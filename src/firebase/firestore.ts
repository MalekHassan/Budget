import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Household, UserProfile, MonthBudget, Transaction, CategoryPlan } from '../types';

// ===== Helpers =====
const toDate = (ts: Timestamp | Date | null): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  return ts.toDate();
};

// ===== Households =====
export async function createHousehold(name: string, memberEmail: string): Promise<string> {
  const ref = await addDoc(collection(db, 'households'), {
    name,
    members: [memberEmail],
    currency: 'JD',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    members: data.members,
    currency: data.currency,
    createdAt: toDate(data.createdAt),
  };
}

export async function addHouseholdMember(householdId: string, email: string): Promise<void> {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found');
  if (household.members.includes(email)) return;
  await updateDoc(doc(db, 'households', householdId), {
    members: [...household.members, email],
  });
}

export async function removeHouseholdMember(householdId: string, email: string): Promise<void> {
  const household = await getHousehold(householdId);
  if (!household) throw new Error('Household not found');
  const updated = household.members.filter((m) => m !== email);
  if (updated.length === 0) throw new Error('Cannot remove the last member');
  await updateDoc(doc(db, 'households', householdId), { members: updated });
}

export async function updateHouseholdName(householdId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { name });
}

export function onHouseholdChange(householdId: string, callback: (h: Household | null) => void) {
  return onSnapshot(
    doc(db, 'households', householdId),
    (snap) => {
      if (!snap.exists()) return callback(null);
      const data = snap.data();
      callback({
        id: snap.id,
        name: data.name,
        members: data.members,
        currency: data.currency,
        createdAt: toDate(data.createdAt),
      });
    },
    (error) => {
      console.error('[Firestore] onHouseholdChange error:', error);
      callback(null);
    }
  );
}

export async function findHouseholdsByEmail(email: string): Promise<Household[]> {
  const q = query(
    collection(db, 'households'),
    where('members', 'array-contains', email)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      members: data.members,
      currency: data.currency,
      createdAt: toDate(data.createdAt),
    };
  });
}

// ===== User Profiles =====
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  householdId: string,
  language: 'en' | 'ar' = 'en'
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    email,
    displayName,
    householdId,
    language,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid: snap.id,
    email: data.email,
    displayName: data.displayName,
    householdId: data.householdId,
    language: data.language,
    createdAt: toDate(data.createdAt),
  };
}

