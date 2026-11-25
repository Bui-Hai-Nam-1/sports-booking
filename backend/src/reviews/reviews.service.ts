import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        review: true,
        court: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đặt sân tương ứng');
    }

    // 1. Must be the customer who booked
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể đánh giá lượt đặt sân của chính mình');
    }

    // 2. Booking must be COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá lượt đặt sân đã hoàn thành (COMPLETED)');
    }

    // 3. endAt cannot be in future
    if (new Date(booking.endAt) > new Date()) {
      throw new BadRequestException('Không thể đánh giá khi thời gian sử dụng sân chưa kết thúc');
    }

    // 4. One review per booking
    if (booking.review) {
      throw new ConflictException('Lượt đặt sân này đã được đánh giá trước đó');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          userId,
          courtId: booking.courtId,
          bookingId: booking.id,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
          court: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return review;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Đã tồn tại đánh giá cho lượt đặt sân này');
      }
      throw error;
    }
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const existing = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa đánh giá của chính mình');
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment.trim() } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async getCourtReviews(courtId: string, query: ReviewQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [items, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { courtId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.review.count({
        where: { courtId },
      }),
      this.prisma.review.aggregate({
        where: { courtId },
        _avg: {
          rating: true,
        },
      }),
    ]);

    const averageRating = aggregate._avg.rating !== null ? Number(aggregate._avg.rating.toFixed(1)) : 0;

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      averageRating,
      totalReviews: total,
    };
  }

  async getReviewByBooking(bookingId: string) {
    return this.prisma.review.findUnique({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }
}
