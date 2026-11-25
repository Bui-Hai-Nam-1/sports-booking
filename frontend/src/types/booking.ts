export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type PricingType = 'STANDARD' | 'WEEKEND' | 'PEAK';

export type SlotStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'MAINTENANCE'
  | 'CLOSED'
  | 'PAST';

export type VenueStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const BOOKING_STATUSES: ReadonlyArray<BookingStatus> = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

export const SLOT_STATUSES: ReadonlyArray<SlotStatus> = [
  'AVAILABLE',
  'BOOKED',
  'MAINTENANCE',
  'CLOSED',
  'PAST',
];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: ReadonlyArray<T>;
  meta: PaginationMeta;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
  status: SlotStatus;
  price: number;
  pricingType: PricingType;
  isBooked: boolean;
  isMaintenance: boolean;
  maintenanceReason?: string;
}

export interface DayAvailabilityRow {
  date: string;
  weekday: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  availableCount: number;
  slots: ReadonlyArray<AvailabilitySlot>;
}

export interface GridMatrixRow<TRowKey extends string, TCell> {
  key: TRowKey;
  label: string;
  metadata?: Readonly<Record<string, unknown>>;
  cells: ReadonlyArray<TCell>;
}

export interface GridMatrix<TRowKey extends string, TCell> {
  columns: ReadonlyArray<string>;
  rows: ReadonlyArray<GridMatrixRow<TRowKey, TCell>>;
}

export interface CourtAvailabilityGridResponse {
  venue: {
    id: string;
    name: string;
    address: string;
    status: VenueStatus;
  };
  court: {
    id: string;
    name: string;
    sportType: string;
  };
  startDate: string;
  days: number;
  matrix: GridMatrix<string, AvailabilitySlot>;
  schedule: ReadonlyArray<DayAvailabilityRow>;
}

export interface VenueAvailabilityGridResponse {
  venue: {
    id: string;
    name: string;
    address: string;
  };
  date: string;
  weekday: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  matrix: GridMatrix<string, AvailabilitySlot>;
}

export interface SearchCourtMatch {
  id: string;
  name: string;
  sportType: string;
  availableSlotCount: number;
  minPricePerHour: number;
  maxPricePerHour: number;
  matchesRequestedWindow: boolean;
  requestedWindowPrice: number | null;
}

export interface SearchVenueMatch {
  id: string;
  name: string;
  address: string;
  description: string | null;
  imageUrls: ReadonlyArray<string>;
  sportTypes: ReadonlyArray<string>;
  date: string;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
  courts: ReadonlyArray<SearchCourtMatch>;
}

export interface BookingRecord {
  id: string;
  startAt: string;
  endAt: string;
  totalPrice: string | number;
  status: BookingStatus;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  userId: string;
  courtId: string;
  createdAt: string;
  updatedAt: string;
  court: {
    id: string;
    name: string;
    sportType: string;
    isActive: boolean;
    venue: {
      id: string;
      name: string;
      address: string;
      ownerId: string;
      status: VenueStatus;
      isActive: boolean;
    };
  };
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface SlotBreakdownItem {
  startAt: string;
  endAt: string;
  price: number;
  pricingType: PricingType;
}

export interface CheckAvailabilityResult {
  available: boolean;
  reason: string | null;
  courtId: string;
  startAt: string;
  endAt: string;
  totalPrice: number;
  breakdown: ReadonlyArray<SlotBreakdownItem>;
}

export interface BookingSlotInput {
  startAt: string;
  endAt: string;
}

export interface CreateBookingPayload {
  courtId: string;
  slots?: ReadonlyArray<BookingSlotInput>;
  startAt?: string;
  endAt?: string;
  notes?: string;
}

export interface CancelBookingPayload {
  reason: string;
}

export interface UpdateBookingStatusPayload {
  status: BookingStatus;
  reason?: string;
}

export type BookingSearchFilters = Partial<
  Readonly<{
    sportType: string;
    area: string;
    date: string;
    startTime: string;
    endTime: string;
    page: number;
    limit: number;
  }>
>;

export type BookingSummaryCard = Readonly<
  Pick<
    BookingRecord,
    'id' | 'startAt' | 'endAt' | 'totalPrice' | 'status' | 'createdAt'
  >
>;

export type BookingCreateDraft = Omit<CreateBookingPayload, 'courtId'> & {
  courtId: string | null;
};

export type SlotStatusStyleMap = Readonly<
  Record<
    SlotStatus,
    {
      label: string;
      badgeClass: string;
    }
  >
>;

export class ApiClientError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Type guard checking whether a runtime value is a valid BookingStatus.
 */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === 'string' &&
    (BOOKING_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Type guard checking whether a runtime value is a valid availability SlotStatus.
 */
export function isSlotStatus(value: unknown): value is SlotStatus {
  return (
    typeof value === 'string' &&
    (SLOT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Type guard checking whether an API payload follows the backend { success: true, data } envelope.
 */
export function isApiEnvelope<T>(
  value: unknown,
): value is { success: true; data: T } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    (value as { success?: unknown }).success === true &&
    'data' in value
  );
}

/**
 * Type guard narrowing unknown caught values to ApiClientError.
 */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Type guard ensuring an array of slots forms a contiguous non-empty sequence without gaps.
 */
export function areSlotsContiguous<
  TSlot extends { startAt: string; endAt: string },
>(slots: ReadonlyArray<TSlot>): boolean {
  if (slots.length === 0) {
    return false;
  }
  const sorted = [...slots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  for (let i = 1; i < sorted.length; i += 1) {
    if (
      new Date(sorted[i - 1].endAt).getTime() !==
      new Date(sorted[i].startAt).getTime()
    ) {
      return false;
    }
  }
  return true;
}
