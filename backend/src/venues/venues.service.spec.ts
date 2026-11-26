import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BookingStatus, PricingType, VenueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from './venues.service';

function createHarness() {
  const transaction = {
    venue: { update: jest.fn() },
    user: { update: jest.fn() },
    venueOpeningHour: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const prismaMock = {
    venue: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    court: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    venueOpeningHour: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    pricingRule: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    maintenanceBlock: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    booking: { findFirst: jest.fn() },
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction),
    ),
  };
  return {
    service: new VenuesService(prismaMock as unknown as PrismaService),
    prismaMock,
    transaction,
  };
}

describe('VenuesService', () => {
  it('creates new venues pending admin approval and uses the authenticated owner id', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.create.mockResolvedValue({ id: 'venue-1', status: VenueStatus.PENDING });

    await service.createVenue('owner-1', {
      name: 'Sân trung tâm',
      address: '12 Đường X, Hà Nội',
      imageUrls: [],
      sportTypes: ['Football'],
      initialCourtPricePerHour: 120000,
      initialPriceStartsAt: '06:00',
      initialPriceEndsAt: '22:00',
    });

    expect(prismaMock.venue.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerId: 'owner-1',
        status: VenueStatus.PENDING,
        courts: {
          create: {
            name: 'Sân 1',
            sportType: 'Football',
            pricingRules: {
              create: expect.objectContaining({
                type: PricingType.STANDARD,
                startsAt: '06:00',
                endsAt: '22:00',
              }),
            },
          },
        },
      }),
    }));
  });

  it('lists only venues belonging to the owner', async () => {
    const { service, prismaMock } = createHarness();
    await service.listOwnerVenues('owner-1');
    expect(prismaMock.venue.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: 'owner-1' },
    }));
  });

  it('lists pending venues for admin review', async () => {
    const { service, prismaMock } = createHarness();
    await service.listPendingVenues();
    expect(prismaMock.venue.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: VenueStatus.PENDING },
    }));
  });

  it('publishes only approved and active venues', async () => {
    const { service, prismaMock } = createHarness();
    await service.listPublicVenues();
    expect(prismaMock.venue.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: VenueStatus.APPROVED, isActive: true },
    }));
  });

  it('updates venue information after checking ownership', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1', ownerId: 'owner-1' });
    prismaMock.venue.update.mockResolvedValue({ id: 'venue-1', name: 'Sân mới' });
    await service.updateVenue('owner-1', 'venue-1', { name: 'Sân mới' });
    expect(prismaMock.venue.update).toHaveBeenCalled();
  });

  it('does not update a venue owned by a different user', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue(null);
    await expect(service.updateVenue('owner-2', 'venue-1', { name: 'Hack' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.venue.update).not.toHaveBeenCalled();
  });

  it('deactivates rather than deleting a venue and its booking history', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    await service.deactivateVenue('owner-1', 'venue-1');
    expect(prismaMock.venue.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { isActive: false },
    }));
  });

  it('sets the approval status of an existing venue', async () => {
    const { service, prismaMock, transaction } = createHarness();
    prismaMock.venue.findUnique.mockResolvedValue({ id: 'venue-1', ownerId: 'owner-1' });
    transaction.venue.update.mockResolvedValue({ id: 'venue-1', status: VenueStatus.APPROVED });
    await service.setApproval('venue-1', { status: VenueStatus.APPROVED });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'owner-1' },
      data: { role: 'OWNER' },
    });
  });

  it('creates a court for an owned venue', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    prismaMock.court.create.mockResolvedValue({ id: 'court-1' });
    await service.createCourt('owner-1', 'venue-1', { name: 'Sân 1', sportType: 'Football' });
    expect(prismaMock.court.create).toHaveBeenCalledWith({
      data: { name: 'Sân 1', sportType: 'Football', venueId: 'venue-1' },
    });
  });

  it('rejects court updates when the owner does not own its venue', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue(null);
    await expect(service.updateCourt('owner-2', 'court-1', { name: 'Sân khác' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates weekdays and rejects duplicate opening-hour entries', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    const hours = [
      { weekday: 1, opensAt: '06:00', closesAt: '22:00', isClosed: false },
      { weekday: 1, opensAt: '07:00', closesAt: '21:00', isClosed: false },
    ];
    await expect(service.replaceOpeningHours('owner-1', 'venue-1', hours))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an opening time after the closing time', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    await expect(service.replaceOpeningHours('owner-1', 'venue-1', [
      { weekday: 2, opensAt: '22:00', closesAt: '06:00', isClosed: false },
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces opening hours in a database transaction', async () => {
    const { service, prismaMock, transaction } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    const hours = [{ weekday: 0, opensAt: '08:00', closesAt: '20:00', isClosed: false }];
    await service.replaceOpeningHours('owner-1', 'venue-1', hours);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(transaction.venueOpeningHour.createMany).toHaveBeenCalledWith({
      data: [{ ...hours[0], venueId: 'venue-1' }],
    });
  });

  it('lists courts only from a public approved venue', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue({ id: 'venue-1' });
    await service.listVenueCourts('venue-1');
    expect(prismaMock.court.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { venueId: 'venue-1', isActive: true },
    }));
  });

  it('does not expose courts from an unapproved venue', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.venue.findFirst.mockResolvedValue(null);
    await expect(service.listVenueCourts('venue-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.court.findMany).not.toHaveBeenCalled();
  });

  it('rejects pricing windows where start is not earlier than end', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    await expect(service.createPricingRule('owner-1', 'court-1', {
      type: PricingType.STANDARD,
      pricePerHour: 120000,
      startsAt: '20:00',
      endsAt: '06:00',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates pricing rules with decimal prices', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.create.mockResolvedValue({ id: 'rule-1' });
    await service.createPricingRule('owner-1', 'court-1', {
      type: PricingType.WEEKEND,
      increasePercent: 15,
      weekday: 6,
      startsAt: '08:00',
      endsAt: '22:00',
    });
    expect(prismaMock.pricingRule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        courtId: 'court-1',
        weekday: 6,
        pricePerHour: null,
        increasePercent: 15,
      }),
    }));
  });

  it('rejects overlapping rules of the same pricing type and weekday', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.findMany.mockResolvedValue([
      {
        type: PricingType.STANDARD,
        weekday: 6,
        startsAt: '08:00',
        endsAt: '12:00',
      },
    ] as never);

    await expect(
      service.createPricingRule('owner-1', 'court-1', {
        type: PricingType.STANDARD,
        pricePerHour: 120000,
        weekday: 6,
        startsAt: '11:00',
        endsAt: '14:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds weekend and peak surcharges to the standard hourly price', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.findMany.mockResolvedValue([
      {
        type: PricingType.STANDARD,
        pricePerHour: { toString: () => '100000' },
        increasePercent: null,
        weekday: null,
        startsAt: '06:00',
        endsAt: '23:00',
      },
      {
        type: PricingType.WEEKEND,
        pricePerHour: null,
        increasePercent: 10,
        weekday: null,
        startsAt: '06:00',
        endsAt: '23:00',
      },
      {
        type: PricingType.PEAK,
        pricePerHour: null,
        increasePercent: 15,
        weekday: null,
        startsAt: '18:00',
        endsAt: '21:00',
      },
    ] as never);

    await expect(service.quoteHourlyPrice('court-1', 6, '19:00')).resolves.toEqual({
      weekday: 6,
      time: '19:00',
      basePricePerHour: 100000,
      increasePercent: 25,
      pricePerHour: 125000,
    });
  });

  it('does not apply weekend surcharges on weekdays', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.findMany.mockResolvedValue([
      {
        type: PricingType.STANDARD,
        pricePerHour: { toString: () => '100000' },
        increasePercent: null,
        weekday: null,
        startsAt: '06:00',
        endsAt: '23:00',
      },
      {
        type: PricingType.WEEKEND,
        pricePerHour: null,
        increasePercent: 10,
        weekday: null,
        startsAt: '06:00',
        endsAt: '23:00',
      },
    ] as never);

    await expect(service.quoteHourlyPrice('court-1', 2, '19:00')).resolves.toEqual({
      weekday: 2,
      time: '19:00',
      basePricePerHour: 100000,
      increasePercent: 0,
      pricePerHour: 100000,
    });
  });

  it('accepts a zero standard hourly price', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.findMany.mockResolvedValue([
      {
        type: PricingType.STANDARD,
        pricePerHour: { toString: () => '0' },
        increasePercent: null,
        weekday: null,
        startsAt: '06:00',
        endsAt: '23:00',
      },
    ] as never);

    await expect(service.quoteHourlyPrice('court-1', 2, '10:00')).resolves.toEqual({
      weekday: 2,
      time: '10:00',
      basePricePerHour: 0,
      increasePercent: 0,
      pricePerHour: 0,
    });
  });

  it('returns not found when deleting a pricing rule on another court', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.pricingRule.findFirst.mockResolvedValue(null);
    await expect(service.deletePricingRule('owner-1', 'court-1', 'rule-2'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects maintenance periods with an invalid time range', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    await expect(service.createMaintenanceBlock('owner-1', 'court-1', {
      startAt: '2026-11-24T10:00:00.000Z',
      endAt: '2026-11-24T10:00:00.000Z',
      reason: 'Repair',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects maintenance that overlaps an existing maintenance block', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.maintenanceBlock.findFirst.mockResolvedValue({ id: 'existing' });
    prismaMock.booking.findFirst.mockResolvedValue(null);
    await expect(service.createMaintenanceBlock('owner-1', 'court-1', {
      startAt: '2026-11-24T10:00:00.000Z',
      endAt: '2026-11-24T12:00:00.000Z',
      reason: 'Repair',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects maintenance that overlaps a pending or confirmed booking', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue({ status: BookingStatus.CONFIRMED });
    await expect(service.createMaintenanceBlock('owner-1', 'court-1', {
      startAt: '2026-11-24T10:00:00.000Z',
      endAt: '2026-11-24T12:00:00.000Z',
      reason: 'Repair',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a maintenance block when there are no booking conflicts', async () => {
    const { service, prismaMock } = createHarness();
    prismaMock.court.findFirst.mockResolvedValue({ id: 'court-1' });
    prismaMock.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);
    prismaMock.maintenanceBlock.create.mockResolvedValue({ id: 'block-1' });
    await service.createMaintenanceBlock('owner-1', 'court-1', {
      startAt: '2026-11-24T10:00:00.000Z',
      endAt: '2026-11-24T12:00:00.000Z',
      reason: 'Repair',
    });
    expect(prismaMock.maintenanceBlock.create).toHaveBeenCalled();
  });
});
