function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date input: ${String(input)}`);
  }
  return d;
}

export function daysSince(
  date: Date | string | number,
  referenceDate: Date | string | number = new Date()
): number {
  const d = toDate(date);
  const ref = toDate(referenceDate);
  const diffMs = ref.getTime() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function toMonthBucket(date: Date | string | number): string {
  const d = toDate(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatIso(date: Date | string | number = new Date()): string {
  return toDate(date).toISOString();
}

export function formatDate(date: Date | string | number = new Date()): string {
  const d = toDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function startOfDayUtc(date: Date | string | number = new Date()): Date {
  const d = toDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function endOfDayUtc(date: Date | string | number = new Date()): Date {
  const d = toDate(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function daysAgo(days: number, referenceDate: Date | string | number = new Date()): Date {
  const ref = toDate(referenceDate);
  const result = new Date(ref.getTime());
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

export function groupByMonth<T>(
  items: readonly T[],
  dateExtractor: (item: T) => Date | string | number
): Record<string, T[]> {
  const buckets: Record<string, T[]> = {};

  for (const item of items) {
    const bucket = toMonthBucket(dateExtractor(item));
    if (!buckets[bucket]) {
      buckets[bucket] = [];
    }
    buckets[bucket].push(item);
  }

  return buckets;
}

export function getMonthBucketsBetween(
  startDate: Date | string | number,
  endDate: Date | string | number = new Date()
): string[] {
  const start = toDate(startDate);
  const end = toDate(endDate);

  const buckets: string[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endLimit = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (current <= endLimit) {
    buckets.push(toMonthBucket(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return buckets;
}
