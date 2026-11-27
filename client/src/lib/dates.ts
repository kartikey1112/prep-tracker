const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as a local date (no timezone shift). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function toISO(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / DAY_MS);
}
/** Plan day number for a date; 1 on the start date, may be <1 or >112. */
export function planDay(start: string, on = todayISO()): number {
  return diffDays(on, start) + 1;
}
export function dayDate(start: string, day: number): string {
  return addDays(start, day - 1);
}
export function fmt(iso: string, withYear = false): string {
  return parseISO(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });
}
