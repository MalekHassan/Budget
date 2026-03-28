export interface Household {
  id: string;
  name: string;
  members: string[];
  currency: string;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  householdId: string;
  language: 'en' | 'ar';
  createdAt: Date;
}

export interface CategoryPlan {
  name: string;
  nameEn: string;
  planned: number;
  note?: string;
}

export interface MonthBudget {
  id: string;
  householdId: string;
  year: number;
  month: number;
  expenseCategories: CategoryPlan[];
  incomeCategories: CategoryPlan[];
  monthNote?: string;
  locked?: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Transaction {
  id: string;
  householdId: string;
  monthKey: string;
  date: Date;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  receiptUrl?: string;
  receiptItems?: ReceiptItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthSummary {
  totalPlannedExpenses: number;
  totalActualExpenses: number;
  totalPlannedIncome: number;
  totalActualIncome: number;
  savings: number;
  savingsPercentage: number;
}

export interface CategorySummary {
  name: string;
  nameEn: string;
  planned: number;
  actual: number;
  diff: number;
  percentage: number;
}

export type Language = 'en' | 'ar';
export type Theme = 'dark' | 'light';
