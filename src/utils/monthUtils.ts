import type { MonthBudget } from '../types';

export function getDefaultMonth(householdMonths: MonthBudget[]): { year: number; month: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Find unlocked months
  const unlockedMonths = householdMonths.filter(m => !m.locked);
  
  if (unlockedMonths.length === 0) {
    // All months locked, return current month
    return { year: currentYear, month: currentMonth };
  }

  // Check if current month is unlocked
  const currentMonthUnlocked = unlockedMonths.some(
    m => m.year === currentYear && m.month === currentMonth
  );
  
  if (currentMonthUnlocked) {
    return { year: currentYear, month: currentMonth };
  }

  // Return the most recent unlocked month
  const mostRecentUnlocked = unlockedMonths.reduce((latest, month) => {
    if (!latest) return month;
    const monthDate = new Date(month.year, month.month - 1);
    const latestDate = new Date(latest.year, latest.month - 1);
    return monthDate > latestDate ? month : latest;
  });

  return { year: mostRecentUnlocked.year, month: mostRecentUnlocked.month };
}

export function getFirstUnlockedMonth(householdMonths: MonthBudget[]): { year: number; month: number } | null {
  const unlockedMonths = householdMonths.filter(m => !m.locked);
  
  if (unlockedMonths.length === 0) return null;
  
  // Return the oldest unlocked month (for TransactionForm default)
  const oldestUnlocked = unlockedMonths.reduce((oldest, month) => {
    if (!oldest) return month;
    const monthDate = new Date(month.year, month.month - 1);
    const oldestDate = new Date(oldest.year, oldest.month - 1);
    return monthDate < oldestDate ? month : oldest;
  });

  return { year: oldestUnlocked.year, month: oldestUnlocked.month };
}
