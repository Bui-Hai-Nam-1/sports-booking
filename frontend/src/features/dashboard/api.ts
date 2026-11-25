import { api } from '../../lib/api';

export interface CourtStat {
  courtId: string;
  courtName: string;
  venueName: string;
  sportType: string;
  completedBookingsCount: number;
  revenue: number;
}

export interface OwnerDashboardData {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  rejectedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  courtStats: CourtStat[];
  recentBookings: any[];
}

export interface AdminDashboardData {
  totalUsers: number;
  totalVenues: number;
  totalCourts: number;
  totalBookings: number;
  completedBookings: number;
  openComplaints: number;
  totalRevenue: number;
  recentBookings: any[];
  recentComplaints: any[];
}

export async function fetchOwnerDashboard(params?: {
  from?: string;
  to?: string;
  venueId?: string;
}): Promise<OwnerDashboardData> {
  const res = await api.get('/owner/dashboard', { params });
  return res.data;
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const res = await api.get('/admin/dashboard');
  return res.data;
}
