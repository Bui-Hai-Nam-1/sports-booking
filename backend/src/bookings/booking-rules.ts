import { BadRequestException } from '@nestjs/common';
import { PricingType } from '@prisma/client';
import type { TimeInterval } from '../common/types/api.types';
import {
  ACTIVE_BLOCKING_BOOKING_STATUSES,
  isValidDateString,
  isValidTimeString,
  type AvailabilitySlot,
  type BookingWindow,
  type DayAvailabilityRow,
  type MaintenanceWindow,
  type OpeningHourWindow,
  type PricingRuleWindow,
  type SlotStatus,
} from './booking.types';

/** Default project timezone offset (+07:00 Asia/Ho_Chi_Minh) in minutes. */
export const VN_TIMEZONE_OFFSET_MINUTES = 7 * 60;
export const SLOT_DURATION_MINUTES = 60;
export const MAX_CONSECUTIVE_SLOTS = 12;
export const DEFAULT_FALLBACK_PRICE_PER_HOUR = 100000;
export const DEFAULT_OPENS_AT = '06:00';
export const DEFAULT_CLOSES_AT = '22:00';

/**
 * Converts HH:mm (or 24:00 when allowed) into minutes from midnight.
 */
export function timeToMinutes(value: string, allow24 = false): number {
  if (!isValidTimeString(value, allow24)) {
    throw new BadRequestException(`Invalid time format "${value}", expected HH:mm`);
  }
  if (value === '24:00') {
    return 24 * 60;
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight [0..1440] back into HH:mm.
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Builds an exact UTC Date from a local YYYY-MM-DD and HH:mm using the configured offset.
 */
export function buildDateTimeFromLocal(
  dateStr: string,
  timeStr: string,
  offsetMinutes: number = VN_TIMEZONE_OFFSET_MINUTES,
): Date {
  if (!isValidDateString(dateStr)) {
    throw new BadRequestException(`Invalid date "${dateStr}", expected YYYY-MM-DD`);
  }
  const minutes = timeToMinutes(timeStr, true);
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcMs =
    Date.UTC(year, month - 1, day, 0, 0, 0, 0) +
    (minutes - offsetMinutes) * 60_000;
  return new Date(utcMs);
}

/**
 * Extracts local calendar date (YYYY-MM-DD), weekday (0=Sun..6=Sat), and minutes from midnight.
 */
export function extractLocalCalendarParts(
  date: Date,
  offsetMinutes: number = VN_TIMEZONE_OFFSET_MINUTES,
): { date: string; weekday: number; minutesOfDay: number } {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    weekday: shifted.getUTCDay(),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/**
 * Returns YYYY-MM-DD shifted by `dayDelta` days from `baseDateStr`.
 */
export function addDaysToDateString(baseDateStr: string, dayDelta: number): string {
  if (!isValidDateString(baseDateStr)) {
    throw new BadRequestException(`Invalid date "${baseDateStr}"`);
  }
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayDelta));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes half-open interval overlap: [a.startAt, a.endAt) intersects [b.startAt, b.endAt).
 */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return (
    a.startAt.getTime() < b.endAt.getTime() &&
    b.startAt.getTime() < a.endAt.getTime()
  );
}

/**
 * Converts a numeric or Prisma Decimal-like price into a finite JavaScript number.
 */
export function toNumericPrice(
  value: number | string | { toString(): string },
): number {
  const numeric = typeof value === 'number' ? value : Number(value.toString());
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

/**
 * Resolves effective opening hours for a given weekday.
 * If the venue configured opening hours for any weekday, missing weekdays are treated as closed;
 * if no opening hours are configured at all yet, defaults to 06:00-22:00.
 */
export function resolveDayOpeningWindow(
  weekday: number,
  openingHours: ReadonlyArray<OpeningHourWindow>,
): { isClosed: boolean; opensAt: string | null; closesAt: string | null } {
  if (openingHours.length === 0) {
    return {
      isClosed: false,
      opensAt: DEFAULT_OPENS_AT,
      closesAt: DEFAULT_CLOSES_AT,
    };
  }
  const matched = openingHours.find((item) => item.weekday === weekday);
  if (!matched || matched.isClosed) {
    return { isClosed: true, opensAt: null, closesAt: null };
  }
  const openMinutes = timeToMinutes(matched.opensAt);
  const closeMinutes = timeToMinutes(matched.closesAt, true);
  if (openMinutes >= closeMinutes) {
    return { isClosed: true, opensAt: null, closesAt: null };
  }
  return {
    isClosed: false,
    opensAt: matched.opensAt,
    closesAt: matched.closesAt,
  };
}

/**
 * Resolves the price & pricing tier for a specific [slotStartMinutes, slotEndMinutes) on weekday.
 * Precedence: day-specific PEAK > day-specific WEEKEND/STANDARD > all-days PEAK > all-days WEEKEND > all-days STANDARD.
 */
export function resolveSlotPricing(
  slotStartMinutes: number,
  slotEndMinutes: number,
  weekday: number,
  rules: ReadonlyArray<PricingRuleWindow>,
): { price: number; pricingType: PricingType } {
  const isWeekendDay = weekday === 0 || weekday === 6;

  const coveringRules = rules.filter((rule) => {
    const ruleStart = timeToMinutes(rule.startsAt);
    const ruleEnd = timeToMinutes(rule.endsAt, true);
    const weekdayMatches = rule.weekday === null || rule.weekday === weekday;
    return (
      weekdayMatches &&
      ruleStart <= slotStartMinutes &&
      slotEndMinutes <= ruleEnd
    );
  });

  const scoreRule = (rule: PricingRuleWindow): number => {
    const specificity = rule.weekday === weekday ? 10 : 0;
    const typeWeight =
      rule.type === PricingType.PEAK
        ? 3
        : rule.type === PricingType.WEEKEND && isWeekendDay
          ? 2
          : rule.type === PricingType.STANDARD
            ? 1
            : 0;
    // Ignore WEEKEND rules on weekdays unless nothing else matches.
    if (rule.type === PricingType.WEEKEND && !isWeekendDay) {
      return -1;
    }
    return specificity + typeWeight;
  };

  const ranked = coveringRules
    .map((rule) => ({ rule, score: scoreRule(rule) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0) {
    return {
      price: toNumericPrice(ranked[0].rule.pricePerHour),
      pricingType: ranked[0].rule.type,
    };
  }

  const fallbackStandard = rules.find(
    (rule) =>
      rule.type === PricingType.STANDARD &&
      (rule.weekday === null || rule.weekday === weekday),
  );
  if (fallbackStandard) {
    return {
      price: toNumericPrice(fallbackStandard.pricePerHour),
      pricingType: PricingType.STANDARD,
    };
  }

  return {
    price: DEFAULT_FALLBACK_PRICE_PER_HOUR,
    pricingType: isWeekendDay ? PricingType.WEEKEND : PricingType.STANDARD,
  };
}

/**
 * Generates an hourly availability row for a single court and calendar date.
 */
export function buildDayAvailabilityRow(params: {
  dateStr: string;
  openingHours: ReadonlyArray<OpeningHourWindow>;
  pricingRules: ReadonlyArray<PricingRuleWindow>;
  maintenanceBlocks: ReadonlyArray<MaintenanceWindow>;
  bookings: ReadonlyArray<BookingWindow>;
  now?: Date;
  offsetMinutes?: number;
}): DayAvailabilityRow {
  const {
    dateStr,
    openingHours,
    pricingRules,
    maintenanceBlocks,
    bookings,
    now = new Date(),
    offsetMinutes = VN_TIMEZONE_OFFSET_MINUTES,
  } = params;

  const midnightUtc = buildDateTimeFromLocal(dateStr, '00:00', offsetMinutes);
  const { weekday } = extractLocalCalendarParts(midnightUtc, offsetMinutes);
  const dayOpening = resolveDayOpeningWindow(weekday, openingHours);

  if (dayOpening.isClosed || !dayOpening.opensAt || !dayOpening.closesAt) {
    return {
      date: dateStr,
      weekday,
      isClosed: true,
      opensAt: null,
      closesAt: null,
      availableCount: 0,
      slots: [],
    };
  }

  const openMinutes = timeToMinutes(dayOpening.opensAt);
  const closeMinutes = timeToMinutes(dayOpening.closesAt, true);
  const activeBookings = bookings.filter((booking) =>
    ACTIVE_BLOCKING_BOOKING_STATUSES.includes(booking.status),
  );

  const slots: AvailabilitySlot[] = [];
  for (
    let cursor = openMinutes;
    cursor + SLOT_DURATION_MINUTES <= closeMinutes;
    cursor += SLOT_DURATION_MINUTES
  ) {
    const slotEnd = cursor + SLOT_DURATION_MINUTES;
    const startTime = minutesToTime(cursor);
    const endTime = minutesToTime(slotEnd);
    const startAt = buildDateTimeFromLocal(dateStr, startTime, offsetMinutes);
    const endAt = buildDateTimeFromLocal(dateStr, endTime, offsetMinutes);
    const slotInterval: TimeInterval = { startAt, endAt };

    const maintenanceMatch = maintenanceBlocks.find((block) =>
      intervalsOverlap(slotInterval, block),
    );
    const bookingMatch = activeBookings.find((booking) =>
      intervalsOverlap(slotInterval, booking),
    );
    const isPast = startAt.getTime() <= now.getTime();
    const { price, pricingType } = resolveSlotPricing(
      cursor,
      slotEnd,
      weekday,
      pricingRules,
    );

    let status: SlotStatus = 'AVAILABLE';
    if (maintenanceMatch) {
      status = 'MAINTENANCE';
    } else if (bookingMatch) {
      status = 'BOOKED';
    } else if (isPast) {
      status = 'PAST';
    }

    slots.push({
      date: dateStr,
      startTime,
      endTime,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      status,
      price,
      pricingType,
      isBooked: Boolean(bookingMatch),
      isMaintenance: Boolean(maintenanceMatch),
      maintenanceReason: maintenanceMatch?.reason,
    });
  }

  return {
    date: dateStr,
    weekday,
    isClosed: false,
    opensAt: dayOpening.opensAt,
    closesAt: dayOpening.closesAt,
    availableCount: slots.filter((slot) => slot.status === 'AVAILABLE').length,
    slots,
  };
}

/**
 * Validates and merges contiguous hourly slots into a single [startAt, endAt) interval.
 * Rejects empty lists, non-hourly steps, gaps, overlaps, or exceeding MAX_CONSECUTIVE_SLOTS.
 */
export function mergeContiguousSlots(
  rawSlots: ReadonlyArray<TimeInterval>,
): { startAt: Date; endAt: Date; hourlySegments: ReadonlyArray<TimeInterval> } {
  if (rawSlots.length === 0) {
    throw new BadRequestException('At least one time slot must be selected');
  }
  if (rawSlots.length > MAX_CONSECUTIVE_SLOTS) {
    throw new BadRequestException(
      `Cannot book more than ${MAX_CONSECUTIVE_SLOTS} consecutive slots at once`,
    );
  }

  const sorted = [...rawSlots].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime(),
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const durationMinutes =
      (current.endAt.getTime() - current.startAt.getTime()) / 60_000;
    if (durationMinutes !== SLOT_DURATION_MINUTES) {
      throw new BadRequestException(
        `Each slot must be exactly ${SLOT_DURATION_MINUTES} minutes`,
      );
    }
    if (index > 0) {
      const previous = sorted[index - 1];
      if (previous.endAt.getTime() !== current.startAt.getTime()) {
        throw new BadRequestException(
          'Selected time slots must be consecutive without gaps or duplicates',
        );
      }
    }
  }

  return {
    startAt: sorted[0].startAt,
    endAt: sorted[sorted.length - 1].endAt,
    hourlySegments: sorted,
  };
}

/**
 * Splits a continuous [startAt, endAt) interval into hourly segments and validates alignment.
 */
export function splitIntervalIntoHourlySlots(
  startAt: Date,
  endAt: Date,
  offsetMinutes: number = VN_TIMEZONE_OFFSET_MINUTES,
): ReadonlyArray<TimeInterval> {
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt.getTime() >= endAt.getTime()
  ) {
    throw new BadRequestException('End time must be strictly after start time');
  }

  const totalMinutes = (endAt.getTime() - startAt.getTime()) / 60_000;
  if (totalMinutes % SLOT_DURATION_MINUTES !== 0) {
    throw new BadRequestException(
      `Booking duration must be a multiple of ${SLOT_DURATION_MINUTES} minutes`,
    );
  }

  const slotCount = totalMinutes / SLOT_DURATION_MINUTES;
  if (slotCount > MAX_CONSECUTIVE_SLOTS) {
    throw new BadRequestException(
      `Cannot book more than ${MAX_CONSECUTIVE_SLOTS} consecutive hours at once`,
    );
  }

  const startParts = extractLocalCalendarParts(startAt, offsetMinutes);
  const endParts = extractLocalCalendarParts(
    new Date(endAt.getTime() - 1),
    offsetMinutes,
  );
  if (startParts.date !== endParts.date) {
    throw new BadRequestException('Booking cannot span across midnight');
  }
  if (startParts.minutesOfDay % 30 !== 0) {
    throw new BadRequestException('Booking start time must align to 30-minute boundaries');
  }

  const segments: TimeInterval[] = [];
  for (let i = 0; i < slotCount; i += 1) {
    const segStart = new Date(startAt.getTime() + i * SLOT_DURATION_MINUTES * 60_000);
    const segEnd = new Date(segStart.getTime() + SLOT_DURATION_MINUTES * 60_000);
    segments.push({ startAt: segStart, endAt: segEnd });
  }
  return segments;
}

/**
 * Calculates total server-side price across one or more hourly segments.
 */
export function calculateBookingTotalPrice(params: {
  segments: ReadonlyArray<TimeInterval>;
  openingHours: ReadonlyArray<OpeningHourWindow>;
  pricingRules: ReadonlyArray<PricingRuleWindow>;
  offsetMinutes?: number;
}): {
  totalPrice: number;
  breakdown: ReadonlyArray<{
    startAt: string;
    endAt: string;
    price: number;
    pricingType: PricingType;
  }>;
} {
  const {
    segments,
    openingHours,
    pricingRules,
    offsetMinutes = VN_TIMEZONE_OFFSET_MINUTES,
  } = params;

  const breakdown = segments.map((segment) => {
    const startParts = extractLocalCalendarParts(segment.startAt, offsetMinutes);
    const endParts = extractLocalCalendarParts(segment.endAt, offsetMinutes);
    const endMinutes =
      endParts.date !== startParts.date ? 24 * 60 : endParts.minutesOfDay;

    const dayOpening = resolveDayOpeningWindow(startParts.weekday, openingHours);
    if (dayOpening.isClosed || !dayOpening.opensAt || !dayOpening.closesAt) {
      throw new BadRequestException('Selected venue is closed on this weekday');
    }

    const openMinutes = timeToMinutes(dayOpening.opensAt);
    const closeMinutes = timeToMinutes(dayOpening.closesAt, true);
    if (startParts.minutesOfDay < openMinutes || endMinutes > closeMinutes) {
      throw new BadRequestException(
        `Selected slot ${minutesToTime(startParts.minutesOfDay)}-${minutesToTime(endMinutes)} is outside venue opening hours (${dayOpening.opensAt}-${dayOpening.closesAt})`,
      );
    }

    const { price, pricingType } = resolveSlotPricing(
      startParts.minutesOfDay,
      endMinutes,
      startParts.weekday,
      pricingRules,
    );

    return {
      startAt: segment.startAt.toISOString(),
      endAt: segment.endAt.toISOString(),
      price,
      pricingType,
    };
  });

  const totalPrice = breakdown.reduce((sum, item) => sum + item.price, 0);
  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    breakdown,
  };
}
