import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      venue: { findMany: jest.fn(), count: jest.fn() },
      court: { count: jest.fn() },
      user: { count: jest.fn() },
      complaint: { count: jest.fn(), findMany: jest.fn() },
      booking: { count: jest.fn(), findMany: jest.fn() },
      review: { aggregate: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  // Scenario 13 & 14: Only COMPLETED bookings contribute to revenue, strict owner isolation
  it('Scenario 13 & 14: should only compute revenue on COMPLETED bookings for owner courts', async () => {
    prisma.venue.findMany.mockResolvedValue([
      {
        id: 'v-1',
        name: 'Sân bóng Thăng Long',
        courts: [{ id: 'c-1', name: 'Sân 1', sportType: 'FOOTBALL' }],
      },
    ]);

    prisma.booking.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(3)  // pending
      .mockResolvedValueOnce(5)  // completed
      .mockResolvedValueOnce(1)  // cancelled
      .mockResolvedValueOnce(1); // rejected

    // allCompletedBookings
    prisma.booking.findMany
      .mockResolvedValueOnce([
        { courtId: 'c-1', totalPrice: '250000' },
        { courtId: 'c-1', totalPrice: '300000' },
      ])
      .mockResolvedValueOnce([]); // recentBookings

    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.8 },
      _count: { id: 12 },
    });

    const res = await service.getOwnerDashboard('owner-1', {});

    expect(res.totalBookings).toBe(10);
    expect(res.pendingBookings).toBe(3);
    expect(res.completedBookings).toBe(5);
    expect(res.totalRevenue).toBe(550000);
    expect(res.averageRating).toBe(4.8);
    expect(res.courtStats[0].revenue).toBe(550000);
  });

  it('should return admin dashboard metrics correctly', async () => {
    prisma.user.count.mockResolvedValue(50);
    prisma.venue.count.mockResolvedValue(10);
    prisma.court.count.mockResolvedValue(20);
    prisma.booking.count.mockResolvedValueOnce(100).mockResolvedValueOnce(60);
    prisma.complaint.count.mockResolvedValue(4);
    prisma.booking.findMany
      .mockResolvedValueOnce([{ totalPrice: '1000000' }])
      .mockResolvedValueOnce([]);
    prisma.complaint.findMany.mockResolvedValue([]);

    const res = await service.getAdminDashboard();

    expect(res.totalUsers).toBe(50);
    expect(res.totalVenues).toBe(10);
    expect(res.totalCourts).toBe(20);
    expect(res.totalRevenue).toBe(1000000);
    expect(res.openComplaints).toBe(4);
  });
});
