import { api } from '../../lib/api';
import type { Review, ReviewFormData, PaginatedResponse } from '../../types';

export interface CourtReviewsResponse extends PaginatedResponse<Review> {
  averageRating: number;
  totalReviews: number;
}

export async function createBookingReview(bookingId: string, data: ReviewFormData): Promise<Review> {
  const res = await api.post('/reviews', {
    bookingId,
    rating: data.rating,
    comment: data.comment,
  });
  return res.data;
}

export async function updateReview(id: string, data: Partial<ReviewFormData>): Promise<Review> {
  const res = await api.patch(`/reviews/${id}`, data);
  return res.data;
}

export async function fetchCourtReviews(
  courtId: string,
  params: { page: number; pageSize: number },
): Promise<CourtReviewsResponse> {
  const res = await api.get(`/courts/${courtId}/reviews`, { params });
  return res.data;
}

export async function fetchBookingReview(bookingId: string): Promise<Review | null> {
  const res = await api.get(`/bookings/${bookingId}/review`);
  return res.data;
}
