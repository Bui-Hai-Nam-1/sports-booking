import { BadRequestException } from '@nestjs/common';
import { BookingStatus, PricingType } from '@prisma/client';
import {
  assertCancellationAllowed,
  assertValidStatusTransition,
  buildDateTimeFromLocal,
  buildDayAvailabilityRow,
  calculateBookingTotalPrice,
  extractLocalCalendarParts,
  mergeContiguousSlots,
  resolveSlotPricing,
  splitIntervalIntoHourlySlots,
} from './booking-rules';
import {
  isBookingStatus,
  isPricingType,
  isSlotStatus,
  isValidDateString,
  isValidTimeInterval,
  isValidTimeString,
  type OpeningHourWindow,
  type PricingRuleWindow,
} from './booking.types';

describe('booking.types type guards', () => {
  it('validates BookingStatus, SlotStatus, and PricingType enum guards', () => {
    expect(isBookingStatus('PENDING')).toBe(true);
    expect(isBookingStatus('UNKNOWN')).toBe(false);
    expect(isSlotStatus('AVAILABLE')).toBe(true);
    expect(isSlotStatus('HOLD')).toBe(false);
    expect(isPricingType('PEAK')).toBe(true);
    expect(isPricingType('DISCOUNT')).toBe(false);
  });

  it('validates real calendar dates, HH:mm times, and TimeInterval bounds', () => {
    expect(isValidDateString('2026-11-25')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('25-11-2026')).toBe(false);

    expect(isValidTimeString('08:30')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('24:00', true)).toBe(true);
    expect(isValidTimeString('25:00', true)).toBe(false);

    const start = new Date('2099-01-10T01:00:00.000Z');
    const end = new Date('2099-01-10T02:00:00.000Z');
    expect(isValidTimeInterval({ startAt: start, endAt: end })).toBe(true);
    expect(isValidTimeInterval({ startAt: end, endAt: start })).toBe(false);
    expect(isValidTimeInterval(null)).toBe(false);
  });
});

