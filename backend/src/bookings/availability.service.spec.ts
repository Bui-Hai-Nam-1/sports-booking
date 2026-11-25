import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingStatus, PricingType, VenueStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import {
  buildDateTimeFromLocal,
  extractLocalCalendarParts,
} from './booking-rules';

function createPrismaMock() {
  return {
    venue: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    court: {
      findFirst: jest.fn(),
    },
    maintenanceBlock: {
      findMany: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  };
}

describe('AvailabilityService', () => {
  const futureDate = '2099-06-15';
  const weekday = extractLocalCalendarParts(
    buildDateTimeFromLocal(futureDate, '00:00'),
  ).weekday;

  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: AvailabilityService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new AvailabilityService(prismaMock as unknown as PrismaService);
  });

  it('searches approved venues and filters courts matching requested time window', async () => {
    prismaMock.venue.findMany.mockResolvedValue([
      {
        id: 'venue-1',
        name: 'San Cau Giay',
        address: 'Cau Giay, Ha Noi',
        description: 'San co nhan tao',
        imageUrls: [],
        sportTypes: ['Bong da'],
        status: VenueStatus.APPROVED,
        isActive: true,
        openingHours: [
          { weekday, opensAt: '08:00', closesAt: '12:00', isClosed: false },
        ],
        courts: [
          {
            id: 'court-free',
            name: 'San 5A',
            sportType: 'Bong da',
            isActive: true,
            pricingRules: [
              {
                type: PricingType.STANDARD,
                pricePerHour: '150000',
                weekday: null,
                startsAt: '08:00',
                endsAt: '12:00',
              },
            ],
            maintenanceBlocks: [],
            bookings: [],
          },
          {
            id: 'court-busy',
            name: 'San 5B',
            sportType: 'Bong da',
            isActive: true,
            pricingRules: [
              {
                type: PricingType.STANDARD,
                pricePerHour: '150000',
                weekday: null,
                startsAt: '08:00',
                endsAt: '12:00',
              },
            ],
            maintenanceBlocks: [],
            bookings: [
              {
                id: 'bk-1',
                startAt: buildDateTimeFromLocal(futureDate, '09:00'),
                endAt: buildDateTimeFromLocal(futureDate, '11:00'),
                status: BookingStatus.CONFIRMED,
              },
            ],
          },
        ],
      },
    ]);

    const result = await service.searchAvailableVenues({
      sportType: 'Bong da',
      area: 'Cau Giay',
      date: futureDate,
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(result.meta.total).toBe(1);
    expect(result.items[0].courts).toHaveLength(1);
    expect(result.items[0].courts[0].id).toBe('court-free');
    expect(result.items[0].courts[0].requestedWindowPrice).toBe(300000);
  });

  it('rejects partial time filter when only startTime is provided', async () => {
    await expect(
      service.searchAvailableVenues({
        date: futureDate,
        startTime: '09:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('builds multi-day Date x TimeSlot grid for a court', async () => {
    const nextDay = '2099-06-16';
    const nextWeekday = extractLocalCalendarParts(
      buildDateTimeFromLocal(nextDay, '00:00'),
    ).weekday;

    prismaMock.court.findFirst.mockResolvedValue({
      id: 'court-1',
      name: 'San A1',
      sportType: 'Cau long',
      isActive: true,
      venue: {
        id: 'venue-1',
        name: 'CLB Thang Long',
        address: 'Thanh Xuan, Ha Noi',
        status: VenueStatus.APPROVED,
        openingHours: [
          { weekday, opensAt: '08:00', closesAt: '10:00', isClosed: false },
          { weekday: nextWeekday, opensAt: '08:00', closesAt: '10:00', isClosed: true },
        ],
      },
      pricingRules: [
        {
          type: PricingType.STANDARD,
          pricePerHour: '90000',
          weekday: null,
          startsAt: '08:00',
          endsAt: '10:00',
        },
      ],
    });
    prismaMock.maintenanceBlock.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'bk-1',
        startAt: buildDateTimeFromLocal(futureDate, '08:00'),
        endAt: buildDateTimeFromLocal(futureDate, '09:00'),
        status: BookingStatus.PENDING,
      },
    ]);

    const grid = await service.getCourtAvailabilityGrid('court-1', {
      date: futureDate,
      days: 2,
    });

    expect(grid.matrix.columns).toEqual(['08:00-09:00', '09:00-10:00']);
    expect(grid.matrix.rows).toHaveLength(2);
    expect(grid.matrix.rows[0].cells.map((c) => c.status)).toEqual([
      'BOOKED',
      'AVAILABLE',
    ]);
    expect(grid.matrix.rows[1].cells.map((c) => c.status)).toEqual([
      'CLOSED',
      'CLOSED',
    ]);
  });

  it('throws NotFoundException when requested court does not exist', async () => {
    prismaMock.court.findFirst.mockResolvedValue(null);

    await expect(
      service.getCourtAvailabilityGrid('missing-court', { date: futureDate }),
    ).rejects.toThrow(NotFoundException);
  });

  it('builds Court x TimeSlot matrix for an approved venue on a single day', async () => {
    prismaMock.venue.findFirst.mockResolvedValue({
      id: 'venue-1',
      name: 'CLB Thanh Cong',
      address: 'Ba Dinh, Ha Noi',
      openingHours: [
        { weekday, opensAt: '17:00', closesAt: '19:00', isClosed: false },
      ],
      courts: [
        {
          id: 'c-1',
          name: 'San 1',
          sportType: 'Tennis',
          pricingRules: [],
          maintenanceBlocks: [],
          bookings: [],
        },
        {
          id: 'c-2',
          name: 'San 2',
          sportType: 'Tennis',
          pricingRules: [],
          maintenanceBlocks: [
            {
              id: 'm-1',
              startAt: buildDateTimeFromLocal(futureDate, '18:00'),
              endAt: buildDateTimeFromLocal(futureDate, '19:00'),
              reason: 'Sua den',
            },
          ],
          bookings: [],
        },
      ],
    });

    const venueGrid = await service.getVenueAvailabilityGrid('venue-1', {
      date: futureDate,
    });

    expect(venueGrid.matrix.columns).toEqual(['17:00-18:00', '18:00-19:00']);
    expect(venueGrid.matrix.rows[0].cells.map((c) => c.status)).toEqual([
      'AVAILABLE',
      'AVAILABLE',
    ]);
    expect(venueGrid.matrix.rows[1].cells.map((c) => c.status)).toEqual([
      'AVAILABLE',
      'MAINTENANCE',
    ]);
  });
});
