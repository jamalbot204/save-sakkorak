/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { UserProfile } from '../../types';
import { generateUUID } from '../../lib/uuid';
import { localTimestamp } from '../../lib/datetime';

export interface ProfileSlice {
  deviceId: string;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
}

export const createProfileSlice: StateCreator<
  AppStoreState,
  [],
  [],
  ProfileSlice
> = (set, get) => {
  const triggerBackgroundSync = () => {
    if (navigator.onLine) {
      get().syncWithSupabase().catch((err) => {
        console.error("[BackgroundSync] Error syncing:", err);
      });
    }
  };

  return {
    deviceId: generateUUID(),
    userProfile: null,

    setUserProfile: (profile) => {
      const now = localTimestamp();
      set({ userProfile: { ...profile, updatedAt: now } });
      setTimeout(triggerBackgroundSync, 500);
    },
  };
};