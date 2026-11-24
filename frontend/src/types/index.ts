export type UserRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  timestamp?: string;
}

// Runtime Type Guard for ApiError
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  const hasSuccessFalse = candidate.success === false;
  const hasValidStatus = typeof candidate.statusCode === 'number' && candidate.statusCode >= 400 && candidate.statusCode <= 599;
  const hasValidMessage = typeof candidate.message === 'string' && candidate.message.trim().length > 0;

  return hasSuccessFalse && hasValidStatus && hasValidMessage;
}

// Domain Models
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  ownerId: string;
}

export interface Court {
  id: string;
  name: string;
  sportType: string;
  isActive: boolean;
  venueId: string;
  venue?: Venue;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  userId: string;
  courtId: string;
  bookingId: string;
  createdAt: string;
  updatedAt?: string;
  user?: Pick<User, 'id' | 'fullName'>;
  court?: Pick<Court, 'id' | 'name'>;
}

export interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  totalPrice: string | number;
  status: BookingStatus;
  userId: string;
  courtId: string;
  createdAt: string;
  updatedAt: string;
  court?: Court;
  review?: Review | null;
  complaints?: Complaint[];
  user?: Pick<User, 'id' | 'fullName' | 'email'>;
}

export interface Complaint {
  id: string;
  bookingId: string;
  complainantId: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolution?: string | null;
  assignedAdminId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
  complainant?: Pick<User, 'id' | 'fullName' | 'email'>;
  assignedAdmin?: Pick<User, 'id' | 'fullName'>;
}

// Utility Types
export type ReviewFormData = Pick<Review, 'rating'> & { comment?: string };
export type ComplaintFormData = Pick<Complaint, 'subject' | 'description'>;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Từ chối',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Bị từ chối',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng',
  OWNER: 'Chủ sân',
  ADMIN: 'Quản trị viên',
};
