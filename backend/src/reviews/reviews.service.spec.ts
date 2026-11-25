import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: {
        findUnique: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  // Scenario 1: Valid review creation
  it('Scenario 1: should create review successfully for completed booking owned by user', async () => {
    const pastEndAt = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-1',
      userId: 'user-1',
      courtId: 'court-1',
      status: BookingStatus.COMPLETED,
      endAt: pastEndAt,
      review: null,
    });

    prisma.review.create.mockResolvedValue({
      id: 'rev-1',
      rating: 5,
      comment: 'Sân rất đẹp, sạch sẽ!',
      userId: 'user-1',
      courtId: 'court-1',
      bookingId: 'b-1',
    });

    const result = await service.create('user-1', {
      bookingId: 'b-1',
      rating: 5,
      comment: 'Sân rất đẹp, sạch sẽ!',
    });

    expect(result.id).toBe('rev-1');
    expect(result.rating).toBe(5);
    expect(prisma.review.create).toHaveBeenCalled();
  });

  // Scenario 3: Review booking belonging to someone else
  it('Scenario 3: should throw ForbiddenException when reviewing someone else booking', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-2',
      userId: 'other-user',
      courtId: 'court-1',
      status: BookingStatus.COMPLETED,
      endAt: new Date(Date.now() - 10000),
      review: null,
    });

    await expect(
      service.create('user-1', { bookingId: 'b-2', rating: 4 }),
    ).rejects.toThrow(ForbiddenException);
  });

  // Scenario 4: Review booking not completed or endAt in future
  it('Scenario 4: should throw BadRequestException when booking is not completed', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-3',
      userId: 'user-1',
      courtId: 'court-1',
      status: BookingStatus.CONFIRMED, // not COMPLETED
      endAt: new Date(Date.now() - 10000),
      review: null,
    });

    await expect(
      service.create('user-1', { bookingId: 'b-3', rating: 4 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('Scenario 4b: should throw BadRequestException when booking endAt is in the future', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-4',
      userId: 'user-1',
      courtId: 'court-1',
      status: BookingStatus.COMPLETED,
      endAt: new Date(Date.now() + 3600 * 1000), // future
      review: null,
    });

    await expect(
      service.create('user-1', { bookingId: 'b-4', rating: 4 }),
    ).rejects.toThrow(BadRequestException);
  });

  // Scenario 5: Duplicate review on same booking
  it('Scenario 5: should throw ConflictException if booking already has a review', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-5',
      userId: 'user-1',
      courtId: 'court-1',
      status: BookingStatus.COMPLETED,
      endAt: new Date(Date.now() - 10000),
      review: { id: 'existing-rev' },
    });

    await expect(
      service.create('user-1', { bookingId: 'b-5', rating: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  it('Scenario 5b: should handle P2002 duplicate database constraint error', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b-6',
      userId: 'user-1',
      courtId: 'court-1',
      status: BookingStatus.COMPLETED,
      endAt: new Date(Date.now() - 10000),
      review: null,
    });
    prisma.review.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('user-1', { bookingId: 'b-6', rating: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  // Scenario 6: Unauthorized edit of review
  it('Scenario 6: should throw ForbiddenException when user tries to edit someone else review', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'rev-2',
      userId: 'author-user',
      rating: 4,
    });

    await expect(
      service.update('rev-2', 'hacker-user', { rating: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Scenario 6b: should allow author to edit their own review', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'rev-3',
      userId: 'author-user',
      rating: 4,
    });
    prisma.review.update.mockResolvedValue({
      id: 'rev-3',
      userId: 'author-user',
      rating: 5,
      comment: 'Cập nhật lại nhận xét',
    });

    const updated = await service.update('rev-3', 'author-user', {
      rating: 5,
      comment: 'Cập nhật lại nhận xét',
    });

    expect(updated.rating).toBe(5);
  });

  it('should return court reviews and calculate averageRating correctly', async () => {
    prisma.review.findMany.mockResolvedValue([
      { id: 'r1', rating: 5, comment: 'Tốt' },
      { id: 'r2', rating: 4, comment: 'Khá' },
    ]);
    prisma.review.count.mockResolvedValue(2);
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } });

    const result = await service.getCourtReviews('court-1', { page: 1, pageSize: 10 });
    expect(result.total).toBe(2);
    expect(result.averageRating).toBe(4.5);
    expect(result.items.length).toBe(2);
  });
});
