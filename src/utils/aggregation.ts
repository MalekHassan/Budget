import type { Transaction } from '../types';

export interface DateRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyToLabel(monthKey: string, language: string = 'en'): string {
  const [year, month] = monthKey.split('_').map(Number);
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const names = language === 'ar' ? MONTHS_AR : MONTHS_EN;
  return `${names[month - 1]} ${year}`;
}

export function generateMonthKeys(range: DateRange): string[] {
  const keys: string[] = [];
  let y = range.startYear;
  let m = range.startMonth;

  while (y < range.endYear || (y === range.endYear && m <= range.endMonth)) {
    keys.push(`${y}_${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}

export function aggregateByCategory(
  transactions: Transaction[],
  type: 'expense' | 'income'
): Record<string, number> {
  const result: Record<string, number> = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      result[t.category] = (result[t.category] || 0) + t.amount;
    });
  return result;
}

export function aggregateByMonth(
  transactions: Transaction[],
  type: 'expense' | 'income'
): Record<string, number> {
  const result: Record<string, number> = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      result[t.monthKey] = (result[t.monthKey] || 0) + t.amount;
    });
  return result;
}

export function aggregateByCategoryAndMonth(
  transactions: Transaction[],
  type: 'expense' | 'income'
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      if (!result[t.category]) result[t.category] = {};
      result[t.category][t.monthKey] = (result[t.category][t.monthKey] || 0) + t.amount;
    });
  return result;
}

export function getDailyCumulative(
  transactions: Transaction[],
  type: 'expense' | 'income'
): { date: string; total: number }[] {
  const filtered = transactions
    .filter((t) => t.type === type)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const dailyMap: Record<string, number> = {};
  filtered.forEach((t) => {
    const key = t.date.toISOString().split('T')[0];
    dailyMap[key] = (dailyMap[key] || 0) + t.amount;
  });

  const entries = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return entries.map(([date, amount]) => {
    cumulative += amount;
    return { date, total: cumulative };
  });
}