export async function updateUserProfile(uid: string, updates: Partial<Pick<UserProfile, 'language' | 'householdId'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

// ===== Month Budgets =====
function monthDocId(householdId: string, year: number, month: number): string {
  return `${householdId}_${year}_${String(month).padStart(2, '0')}`;
}

export async function createMonthBudget(
  householdId: string,
  year: number,
  month: number,
  expenseCategories: CategoryPlan[],
  incomeCategories: CategoryPlan[],
  createdBy: string
): Promise<string> {
  const id = monthDocId(householdId, year, month);
  await setDoc(doc(db, 'months', id), {
    householdId,
    year,
    month,
    expenseCategories,
    incomeCategories,
    createdAt: serverTimestamp(),
    createdBy,
  });
  return id;
}

export async function getMonthBudget(householdId: string, year: number, month: number): Promise<MonthBudget | null> {
  const id = monthDocId(householdId, year, month);
  const snap = await getDoc(doc(db, 'months', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    householdId: data.householdId,
    year: data.year,
    month: data.month,
    expenseCategories: data.expenseCategories,
    incomeCategories: data.incomeCategories,
    monthNote: data.monthNote || '',
    locked: data.locked || false,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy,
  };
}

export async function updateMonthBudget(
  householdId: string,
  year: number,
  month: number,
  updates: { expenseCategories?: CategoryPlan[]; incomeCategories?: CategoryPlan[] }
): Promise<void> {
  const id = monthDocId(householdId, year, month);
  await updateDoc(doc(db, 'months', id), updates);
}

export async function updateMonthNote(householdId: string, year: number, month: number, note: string): Promise<void> {
  const id = monthDocId(householdId, year, month);
  await updateDoc(doc(db, 'months', id), { monthNote: note });
}

export async function setMonthLocked(householdId: string, year: number, month: number, locked: boolean): Promise<void> {
  const id = monthDocId(householdId, year, month);
  await updateDoc(doc(db, 'months', id), { locked });
}

export async function updateCategoryNote(
  householdId: string,
  year: number,
  month: number,
  categoryType: 'expense' | 'income',
  categoryName: string,
  note: string
): Promise<void> {
  const id = monthDocId(householdId, year, month);
  const budget = await getMonthBudget(householdId, year, month);
  if (!budget) return;

  const categories = categoryType === 'expense' ? budget.expenseCategories : budget.incomeCategories;
  const updated = categories.map((c) =>
    c.name === categoryName ? { ...c, note } : c
  );

  const field = categoryType === 'expense' ? 'expenseCategories' : 'incomeCategories';
  await updateDoc(doc(db, 'months', id), { [field]: updated });
}

export function onMonthBudgetChange(
  householdId: string,
  year: number,
  month: number,
  callback: (budget: MonthBudget | null) => void
) {
  const id = monthDocId(householdId, year, month);
  return onSnapshot(doc(db, 'months', id), (snap) => {
    if (!snap.exists()) return callback(null);
    const data = snap.data();
    callback({
      id: snap.id,
      householdId: data.householdId,
      year: data.year,
      month: data.month,
      expenseCategories: data.expenseCategories,
      incomeCategories: data.incomeCategories,
      monthNote: data.monthNote || '',
      locked: data.locked || false,
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy,
    });
  });
}

export async function getHouseholdMonths(householdId: string): Promise<MonthBudget[]> {
  const q = query(
    collection(db, 'months'),
    where('householdId', '==', householdId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      householdId: data.householdId,
      year: data.year,
      month: data.month,
      expenseCategories: data.expenseCategories,
      incomeCategories: data.incomeCategories,
      locked: data.locked || false,
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy,
    };
  }).sort((a, b) => b.year - a.year || b.month - a.month);
}

// ===== Transactions =====
export async function addTransaction(
  householdId: string,
  transaction: Omit<Transaction, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Strip undefined values — Firestore rejects them
  const clean = Object.fromEntries(
    Object.entries(transaction).filter(([, v]) => v !== undefined)
  );
  const ref = await addDoc(collection(db, 'transactions'), {
    ...clean,
    householdId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const { id: _id, ...data } = updates;
  const cleaned = Object.fromEntries(
    Object.entries({ ...data, updatedAt: serverTimestamp() }).filter(([, v]) => v !== undefined)
  );
  await updateDoc(doc(db, 'transactions', id), cleaned);
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', id));
}

export async function deleteMonthTransactions(householdId: string, monthKey: string): Promise<number> {
  const q = query(
    collection(db, 'transactions'),
    where('householdId', '==', householdId),
    where('monthKey', '==', monthKey)
  );
  const snap = await getDocs(q);
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'transactions', d.id));
    count++;
  }
  return count;
}

export async function getMonthTransactions(householdId: string, monthKey: string): Promise<Transaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('householdId', '==', householdId),
    where('monthKey', '==', monthKey)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      householdId: data.householdId,
      monthKey: data.monthKey,
      date: toDate(data.date),
      amount: data.amount,
      type: data.type,
      category: data.category,
      description: data.description,
      receiptUrl: data.receiptUrl,
      createdBy: data.createdBy,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  }).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function onMonthTransactions(
  householdId: string,
  monthKey: string,
  callback: (txns: Transaction[]) => void
) {
  const q = query(
    collection(db, 'transactions'),
    where('householdId', '==', householdId),
    where('monthKey', '==', monthKey)
  );
  return onSnapshot(q, (snap) => {
    const txns = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        householdId: data.householdId,
        monthKey: data.monthKey,
        date: toDate(data.date),
        amount: data.amount,
        type: data.type,
        category: data.category,
        description: data.description,
        receiptUrl: data.receiptUrl,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
    callback(txns);
  });
}

export async function getTransactionsInRange(
  householdId: string,
  startMonthKey: string,
  endMonthKey: string
): Promise<Transaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('householdId', '==', householdId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      householdId: data.householdId,
      monthKey: data.monthKey,
      date: toDate(data.date),
      amount: data.amount,
      type: data.type,
      category: data.category,
      description: data.description,
      receiptUrl: data.receiptUrl,
      createdBy: data.createdBy,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  })
  .filter((t) => t.monthKey >= startMonthKey && t.monthKey <= endMonthKey)
  .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || b.date.getTime() - a.date.getTime());
}
