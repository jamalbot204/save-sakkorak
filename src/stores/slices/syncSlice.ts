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

// كائن مزامنة على مستوى الوحدة لمنع تداخل عمليات المزامنة المتزامنة
// يُضبط بشكل متزامن قبل أي await لسد فجوة TOCTOU بين فحص isSyncing وتعيينه
let _syncing = false;

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

    let initFinished = false;
    const finishInit = () => {
      if (initFinished) return;
      initFinished = true;
      set({ isInitialized: true });
    };

    // مهلة أمان: في حال تعليق استعادة الجلسة لأكثر من 5 ثوانٍ، تابع الإقلاع
    const safetyTimer = setTimeout(finishInit, 5000);

    // 1. الاستماع لتغيرات المصادقة — يُسجَّل أولاً لضمان عدم تفويت أي حدث
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const currentUser = get().user;
        const isNewSignIn = event === 'SIGNED_IN' && (!currentUser || currentUser.id !== session.user.id);

        set({ session, user: session.user });

        if (isNewSignIn) {
          // تسجيل دخول جديد ← اسحب من السحابة وأظهر الدوّار
          setTimeout(async () => {
            if (get().isSyncing) return;
            await get().pullFromSupabase();
            await get().syncWithSupabase();
          }, 100);
        } else {
          // جلسة مسترجَعة من التخزين المحلي — إذا كانت البيانات المحلية موجودة، تجاوز الدوّار
          if (get().userProfile) {
            set({ profileReady: true });
          }
        }

        finishInit();
      } else {
        set({ session: null, user: null });
        // لا ننهي التهيئة هنا — ننتظر getSession() ليقرر الحالة النهائية
        // إذا نجحت استعادة الجلسة لاحقاً، سينطلق onAuthStateChange مجدداً بحدث TOKEN_REFRESHED
        // وإذا فشلت، سينهي getSession() التهيئة. في كل الأحوال يحمي مؤقت الأمان البالغ 5 ثوانٍ من التعليق
      }
    });

    // 2. مراقبة حالة الشبكة لإطلاق مزامنة تلقائية فور عودة الاتصال
    subscribeToNetwork((online) => {
      if (online) {
        get().syncWithSupabase().catch((err) => {
          console.error("[Network] Auto sync on reconnect failed:", err);
        });
      } else {
        set({ lastSyncStatus: 'failed' });
      }
    });

    // 3. استعادة الجلسة الحالية وتفعيل السحب/الرفع
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // إذا كانت الجلسة قد استُرجعت عبر onAuthStateChange نضمن عدم فقدان تحديث المستخدم
        if (!get().user) {
          set({ session, user: session.user });
        }

        // إذا وُجدت بيانات محلية من IndexedDB، تجاوز دوّار "جاري تحميل الملف الطبي من السحابة"
        if (get().userProfile) {
          set({ profileReady: true });
        }

        setTimeout(async () => {
          if (get().isSyncing) return;
          await get().pullFromSupabase();
          await get().syncWithSupabase();
        }, 0);
      }

      clearTimeout(safetyTimer);
      finishInit();
    }).catch(() => {
      clearTimeout(safetyTimer);
      finishInit();
    });
  },

  syncWithSupabase: async () => {
    if (_syncing) return;
    const state = get();
    if (!state.user) return;

    _syncing = true;
    try {
      const online = await isOnline();
      if (!online) {
        set({ lastSyncStatus: 'failed' });
        return;
      }

      set({ isSyncing: true, syncError: null });

      const supabase = getSupabase();
      const uId = state.user.id;
      const syncTime = localTimestamp();

      await withRetry(async () => {
        const fresh = get();

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة المزامنة — ١٥ ثانية')), 15_000)
        );

        await Promise.race([
          (async () => {
            if (fresh.userProfile && (fresh.userProfile.updatedAt || '') > fresh.lastSyncedAt) {
              await supabase.from('profiles').upsert({
                id: uId,
                name: fresh.userProfile.name,
                age: fresh.userProfile.age,
                gender: fresh.userProfile.gender,
                diabetes_type: fresh.userProfile.diabetesType,
                comorbidities: fresh.userProfile.comorbidities,
                medication_times: fresh.userProfile.medicationTimes,
                current_device_id: fresh.deviceId,
                updated_at: fresh.userProfile.updatedAt
              });
            }

            await supabase.from('health_data').upsert({
              user_id: uId,
              data: {
                medications: fresh.healthData.medications || [],
                glucoseReadings: fresh.healthData.glucoseReadings || [],
                medicationLogs: fresh.healthData.medicationLogs || [],
                foodLogs: fresh.healthData.foodLogs || [],
                waterLogs: fresh.healthData.waterLogs || {},
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
      _syncing = false;
      set({ isSyncing: false });
    }
  },

  pullFromSupabase: async () => {
    if (_syncing) return;
    const state = get();
    if (!state.user) return;

    _syncing = true;
    try {
      const online = await isOnline();
      if (!online) {
        set({ lastSyncStatus: 'failed', profileReady: true });
        return;
      }

      set({ isSyncing: true, syncError: null });

      const supabase = getSupabase();
      const uId = state.user.id;
      const syncTime = localTimestamp();

      await withRetry(async () => {
        const fresh = get();

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('انتهت مهلة المزامنة — ١٥ ثانية')), 15_000)
        );

        await Promise.race([
          (async () => {
            const { data: dbProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', uId).maybeSingle();

            if (profileError) throw profileError;

            if (dbProfile) {
              if (dbProfile.current_device_id && dbProfile.current_device_id !== fresh.deviceId) {
                await supabase.from('profiles').upsert({
                  id: uId,
                  current_device_id: fresh.deviceId,
                  updated_at: syncTime,
                });
                await supabase.auth.signOut({ scope: 'others' });
              }

              const serverUpdated = dbProfile.updated_at || '';
              const localUpdated = fresh.userProfile?.updatedAt || '';
              const isFreshSignIn = fresh.lastSyncedAt === new Date(0).toISOString();

              if (isFreshSignIn || serverUpdated > localUpdated) {
                const mergedProfile: UserProfile = {
                  name: dbProfile.name || '',
                  age: dbProfile.age || 0,
                  gender: dbProfile.gender || 'male',
                  diabetesType: dbProfile.diabetes_type || 'type2',
                  comorbidities: dbProfile.comorbidities || [],
                  medicationTimes: dbProfile.medication_times || { Breakfast: '08:00 AM', Lunch: '01:00 PM', Dinner: '08:00 PM', Bedtime: '10:00 PM' },
                  isOnboarded: !!dbProfile.age,
                  currentDeviceId: fresh.deviceId,
                  updatedAt: serverUpdated
                };
                set({ userProfile: mergedProfile });
              }
            }

            const { data: dbHealth, error: healthError } = await supabase.from('health_data').select('*').eq('user_id', uId).maybeSingle();

            if (healthError) throw healthError;

            if (dbHealth && dbHealth.data) {
              const remote = dbHealth.data;
              const remoteUpdated = dbHealth.updated_at || '';
              const isFreshSignIn = fresh.lastSyncedAt === new Date(0).toISOString();

              if (isFreshSignIn || remoteUpdated > fresh.healthDataUpdatedAt) {
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
      set({ syncError: err.message, lastSyncStatus: 'failed', profileReady: true });
    } finally {
      _syncing = false;
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
    
    try {
      localStorage.clear();
      sessionStorage.clear();
      await del('sokkarak-mazboot-storage');
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    } finally {
      set({ isInitialized: true });
    }
  },
});