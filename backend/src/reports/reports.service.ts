import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { BookingStatus } from '@prisma/client';

export interface RevenueBucket {
  period: string; // 'YYYY-MM-DD' or 'YYYY-MM'
  revenue: number;
  bookingsCount: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to format date in Asia/Ho_Chi_Minh (UTC+7)
  private formatVNDate(date: Date, groupBy: 'day' | 'month'): string {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const y = vnDate.getUTCFullYear();
    const m = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
    if (groupBy === 'month') {
      return `${y}-${m}`;
    }
    const d = String(vnDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Generate continuous buckets in [from, to)
  private generateBuckets(startDate: Date, endDate: Date, groupBy: 'day' | 'month'): string[] {
    const periods: string[] = [];
    const current = new Date(startDate.getTime());

    while (current < endDate) {
      const p = this.formatVNDate(current, groupBy);
      if (!periods.includes(p)) {
        periods.push(p);
      }
      if (groupBy === 'month') {
        current.setUTCMonth(current.getUTCMonth() + 1);
      } else {
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }
    return periods;
  }

  async getOwnerRevenueReport(ownerId: string, query: RevenueQueryDto) {
    const groupBy = query.groupBy || 'day';

    // Default: past 30 days
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    defaultFrom.setUTCHours(0, 0, 0, 0);

    const from = query.from ? new Date(query.from) : defaultFrom;
    const to = query.to ? new Date(query.to) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Khoảng thời gian from/to không đúng định dạng');
    }
    if (from >= to) {
      throw new BadRequestException('Thời điểm bắt đầu (from) phải trước thời điểm kết thúc (to)');
    }

    const venues = await this.prisma.venue.findMany({
      where: {
        ownerId,
        ...(query.venueId ? { id: query.venueId } : {}),
      },
      include: {
        courts: { select: { id: true } },
      },
    });

    let courtIds = venues.flatMap((v) => v.courts.map((c) => c.id));
    if (query.courtId) {
      courtIds = courtIds.filter((id) => id === query.courtId);
    }

    const completedBookings = await this.prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        status: BookingStatus.COMPLETED,
        startAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        startAt: true,
        totalPrice: true,
      },
      orderBy: { startAt: 'asc' },
    });

    const bucketKeys = this.generateBuckets(from, to, groupBy);
    const bucketMap = new Map<string, { revenue: number; bookingsCount: number }>();

    for (const key of bucketKeys) {
      bucketMap.set(key, { revenue: 0, bookingsCount: 0 });
    }

    let totalRevenue = 0;
    for (const b of completedBookings) {
      const p = this.formatVNDate(b.startAt, groupBy);
      const val = Number(b.totalPrice);
      totalRevenue += val;

      const existing = bucketMap.get(p);
      if (existing) {
        existing.revenue += val;
        existing.bookingsCount += 1;
      }
    }

    const buckets: RevenueBucket[] = bucketKeys.map((p) => {
      const item = bucketMap.get(p)!;
      return {
        period: p,
        revenue: item.revenue,
        bookingsCount: item.bookingsCount,
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      totalRevenue,
      totalCompletedBookings: completedBookings.length,
      currency: 'VND',
      buckets,
    };
  }

  async getAdminRevenueReport(query: RevenueQueryDto) {
    const groupBy = query.groupBy || 'day';

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    defaultFrom.setUTCHours(0, 0, 0, 0);

    const from = query.from ? new Date(query.from) : defaultFrom;
    const to = query.to ? new Date(query.to) : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Khoảng thời gian from/to không đúng định dạng');
    }
    if (from >= to) {
      throw new BadRequestException('Thời điểm bắt đầu (from) phải trước thời điểm kết thúc (to)');
    }

    const where: any = {
      status: BookingStatus.COMPLETED,
      startAt: {
        gte: from,
        lt: to,
      },
    };

    if (query.courtId) {
      where.courtId = query.courtId;
    } else if (query.venueId) {
      where.court = { venueId: query.venueId };
    }

    const completedBookings = await this.prisma.booking.findMany({
      where,
      select: {
        startAt: true,
        totalPrice: true,
      },
      orderBy: { startAt: 'asc' },
    });

    const bucketKeys = this.generateBuckets(from, to, groupBy);
    const bucketMap = new Map<string, { revenue: number; bookingsCount: number }>();

    for (const key of bucketKeys) {
      bucketMap.set(key, { revenue: 0, bookingsCount: 0 });
    }

    let totalRevenue = 0;
    for (const b of completedBookings) {
      const p = this.formatVNDate(b.startAt, groupBy);
      const val = Number(b.totalPrice);
      totalRevenue += val;

      const existing = bucketMap.get(p);
      if (existing) {
        existing.revenue += val;
        existing.bookingsCount += 1;
      }
    }

    const buckets: RevenueBucket[] = bucketKeys.map((p) => {
      const item = bucketMap.get(p)!;
      return {
        period: p,
        revenue: item.revenue,
        bookingsCount: item.bookingsCount,
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      totalRevenue,
      totalCompletedBookings: completedBookings.length,
      currency: 'VND',
      buckets,
    };
  }
}
