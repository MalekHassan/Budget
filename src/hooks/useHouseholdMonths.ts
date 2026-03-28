import { useState, useEffect } from 'react';
import { getHouseholdMonths } from '../firebase/firestore';
import type { MonthBudget } from '../types';

export function useHouseholdMonths(householdId: string | undefined) {
  const [months, setMonths] = useState<MonthBudget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setMonths([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await getHouseholdMonths(householdId);
        setMonths(data);
      } catch (err) {
        console.error('Failed to load household months:', err);
        setMonths([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [householdId]);

  return { months, loading };
}
