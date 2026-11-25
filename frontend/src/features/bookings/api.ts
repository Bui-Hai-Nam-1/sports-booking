import { api } from '../../lib/api';
import type { Booking, BookingStatus, PaginatedResponse } from '../../types';

export interface BookingQueryParams {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  courtId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchMyBookings(params: BookingQueryParams): Promise<PaginatedResponse<Booking>> {
  const res = await api.get('/bookings/me', { params });
  return res.data;
}

export async function fetchBookingDetail(id: string): Promise<Booking> {
  const res = await api.get(`/bookings/${id}`);
  return res.data;
}

export async function cancelCustomerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/bookings/${id}/cancel`);
  return res.data;
}

export async function fetchOwnerBookings(params: BookingQueryParams): Promise<PaginatedResponse<Booking>> {
  const res = await api.get('/owner/bookings', { params });
  return res.data;
}

export async function confirmOwnerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/owner/bookings/${id}/confirm`);
  return res.data;
}

export async function rejectOwnerBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.patch(`/owner/bookings/${id}/reject`, { reason });
  return res.data;
}

export async function completeOwnerBooking(id: string): Promise<Booking> {
  const res = await api.patch(`/owner/bookings/${id}/complete`);
  return res.data;
}
