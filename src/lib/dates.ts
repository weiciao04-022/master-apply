import type { ISODate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 以本地時間轉成 YYYY-MM-DD（避免 toISOString 的 UTC 位移） */
export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** 加年份；2/29 遇到非閏年會落在 2/28 */
export function addYears(s: ISODate, n: number): ISODate {
  const [y, m, d] = s.split('-').map(Number);
  const ty = y + n;
  const last = new Date(ty, m, 0).getDate();
  return `${ty}-${pad(m)}-${pad(Math.min(d, last))}`;
}

export function diffDays(a: ISODate, b: ISODate): number {
  // a - b，用 UTC 計算避免日光節約誤差
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86400000);
}

export function weekday(s: ISODate): number {
  return parseISO(s).getDay();
}

/** 週一為一週開始 */
export function startOfWeek(s: ISODate): ISODate {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + '01';
}

export function addMonths(s: ISODate, n: number): ISODate {
  const [y, m] = s.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return toISO(d);
}

export function daysInMonth(s: ISODate): number {
  const [y, m] = s.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function inRange(s: ISODate, start: ISODate, end: ISODate): boolean {
  return s >= start && s <= end;
}

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function fmt(s: ISODate | null | undefined, withWeekday = false): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  const base = `${y}/${m}/${d}`;
  return withWeekday ? `${base}（${WEEKDAY_LABELS[weekday(s)]}）` : base;
}

export function fmtShort(s: ISODate): string {
  const [, m, d] = s.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 距離今天幾天的人話描述 */
export function relative(s: ISODate, today: ISODate): string {
  const n = diffDays(s, today);
  if (n === 0) return '今天';
  if (n === 1) return '明天';
  if (n === -1) return '昨天';
  if (n > 0) return `${n} 天後`;
  return `已過 ${-n} 天`;
}
