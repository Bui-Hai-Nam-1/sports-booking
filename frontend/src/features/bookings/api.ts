import { api } from '../../lib/api';
import type { Booking, BookingStatus, PaginatedResponse } from '../../types';

export interface BookingQueryParams {
  page?: number; pageSize?: number; status?: BookingStatus; courtId?: string; dateFrom?: string; dateTo?: string;
}

function normalizePage(data: any, params: BookingQueryParams): PaginatedResponse<Booking> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const meta = data.meta ?? {};
  return {
    items: data.items ?? [],
    total: meta.total ?? data.total ?? 0,
    page: meta.page ?? page,
    pageSize: meta.limit ?? pageSize,
    totalPages: meta.totalPages ?? data.totalPages ?? 0,
  };
}

export async function fetchMyBookings(params: BookingQueryParams): Promise<PaginatedResponse<Booking>> {
  const query = { page: params.page, limit: params.pageSize, status: params.status, courtId: params.courtId, date: params.dateFrom };
  const res = await api.get('/bookings/me', { params: query });
  return normalizePage(res.data, params);
}
export async function fetchBookingDetail(id: string): Promise<Booking> {
  const res = await api.get(`/bookings/${id}`); return res.data;
}
export async function cancelCustomerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/bookings/${id}/cancel`, { reason: 'Yêu cầu hủy từ khách hàng' }); return res.data;
}
export async function fetchOwnerBookings(params: BookingQueryParams): Promise<PaginatedResponse<Booking>> {
  const query = { page: params.page, limit: params.pageSize, status: params.status, courtId: params.courtId, date: params.dateFrom };
  const res = await api.get('/bookings/owner', { params: query }); return normalizePage(res.data, params);
}
export async function confirmOwnerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/bookings/${id}/status`, { status: 'CONFIRMED' }); return res.data;
}
export async function rejectOwnerBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.patch(`/bookings/${id}/status`, { status: 'REJECTED', reason: reason ?? 'Chủ sân từ chối' }); return res.data;
}
export async function completeOwnerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/bookings/${id}/status`, { status: 'COMPLETED' }); return res.data;
}
