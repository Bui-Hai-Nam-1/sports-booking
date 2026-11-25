import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, VenueStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import type { PaginatedResponse } from '../common/types/api.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVE_BLOCKING_BOOKING_STATUSES,
  isValidDateString,
} from './booking.types';
import {
  addDaysToDateString,
  assertCancellationAllowed,
  assertValidStatusTransition,
  buildDateTimeFromLocal,
  calculateBookingTotalPrice,
  resolveBookingSegmentsFromInput,
} from './booking-rules';
import type {
  CheckAvailabilityDto,
  CreateBookingDto,
} from './dto/create-booking.dto';
import type {
  CancelBookingDto,
  ListBookingsQueryDto,
  UpdateBookingStatusDto,
} from './dto/manage-booking.dto';

const bookingDetailInclude = {
  court: {
    select: {
      id: true,
      name: true,
      sportType: true,
      isActive: true,
      venue: {
        select: {
          id: true,
          name: true,
          address: true,
          ownerId: true,
          status: true,
          isActive: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkSlotAvailability(dto: CheckAvailabilityDto) {
    const { startAt, endAt, segments } = resolveBookingSegmentsFromInput(dto);
    const now = new Date();
    if (startAt.getTime() <= now.getTime()) {
      return {
        available: false,
        reason: 'Selected time slot is already in the past',
        courtId: dto.courtId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalPrice: 0,
        breakdown: [],
      };
    }

    const court = await this.prisma.court.findFirst({
      where: {
        id: dto.courtId,
        isActive: true,
        venue: { status: VenueStatus.APPROVED, isActive: true },
      },
      include: {
        venue: { include: { openingHours: true } },
        pricingRules: true,
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found or unavailable');
    }

    let pricing: ReturnType<typeof calculateBookingTotalPrice>;
    try {
      pricing = calculateBookingTotalPrice({
        segments,
        openingHours: court.venue.openingHours,
        pricingRules: court.pricingRules,
      });
    } catch (error) {
      return {
        available: false,
        reason:
          error instanceof Error
            ? error.message
            : 'Selected time is outside opening hours',
        courtId: court.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalPrice: 0,
        breakdown: [],
      };
    }

    const [maintenanceBlock, overlappingBooking] = await Promise.all([
      this.prisma.maintenanceBlock.findFirst({
        where: {
          courtId: court.id,
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
      this.prisma.booking.findFirst({
        where: {
          courtId: court.id,
          status: { in: [...ACTIVE_BLOCKING_BOOKING_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true, status: true },
      }),
    ]);

    if (maintenanceBlock) {
      return {
        available: false,
        reason: `Maintenance scheduled: ${maintenanceBlock.reason}`,
        courtId: court.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalPrice: pricing.totalPrice,
        breakdown: pricing.breakdown,
      };
    }

    if (overlappingBooking) {
      return {
        available: false,
        reason: 'Selected time slot is already booked',
        courtId: court.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalPrice: pricing.totalPrice,
        breakdown: pricing.breakdown,
      };
    }

    return {
      available: true,
      reason: null,
      courtId: court.id,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      totalPrice: pricing.totalPrice,
      breakdown: pricing.breakdown,
    };
  }

  async createBooking(user: AuthenticatedUser, dto: CreateBookingDto) {
    const { startAt, endAt, segments } = resolveBookingSegmentsFromInput(dto);
    const now = new Date();
    if (startAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Cannot create a booking in the past');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Serialize concurrent booking requests targeting the same court.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.courtId}))`;

          const court = await tx.court.findFirst({
            where: {
              id: dto.courtId,
              isActive: true,
              venue: { status: VenueStatus.APPROVED, isActive: true },
            },
            include: {
              venue: { include: { openingHours: true } },
              pricingRules: true,
            },
          });

          if (!court) {
            throw new NotFoundException('Court not found or not available for booking');
          }

          const { totalPrice } = calculateBookingTotalPrice({
            segments,
            openingHours: court.venue.openingHours,
            pricingRules: court.pricingRules,
          });

          const [maintenanceConflict, bookingConflict] = await Promise.all([
            tx.maintenanceBlock.findFirst({
              where: {
                courtId: court.id,
                startAt: { lt: endAt },
                endAt: { gt: startAt },
              },
            }),
            tx.booking.findFirst({
              where: {
                courtId: court.id,
                status: { in: [...ACTIVE_BLOCKING_BOOKING_STATUSES] },
                startAt: { lt: endAt },
                endAt: { gt: startAt },
              },
              select: { id: true },
            }),
          ]);

          if (maintenanceConflict) {
            throw new ConflictException(
              `Court is locked for maintenance (${maintenanceConflict.reason})`,
            );
          }

          if (bookingConflict) {
            throw new ConflictException(
              'Selected time slot overlaps an existing booking',
            );
          }

          return tx.booking.create({
            data: {
              userId: user.id,
              courtId: court.id,
              startAt,
              endAt,
              totalPrice: new Prisma.Decimal(totalPrice),
              status: BookingStatus.PENDING,
              notes: dto.notes?.trim() || null,
            },
            include: bookingDetailInclude,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      ) {
        throw new ConflictException(
          'Time slot was just reserved by another request. Please refresh and choose another slot.',
        );
      }
      throw error;
    }
  }

  async listMyBookings(
    user: AuthenticatedUser,
    query: ListBookingsQueryDto,
  ): Promise<PaginatedResponse<Prisma.BookingGetPayload<{ include: typeof bookingDetailInclude }>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.BookingWhereInput = {
      userId: user.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courtId ? { courtId: query.courtId } : {}),
      ...(this.buildDateRangeFilter(query.dateFrom, query.dateTo, query.date)),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingDetailInclude,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listManagedBookings(
    user: AuthenticatedUser,
    query: ListBookingsQueryDto,
  ): Promise<PaginatedResponse<Prisma.BookingGetPayload<{ include: typeof bookingDetailInclude }>>> {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only court owners or admins can list venue bookings');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.courtId ? { courtId: query.courtId } : {}),
      ...(this.buildDateRangeFilter(query.dateFrom, query.dateTo, query.date)),
      court: {
        ...(query.venueId ? { venueId: query.venueId } : {}),
        ...(user.role === 'OWNER' ? { venue: { ownerId: user.id } } : {}),
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: bookingDetailInclude,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getBookingById(user: AuthenticatedUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingDetailInclude,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isCustomer = booking.userId === user.id;
    const isVenueOwner = booking.court.venue.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isCustomer && !isVenueOwner && !isAdmin) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  async cancelBooking(
    user: AuthenticatedUser,
    bookingId: string,
    dto: CancelBookingDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: bookingDetailInclude,
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const isBookingOwner = booking.userId === user.id;
      const isVenueOwner = booking.court.venue.ownerId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isBookingOwner && !isVenueOwner && !isAdmin) {
        throw new ForbiddenException('You cannot cancel another user booking');
      }

      const now = new Date();
      assertCancellationAllowed({
        status: booking.status,
        startAt: booking.startAt,
        actorRole: isAdmin ? 'ADMIN' : isVenueOwner && !isBookingOwner ? 'OWNER' : 'CUSTOMER',
        now,
      });

      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: booking.status,
        },
        data: {
          status: BookingStatus.CANCELLED,
          cancelReason: dto.reason.trim(),
          cancelledAt: now,
          cancelledById: user.id,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Booking status changed concurrently; please retry');
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingDetailInclude,
      });
    });
  }

  async updateBookingStatus(
    user: AuthenticatedUser,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only court owners or admins can change booking status');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: bookingDetailInclude,
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (user.role === 'OWNER' && booking.court.venue.ownerId !== user.id) {
        throw new ForbiddenException('You do not own the venue for this booking');
      }

      const now = new Date();
      assertValidStatusTransition({
        currentStatus: booking.status,
        nextStatus: dto.status,
        startAt: booking.startAt,
        now,
      });

      const cancellationFields =
        dto.status === BookingStatus.CANCELLED ||
        dto.status === BookingStatus.REJECTED
          ? {
              cancelReason: dto.reason?.trim() || null,
              cancelledAt: now,
              cancelledById: user.id,
            }
          : {};

      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: booking.status,
        },
        data: {
          status: dto.status,
          ...cancellationFields,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Booking status changed concurrently; please retry');
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingDetailInclude,
      });
    });
  }

  private buildDateRangeFilter(
    rawDateFrom?: string,
    rawDateTo?: string,
    legacyDate?: string,
  ): Prisma.BookingWhereInput {
    const dateFrom = rawDateFrom ?? rawDateTo ?? legacyDate;
    const dateTo = rawDateTo ?? rawDateFrom ?? legacyDate;

    if (!dateFrom || !dateTo) {
      return {};
    }
    if (!isValidDateString(dateFrom)) {
      throw new BadRequestException(`Invalid dateFrom filter "${dateFrom}"`);
    }
    if (!isValidDateString(dateTo)) {
      throw new BadRequestException(`Invalid dateTo filter "${dateTo}"`);
    }
    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    const rangeStart = buildDateTimeFromLocal(dateFrom, '00:00');
    const rangeEnd = buildDateTimeFromLocal(
      addDaysToDateString(dateTo, 1),
      '00:00',
    );
    return {
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    };
  }
}