describe('booking-rules availability and pricing', () => {
  const sampleDate = '2099-06-15';
  const sampleWeekday = extractLocalCalendarParts(
    buildDateTimeFromLocal(sampleDate, '00:00'),
  ).weekday;

  const openingHours: OpeningHourWindow[] = [
    { weekday: sampleWeekday, opensAt: '08:00', closesAt: '12:00', isClosed: false },
  ];

  const pricingRules: PricingRuleWindow[] = [
    {
      type: PricingType.STANDARD,
      pricePerHour: 120000,
      weekday: null,
      startsAt: '08:00',
      endsAt: '12:00',
    },
    {
      type: PricingType.PEAK,
      pricePerHour: 200000,
      weekday: null,
      startsAt: '10:00',
      endsAt: '12:00',
    },
    {
      type: PricingType.PEAK,
      pricePerHour: 250000,
      weekday: sampleWeekday,
      startsAt: '11:00',
      endsAt: '12:00',
    },
  ];

  it('builds hourly slots marking booked, maintenance, past, and available states', () => {
    const now = buildDateTimeFromLocal(sampleDate, '08:30');
    const row = buildDayAvailabilityRow({
      dateStr: sampleDate,
      openingHours,
      pricingRules,
      maintenanceBlocks: [
        {
          id: 'm-1',
          startAt: buildDateTimeFromLocal(sampleDate, '09:00'),
          endAt: buildDateTimeFromLocal(sampleDate, '10:00'),
          reason: 'Thay luoi san',
        },
      ],
      bookings: [
        {
          id: 'b-1',
          startAt: buildDateTimeFromLocal(sampleDate, '10:00'),
          endAt: buildDateTimeFromLocal(sampleDate, '11:00'),
          status: BookingStatus.CONFIRMED,
        },
        {
          id: 'b-cancelled',
          startAt: buildDateTimeFromLocal(sampleDate, '11:00'),
          endAt: buildDateTimeFromLocal(sampleDate, '12:00'),
          status: BookingStatus.CANCELLED,
        },
      ],
      now,
    });

    expect(row.isClosed).toBe(false);
    expect(row.slots).toHaveLength(4);
    expect(row.slots.map((s) => s.status)).toEqual([
      'PAST',
      'MAINTENANCE',
      'BOOKED',
      'AVAILABLE',
    ]);
    expect(row.slots[1].maintenanceReason).toBe('Thay luoi san');
    expect(row.slots[2].price).toBe(200000);
    expect(row.slots[3].price).toBe(250000);
    expect(row.availableCount).toBe(1);
  });

  it('returns closed day row when weekday is marked closed or missing', () => {
    const row = buildDayAvailabilityRow({
      dateStr: sampleDate,
      openingHours: [
        { weekday: sampleWeekday, opensAt: '08:00', closesAt: '20:00', isClosed: true },
      ],
      pricingRules: [],
      maintenanceBlocks: [],
      bookings: [],
    });

    expect(row.isClosed).toBe(true);
    expect(row.slots).toEqual([]);
    expect(row.availableCount).toBe(0);
  });

  it('resolves weekend vs standard vs peak pricing precedence', () => {
    const saturdayRules: PricingRuleWindow[] = [
      {
        type: PricingType.STANDARD,
        pricePerHour: 100000,
        weekday: null,
        startsAt: '06:00',
        endsAt: '22:00',
      },
      {
        type: PricingType.WEEKEND,
        pricePerHour: 150000,
        weekday: null,
        startsAt: '06:00',
        endsAt: '22:00',
      },
      {
        type: PricingType.PEAK,
        pricePerHour: 220000,
        weekday: 6,
        startsAt: '18:00',
        endsAt: '21:00',
      },
    ];

    expect(resolveSlotPricing(9 * 60, 10 * 60, 2, saturdayRules)).toEqual({
      price: 100000,
      pricingType: PricingType.STANDARD,
    });
    expect(resolveSlotPricing(9 * 60, 10 * 60, 6, saturdayRules)).toEqual({
      price: 150000,
      pricingType: PricingType.WEEKEND,
    });
    expect(resolveSlotPricing(18 * 60, 19 * 60, 6, saturdayRules)).toEqual({
      price: 220000,
      pricingType: PricingType.PEAK,
    });
  });

  it('merges contiguous slots and rejects gaps or non-hourly durations', () => {
    const s1 = {
      startAt: buildDateTimeFromLocal(sampleDate, '08:00'),
      endAt: buildDateTimeFromLocal(sampleDate, '09:00'),
    };
    const s2 = {
      startAt: buildDateTimeFromLocal(sampleDate, '09:00'),
      endAt: buildDateTimeFromLocal(sampleDate, '10:00'),
    };
    const s4 = {
      startAt: buildDateTimeFromLocal(sampleDate, '11:00'),
      endAt: buildDateTimeFromLocal(sampleDate, '12:00'),
    };

    const merged = mergeContiguousSlots([s2, s1]);
    expect(merged.startAt.getTime()).toBe(s1.startAt.getTime());
    expect(merged.endAt.getTime()).toBe(s2.endAt.getTime());
    expect(merged.hourlySegments).toHaveLength(2);

    expect(() => mergeContiguousSlots([s1, s4])).toThrow(BadRequestException);
    expect(() => mergeContiguousSlots([])).toThrow(BadRequestException);
    expect(() =>
      mergeContiguousSlots([
        {
          startAt: buildDateTimeFromLocal(sampleDate, '08:00'),
          endAt: buildDateTimeFromLocal(sampleDate, '08:30'),
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('splits continuous interval into hourly segments and rejects out-of-hours pricing', () => {
    const startAt = buildDateTimeFromLocal(sampleDate, '09:00');
    const endAt = buildDateTimeFromLocal(sampleDate, '12:00');
    const segments = splitIntervalIntoHourlySlots(startAt, endAt);
    expect(segments).toHaveLength(3);

    const total = calculateBookingTotalPrice({
      segments,
      openingHours,
      pricingRules,
    });
    expect(total.totalPrice).toBe(120000 + 200000 + 250000);

    expect(() =>
      calculateBookingTotalPrice({
        segments: [
          {
            startAt: buildDateTimeFromLocal(sampleDate, '07:00'),
            endAt: buildDateTimeFromLocal(sampleDate, '08:00'),
          },
        ],
        openingHours,
        pricingRules,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('booking-rules cancellation and status transitions', () => {
  const matchStart = new Date('2099-06-15T10:00:00.000Z');

  it('enforces 2-hour cancellation lead time for customers', () => {
    const threeHoursBefore = new Date(matchStart.getTime() - 3 * 3600_000);
    const oneHourBefore = new Date(matchStart.getTime() - 1 * 3600_000);

    expect(() =>
      assertCancellationAllowed({
        status: BookingStatus.PENDING,
        startAt: matchStart,
        actorRole: 'CUSTOMER',
        now: threeHoursBefore,
      }),
    ).not.toThrow();

    expect(() =>
      assertCancellationAllowed({
        status: BookingStatus.CONFIRMED,
        startAt: matchStart,
        actorRole: 'CUSTOMER',
        now: oneHourBefore,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertCancellationAllowed({
        status: BookingStatus.CONFIRMED,
        startAt: matchStart,
        actorRole: 'OWNER',
        now: oneHourBefore,
      }),
    ).not.toThrow();
  });

  it('rejects cancelling completed, rejected, or already started bookings', () => {
    expect(() =>
      assertCancellationAllowed({
        status: BookingStatus.COMPLETED,
        startAt: matchStart,
        actorRole: 'ADMIN',
        now: new Date(matchStart.getTime() - 5 * 3600_000),
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertCancellationAllowed({
        status: BookingStatus.CONFIRMED,
        startAt: matchStart,
        actorRole: 'OWNER',
        now: new Date(matchStart.getTime() + 1000),
      }),
    ).toThrow(BadRequestException);
  });

  it('enforces valid booking status state-machine transitions', () => {
    const beforeStart = new Date(matchStart.getTime() - 3600_000);
    const beforeEnd = new Date(matchStart.getTime() + 30 * 60_000);
    const afterEnd = new Date(matchStart.getTime() + 90 * 60_000);

    expect(() =>
      assertValidStatusTransition({
        currentStatus: BookingStatus.PENDING,
        nextStatus: BookingStatus.CONFIRMED,
        startAt: matchStart,
        endAt: new Date(matchStart.getTime() + 3600_000),
        now: beforeStart,
      }),
    ).not.toThrow();

    expect(() =>
      assertValidStatusTransition({
        currentStatus: BookingStatus.CONFIRMED,
        nextStatus: BookingStatus.COMPLETED,
        startAt: matchStart,
        endAt: new Date(matchStart.getTime() + 3600_000),
        now: beforeStart,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertValidStatusTransition({
        currentStatus: BookingStatus.CONFIRMED,
        nextStatus: BookingStatus.COMPLETED,
        startAt: matchStart,
        endAt: new Date(matchStart.getTime() + 3600_000),
        now: beforeEnd,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertValidStatusTransition({
        currentStatus: BookingStatus.CONFIRMED,
        nextStatus: BookingStatus.COMPLETED,
        startAt: matchStart,
        endAt: new Date(matchStart.getTime() + 3600_000),
        now: afterEnd,
      }),
    ).not.toThrow();

    expect(() =>
      assertValidStatusTransition({
        currentStatus: BookingStatus.CANCELLED,
        nextStatus: BookingStatus.CONFIRMED,
        startAt: matchStart,
        endAt: new Date(matchStart.getTime() + 3600_000),
        now: beforeStart,
      }),
    ).toThrow(BadRequestException);
  });
});
