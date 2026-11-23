import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OwnerApprovalStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourtDto,
  CreateMaintenanceDto,
  CreatePriceRuleDto,
  CreateVenueDto,
  OwnerApprovalDto,
  SearchVenuesQueryDto,
  UpdateCourtDto,
  UpdatePriceRuleDto,
  UpdateVenueDto,
  VenueOpeningHourDto,
} from './venues.dto';
import {
  assertPriceRuleDoesNotOverlap,
  assertValidDateInterval,
  assertValidOpeningHours,
} from './venue-rules';

const venueDetails = {
  openingHours: { orderBy: { dayOfWeek: 'asc' as const } },
  courts: {
    where: { isActive: true },
    include: {
      priceRules: {
        orderBy: [{ dayOfWeek: 'asc' as const }, { startTime: 'asc' as const }],
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

function normalizedList(values: string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  const cleaned = values.map((value) => value.trim());
  if (cleaned.some((value) => value.length === 0)) {
    throw new BadRequestException('List values cannot be blank');
  }
  return [...new Set(cleaned)];
}

function openingHourRecords(
  hours: VenueOpeningHourDto[] | undefined,
): Prisma.VenueOpeningHourCreateWithoutVenueInput[] {
  if (!hours) {
    return [];
  }
  assertValidOpeningHours(hours);
  return hours.map((hour) => ({
    dayOfWeek: hour.dayOfWeek,
    openTime: hour.openTime,
    closeTime: hour.closeTime,
    isClosed: hour.isClosed ?? false,
  }));
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: SearchVenuesQueryDto) {
    const search = query.q?.trim();
    const sport = query.sport?.trim();
    const filters: Prisma.VenueWhereInput[] = [];
    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (sport) {
      filters.push({
        OR: [
          { sportTypes: { has: sport } },
          {
            courts: {
              some: {
                isActive: true,
                sportType: { equals: sport, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }
    return this.prisma.venue.findMany({
      where: {
        isActive: true,
        owner: { ownerApprovalStatus: OwnerApprovalStatus.APPROVED },
        AND: filters,
      },
      include: venueDetails,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicVenue(venueId: string) {
    const venue = await this.prisma.venue.findFirst({
      where: {
        id: venueId,
        isActive: true,
        owner: { ownerApprovalStatus: OwnerApprovalStatus.APPROVED },
      },
      include: venueDetails,
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    return venue;
  }

  async listOwned(user: AuthenticatedUser) {
    await this.assertApprovedOwner(user);
    return this.prisma.venue.findMany({
      where: user.role === 'ADMIN' ? {} : { ownerId: user.id },
      include: {
        ...venueDetails,
        courts: {
          where: {},
          include: {
            priceRules: {
              orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVenue(user: AuthenticatedUser, dto: CreateVenueDto) {
    await this.assertApprovedOwner(user);
    const hours = openingHourRecords(dto.openingHours);
    return this.prisma.venue.create({
      data: {
        name: dto.name.trim(),
        address: dto.address.trim(),
        description: dto.description?.trim(),
        sportTypes: normalizedList(dto.sportTypes) ?? [],
        imageUrls: dto.imageUrls ?? [],
        ownerId: user.id,
        openingHours: { create: hours },
      },
      include: venueDetails,
    });
  }

  async updateVenue(
    venueId: string,
    user: AuthenticatedUser,
    dto: UpdateVenueDto,
  ) {
    await this.assertVenueAccess(venueId, user);
    const hours =
      dto.openingHours === undefined
        ? undefined
        : openingHourRecords(dto.openingHours);
    const fields = dto;
    const data: Prisma.VenueUpdateInput = {
      ...(fields.name !== undefined ? { name: fields.name.trim() } : {}),
      ...(fields.address !== undefined
        ? { address: fields.address.trim() }
        : {}),
      ...(fields.description !== undefined
        ? { description: fields.description.trim() }
        : {}),
      ...(fields.sportTypes !== undefined
        ? { sportTypes: normalizedList(fields.sportTypes) }
        : {}),
      ...(fields.imageUrls !== undefined
        ? { imageUrls: fields.imageUrls }
        : {}),
    };

    return this.prisma.$transaction(async (transaction) => {
      if (hours !== undefined) {
        await transaction.venueOpeningHour.deleteMany({ where: { venueId } });
        if (hours.length > 0) {
          await transaction.venueOpeningHour.createMany({
            data: hours.map((hour) => ({ ...hour, venueId })),
          });
        }
      }
      return transaction.venue.update({
        where: { id: venueId },
        data,
        include: venueDetails,
      });
    });
  }

  async deactivateVenue(venueId: string, user: AuthenticatedUser) {
    await this.assertVenueAccess(venueId, user);
    return this.prisma.$transaction(async (transaction) => {
      await transaction.court.updateMany({
        where: { venueId },
        data: { isActive: false },
      });
      return transaction.venue.update({
        where: { id: venueId },
        data: { isActive: false },
      });
    });
  }

  async createCourt(
    venueId: string,
    user: AuthenticatedUser,
    dto: CreateCourtDto,
  ) {
    await this.assertVenueAccess(venueId, user);
    return this.prisma.court.create({
      data: {
        name: dto.name.trim(),
        sportType: dto.sportType.trim(),
        imageUrls: dto.imageUrls ?? [],
        venueId,
      },
      include: { priceRules: true },
    });
  }

  async updateCourt(
    courtId: string,
    user: AuthenticatedUser,
    dto: UpdateCourtDto,
  ) {
    const court = await this.getManagedCourt(courtId, user);
    return this.prisma.court.update({
      where: { id: court.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sportType !== undefined
          ? { sportType: dto.sportType.trim() }
          : {}),
        ...(dto.imageUrls !== undefined ? { imageUrls: dto.imageUrls } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { priceRules: true },
    });
  }

  async deactivateCourt(courtId: string, user: AuthenticatedUser) {
    const court = await this.getManagedCourt(courtId, user);
    return this.prisma.court.update({
      where: { id: court.id },
      data: { isActive: false },
    });
  }

  async createPriceRule(
    courtId: string,
    user: AuthenticatedUser,
    dto: CreatePriceRuleDto,
  ) {
    const court = await this.getManagedCourt(courtId, user);
    const existing = await this.prisma.courtPriceRule.findMany({
      where: { courtId: court.id },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    assertPriceRuleDoesNotOverlap(
      {
        dayOfWeek: dto.dayOfWeek ?? null,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      existing,
    );
    return this.prisma.courtPriceRule.create({
      data: {
        courtId: court.id,
        name: dto.name.trim(),
        dayOfWeek: dto.dayOfWeek ?? null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        pricePerHour: dto.pricePerHour,
      },
    });
  }

  async updatePriceRule(
    ruleId: string,
    user: AuthenticatedUser,
    dto: UpdatePriceRuleDto,
  ) {
    const rule = await this.getManagedPriceRule(ruleId, user);
    const candidate = {
      id: rule.id,
      dayOfWeek: dto.dayOfWeek === undefined ? rule.dayOfWeek : dto.dayOfWeek,
      startTime: dto.startTime ?? rule.startTime,
      endTime: dto.endTime ?? rule.endTime,
    };
    const existing = await this.prisma.courtPriceRule.findMany({
      where: { courtId: rule.courtId },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    assertPriceRuleDoesNotOverlap(candidate, existing, rule.id);
    return this.prisma.courtPriceRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        ...(dto.pricePerHour !== undefined
          ? { pricePerHour: dto.pricePerHour }
          : {}),
      },
    });
  }

  async deletePriceRule(ruleId: string, user: AuthenticatedUser) {
    await this.getManagedPriceRule(ruleId, user);
    return this.prisma.courtPriceRule.delete({ where: { id: ruleId } });
  }

  async listMaintenance(courtId: string, user: AuthenticatedUser) {
    const court = await this.getManagedCourt(courtId, user);
    return this.prisma.courtMaintenance.findMany({
      where: { courtId: court.id },
      orderBy: { startAt: 'desc' },
    });
  }

  async createMaintenance(
    courtId: string,
    user: AuthenticatedUser,
    dto: CreateMaintenanceDto,
  ) {
    const court = await this.getManagedCourt(courtId, user);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    assertValidDateInterval(startAt, endAt);

    return this.prisma.$transaction(
      async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: {
            courtId: court.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        });
        if (booking) {
          throw new ConflictException(
            'Maintenance cannot overlap an active booking',
          );
        }

        const maintenance = await transaction.courtMaintenance.findFirst({
          where: {
            courtId: court.id,
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        });
        if (maintenance) {
          throw new ConflictException('Maintenance periods cannot overlap');
        }

        return transaction.courtMaintenance.create({
          data: {
            courtId: court.id,
            startAt,
            endAt,
            reason: dto.reason.trim(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deleteMaintenance(maintenanceId: string, user: AuthenticatedUser) {
    const block = await this.prisma.courtMaintenance.findUnique({
      where: { id: maintenanceId },
      include: { court: { include: { venue: { select: { ownerId: true } } } } },
    });
    if (!block) {
      throw new NotFoundException('Maintenance period not found');
    }
    await this.assertVenueOwner(block.court.venue.ownerId, user);
    return this.prisma.courtMaintenance.delete({
      where: { id: maintenanceId },
    });
  }

  async listPendingOwners() {
    return this.prisma.user.findMany({
      where: {
        role: 'OWNER',
        ownerApprovalStatus: OwnerApprovalStatus.PENDING,
      },
      select: { id: true, fullName: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewOwner(
    ownerId: string,
    reviewerId: string,
    dto: OwnerApprovalDto,
  ) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });
    if (!owner || owner.role !== 'OWNER') {
      throw new NotFoundException('Owner account not found');
    }
    return this.prisma.user.update({
      where: { id: ownerId },
      data: {
        ownerApprovalStatus: dto.status,
        ownerReviewedAt: new Date(),
        ownerReviewedById: reviewerId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        ownerApprovalStatus: true,
        ownerReviewedAt: true,
      },
    });
  }

  private async assertApprovedOwner(user: AuthenticatedUser): Promise<void> {
    if (user.role === 'ADMIN') {
      return;
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, ownerApprovalStatus: true },
    });
    if (!owner || owner.role !== 'OWNER') {
      throw new ForbiddenException('An owner account is required');
    }
    if (owner.ownerApprovalStatus !== OwnerApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'The owner account must be approved before managing venues',
      );
    }
  }

  private async assertVenueAccess(venueId: string, user: AuthenticatedUser) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, ownerId: true },
    });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }
    await this.assertVenueOwner(venue.ownerId, user);
    return venue;
  }

  private async assertVenueOwner(
    ownerId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === 'ADMIN') {
      return;
    }
    await this.assertApprovedOwner(user);
    if (ownerId !== user.id) {
      throw new ForbiddenException('You can only manage your own venues');
    }
  }

  private async getManagedCourt(courtId: string, user: AuthenticatedUser) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
      include: { venue: { select: { ownerId: true } } },
    });
    if (!court) {
      throw new NotFoundException('Court not found');
    }
    await this.assertVenueOwner(court.venue.ownerId, user);
    return court;
  }

  private async getManagedPriceRule(ruleId: string, user: AuthenticatedUser) {
    const rule = await this.prisma.courtPriceRule.findUnique({
      where: { id: ruleId },
      include: { court: { include: { venue: { select: { ownerId: true } } } } },
    });
    if (!rule) {
      throw new NotFoundException('Price rule not found');
    }
    await this.assertVenueOwner(rule.court.venue.ownerId, user);
    return rule;
  }
}
