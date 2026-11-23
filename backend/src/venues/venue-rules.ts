import { BadRequestException } from '@nestjs/common';

export interface PriceRuleWindow {
  id?: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
}

export interface TimeInterval {
  startAt: Date;
  endAt: Date;
}

export function timeToMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new BadRequestException('Time must use the HH:mm format');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function assertValidTimeWindow(
  startTime: string,
  endTime: string,
): void {
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new BadRequestException('End time must be later than start time');
  }
}

export function assertValidOpeningHours(
  hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
  }>,
): void {
  const days = new Set<number>();
  for (const hour of hours) {
    if (days.has(hour.dayOfWeek)) {
      throw new BadRequestException(
        'Opening hours can only contain one entry per day',
      );
    }
    days.add(hour.dayOfWeek);
    if (!hour.isClosed) {
      assertValidTimeWindow(hour.openTime, hour.closeTime);
    }
  }
}

export function assertPriceRuleDoesNotOverlap(
  candidate: PriceRuleWindow,
  rules: PriceRuleWindow[],
  excludeId?: string,
): void {
  assertValidTimeWindow(candidate.startTime, candidate.endTime);
  const candidateStart = timeToMinutes(candidate.startTime);
  const candidateEnd = timeToMinutes(candidate.endTime);
  const overlap = rules.some((rule) => {
    if (excludeId !== undefined && rule.id === excludeId) {
      return false;
    }
    if (candidate.dayOfWeek !== rule.dayOfWeek) {
      return false;
    }
    return (
      candidateStart < timeToMinutes(rule.endTime) &&
      timeToMinutes(rule.startTime) < candidateEnd
    );
  });
  if (overlap) {
    throw new BadRequestException(
      'Pricing rules cannot overlap for the same day',
    );
  }
}

export function intervalsOverlap(
  first: TimeInterval,
  second: TimeInterval,
): boolean {
  return first.startAt < second.endAt && second.startAt < first.endAt;
}

export function assertValidDateInterval(startAt: Date, endAt: Date): void {
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt >= endAt
  ) {
    throw new BadRequestException('End date must be later than start date');
  }
}
