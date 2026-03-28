import { useCallback } from 'react';
import { addTransaction, updateTransaction, deleteTransaction } from '../firebase/firestore';
import type { Transaction } from '../types';

export function useTransactions(householdId: string | undefined) {
  const add = useCallback(
    async (txn: Omit<Transaction, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => {
      if (!householdId) throw new Error('No household');
      return addTransaction(householdId, txn);
    },
    [householdId]
  );

  const update = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      return updateTransaction(id, updates);
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      return deleteTransaction(id);
    },
    []
  );

  return { addTransaction: add, updateTransaction: update, deleteTransaction: remove };
}
