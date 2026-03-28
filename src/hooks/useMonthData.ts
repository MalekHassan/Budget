import { useState, useEffect } from 'react';
import { onMonthBudgetChange, onMonthTransactions } from '../firebase/firestore';
import type { MonthBudget, Transaction, CategorySummary, MonthSummary } from '../types';

interface MonthData {
  budget: MonthBudget | null;
  transactions: Transaction[];
  expenseSummaries: CategorySummary[];
  incomeSummaries: CategorySummary[];
  monthSummary: MonthSummary;
  loading: boolean;
}

function calcCategorySummaries(
  categories: { name: string; nameEn: string; planned: number }[],
  transactions: Transaction[],
  type: 'expense' | 'income'
): CategorySummary[] {
  const filtered = transactions.filter((t) => t.type === type);

  return categories.map((cat) => {
    const actual = filtered
      .filter((t) => t.category === cat.name)
      .reduce((sum, t) => sum + t.amount, 0);
    const diff = cat.planned - actual;
    const percentage = cat.planned > 0 ? (actual / cat.planned) * 100 : actual > 0 ? 100 : 0;

    return {
      name: cat.name,
      nameEn: cat.nameEn,
      planned: cat.planned,
      actual,
      diff,
      percentage,
    };
  });
}

export function useMonthData(householdId: string | undefined, year: number, month: number): MonthData {
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = `${year}_${String(month).padStart(2, '0')}`;

  useEffect(() => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let budgetLoaded = false;
    let txnsLoaded = false;

    const checkDone = () => {
      if (budgetLoaded && txnsLoaded) setLoading(false);
    };

    const unsubBudget = onMonthBudgetChange(householdId, year, month, (b) => {
      setBudget(b);
      budgetLoaded = true;
      checkDone();
    });

    const unsubTxns = onMonthTransactions(householdId, monthKey, (txns) => {
      setTransactions(txns);
      txnsLoaded = true;
      checkDone();
    });

    return () => {
      unsubBudget();
      unsubTxns();
    };
  }, [householdId, year, month, monthKey]);

  const expenseCategories = budget?.expenseCategories || [];
  const incomeCategories = budget?.incomeCategories || [];

  const expenseSummaries = calcCategorySummaries(expenseCategories, transactions, 'expense');
  const incomeSummaries = calcCategorySummaries(incomeCategories, transactions, 'income');

  const totalPlannedExpenses = expenseCategories.reduce((s, c) => s + c.planned, 0);
  const totalActualExpenses = expenseSummaries.reduce((s, c) => s + c.actual, 0);
  const totalPlannedIncome = incomeCategories.reduce((s, c) => s + c.planned, 0);
  const totalActualIncome = incomeSummaries.reduce((s, c) => s + c.actual, 0);
  const savings = totalActualIncome - totalActualExpenses;
  const savingsPercentage = totalActualIncome > 0 ? (savings / totalActualIncome) * 100 : 0;

  return {
    budget,
    transactions,
    expenseSummaries,
    incomeSummaries,
    monthSummary: {
      totalPlannedExpenses,
      totalActualExpenses,
      totalPlannedIncome,
      totalActualIncome,
      savings,
      savingsPercentage,
    },
    loading,
  };
}
