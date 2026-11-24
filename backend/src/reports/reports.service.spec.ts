import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      venue: { findMany: jest.fn() },
      booking: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // Scenario 15: Date boundaries [from, to) and timezone
  it('Scenario 15: should filter strictly within [from, to) and group by day correctly', async () => {
    prisma.venue.findMany.mockResolvedValue([
      { id: 'v-1', courts: [{ id: 'c-1' }] },
    ]);

    // Bookings at specific UTC timestamps
    // 2026-05-10T17:30:00Z in UTC+7 is 2026-05-11 00:30:00
    prisma.booking.findMany.mockResolvedValue([
      {
        startAt: new Date('2026-05-10T17:30:00Z'),
        totalPrice: '300000',
      },
    ]);

    const res = await service.getOwnerRevenueReport('owner-1', {
      from: '2026-05-10T00:00:00Z',
      to: '2026-05-12T00:00:00Z',
      groupBy: 'day',
    });

    expect(res.totalRevenue).toBe(300000);
    expect(res.totalCompletedBookings).toBe(1);
    expect(res.currency).toBe('VND');

    // The bucket corresponding to 2026-05-11 in Asia/Ho_Chi_Minh has 300,000
    const b2 = res.buckets.find((b) => b.period === '2026-05-11');
    expect(b2?.revenue).toBe(300000);
  });

  // Scenario 16: Zero booking period returns 0 buckets and no NaN
  it('Scenario 16: should fill empty date buckets with 0 revenue and no NaN', async () => {
    prisma.venue.findMany.mockResolvedValue([
      { id: 'v-1', courts: [{ id: 'c-1' }] },
    ]);
    prisma.booking.findMany.mockResolvedValue([]); // empty bookings

    const res = await service.getOwnerRevenueReport('owner-1', {
      from: '2026-06-01T00:00:00Z',
      to: '2026-06-04T00:00:00Z',
      groupBy: 'day',
    });

    expect(res.totalRevenue).toBe(0);
    expect(res.totalCompletedBookings).toBe(0);
    expect(res.buckets.length).toBeGreaterThan(0);
    for (const bucket of res.buckets) {
      expect(bucket.revenue).toBe(0);
      expect(bucket.bookingsCount).toBe(0);
      expect(isNaN(bucket.revenue)).toBe(false);
    }
  });

  it('should validate invalid date ranges', async () => {
    await expect(
      service.getOwnerRevenueReport('owner-1', {
        from: '2026-06-10T00:00:00Z',
        to: '2026-06-05T00:00:00Z', // from > to
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
