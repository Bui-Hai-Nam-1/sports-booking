import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, VenueStatus } from '@prisma/client';
import type { PaginatedResponse } from '../common/types/api.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVE_BLOCKING_BOOKING_STATUSES,
  isValidDateString,
  type AvailabilitySlot,
  type CourtAvailabilityGridResponse,
  type DayAvailabilityRow,
  type SearchCourtMatch,
  type SearchVenueMatch,
  type VenueAvailabilityGridResponse,
} from './booking.types';
import {
  addDaysToDateString,
  buildDateTimeFromLocal,
  buildDayAvailabilityRow,
  calculateBookingTotalPrice,
  extractLocalCalendarParts,
  intervalsOverlap,
  resolveDayOpeningWindow,
  splitIntervalIntoHourlySlots,
  timeToMinutes,
} from './booking-rules';
import type {
  CourtAvailabilityGridQueryDto,
  SearchAvailabilityDto,
  VenueAvailabilityGridQueryDto,
} from './dto/search-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async searchAvailableVenues(
    query: SearchAvailabilityDto,
  ): Promise<PaginatedResponse<SearchVenueMatch>> {
    const targetDate = this.resolveTargetDate(query.date);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const requestedRange = this.resolveRequestedWindow(
      targetDate,
      query.startTime,
      query.endTime,
    );

    const dayStart = buildDateTimeFromLocal(targetDate, '00:00');
    const dayEnd = buildDateTimeFromLocal(
      addDaysToDateString(targetDate, 1),
      '00:00',
    );
    const now = new Date();

    const venues = await this.prisma.venue.findMany({
      where: {
        status: VenueStatus.APPROVED,
        isActive: true,
        ...(query.area
          ? {
              OR: [
                { address: { contains: query.area.trim(), mode: 'insensitive' } },
                { name: { contains: query.area.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
        courts: {
          some: {
            isActive: true,
            ...(query.sportType
              ? {
                  sportType: {
                    equals: query.sportType.trim(),
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
        },
      },
      include: {
        openingHours: { orderBy: { weekday: 'asc' } },
        courts: {
          where: {
            isActive: true,
            ...(query.sportType
              ? {
                  sportType: {
                    equals: query.sportType.trim(),
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
          orderBy: { createdAt: 'asc' },
          include: {
            pricingRules: true,
            maintenanceBlocks: {
              where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
            },
            bookings: {
              where: {
                status: { in: [...ACTIVE_BLOCKING_BOOKING_STATUSES] },
                startAt: { lt: dayEnd },
                endAt: { gt: dayStart },
              },
              select: { id: true, startAt: true, endAt: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const matches: SearchVenueMatch[] = [];

    for (const venue of venues) {
      const { weekday } = extractLocalCalendarParts(dayStart);
      const dayOpening = resolveDayOpeningWindow(weekday, venue.openingHours);

      const courtMatches: SearchCourtMatch[] = [];

      for (const court of venue.courts) {
        const dayRow = buildDayAvailabilityRow({
          dateStr: targetDate,
          openingHours: venue.openingHours,
          pricingRules: court.pricingRules,
          maintenanceBlocks: court.maintenanceBlocks,
          bookings: court.bookings,
          now,
        });

        const availableSlots = dayRow.slots.filter(
          (slot) => slot.status === 'AVAILABLE',
        );
        const prices = dayRow.slots.map((slot) => slot.price);
        const minPricePerHour = prices.length ? Math.min(...prices) : 0;
        const maxPricePerHour = prices.length ? Math.max(...prices) : 0;

        let matchesRequestedWindow = availableSlots.length > 0;
        let requestedWindowPrice: number | null = null;

        if (requestedRange) {
          matchesRequestedWindow = this.checkCourtMatchesWindow({
            requestedRange,
            openingHours: venue.openingHours,
            pricingRules: court.pricingRules,
            maintenanceBlocks: court.maintenanceBlocks,
            bookings: court.bookings,
            now,
          });
          if (matchesRequestedWindow) {
            const segments = splitIntervalIntoHourlySlots(
              requestedRange.startAt,
              requestedRange.endAt,
            );
            requestedWindowPrice = calculateBookingTotalPrice({
              segments,
              openingHours: venue.openingHours,
              pricingRules: court.pricingRules,
            }).totalPrice;
          }
        }

        if (requestedRange && !matchesRequestedWindow) {
          continue;
        }

        courtMatches.push({
          id: court.id,
          name: court.name,
          sportType: court.sportType,
          availableSlotCount: availableSlots.length,
          minPricePerHour,
          maxPricePerHour,
          matchesRequestedWindow,
          requestedWindowPrice,
        });
      }

      if (courtMatches.length === 0) {
        continue;
      }

      matches.push({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        description: venue.description,
        imageUrls: venue.imageUrls,
        sportTypes: venue.sportTypes,
        date: targetDate,
        opensAt: dayOpening.opensAt,
        closesAt: dayOpening.closesAt,
        isClosed: dayOpening.isClosed,
        courts: courtMatches,
      });
    }

    const total = matches.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;

    return {
      items: matches.slice(offset, offset + limit),
      meta: { page, limit, total, totalPages },
    };
  }

  async getCourtAvailabilityGrid(
    courtId: string,
    query: CourtAvailabilityGridQueryDto,
  ): Promise<CourtAvailabilityGridResponse> {
    const startDate = this.resolveTargetDate(query.date);
    const days = query.days ?? 7;

    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        isActive: true,
        venue: { status: VenueStatus.APPROVED, isActive: true },
      },
      include: {
        venue: {
          include: { openingHours: { orderBy: { weekday: 'asc' } } },
        },
        pricingRules: true,
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found or unavailable');
    }

    const rangeStart = buildDateTimeFromLocal(startDate, '00:00');
    const rangeEnd = buildDateTimeFromLocal(
      addDaysToDateString(startDate, days),
      '00:00',
    );

    const [maintenanceBlocks, bookings] = await Promise.all([
      this.prisma.maintenanceBlock.findMany({
        where: {
          courtId,
          startAt: { lt: rangeEnd },
          endAt: { gt: rangeStart },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          courtId,
          status: { in: [...ACTIVE_BLOCKING_BOOKING_STATUSES] },
          startAt: { lt: rangeEnd },
          endAt: { gt: rangeStart },
        },
        select: { id: true, startAt: true, endAt: true, status: true },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    const now = new Date();
    const schedule: DayAvailabilityRow[] = [];
    const columnLabels = new Set<string>();

    for (let offset = 0; offset < days; offset += 1) {
      const dateStr = addDaysToDateString(startDate, offset);
      const dayRow = buildDayAvailabilityRow({
        dateStr,
        openingHours: court.venue.openingHours,
        pricingRules: court.pricingRules,
        maintenanceBlocks,
        bookings,
        now,
      });
      schedule.push(dayRow);
      for (const slot of dayRow.slots) {
        columnLabels.add(`${slot.startTime}-${slot.endTime}`);
      }
    }

    const columns = Array.from(columnLabels).sort();

    return {
      venue: {
        id: court.venue.id,
        name: court.venue.name,
        address: court.venue.address,
        status: court.venue.status,
      },
      court: {
        id: court.id,
        name: court.name,
        sportType: court.sportType,
      },
      startDate,
      days,
      matrix: {
        columns,
        rows: schedule.map((day) => ({
          key: day.date,
          label: day.date,
          metadata: {
            weekday: day.weekday,
            isClosed: day.isClosed,
            opensAt: day.opensAt,
            closesAt: day.closesAt,
            availableCount: day.availableCount,
          },
          cells: columns.map((column) => {
            const [startTime] = column.split('-');
            return (
              day.slots.find((slot) => slot.startTime === startTime) ??
              this.buildClosedPlaceholderSlot(day.date, column)
            );
          }),
        })),
      },
      schedule,
    };
  }

  async getVenueAvailabilityGrid(
    venueId: string,
    query: VenueAvailabilityGridQueryDto,
  ): Promise<VenueAvailabilityGridResponse> {
    const dateStr = this.resolveTargetDate(query.date);
    const dayStart = buildDateTimeFromLocal(dateStr, '00:00');
    const dayEnd = buildDateTimeFromLocal(
      addDaysToDateString(dateStr, 1),
      '00:00',
    );

    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, status: VenueStatus.APPROVED, isActive: true },
      include: {
        openingHours: { orderBy: { weekday: 'asc' } },
        courts: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          include: {
            pricingRules: true,
            maintenanceBlocks: {
              where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
            },
            bookings: {
              where: {
                status: { in: [...ACTIVE_BLOCKING_BOOKING_STATUSES] },
                startAt: { lt: dayEnd },
                endAt: { gt: dayStart },
              },
              select: { id: true, startAt: true, endAt: true, status: true },
            },
          },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found or not approved');
    }

    const { weekday } = extractLocalCalendarParts(dayStart);
    const dayOpening = resolveDayOpeningWindow(weekday, venue.openingHours);
    const now = new Date();

    const courtRows = venue.courts.map((court) => ({
      court,
      dayRow: buildDayAvailabilityRow({
        dateStr,
        openingHours: venue.openingHours,
        pricingRules: court.pricingRules,
        maintenanceBlocks: court.maintenanceBlocks,
        bookings: court.bookings,
        now,
      }),
    }));

    const columns =
      courtRows[0]?.dayRow.slots.map(
        (slot) => `${slot.startTime}-${slot.endTime}`,
      ) ?? [];

    return {
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
      },
      date: dateStr,
      weekday,
      isClosed: dayOpening.isClosed,
      opensAt: dayOpening.opensAt,
      closesAt: dayOpening.closesAt,
      matrix: {
        columns,
        rows: courtRows.map(({ court, dayRow }) => ({
          key: court.id,
          label: court.name,
          metadata: {
            sportType: court.sportType,
            availableCount: dayRow.availableCount,
          },
          cells: dayRow.slots,
        })),
      },
    };
  }

  private resolveTargetDate(rawDate?: string): string {
    if (!rawDate) {
      return extractLocalCalendarParts(new Date()).date;
    }
    if (!isValidDateString(rawDate)) {
      throw new BadRequestException(`Invalid calendar date "${rawDate}"`);
    }
    return rawDate;
  }

  private resolveRequestedWindow(
    dateStr: string,
    startTime?: string,
    endTime?: string,
  ): { startAt: Date; endAt: Date } | null {
    if (!startTime && !endTime) {
      return null;
    }
    if (!startTime || !endTime) {
      throw new BadRequestException(
        'Both startTime and endTime must be provided together when filtering by time',
      );
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime, true)) {
      throw new BadRequestException('endTime must be later than startTime');
    }
    const startAt = buildDateTimeFromLocal(dateStr, startTime);
    const endAt = buildDateTimeFromLocal(dateStr, endTime);
    splitIntervalIntoHourlySlots(startAt, endAt);
    return { startAt, endAt };
  }

  private checkCourtMatchesWindow(params: {
    requestedRange: { startAt: Date; endAt: Date };
    openingHours: Parameters<typeof calculateBookingTotalPrice>[0]['openingHours'];
    pricingRules: Parameters<typeof calculateBookingTotalPrice>[0]['pricingRules'];
    maintenanceBlocks: Array<{ startAt: Date; endAt: Date }>;
    bookings: Array<{ startAt: Date; endAt: Date; status: BookingStatus }>;
    now: Date;
  }): boolean {
    const {
      requestedRange,
      openingHours,
      pricingRules,
      maintenanceBlocks,
      bookings,
      now,
    } = params;

    if (requestedRange.startAt.getTime() <= now.getTime()) {
      return false;
    }

    try {
      const segments = splitIntervalIntoHourlySlots(
        requestedRange.startAt,
        requestedRange.endAt,
      );
      calculateBookingTotalPrice({
        segments,
        openingHours,
        pricingRules,
      });
    } catch {
      return false;
    }

    const hasMaintenance = maintenanceBlocks.some((block) =>
      intervalsOverlap(requestedRange, block),
    );
    if (hasMaintenance) {
      return false;
    }

    const hasBookingConflict = bookings.some(
      (booking) =>
        ACTIVE_BLOCKING_BOOKING_STATUSES.includes(booking.status) &&
        intervalsOverlap(requestedRange, booking),
    );

    return !hasBookingConflict;
  }

  private buildClosedPlaceholderSlot(
    dateStr: string,
    column: string,
  ): AvailabilitySlot {
    const [startTime, endTime] = column.split('-');
    return {
      date: dateStr,
      startTime,
      endTime,
      startAt: buildDateTimeFromLocal(dateStr, startTime).toISOString(),
      endAt: buildDateTimeFromLocal(dateStr, endTime).toISOString(),
      status: 'CLOSED',
      price: 0,
      pricingType: 'STANDARD',
      isBooked: false,
      isMaintenance: false,
    };
  }
}
