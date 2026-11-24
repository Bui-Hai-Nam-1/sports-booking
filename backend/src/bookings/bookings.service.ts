import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BookingQueryDto } from './dto/booking-query.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { BookingStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyBookings(userId: string, query: BookingQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.dateFrom || query.dateTo) {
      where.startAt = {};
      if (query.dateFrom) where.startAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.startAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          court: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getBookingDetail(id: string, user: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            venue: true,
          },
        },
        review: true,
        complaints: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // Access control:
    // Customer can only view their own
    // Owner can only view bookings for their courts
    // Admin can view any
    if (user.role === UserRole.CUSTOMER && booking.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn đặt sân này');
    }
    if (user.role === UserRole.OWNER && booking.court.venue.ownerId !== user.id) {
      throw new ForbiddenException('Đơn đặt sân này không thuộc cụm sân bạn quản lý');
    }

    return booking;
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể hủy đơn đặt sân của chính mình');
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Chỉ có thể hủy đơn đang ở trạng thái chờ duyệt hoặc đã xác nhận');
    }

    if (new Date(booking.startAt) <= new Date()) {
      throw new BadRequestException('Không thể hủy đơn đặt sân sau khi thời gian bắt đầu đã đến');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async getOwnerBookings(ownerId: string, query: BookingQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
      court: {
        venue: {
          ownerId,
        },
      },
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.courtId) {
      where.courtId = query.courtId;
    }
    if (query.dateFrom || query.dateTo) {
      where.startAt = {};
      if (query.dateFrom) where.startAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.startAt.lte = new Date(query.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          court: {
            include: {
              venue: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async confirmBooking(id: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    if (booking.court.venue.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không sở hữu sân của đơn đặt này');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException(
        `Không thể xác nhận đơn ở trạng thái ${booking.status}. Đơn có thể đã được xử lý từ trước.`,
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  async rejectBooking(id: string, ownerId: string, _dto: RejectBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    if (booking.court.venue.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không sở hữu sân của đơn đặt này');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException(
        `Không thể từ chối đơn ở trạng thái ${booking.status}. Đơn có thể đã được xử lý từ trước.`,
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.REJECTED },
    });
  }

  async completeBooking(id: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    if (booking.court.venue.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không sở hữu sân của đơn đặt này');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Chỉ có thể hoàn thành đơn đã được xác nhận (CONFIRMED)');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED },
    });
  }
}
