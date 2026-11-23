const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  assertPriceRuleDoesNotOverlap,
  assertValidDateInterval,
  assertValidOpeningHours,
  assertValidTimeWindow,
  intervalsOverlap,
  timeToMinutes,
} = require('../dist/venues/venue-rules.js');

test('parses midnight and end-of-day times', () => {
  assert.equal(timeToMinutes('00:00'), 0);
  assert.equal(timeToMinutes('23:59'), 1439);
});

test('rejects invalid time values', () => {
  assert.throws(() => timeToMinutes('24:00'), /HH:mm/);
  assert.throws(() => timeToMinutes('9:30'), /HH:mm/);
});

test('accepts a time window within the same day', () => {
  assert.doesNotThrow(() => assertValidTimeWindow('06:00', '22:00'));
});

test('rejects zero-length and reverse time windows', () => {
  assert.throws(
    () => assertValidTimeWindow('10:00', '10:00'),
    /later than start/,
  );
  assert.throws(
    () => assertValidTimeWindow('23:00', '01:00'),
    /later than start/,
  );
});

test('accepts a full weekly opening-hours schedule', () => {
  assert.doesNotThrow(() =>
    assertValidOpeningHours(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        openTime: '06:00',
        closeTime: '22:00',
        isClosed: false,
      })),
    ),
  );
});

test('rejects duplicate opening-hours entries for a day', () => {
  assert.throws(
    () =>
      assertValidOpeningHours([
        { dayOfWeek: 1, openTime: '06:00', closeTime: '22:00' },
        { dayOfWeek: 1, openTime: '07:00', closeTime: '21:00' },
      ]),
    /one entry per day/,
  );
});

test('does not require a valid interval for a closed day', () => {
  assert.doesNotThrow(() =>
    assertValidOpeningHours([
      { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
    ]),
  );
});

test('allows adjacent pricing rules without a gap or overlap', () => {
  assert.doesNotThrow(() =>
    assertPriceRuleDoesNotOverlap(
      { dayOfWeek: 1, startTime: '12:00', endTime: '14:00' },
      [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }],
    ),
  );
});

test('rejects partially overlapping rules on the same day', () => {
  assert.throws(
    () =>
      assertPriceRuleDoesNotOverlap(
        { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
        [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }],
      ),
    /cannot overlap/,
  );
});

test('rejects a rule fully contained within another same-day rule', () => {
  assert.throws(
    () =>
      assertPriceRuleDoesNotOverlap(
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
        [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }],
      ),
    /cannot overlap/,
  );
});

test('allows overlapping rules on different days', () => {
  assert.doesNotThrow(() =>
    assertPriceRuleDoesNotOverlap(
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
      [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }],
    ),
  );
});

test('allows a day-specific rule to override the all-days base rate', () => {
  assert.doesNotThrow(() =>
    assertPriceRuleDoesNotOverlap(
      { dayOfWeek: 0, startTime: '18:00', endTime: '22:00' },
      [{ dayOfWeek: null, startTime: '06:00', endTime: '22:00' }],
    ),
  );
});

test('allows updating a pricing rule without matching itself', () => {
  assert.doesNotThrow(() =>
    assertPriceRuleDoesNotOverlap(
      { id: 'existing', dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      [{ id: 'existing', dayOfWeek: 2, startTime: '08:00', endTime: '17:00' }],
      'existing',
    ),
  );
});

test('rejects an invalid pricing interval', () => {
  assert.throws(
    () =>
      assertPriceRuleDoesNotOverlap(
        { dayOfWeek: null, startTime: '18:00', endTime: '08:00' },
        [],
      ),
    /later than start/,
  );
});

test('treats adjacent maintenance intervals as non-overlapping', () => {
  assert.equal(
    intervalsOverlap(
      {
        startAt: new Date('2026-01-01T10:00:00Z'),
        endAt: new Date('2026-01-01T12:00:00Z'),
      },
      {
        startAt: new Date('2026-01-01T12:00:00Z'),
        endAt: new Date('2026-01-01T13:00:00Z'),
      },
    ),
    false,
  );
});

test('detects overlapping maintenance intervals', () => {
  assert.equal(
    intervalsOverlap(
      {
        startAt: new Date('2026-01-01T10:00:00Z'),
        endAt: new Date('2026-01-01T12:00:00Z'),
      },
      {
        startAt: new Date('2026-01-01T11:00:00Z'),
        endAt: new Date('2026-01-01T13:00:00Z'),
      },
    ),
    true,
  );
});

test('accepts a forward maintenance interval', () => {
  assert.doesNotThrow(() =>
    assertValidDateInterval(
      new Date('2026-01-01T10:00:00Z'),
      new Date('2026-01-01T12:00:00Z'),
    ),
  );
});

test('rejects empty or reverse maintenance intervals', () => {
  const start = new Date('2026-01-01T10:00:00Z');
  assert.throws(
    () => assertValidDateInterval(start, start),
    /later than start/,
  );
  assert.throws(
    () => assertValidDateInterval(new Date('2026-01-01T12:00:00Z'), start),
    /later than start/,
  );
});

test('rejects invalid maintenance dates', () => {
  assert.throws(
    () => assertValidDateInterval(new Date(Number.NaN), new Date()),
    /later than start/,
  );
});
