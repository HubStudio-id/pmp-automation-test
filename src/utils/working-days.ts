// Working-day arithmetic in Asia/Jakarta: weekends and the Admin holiday calendar (Standar Operasional ›
// Kalender hari kerja, GET /admin/holidays) do not count.
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant in Jakarta time. */
export function jakartaDate(instant: Date | string): string {
  return new Date(new Date(instant).getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The date that is `days` working days after `start` (start itself not counted). */
export function addWorkingDays(start: string, days: number, holidays: Set<string>): string {
  const date = new Date(`${start}T00:00:00Z`);
  let counted = 0;
  while (counted < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    const iso = date.toISOString().slice(0, 10);
    if (weekday !== 0 && weekday !== 6 && !holidays.has(iso)) counted++;
  }
  return date.toISOString().slice(0, 10);
}
