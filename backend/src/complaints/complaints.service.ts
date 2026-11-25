import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ComplaintQueryDto } from './dto/complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { ComplaintStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateComplaintDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin đơn đặt sân cần khiếu nại');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể khiếu nại đơn đặt sân của chính mình');
    }

    // Check if an open or in-progress complaint already exists for this booking
    const activeComplaint = await this.prisma.complaint.findFirst({
      where: {
        bookingId: dto.bookingId,
        status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] },
      },
    });

    if (activeComplaint) {
      throw new ConflictException(
        'Đang có một khiếu nại đang chờ xử lý cho đơn đặt sân này. Vui lòng chờ phản hồi trước khi gửi khiếu nại mới.',
      );
    }

    return this.prisma.complaint.create({
      data: {
        bookingId: dto.bookingId,
        complainantId: userId,
        subject: dto.subject.trim(),
        description: dto.description.trim(),
        status: ComplaintStatus.OPEN,
      },
      include: {
        booking: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            court: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getMyComplaints(userId: string, query: ComplaintQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { complainantId: userId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              startAt: true,
              endAt: true,
              court: {
                select: {
                  name: true,
                  venue: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getComplaintDetail(id: string, user: AuthenticatedUser) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            court: {
              include: {
                venue: true,
              },
            },
          },
        },
        complainant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    // Access control:
    // Complainant can view their own complaint
    // Admin can view any complaint
    // Other users are forbidden
    if (user.role !== UserRole.ADMIN && complaint.complainantId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập khiếu nại này');
    }

    return complaint;
  }

  async getAdminComplaints(query: ComplaintQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          complainant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          booking: {
            select: {
              id: true,
              court: {
                select: {
                  name: true,
                  venue: { select: { name: true } },
                },
              },
            },
          },
          assignedAdmin: {
            select: {
              fullName: true,
            },
          },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateStatus(id: string, adminId: string, dto: UpdateComplaintStatusDto) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    // Cannot change if already closed (RESOLVED or REJECTED)
    if (
      complaint.status === ComplaintStatus.RESOLVED ||
      complaint.status === ComplaintStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Khiếu nại đã được đóng ở trạng thái ${complaint.status}, không thể thay đổi thêm`,
      );
    }

    // Allowed transitions:
    // OPEN -> IN_PROGRESS, RESOLVED, REJECTED
    // IN_PROGRESS -> RESOLVED, REJECTED
    const validNextStatuses: Record<ComplaintStatus, ComplaintStatus[]> = {
      [ComplaintStatus.OPEN]: [
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
      ],
      [ComplaintStatus.IN_PROGRESS]: [
        ComplaintStatus.RESOLVED,
        ComplaintStatus.REJECTED,
      ],
      [ComplaintStatus.RESOLVED]: [],
      [ComplaintStatus.REJECTED]: [],
    };

    if (!validNextStatuses[complaint.status].includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái khiếu nại từ ${complaint.status} sang ${dto.status}`,
      );
    }

    const isClosing =
      dto.status === ComplaintStatus.RESOLVED || dto.status === ComplaintStatus.REJECTED;

    return this.prisma.complaint.update({
      where: { id },
      data: {
        status: dto.status,
        resolution: dto.resolution ? dto.resolution.trim() : complaint.resolution,
        assignedAdminId: adminId,
        resolvedAt: isClosing ? new Date() : null,
      },
      include: {
        assignedAdmin: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }
}
