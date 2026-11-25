import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingStatus, UserRole } from '@prisma/client';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  // Scenario 7: Customer only receives their own bookings
  it('Scenario 7: should only fetch bookings for the authenticated customer', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 'b-1', userId: 'cust-1' }]);
    prisma.booking.count.mockResolvedValue(1);

    const result = await service.getMyBookings('cust-1', { page: 1, pageSize: 10 });

    expect(result.items.length).toBe(1);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'cust-1' }),
      }),
    );
  });

  // Scenario 8: Filtering and pagination
  it('Scenario 8: should filter by status and date range with correct pagination', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.count.mockResolvedValue(25);

    const result = await service.getMyBookings('cust-1', {
      page: 2,
      pageSize: 10,
      status: BookingStatus.CONFIRMED,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          userId: 'cust-1',
          status: BookingStatus.CONFIRMED,
        }),
      }),
    );
  });

  // Scenario 9: Owner confirms PENDING booking of their court
  it('Scenario 9: owner can confirm PENDING booking on their own court', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-owner-1',
      status: BookingStatus.PENDING,
      court: { venue: { ownerId: 'owner-1' } },
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b-owner-1',
      status: BookingStatus.CONFIRMED,
    });

    const res = await service.confirmBooking('b-owner-1', 'owner-1');
    expect(res.status).toBe(BookingStatus.CONFIRMED);
  });

  // Scenario 10: Owner cannot operate on bookings from other owner's courts
  it('Scenario 10: owner cannot confirm or reject bookings from other owner courts', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-foreign',
      status: BookingStatus.PENDING,
      court: { venue: { ownerId: 'other-owner' } },
    });

    await expect(
      service.confirmBooking('b-foreign', 'owner-1'),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.rejectBooking('b-foreign', 'owner-1', { reason: 'No' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // Scenario 11: Confirm and reject conflict handling
  it('Scenario 11: should throw ConflictException if booking is already processed', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-done',
      status: BookingStatus.CONFIRMED, // already confirmed by another tab
      court: { venue: { ownerId: 'owner-1' } },
    });

    await expect(
      service.rejectBooking('b-done', 'owner-1', { reason: 'Reject' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should enforce access control on booking detail for customer and owner', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-detail',
      userId: 'cust-1',
      court: { venue: { ownerId: 'owner-1' } },
    });

    // Customer from another account
    await expect(
      service.getBookingDetail('b-detail', { id: 'cust-2', email: 'c2@test.com', role: UserRole.CUSTOMER }),
    ).rejects.toThrow(ForbiddenException);

    // Unrelated owner
    await expect(
      service.getBookingDetail('b-detail', { id: 'owner-2', email: 'o2@test.com', role: UserRole.OWNER }),
    ).rejects.toThrow(ForbiddenException);

    // Permitted customer
    const allowed = await service.getBookingDetail('b-detail', { id: 'cust-1', email: 'c1@test.com', role: UserRole.CUSTOMER });
    expect(allowed.id).toBe('b-detail');
  });
});
