import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { BookingStatus, ComplaintStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerDashboard(ownerId: string, query: DashboardQueryDto) {
    const venues = await this.prisma.venue.findMany({
      where: {
        ownerId,
        ...(query.venueId ? { id: query.venueId } : {}),
      },
      include: {
        courts: {
          select: { id: true, name: true, sportType: true },
        },
      },
    });

    const courtIds = venues.flatMap((v) => v.courts.map((c) => c.id));

    const dateFilter: any = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lt = new Date(query.to);

    const bookingWhere: any = {
      courtId: { in: courtIds },
      ...(Object.keys(dateFilter).length > 0 ? { startAt: dateFilter } : {}),
    };

    const [
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      allCompletedBookings,
      reviewsAggregate,
      recentBookings,
    ] = await Promise.all([
      this.prisma.booking.count({ where: bookingWhere }),
      this.prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.CANCELLED } }),
      this.prisma.booking.count({ where: { ...bookingWhere, status: BookingStatus.REJECTED } }),
      this.prisma.booking.findMany({
        where: { ...bookingWhere, status: BookingStatus.COMPLETED },
        select: { courtId: true, totalPrice: true },
      }),
      this.prisma.review.aggregate({
        where: { courtId: { in: courtIds } },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.booking.findMany({
        where: { courtId: { in: courtIds } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          court: { select: { name: true } },
        },
      }),
    ]);

    // Calculate revenue using accurate decimal accumulation
    const totalRevenue = allCompletedBookings.reduce(
      (sum, b) => sum + Number(b.totalPrice),
      0,
    );

    // Court-level stats
    const courtStats = venues.flatMap((v) =>
      v.courts.map((c) => {
        const courtCompleted = allCompletedBookings.filter((b) => b.courtId === c.id);
        const revenue = courtCompleted.reduce((s, b) => s + Number(b.totalPrice), 0);
        return {
          courtId: c.id,
          courtName: c.name,
          venueName: v.name,
          sportType: c.sportType,
          completedBookingsCount: courtCompleted.length,
          revenue,
        };
      }),
    );

    return {
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      totalRevenue,
      averageRating: reviewsAggregate._avg.rating !== null ? Number(reviewsAggregate._avg.rating.toFixed(1)) : 0,
      totalReviews: reviewsAggregate._count.id,
      courtStats,
      recentBookings,
    };
  }

  async getAdminDashboard() {
    const [
      totalUsers,
      totalVenues,
      totalCourts,
      totalBookings,
      completedBookings,
      openComplaints,
      allCompletedBookings,
      recentBookings,
      recentComplaints,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.venue.count(),
      this.prisma.court.count(),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.complaint.count({
        where: {
          status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.booking.findMany({
        where: { status: BookingStatus.COMPLETED },
        select: { totalPrice: true },
      }),
      this.prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
          court: { select: { name: true } },
        },
      }),
      this.prisma.complaint.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          complainant: { select: { fullName: true } },
        },
      }),
    ]);

    const totalRevenue = allCompletedBookings.reduce(
      (sum, b) => sum + Number(b.totalPrice),
      0,
    );

    return {
      totalUsers,
      totalVenues,
      totalCourts,
      totalBookings,
      completedBookings,
      openComplaints,
      totalRevenue,
      recentBookings,
      recentComplaints,
    };
  }
}
