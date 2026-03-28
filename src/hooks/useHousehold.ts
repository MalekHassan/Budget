import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  getUserProfile,
  createUserProfile,
  createHousehold,
  findHouseholdsByEmail,
  onHouseholdChange,
} from '../firebase/firestore';
import type { Household, UserProfile } from '../types';

export function useHousehold() {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    let unsubHousehold: (() => void) | null = null;

    const init = async () => {
      try {
        setLoading(true);
        let userProfile = await getUserProfile(user.uid);

        if (!userProfile) {
          // Check if user's email is already a member of an existing household
          const existingHouseholds = await findHouseholdsByEmail(user.email!);
          let householdId: string;

          if (existingHouseholds.length > 0) {
            // Link to the first household they're a member of
            householdId = existingHouseholds[0].id;
          } else {
            // No existing membership — create a new household
            householdId = await createHousehold(
              `${user.displayName}'s Budget`,
              user.email!
            );
          }

          await createUserProfile(
            user.uid,
            user.email!,
            user.displayName || 'User',
            householdId,
            'en'
          );
          userProfile = await getUserProfile(user.uid);
        }

        if (userProfile) {
          setProfile(userProfile);
          // Subscribe to real-time household changes
          unsubHousehold = onHouseholdChange(userProfile.householdId, (h) => {
            setHousehold(h);
            setLoading(false);
          });
        } else {
          console.error('[useHousehold] Failed to create/load profile');
          setLoading(false);
        }
      } catch (err) {
        console.error('[useHousehold] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load household');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubHousehold) unsubHousehold();
    };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    if (p) setProfile(p);
  }, [user]);

  return { household, profile, loading, error, refreshProfile };
}
