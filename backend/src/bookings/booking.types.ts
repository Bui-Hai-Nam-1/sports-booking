import { BookingStatus, PricingType, VenueStatus } from '@prisma/client';
import {
  isNonEmptyString,
  isRecord,
  type TimeInterval,
} from '../common/types/api.types';

export const SLOT_STATUSES = [
  'AVAILABLE',
  'BOOKED',
  'MAINTENANCE',
  'CLOSED',
  'PAST',
] as const;

export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const ACTIVE_BLOCKING_BOOKING_STATUSES: ReadonlyArray<BookingStatus> = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

export const BOOKING_STATUS_VALUES: ReadonlyArray<BookingStatus> = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
];

export const PRICING_TYPE_VALUES: ReadonlyArray<PricingType> = [
  PricingType.STANDARD,
  PricingType.WEEKEND,
  PricingType.PEAK,
];

export interface OpeningHourWindow {
  weekday: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface PricingRuleWindow {
  id?: string;
  type: PricingType;
  pricePerHour: number | string | { toString(): string };
  weekday: number | null;
  startsAt: string;
  endsAt: string;
}

export interface MaintenanceWindow extends TimeInterval {
  id: string;
  reason: string;
}

export interface BookingWindow extends TimeInterval {
  id: string;
  status: BookingStatus;
  userId?: string;
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

export interface GridMatrix<TRowKey extends string, TCell> {
  columns: ReadonlyArray<string>;
  rows: ReadonlyArray<{
    key: TRowKey;
    label: string;
    metadata?: Readonly<Record<string, unknown>>;
    cells: ReadonlyArray<TCell>;
  }>;
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

export type BookingTransitionMap = Readonly<
  Record<BookingStatus, ReadonlyArray<BookingStatus>>
>;

export type BookingSummary<
  T extends {
    id: string;
    courtId: string;
    userId: string;
    startAt: Date;
    endAt: Date;
    totalPrice: unknown;
    status: BookingStatus;
    createdAt: Date;
  },
> = Readonly<
  Pick<T, 'id' | 'courtId' | 'userId' | 'startAt' | 'endAt' | 'totalPrice' | 'status' | 'createdAt'>
>;

export type PublicBookingSnapshot<T extends { userId: string }> = Readonly<
  Omit<T, 'userId'>
>;

export type CourtSearchCriteria = Partial<
  Readonly<{
    sportType: string;
    area: string;
    date: string;
    startTime: string;
    endTime: string;
  }>
>;

/**
 * Type guard validating whether a value is a known BookingStatus enum value.
 */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    typeof value === 'string' &&
    (BOOKING_STATUS_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Type guard validating whether a value is a valid availability SlotStatus.
 */
export function isSlotStatus(value: unknown): value is SlotStatus {
  return (
    typeof value === 'string' &&
    (SLOT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Type guard validating whether a value is a PricingType enum value.
 */
export function isPricingType(value: unknown): value is PricingType {
  return (
    typeof value === 'string' &&
    (PRICING_TYPE_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Type guard checking YYYY-MM-DD string represents an actual calendar date.
 */
export function isValidDateString(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Type guard checking HH:mm 24-hour format (including "24:00" when end-of-day is explicitly allowed).
 */
export function isValidTimeString(
  value: unknown,
  allow24 = false,
): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }
  if (allow24 && value === '24:00') {
    return true;
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Type guard checking an arbitrary value carries valid Date startAt/endAt bounds.
 */
export function isValidTimeInterval(value: unknown): value is TimeInterval {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.startAt instanceof Date &&
    value.endAt instanceof Date &&
    !Number.isNaN(value.startAt.getTime()) &&
    !Number.isNaN(value.endAt.getTime()) &&
    value.startAt.getTime() < value.endAt.getTime()
  );
}
