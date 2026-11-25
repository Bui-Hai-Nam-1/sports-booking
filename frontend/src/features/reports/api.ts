import { api } from '../../lib/api';

export interface RevenueBucket {
  period: string;
  revenue: number;
  bookingsCount: number;
}

export interface RevenueReportData {
  from: string;
  to: string;
  groupBy: 'day' | 'month';
  totalRevenue: number;
  totalCompletedBookings: number;
  currency: string;
  buckets: RevenueBucket[];
}

export async function fetchOwnerRevenueReport(params: {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'month';
  venueId?: string;
  courtId?: string;
}): Promise<RevenueReportData> {
  const res = await api.get('/reports/owner/revenue', { params });
  return res.data;
}

export async function fetchAdminRevenueReport(params: {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'month';
  venueId?: string;
  courtId?: string;
}): Promise<RevenueReportData> {
  const res = await api.get('/reports/admin/revenue', { params });
  return res.data;
}
