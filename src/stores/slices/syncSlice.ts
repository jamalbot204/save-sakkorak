/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { getSupabase } from '../../lib/supabaseClient';
import { AppStoreState } from '../useAppStore';
import { UserProfile } from '../../types';
import { del } from 'idb-keyval';
import { generateUUID } from '../../lib/uuid';
import { localTimestamp } from '../../lib/datetime';
import { isOnline, subscribeToNetwork } from '../../lib/networkStatus';
import { withRetry } from '../../lib/retry';

export interface SyncSlice {
  isInitialized: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string;
  healthDataUpdatedAt: string;
  profileReady: boolean;
  lastSyncStatus: 'idle' | 'synced' | 'failed';
  initializeStore: () => void;
  syncWithSupabase: () => Promise<void>;
  pullFromSupabase: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const createSyncSlice: StateCreator<
  AppStoreState,
  [],
  [],
  SyncSlice
> = (set, get) => ({
  isInitialized: false,
  isSyncing: false,
  syncError: null,
  lastSyncedAt: new Date(0).toISOString(),
  healthDataUpdatedAt: new Date(0).toISOString(),
  profileReady: false,
  lastSyncStatus: 'idle',

  initializeStore: () => {
    const supabase = getSupabase();
    
    // 1. جلب الجلسة الأولى وتشغيل المزامنة خارج مسار الخيط الرئيسي لتجنب الجمود
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({ session, user: session.user });
        setTimeout(async () => {
          if (get().isSyncing) return;
          await get().pullFromSupabase();
          await get().syncWithSupabase();
        }, 0);
      }
    });

    // 2. الاستماع لتغيرات المصادقة وتأجيل المزامنة عبر setTimeout لتجنب ثغرة الـ Deadlock في Supabase
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const currentUser = get().user;
        set({ session, user: session.user });
        
