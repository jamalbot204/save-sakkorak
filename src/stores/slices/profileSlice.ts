/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { UserProfile, Medication } from '../../types';
import { generateUUID } from '../../lib/uuid';

export interface ProfileSlice {
  deviceId: string;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  addMedication: (medication: Medication) => void;
  deleteMedication: (id: string) => void;
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
      const now = new Date().toISOString();
      set({ userProfile: { ...profile, updatedAt: now } });
      setTimeout(triggerBackgroundSync, 500);
    },

    addMedication: (medication) => {
      set((state) => {
        if (!state.userProfile) return state;
        const now = new Date().toISOString();
        const newMed = { ...medication, updatedAt: now };
        const updatedProfile = {
          ...state.userProfile,
          medications: [...(state.userProfile.medications || []), newMed],
          updatedAt: now
        };
        setTimeout(triggerBackgroundSync, 500);
        return { userProfile: updatedProfile };
      });
    },

    deleteMedication: (id) => {
      set((state) => {
        if (!state.userProfile) return state;
        const now = new Date().toISOString();
        const updatedProfile = {
          ...state.userProfile,
          medications: (state.userProfile.medications || []).filter((m) => m.id !== id),
          updatedAt: now
        };
        setTimeout(triggerBackgroundSync, 500);
        return { 
          userProfile: updatedProfile,
          deletedRecords: [...state.deletedRecords, { id, table: 'medications', updatedAt: now }]
        };
      });
    },
  };
};