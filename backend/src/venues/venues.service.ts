import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookingStatus, Prisma, VenueStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourtDto, UpdateCourtDto } from "./dto/court.dto";
import { CreateMaintenanceBlockDto } from "./dto/maintenance.dto";
import { CreatePricingRuleDto } from "./dto/pricing.dto";
import { VenueApprovalDto } from "./dto/venue-approval.dto";
import {
  CreateVenueDto,
  OpeningHourDto,
  UpdateVenueDto,
} from "./dto/venue.dto";

const venueSummary = {
  id: true,
  name: true,
  address: true,
  description: true,
  imageUrls: true,
  videoUrls: true,
  sportTypes: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VenueSelect;

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicVenues() {
    return this.prisma.venue.findMany({
      where: { status: VenueStatus.APPROVED, isActive: true },
      select: { ...venueSummary, courts: { where: { isActive: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listOwnerVenues(ownerId: string) {
    return this.prisma.venue.findMany({
      where: { ownerId },
      include: {
        courts: { orderBy: { createdAt: "asc" } },
        openingHours: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listPendingVenues() {
    return this.prisma.venue.findMany({
      where: { status: VenueStatus.PENDING },
      select: {
        ...venueSummary,
        owner: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createVenue(ownerId: string, dto: CreateVenueDto) {
    const {
      initialCourtPricePerHour,
      initialPriceStartsAt = "06:00",
      initialPriceEndsAt = "22:00",
      ...venueData
    } = dto;
    if (
      initialCourtPricePerHour !== undefined &&
      initialPriceStartsAt >= initialPriceEndsAt
    ) {
      throw new BadRequestException(
        "Initial court price start time must be earlier than end time",
      );
    }
    return this.prisma.venue.create({
      data: {
        ...venueData,
        ownerId,
        status: VenueStatus.PENDING,
        ...(initialCourtPricePerHour === undefined
          ? {}
          : {
              courts: {
                create: {
                  name: "Sân 1",
                  sportType: dto.sportTypes[0],
                  pricingRules: {
                    create: {
                      type: "STANDARD",
                      pricePerHour: new Prisma.Decimal(
                        initialCourtPricePerHour,
                      ),
                      startsAt: initialPriceStartsAt,
                      endsAt: initialPriceEndsAt,
                    },
                  },
                },
              },
            }),
      },
      select: venueSummary,
    });
  }

  async updateVenue(ownerId: string, venueId: string, dto: UpdateVenueDto) {
    await this.getOwnedVenue(ownerId, venueId);
    return this.prisma.venue.update({
      where: { id: venueId },
      data: dto,
      select: venueSummary,
    });
  }

  async deactivateVenue(ownerId: string, venueId: string) {
    await this.getOwnedVenue(ownerId, venueId);
    await this.prisma.venue.update({
      where: { id: venueId },
      data: { isActive: false },
    });
    return { id: venueId, isActive: false };
  }

  async setApproval(venueId: string, dto: VenueApprovalDto) {
    const venue = await this.getVenue(venueId);
    if (dto.status === VenueStatus.APPROVED) {
      return this.prisma.$transaction(async (transaction) => {
        const approvedVenue = await transaction.venue.update({
          where: { id: venueId },
          data: { status: dto.status },
          select: venueSummary,
        });
        await transaction.user.update({
          where: { id: venue.ownerId },
          data: { role: "OWNER" },
        });
        return approvedVenue;
      });
    }
    return this.prisma.venue.update({
      where: { id: venueId },
      data: { status: dto.status },
      select: venueSummary,
    });
  }

  async listVenueCourts(venueId: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, status: VenueStatus.APPROVED, isActive: true },
    });
    if (!venue) throw new NotFoundException("Venue not found");
    return this.prisma.court.findMany({
      where: { venueId, isActive: true },
      include: { pricingRules: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async createCourt(ownerId: string, venueId: string, dto: CreateCourtDto) {
    await this.getOwnedVenue(ownerId, venueId);
    return this.prisma.court.create({ data: { ...dto, venueId } });
  }

  async updateCourt(ownerId: string, courtId: string, dto: UpdateCourtDto) {
    await this.getOwnedCourt(ownerId, courtId);
    return this.prisma.court.update({ where: { id: courtId }, data: dto });
  }

  async deactivateCourt(ownerId: string, courtId: string) {
    await this.getOwnedCourt(ownerId, courtId);
    await this.prisma.court.update({
      where: { id: courtId },
      data: { isActive: false },
    });
    return { id: courtId, isActive: false };
  }

  async getOpeningHours(venueId: string, ownerId?: string) {
    if (ownerId) await this.getOwnedVenue(ownerId, venueId);
    else {
      const venue = await this.prisma.venue.findFirst({
        where: { id: venueId, status: VenueStatus.APPROVED, isActive: true },
      });
      if (!venue) throw new NotFoundException("Venue not found");
    }
    return this.prisma.venueOpeningHour.findMany({
      where: { venueId },
      orderBy: { weekday: "asc" },
    });
  }

  async replaceOpeningHours(
    ownerId: string,
    venueId: string,
    hours: OpeningHourDto[],
  ) {
    await this.getOwnedVenue(ownerId, venueId);
    const weekdays = hours.map(({ weekday }) => weekday);
    if (
      weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(weekdays).size !== weekdays.length
    ) {
      throw new BadRequestException(
        "Opening hours must contain unique weekdays from 0 to 6",
      );
    }
    for (const hour of hours) {
      if (
        !hour.isClosed &&
        (!this.isTime(hour.opensAt) ||
          !this.isTime(hour.closesAt) ||
          hour.opensAt >= hour.closesAt)
      ) {
        throw new BadRequestException(
          "Opening time must be earlier than closing time",
        );
      }
    }
    return this.prisma.$transaction(async (transaction) => {
      await transaction.venueOpeningHour.deleteMany({ where: { venueId } });
      if (hours.length) {
        await transaction.venueOpeningHour.createMany({
          data: hours.map((hour) => ({ ...hour, venueId })),
        });
      }
      return transaction.venueOpeningHour.findMany({
        where: { venueId },
        orderBy: { weekday: "asc" },
      });
    });
  }

  async listPricingRules(courtId: string, ownerId?: string) {
    await this.getCourtForRead(courtId, ownerId);
    return this.prisma.pricingRule.findMany({
      where: { courtId },
      orderBy: [{ type: "asc" }, { weekday: "asc" }, { startsAt: "asc" }],
    });
  }

  async quoteHourlyPrice(
    courtId: string,
    weekday: number,
    time: string,
    ownerId?: string,
  ) {
    await this.getCourtForRead(courtId, ownerId);
    if (
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      !this.isTime(time)
    ) {
      throw new BadRequestException("A valid weekday and time are required");
    }

    const rules = await this.prisma.pricingRule.findMany({
      where: { courtId },
    });
    const appliesAtTime = (rule: (typeof rules)[number]) =>
      (rule.weekday === null || rule.weekday === weekday) &&
      rule.startsAt <= time &&
      time < rule.endsAt;
    const baseRule = rules
      .filter((rule) => rule.type === "STANDARD" && appliesAtTime(rule))
      .sort(
        (left, right) =>
          Number(right.weekday !== null) - Number(left.weekday !== null),
      )[0];

    if (!baseRule || baseRule.pricePerHour === null) {
      throw new NotFoundException(
        "No standard hourly price is configured for this time",
      );
    }

    const isWeekend = weekday === 0 || weekday === 6;
    const increasePercent = rules
      .filter((rule) => {
        if (
          !appliesAtTime(rule) ||
          rule.increasePercent === null ||
          rule.increasePercent === undefined
        ) {
          return false;
        }
        if (rule.type === "WEEKEND") return isWeekend;
        return rule.type === "PEAK";
      })
      .reduce((total, rule) => total + (rule.increasePercent ?? 0), 0);
    const basePricePerHour = Number(baseRule.pricePerHour);

    return {
      weekday,
      time,
      basePricePerHour,
      increasePercent,
      pricePerHour: Math.round(basePricePerHour * (1 + increasePercent / 100)),
    };
  }

  async createPricingRule(
    ownerId: string,
    courtId: string,
    dto: CreatePricingRuleDto,
  ) {
    await this.getOwnedCourt(ownerId, courtId);
    if (
      dto.type === "STANDARD" &&
      (dto.pricePerHour === undefined || dto.increasePercent !== undefined)
    ) {
      throw new BadRequestException("Standard pricing requires a price per hour");
    }
    if (
      dto.type !== "STANDARD" &&
      (dto.increasePercent === undefined ||
        dto.increasePercent < 10 ||
        dto.increasePercent > 20 ||
        dto.pricePerHour !== undefined)
    ) {
      throw new BadRequestException(
        "Weekend and peak pricing require a 10–20% increase, not a separate hourly price",
      );
    }
    const existingRules = await this.prisma.pricingRule.findMany({
      where: { courtId, type: dto.type },
    });
    const hasConflictingRule = existingRules.some((rule) => {
      const timeOverlaps =
        dto.startsAt < rule.endsAt && dto.endsAt > rule.startsAt;
      const weekdaysOverlap =
        dto.weekday === null ||
        dto.weekday === undefined ||
        rule.weekday === null ||
        dto.weekday === rule.weekday;
      const isBaseRateOverride =
        dto.type === "STANDARD" &&
        ((dto.weekday === null || dto.weekday === undefined) !==
          (rule.weekday === null));
      return timeOverlaps && weekdaysOverlap && !isBaseRateOverride;
    });
    if (hasConflictingRule) {
      throw new ConflictException(
        "Pricing rules of the same type cannot overlap for the same day",
      );
    }
    if (dto.startsAt >= dto.endsAt) {
      throw new BadRequestException(
        "Pricing rule start time must be earlier than end time",
      );
    }
    return this.prisma.pricingRule.create({
      data: {
        type: dto.type,
        pricePerHour:
          dto.pricePerHour === undefined
            ? null
            : new Prisma.Decimal(dto.pricePerHour),
        increasePercent:
          dto.type === "STANDARD" ? null : dto.increasePercent,
        weekday: dto.weekday,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        courtId,
      },
    });
  }

  async deletePricingRule(ownerId: string, courtId: string, ruleId: string) {
    await this.getOwnedCourt(ownerId, courtId);
    const rule = await this.prisma.pricingRule.findFirst({
      where: { id: ruleId, courtId },
    });
    if (!rule) throw new NotFoundException("Pricing rule not found");
    await this.prisma.pricingRule.delete({ where: { id: ruleId } });
    return { id: ruleId, deleted: true };
  }

  async listMaintenanceBlocks(courtId: string, ownerId?: string) {
    await this.getCourtForRead(courtId, ownerId);
    return this.prisma.maintenanceBlock.findMany({
      where: { courtId },
      orderBy: { startAt: "asc" },
    });
  }

  async createMaintenanceBlock(
    ownerId: string,
    courtId: string,
    dto: CreateMaintenanceBlockDto,
  ) {
    await this.getOwnedCourt(ownerId, courtId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) {
      throw new BadRequestException(
        "Maintenance end time must be after start time",
      );
    }
    const [existingBlock, existingBooking] = await Promise.all([
      this.prisma.maintenanceBlock.findFirst({
        where: { courtId, startAt: { lt: endAt }, endAt: { gt: startAt } },
      }),
      this.prisma.booking.findFirst({
        where: {
          courtId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
    ]);
    if (existingBlock || existingBooking) {
      throw new ConflictException(
        "Maintenance time conflicts with an existing block or booking",
      );
    }
    return this.prisma.maintenanceBlock.create({
      data: { courtId, startAt, endAt, reason: dto.reason },
    });
  }

  async deleteMaintenanceBlock(
    ownerId: string,
    courtId: string,
    blockId: string,
  ) {
    await this.getOwnedCourt(ownerId, courtId);
    const block = await this.prisma.maintenanceBlock.findFirst({
      where: { id: blockId, courtId },
    });
    if (!block) throw new NotFoundException("Maintenance block not found");
    await this.prisma.maintenanceBlock.delete({ where: { id: blockId } });
    return { id: blockId, deleted: true };
  }

  async getOwnedVenue(ownerId: string, venueId: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, ownerId },
    });
    if (!venue) throw new NotFoundException("Venue not found");
    return venue;
  }

  private async getOwnedCourt(ownerId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: { id: courtId, venue: { ownerId } },
    });
    if (!court) throw new NotFoundException("Court not found");
    return court;
  }

  private async getPublicCourt(courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        isActive: true,
        venue: { status: VenueStatus.APPROVED, isActive: true },
      },
    });
    if (!court) throw new NotFoundException("Court not found");
    return court;
  }

  private async getCourtForRead(courtId: string, ownerId?: string) {
    return ownerId
      ? this.getOwnedCourt(ownerId, courtId)
      : this.getPublicCourt(courtId);
  }

  private async getVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
    });
    if (!venue) throw new NotFoundException("Venue not found");
    return venue;
  }

  private isTime(value: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }
}
