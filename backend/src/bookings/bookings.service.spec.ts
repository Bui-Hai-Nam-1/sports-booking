import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PricingType, Prisma, VenueStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import {
  buildDateTimeFromLocal,
  extractLocalCalendarParts,
} from './booking-rules';
import { BookingsService } from './bookings.service';

interface TxMock {
  $executeRaw: jest.Mock;
  court: { findFirst: jest.Mock };
  maintenanceBlock: { findFirst: jest.Mock };
  booking: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
}

function createPrismaBookingMock() {
  const tx: TxMock = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    court: { findFirst: jest.fn() },
    maintenanceBlock: { findFirst: jest.fn() },
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: TxMock) => Promise<unknown>) =>
      callback(tx),
    ),
    court: { findFirst: jest.fn() },
    maintenanceBlock: { findFirst: jest.fn() },
    booking: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    __tx: tx,
  };

  return prisma;
}

describe('BookingsService', () => {
  const futureDate = '2099-06-15';
  const weekday = extractLocalCalendarParts(
    buildDateTimeFromLocal(futureDate, '00:00'),
  ).weekday;

  const customer: AuthenticatedUser = {
    id: 'user-cust-1',
    userId: 'user-cust-1',
    role: 'CUSTOMER',
    email: 'cust@example.com',
  };
  const owner: AuthenticatedUser = {
    id: 'user-owner-1',
    userId: 'user-owner-1',
    role: 'OWNER',
    email: 'owner@example.com',
  };
  const otherOwner: AuthenticatedUser = {
    id: 'user-owner-2',
    userId: 'user-owner-2',
    role: 'OWNER',
  };
  const admin: AuthenticatedUser = {
    id: 'user-admin-1',
    userId: 'user-admin-1',
    role: 'ADMIN',
  };

  const sampleCourt = {
    id: 'court-1',
    name: 'San 7A',
    sportType: 'Bong da',
    isActive: true,
    venue: {
      id: 'venue-1',
      name: 'San My Dinh',
      address: 'Nam Tu Liem, Ha Noi',
      ownerId: owner.id,
      status: VenueStatus.APPROVED,
      isActive: true,
      openingHours: [
        { weekday, opensAt: '06:00', closesAt: '22:00', isClosed: false },
      ],
    },
    pricingRules: [
      {
        type: PricingType.STANDARD,
        pricePerHour: '200000',
        weekday: null,
        startsAt: '06:00',
        endsAt: '17:00',
      },
      {
        type: PricingType.PEAK,
        pricePerHour: '350000',
        weekday: null,
        startsAt: '17:00',
        endsAt: '22:00',
      },
    ],
  };

  let prismaMock: ReturnType<typeof createPrismaBookingMock>;
  let service: BookingsService;

  beforeEach(() => {
    prismaMock = createPrismaBookingMock();
    service = new BookingsService(prismaMock as unknown as PrismaService);
  });

  it('checkSlotAvailability returns true and server pricing when slot is open', async () => {
    prismaMock.court.findFirst.mockResolvedValue(sampleCourt);
    prismaMock.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue(null);

    const check = await service.checkSlotAvailability({
      courtId: 'court-1',
      slots: [
        {
          startAt: buildDateTimeFromLocal(futureDate, '16:00').toISOString(),
          endAt: buildDateTimeFromLocal(futureDate, '17:00').toISOString(),
        },
        {
          startAt: buildDateTimeFromLocal(futureDate, '17:00').toISOString(),
          endAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        },
      ],
    });

    expect(check.available).toBe(true);
    expect(check.totalPrice).toBe(550000);
    expect(check.breakdown).toHaveLength(2);
  });

  it('checkSlotAvailability reports unavailable when slot overlaps existing booking', async () => {
    prismaMock.court.findFirst.mockResolvedValue(sampleCourt);
    prismaMock.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.booking.findFirst.mockResolvedValue({
      id: 'existing-1',
      status: BookingStatus.CONFIRMED,
    });

    const check = await service.checkSlotAvailability({
      courtId: 'court-1',
      startAt: buildDateTimeFromLocal(futureDate, '17:00').toISOString(),
      endAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
    });

    expect(check.available).toBe(false);
    expect(check.reason).toContain('already booked');
  });

  it('creates multi-slot booking inside Serializable transaction with advisory lock', async () => {
    prismaMock.__tx.court.findFirst.mockResolvedValue(sampleCourt);
    prismaMock.__tx.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.__tx.booking.findFirst.mockResolvedValue(null);
    prismaMock.__tx.booking.create.mockResolvedValue({
      id: 'bk-new',
      courtId: 'court-1',
      userId: customer.id,
      status: BookingStatus.PENDING,
      totalPrice: new Prisma.Decimal(550000),
    });

    const created = await service.createBooking(customer, {
      courtId: 'court-1',
      slots: [
        {
          startAt: buildDateTimeFromLocal(futureDate, '16:00').toISOString(),
          endAt: buildDateTimeFromLocal(futureDate, '17:00').toISOString(),
        },
        {
          startAt: buildDateTimeFromLocal(futureDate, '17:00').toISOString(),
          endAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        },
      ],
      notes: 'Dat san da giao huu',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
    expect(prismaMock.__tx.$executeRaw).toHaveBeenCalled();
    expect(prismaMock.__tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: customer.id,
          courtId: 'court-1',
          totalPrice: new Prisma.Decimal(550000),
          status: BookingStatus.PENDING,
        }),
      }),
    );
    expect(created.id).toBe('bk-new');
  });

  it('prevents double-booking when an active overlapping booking already exists', async () => {
    prismaMock.__tx.court.findFirst.mockResolvedValue(sampleCourt);
    prismaMock.__tx.maintenanceBlock.findFirst.mockResolvedValue(null);
    prismaMock.__tx.booking.findFirst.mockResolvedValue({ id: 'bk-race-winner' });

    await expect(
      service.createBooking(customer, {
        courtId: 'court-1',
        startAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        endAt: buildDateTimeFromLocal(futureDate, '19:00').toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('prevents booking when court is under maintenance', async () => {
    prismaMock.__tx.court.findFirst.mockResolvedValue(sampleCourt);
    prismaMock.__tx.maintenanceBlock.findFirst.mockResolvedValue({
      id: 'm-1',
      reason: 'Bao tri mat co',
    });
    prismaMock.__tx.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.createBooking(customer, {
        courtId: 'court-1',
        startAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        endAt: buildDateTimeFromLocal(futureDate, '19:00').toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps Prisma P2034 serialization conflict to ConflictException', async () => {
    const p2034 = new Prisma.PrismaClientKnownRequestError(
      'Serialization failure',
      { code: 'P2034', clientVersion: '6.19.3' },
    );
    prismaMock.$transaction.mockRejectedValue(p2034);

    await expect(
      service.createBooking(customer, {
        courtId: 'court-1',
        startAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        endAt: buildDateTimeFromLocal(futureDate, '19:00').toISOString(),
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects booking in the past or for unapproved/missing courts', async () => {
    await expect(
      service.createBooking(customer, {
        courtId: 'court-1',
        startAt: '2020-01-01T08:00:00.000Z',
        endAt: '2020-01-01T09:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);

    prismaMock.__tx.court.findFirst.mockResolvedValue(null);
    await expect(
      service.createBooking(customer, {
        courtId: 'court-missing',
        startAt: buildDateTimeFromLocal(futureDate, '18:00').toISOString(),
        endAt: buildDateTimeFromLocal(futureDate, '19:00').toISOString(),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows customer cancellation before policy deadline and rejects unauthorized users', async () => {
    const bookingRecord = {
      id: 'bk-1',
      userId: customer.id,
      courtId: 'court-1',
      startAt: buildDateTimeFromLocal(futureDate, '18:00'),
      endAt: buildDateTimeFromLocal(futureDate, '19:00'),
      status: BookingStatus.PENDING,
      court: { venue: { ownerId: owner.id } },
    };

    prismaMock.__tx.booking.findUnique.mockResolvedValue(bookingRecord);
    prismaMock.__tx.booking.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.__tx.booking.findUniqueOrThrow.mockResolvedValue({
      ...bookingRecord,
      status: BookingStatus.CANCELLED,
      cancelReason: 'Doi lich nhom',
    });

    const cancelled = await service.cancelBooking(customer, 'bk-1', {
      reason: 'Doi lich nhom',
    });
    expect(cancelled.status).toBe(BookingStatus.CANCELLED);

    await expect(
      service.cancelBooking(otherOwner, 'bk-1', { reason: 'Khong hop le' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ConflictException if booking status changes concurrently during cancel', async () => {
    prismaMock.__tx.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      userId: customer.id,
      startAt: buildDateTimeFromLocal(futureDate, '18:00'),
      endAt: buildDateTimeFromLocal(futureDate, '19:00'),
      status: BookingStatus.PENDING,
      court: { venue: { ownerId: owner.id } },
    });
    prismaMock.__tx.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.cancelBooking(customer, 'bk-1', { reason: 'Huy don' }),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces RBAC and state machine when updating booking status', async () => {
    const bookingRecord = {
      id: 'bk-1',
      userId: customer.id,
      startAt: buildDateTimeFromLocal(futureDate, '18:00'),
      status: BookingStatus.PENDING,
      court: { venue: { ownerId: owner.id } },
    };

    prismaMock.__tx.booking.findUnique.mockResolvedValue(bookingRecord);
    prismaMock.__tx.booking.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.__tx.booking.findUniqueOrThrow.mockResolvedValue({
      ...bookingRecord,
      status: BookingStatus.CONFIRMED,
    });

    const updated = await service.updateBookingStatus(owner, 'bk-1', {
      status: BookingStatus.CONFIRMED,
    });
    expect(updated.status).toBe(BookingStatus.CONFIRMED);

    await expect(
      service.updateBookingStatus(customer, 'bk-1', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.updateBookingStatus(otherOwner, 'bk-1', {
        status: BookingStatus.CONFIRMED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lists customer and managed bookings with pagination and checks detail RBAC', async () => {
    prismaMock.booking.findMany.mockResolvedValue([{ id: 'bk-1' }]);
    prismaMock.booking.count.mockResolvedValue(1);

    const mine = await service.listMyBookings(customer, { page: 1, limit: 10 });
    expect(mine.items).toHaveLength(1);
    expect(mine.meta.totalPages).toBe(1);

    await service.listMyBookings(customer, {
      dateFrom: futureDate,
      dateTo: '2099-06-16',
    });
    expect(prismaMock.booking.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: customer.id,
          startAt: { lt: buildDateTimeFromLocal('2099-06-17', '00:00') },
          endAt: { gt: buildDateTimeFromLocal(futureDate, '00:00') },
        }),
      }),
    );

    await expect(
      service.listMyBookings(customer, {
        dateFrom: '2099-06-16',
        dateTo: futureDate,
      }),
    ).rejects.toThrow(BadRequestException);

    const managed = await service.listManagedBookings(admin, {
      date: futureDate,
    });
    expect(managed.items).toHaveLength(1);

    await expect(service.listManagedBookings(customer, {})).rejects.toThrow(
      ForbiddenException,
    );

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'bk-1',
      userId: customer.id,
      court: { venue: { ownerId: owner.id } },
    });
    await expect(service.getBookingById(otherOwner, 'bk-1')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.getBookingById(admin, 'bk-1')).resolves.toMatchObject({
      id: 'bk-1',
    });
  });
});
