/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// استيراد الشرائح الخمسة الفرعية
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createProfileSlice, ProfileSlice } from './slices/profileSlice';
import { createHealthSlice, HealthSlice } from './slices/healthSlice';
import { createChatSlice, ChatSlice } from './slices/chatSlice';
import { createSyncSlice, SyncSlice } from './slices/syncSlice';

// موصل التخزين المخصص لـ IndexedDB باستخدام idb-keyval لضمان الأداء العالي
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get(name);
    return value ? (value as string) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

// تعريف النوع الشامل والدمج الصارم لجميع الشرائح لتمكين التواصل الآمن بينها (Cross-Slice Communication)
export type AppStoreState = AuthSlice & ProfileSlice & HealthSlice & ChatSlice & SyncSlice;

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get, store) => ({
      // دمج وتمرير الصلاحيات لكل شريحة بشكل منفصل
      ...createAuthSlice(set, get, store),
      ...createProfileSlice(set, get, store),
      ...createHealthSlice(set, get, store),
      ...createChatSlice(set, get, store),
      ...createSyncSlice(set, get, store),
    }),
    {
      name: 'sokkarak-mazboot-storage',
      storage: createJSONStorage(() => idbStorage),
      // تحديد العناصر التي نريد حفظها محلياً فقط وتجنب حفظ الحالات المؤقتة
      partialize: (state) => ({
        deviceId: state.deviceId,
        userProfile: state.userProfile,
        glucoseReadings: state.glucoseReadings,
        medicationLogs: state.medicationLogs,
        waterLogs: state.waterLogs,
        foodLogs: state.foodLogs,
        chatHistory: state.chatHistory,
        geminiApiKey: state.geminiApiKey,
        lastSyncedAt: state.lastSyncedAt,
        deletedRecords: state.deletedRecords,
      }),
    }
  )
);