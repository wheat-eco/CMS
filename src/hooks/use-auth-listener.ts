
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { serverTimestamp } from 'firebase/firestore';

export interface AppUser extends FirebaseAuthUser {
    profile: UserProfile | null;
}

export function useAuthListener() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const profile = await getUserProfile(authUser.uid);
        setUser({ ...authUser, profile });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Effect to update the user's "lastSeen" timestamp for presence indication
  useEffect(() => {
    if (!user?.uid) return;

    // Update immediately on load
    updateUserProfile(user.uid, { lastSeen: serverTimestamp() });
    
    // Update every 60 seconds
    const interval = setInterval(() => {
      updateUserProfile(user.uid, { lastSeen: serverTimestamp() });
    }, 60000);

    // Update when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserProfile(user.uid, { lastSeen: serverTimestamp() });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [user?.uid]);

  return { user, loading };
}