        if (event === 'SIGNED_IN' && (!currentUser || currentUser.id !== session.user.id)) {
          setTimeout(async () => {
            if (get().isSyncing) return;
            await get().pullFromSupabase();
            await get().syncWithSupabase();
          }, 100);
        }
      } else {
        set({ session: null, user: null });
      }
    });

    // 3. مراقبة حالة الشبكة عبر Capacitor Network API (أو DOM events على الويب)
    //     لإطلاق مزامنة تلقائية فور عودة الاتصال
    subscribeToNetwork((online) => {
      if (online) {
        get().syncWithSupabase().catch((err) => {
          console.error("[Network] Auto sync on reconnect failed:", err);
        });
      } else {
        set({ lastSyncStatus: 'failed' });
      }
    });

    set({ isInitialized: true });
  },

  syncWithSupabase: async () => {
    const state = get();
    if (!state.user || state.isSyncing) return;

    const online = await isOnline();
    if (!online) {
      set({ lastSyncStatus: 'failed' });
      return;
    }

    set({ isSyncing: true, syncError: null });

    try {
      const supabase = getSupabase();
      const uId = state.user.id;
      const syncTime = localTimestamp();
      const lastSync = state.lastSyncedAt;

      await withRetry(async () => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة المزامنة — ١٥ ثانية')), 15_000)
        );

        await Promise.race([
          (async () => {
            if (state.userProfile && (state.userProfile.updatedAt || '') > lastSync) {
              await supabase.from('profiles').upsert({
                id: uId,
                name: state.userProfile.name,
                age: state.userProfile.age,
                gender: state.userProfile.gender,
                diabetes_type: state.userProfile.diabetesType,
                comorbidities: state.userProfile.comorbidities,
                medication_times: state.userProfile.medicationTimes,
                current_device_id: state.deviceId,
                updated_at: state.userProfile.updatedAt
              });
            }

            await supabase.from('health_data').upsert({
              user_id: uId,
              data: {
                medications: state.healthData.medications || [],
                glucoseReadings: state.healthData.glucoseReadings || [],
                medicationLogs: state.healthData.medicationLogs || [],
                foodLogs: state.healthData.foodLogs || [],
                waterLogs: state.healthData.waterLogs || {},
              },
              updated_at: syncTime
            });
          })(),
          timeout,
        ]);
      }, 3, 'syncWithSupabase');

      set({ lastSyncedAt: syncTime, lastSyncStatus: 'synced' });

      console.log("[Sync] Delta Push Completed Successfully.");
    } catch (err: any) {
      console.error("[Sync] Error pushing sync state:", err);
      set({ syncError: err.message, lastSyncStatus: 'failed' });
    } finally {
      set({ isSyncing: false });
    }
  },

  pullFromSupabase: async () => {
    const state = get();
    if (!state.user || state.isSyncing) return;

    const online = await isOnline();
    if (!online) {
      set({ lastSyncStatus: 'failed', profileReady: true });
      return;
    }

    set({ isSyncing: true, syncError: null });

    try {
      const supabase = getSupabase();
      const uId = state.user.id;
      const lastSync = state.lastSyncedAt;
      const syncTime = localTimestamp();

      await withRetry(async () => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة المزامنة — ١٥ ثانية')), 15_000)
        );

        await Promise.race([
          (async () => {
            const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', uId).single();
            
            if (dbProfile) {
              if (dbProfile.current_device_id && dbProfile.current_device_id !== state.deviceId) {
                await supabase.from('profiles').upsert({
                  id: uId,
                  current_device_id: state.deviceId,
                  updated_at: syncTime,
                });
                await supabase.auth.signOut({ scope: 'others' });
              }

              const serverUpdated = dbProfile.updated_at || '';
              const localUpdated = state.userProfile?.updatedAt || '';
              const isFreshSignIn = lastSync === new Date(0).toISOString();
              
              if (isFreshSignIn || serverUpdated > localUpdated) {
                const mergedProfile: UserProfile = {
                  name: dbProfile.name || '',
                  age: dbProfile.age || 0,
                  gender: dbProfile.gender || 'male',
                  diabetesType: dbProfile.diabetes_type || 'type2',
                  comorbidities: dbProfile.comorbidities || [],
                  medicationTimes: dbProfile.medication_times || { Breakfast: '08:00 AM', Lunch: '01:00 PM', Dinner: '08:00 PM', Bedtime: '10:00 PM' },
                  isOnboarded: !!dbProfile.age,
                  currentDeviceId: state.deviceId,
                  updatedAt: serverUpdated
                };
                set({ userProfile: mergedProfile });
              }
            }

            const { data: dbHealth } = await supabase.from('health_data').select('*').eq('user_id', uId).maybeSingle();
            if (dbHealth && dbHealth.data) {
              const remote = dbHealth.data;
              const remoteUpdated = dbHealth.updated_at || '';
              const isFreshSignIn = lastSync === new Date(0).toISOString();
              
              if (isFreshSignIn || remoteUpdated > state.healthDataUpdatedAt) {
                set({
                  healthData: {
                    medications: remote.medications || [],
                    glucoseReadings: remote.glucoseReadings || [],
                    medicationLogs: remote.medicationLogs || [],
                    foodLogs: remote.foodLogs || [],
                    waterLogs: remote.waterLogs || {},
                  },
                  healthDataUpdatedAt: remoteUpdated
                });
              }
            }
          })(),
          timeout,
        ]);
      }, 3, 'pullFromSupabase');

      set({ lastSyncedAt: syncTime, profileReady: true, lastSyncStatus: 'synced' });
      console.log("[Sync] Delta Pull Completed Successfully.");

    } catch (err: any) {
      console.error("[Sync] Error pulling backup history:", err);
      set({ syncError: err.message, lastSyncStatus: 'failed' });
    } finally {
      set({ isSyncing: false });
    }
  },

  clearAllData: async () => {
    set({
      session: null,
      user: null,
      userProfile: null,
      healthData: { medications: [], glucoseReadings: [], medicationLogs: [], foodLogs: [], waterLogs: {} },
      chatHistory: [],
      isInitialized: false,
      deviceId: generateUUID(),
      lastSyncedAt: new Date(0).toISOString(),
      healthDataUpdatedAt: new Date(0).toISOString(),
      profileReady: false,
      lastSyncStatus: 'idle'
    });
    
    localStorage.clear();
    sessionStorage.clear();

    try {
      await del('sokkarak-mazboot-storage');
    } catch (error) {
      console.error('Failed to clear IndexedDB store:', error);
      return;
    }

    set({ isInitialized: true });
  },
});