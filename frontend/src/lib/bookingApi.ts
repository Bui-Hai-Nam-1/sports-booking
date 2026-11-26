import { api } from './api';
import type {
  BookingRecord,
  BookingSearchFilters,
  BookingStatus,
  CancelBookingPayload,
  CheckAvailabilityResult,
  CourtAvailabilityGridResponse,
  CreateBookingPayload,
  PaginatedResult,
  SearchVenueMatch,
  UpdateBookingStatusPayload,
  VenueAvailabilityGridResponse,
} from '../types/booking';

export interface ListBookingsParams {
  status?: BookingStatus;
  venueId?: string;
  courtId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function searchAvailableVenues(
  filters: BookingSearchFilters,
): Promise<PaginatedResult<SearchVenueMatch>> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== '',
    ),
  );
  const { data } = await api.get<PaginatedResult<SearchVenueMatch>>(
    '/availability/search',
    { params },
  );
  return data;
}

export async function getCourtAvailabilityGrid(
  courtId: string,
  params?: { date?: string; days?: number },
): Promise<CourtAvailabilityGridResponse> {
  const { data } = await api.get<CourtAvailabilityGridResponse>(
    `/availability/courts/${courtId}/grid`,
    { params },
  );
  return data;
}

export async function getVenueAvailabilityGrid(
  venueId: string,
  params?: { date?: string },
): Promise<VenueAvailabilityGridResponse> {
  const { data } = await api.get<VenueAvailabilityGridResponse>(
    `/availability/venues/${venueId}/grid`,
    { params },
  );
  return data;
}

export async function checkBookingAvailability(
  payload: CreateBookingPayload,
): Promise<CheckAvailabilityResult> {
  const { data } = await api.post<CheckAvailabilityResult>(
    '/bookings/check',
    payload,
  );
  return data;
}

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<BookingRecord> {
  const { data } = await api.post<BookingRecord>('/bookings', payload);
  return data;
}

export async function listMyBookings(
  params?: ListBookingsParams,
): Promise<PaginatedResult<BookingRecord>> {
  const { data } = await api.get<PaginatedResult<BookingRecord>>(
    '/bookings/me',
    { params },
  );
  return data;
}

export async function listOwnerBookings(
  params?: ListBookingsParams,
): Promise<PaginatedResult<BookingRecord>> {
  const { data } = await api.get<PaginatedResult<BookingRecord>>(
    '/bookings/owner',
    { params },
  );
  return data;
}

export async function getBookingById(bookingId: string): Promise<BookingRecord> {
  const { data } = await api.get<BookingRecord>(`/bookings/${bookingId}`);
  return data;
}

export async function cancelBooking(
  bookingId: string,
  payload: CancelBookingPayload,
): Promise<BookingRecord> {
  const { data } = await api.patch<BookingRecord>(
    `/bookings/${bookingId}/cancel`,
    payload,
  );
  return data;
}

export async function updateBookingStatus(
  bookingId: string,
  payload: UpdateBookingStatusPayload,
): Promise<BookingRecord> {
  const { data } = await api.patch<BookingRecord>(
    `/bookings/${bookingId}/status`,
    payload,
  );
  return data;
}
