/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { getSupabase } from '../../lib/supabaseClient';
import { AppStoreState } from '../useAppStore';
import { UserProfile, GlucoseReading, MedicationLog, FoodLog, ChatMessage, Medication } from '../../types';
import { del } from 'idb-keyval';
import { generateUUID } from '../../lib/uuid';

export interface DeletedRecord {
  id: string;
  table: string;
  updatedAt: string;
}

export interface SyncSlice {
  isInitialized: boolean;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string;
  deletedRecords: DeletedRecord[];
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
  deletedRecords: [],

  initializeStore: () => {
    const supabase = getSupabase();
    
    // 1. جلب الجلسة الأولى وتشغيل المزامنة خارج مسار الخيط الرئيسي لتجنب الجمود
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({ session, user: session.user });
        setTimeout(() => {
          get().pullFromSupabase().then(() => get().syncWithSupabase());
        }, 0);
      }
    });

    // 2. الاستماع لتغيرات المصادقة وتأجيل المزامنة عبر setTimeout لتجنب ثغرة الـ Deadlock في Supabase
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const currentUser = get().user;
        set({ session, user: session.user });
        
        // نطلق المزامنة فقط إذا كان المستخدم قد سجل دخوله للتو أو تغير الحساب فعلياً
        if (event === 'SIGNED_IN' && (!currentUser || currentUser.id !== session.user.id)) {
          setTimeout(() => {
            get().pullFromSupabase().then(() => get().syncWithSupabase());
          }, 100);
        }
      } else {
        set({ session: null, user: null });
      }
    });

    // إضافة مستمع لحالة الشبكة لإطلاق المزامنة التلقائية عند عودة النت
    window.addEventListener('online', () => {
      if (navigator.onLine) {
        get().syncWithSupabase().catch((err) => {
          console.error("[BackgroundSync] Error syncing:", err);
        });
      }
    });

    set({ isInitialized: true });
  },

  syncWithSupabase: async () => {
    const state = get();
    // قفل التزامن الصارم (Concurrency Lock): يمنع إطلاق أي مزامنة بالتوازي إذا كانت هناك مزامنة نشطة حالياً
    if (!state.user || !navigator.onLine || state.isSyncing) return;

    set({ isSyncing: true, syncError: null });
    try {
      const supabase = getSupabase();
      const uId = state.user.id;
      const syncTime = new Date().toISOString();
      const lastSync = state.lastSyncedAt;

      // 1. رفع الملف الشخصي إذا تم تعديله
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

      // دالة مساعدة لرفع البيانات النشطة التي تم تعديلها فقط (Delta Push)
      const pushActive = async (table: string, items: any[], mapper: (item: any) => any) => {
        const toPush = items.filter(i => (i.updatedAt || '') > lastSync);
        if (toPush.length > 0) {
          await supabase.from(table).upsert(toPush.map(mapper));
        }
      };

      await pushActive('medications', state.userProfile?.medications || [], (m) => ({
        id: m.id, user_id: uId, name: m.name, dosage: m.dosage, frequency: m.frequency, time_slots: m.timeSlots, updated_at: m.updatedAt
      }));

      await pushActive('glucose_readings', state.glucoseReadings, (r) => ({
        id: r.id, user_id: uId, value: r.value, meal_relation: r.mealRelation, status: r.status, notes: r.notes || null, logged_at: r.loggedAt, updated_at: r.updatedAt
      }));

      await pushActive('food_logs', state.foodLogs, (f) => ({
        id: f.id, user_id: uId, meal_type: f.mealType, description: f.description, logged_at: f.loggedAt, updated_at: f.updatedAt
      }));

      await pushActive('medication_logs', state.medicationLogs, (ml) => ({
        id: ml.id, user_id: uId, medication_id: ml.medicationId, medication_name: ml.medicationName, dosage: ml.dosage, time_slot: ml.timeSlot, logged_at: ml.loggedAt, updated_at: ml.updatedAt
      }));

      await pushActive('chat_messages', state.chatHistory, (msg) => ({
        id: msg.id, user_id: uId, role: msg.role, content: msg.content, timestamp: msg.timestamp, updated_at: msg.updatedAt,
        attachment_name: msg.attachment?.name, attachment_mime_type: msg.attachment?.mimeType, attachment_data_url: msg.attachment?.dataUrl
      }));

      // رفع سجلات المياه
      const waterPairs = Object.entries(state.waterLogs);
      if (waterPairs.length > 0) {
        const mappedWater = waterPairs.map(([date, count]) => ({
          user_id: uId, logged_date: date, count: count, updated_at: syncTime
        }));
        await supabase.from('water_logs').upsert(mappedWater, { onConflict: 'user_id, logged_date' });
      }

      // 2. رفع طابور الحذف الناعم (Soft Deletes)
      const deletesToPush = state.deletedRecords.filter(d => d.updatedAt > lastSync);
      for (const delRecord of deletesToPush) {
        await supabase.from(delRecord.table).update({ is_deleted: true, updated_at: delRecord.updatedAt }).eq('id', delRecord.id);
      }

      // تنظيف طابور الحذف المحلي وتحديث وقت المزامنة
      set((s) => ({
        deletedRecords: s.deletedRecords.filter(d => d.updatedAt > syncTime),
        lastSyncedAt: syncTime
      }));

      console.log("[Sync] Delta Push Completed Successfully.");
    } catch (err: any) {
      console.error("[Sync] Error pushing sync state:", err);
      set({ syncError: err.message });
    } finally {
      set({ isSyncing: false });
    }
  },

  pullFromSupabase: async () => {
    const state = get();
    // قفل التزامن الصارم (Concurrency Lock)
    if (!state.user || !navigator.onLine || state.isSyncing) return;

    set({ isSyncing: true, syncError: null });
    try {
      const supabase = getSupabase();
      const uId = state.user.id;
      const lastSync = state.lastSyncedAt;
      const syncTime = new Date().toISOString();

      // 1. جلب الملف الشخصي والتحقق من بصمة الجهاز (Single Device Enforcement)
      const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', uId).single();
      
      if (dbProfile) {
        if (dbProfile.current_device_id && dbProfile.current_device_id !== state.deviceId) {
          alert("تم تسجيل الدخول من جهاز آخر. سيتم تسجيل الخروج لحماية بياناتك.");
          await get().signOut();
          return;
        }

        const serverUpdated = dbProfile.updated_at || '';
        const localUpdated = state.userProfile?.updatedAt || '';
        
        if (serverUpdated > localUpdated) {
          const mergedProfile: UserProfile = {
            name: dbProfile.name || '',
            age: dbProfile.age || 0,
            gender: dbProfile.gender || 'male',
            diabetesType: dbProfile.diabetes_type || 'type2',
            comorbidities: dbProfile.comorbidities || [],
            medicationTimes: dbProfile.medication_times || { Breakfast: '08:00 AM', Lunch: '01:00 PM', Dinner: '08:00 PM', Bedtime: '10:00 PM' },
            medications: state.userProfile?.medications || [],
            isOnboarded: !!dbProfile.age,
            currentDeviceId: state.deviceId,
            updatedAt: serverUpdated
          };
          set({ userProfile: mergedProfile });
        }
      } else if (state.userProfile) {
        // رفع الملف لأول مرة إذا لم يكن موجوداً في السحابة
        await supabase.from('profiles').upsert({
          id: uId,
          name: state.userProfile.name,
          age: state.userProfile.age,
          gender: state.userProfile.gender,
          diabetes_type: state.userProfile.diabetesType,
          comorbidities: state.userProfile.comorbidities,
          medication_times: state.userProfile.medicationTimes,
          current_device_id: state.deviceId,
          updated_at: state.userProfile.updatedAt || syncTime
        });
      }

      // دالة مساعدة لدمج المصفوفات بناءً على الطابع الزمني والحذف الناعم
      const mergeArrays = (local: any[], remote: any[], mapper: (r: any) => any) => {
        const remoteMap = new Map(remote.map(r => [r.id, r]));
        const merged = local.filter(l => {
          const r = remoteMap.get(l.id);
          if (r && r.is_deleted) return false; // تم حذفه في السحابة
          if (r && r.updated_at > (l.updatedAt || '')) return false; // سيتم استبداله بالنسخة الأحدث
          return true;
        });
        
        remote.forEach(r => {
          if (!r.is_deleted && r.updated_at > lastSync) {
            merged.push(mapper(r));
          }
        });
        return merged;
      };

      // 2. جلب الأدوية
      const { data: dbMeds } = await supabase.from('medications').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbMeds && dbMeds.length > 0) {
        set(s => ({
          userProfile: s.userProfile ? {
            ...s.userProfile,
            medications: mergeArrays(s.userProfile.medications, dbMeds, m => ({
              id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency, timeSlots: m.time_slots, updatedAt: m.updated_at
            }))
          } : null
        }));
      }

      // 3. جلب قراءات السكر
      const { data: dbGlucose } = await supabase.from('glucose_readings').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbGlucose && dbGlucose.length > 0) {
        set(s => ({
          glucoseReadings: mergeArrays(s.glucoseReadings, dbGlucose, r => ({
            id: r.id, value: r.value, mealRelation: r.meal_relation, status: r.status, notes: r.notes, loggedAt: r.logged_at, updatedAt: r.updated_at
          })).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
        }));
      }

      // 4. جلب سجلات الطعام
      const { data: dbFood } = await supabase.from('food_logs').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbFood && dbFood.length > 0) {
        set(s => ({
          foodLogs: mergeArrays(s.foodLogs, dbFood, f => ({
            id: f.id, mealType: f.meal_type, description: f.description, loggedAt: f.logged_at, updatedAt: f.updated_at
          })).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
        }));
      }

      // 5. جلب سجلات الأدوية
      const { data: dbMedLogs } = await supabase.from('medication_logs').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbMedLogs && dbMedLogs.length > 0) {
        set(s => ({
          medicationLogs: mergeArrays(s.medicationLogs, dbMedLogs, ml => ({
            id: ml.id, medicationId: ml.medication_id, medicationName: ml.medication_name, dosage: ml.dosage, timeSlot: ml.time_slot, loggedAt: ml.logged_at, updatedAt: ml.updated_at
          })).sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
        }));
      }

      // 6. جلب المحادثات
      const { data: dbChat } = await supabase.from('chat_messages').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbChat && dbChat.length > 0) {
        set(s => ({
          chatHistory: mergeArrays(s.chatHistory, dbChat, msg => ({
            id: msg.id, role: msg.role, content: msg.content, timestamp: msg.timestamp, updatedAt: msg.updated_at,
            attachment: msg.attachment_data_url ? { name: msg.attachment_name, mimeType: msg.attachment_mime_type, dataUrl: msg.attachment_data_url } : undefined
          })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }));
      }

      // 7. جلب سجلات المياه
      const { data: dbWater } = await supabase.from('water_logs').select('*').eq('user_id', uId).gt('updated_at', lastSync);
      if (dbWater && dbWater.length > 0) {
        set(s => {
          const newWater = { ...s.waterLogs };
          dbWater.forEach(w => {
            if (w.is_deleted) delete newWater[w.logged_date];
            else newWater[w.logged_date] = w.count;
          });
          return { waterLogs: newWater };
        });
      }

      set({ lastSyncedAt: syncTime });
      console.log("[Sync] Delta Pull Completed Successfully.");

    } catch (err: any) {
      console.error("[Sync] Error pulling backup history:", err);
      set({ syncError: err.message });
    } finally {
      set({ isSyncing: false });
    }
  },

  clearAllData: async () => {
    set({
      session: null,
      user: null,
      userProfile: null,
      glucoseReadings: [],
      medicationLogs: [],
      waterLogs: {},
      foodLogs: [],
      chatHistory: [],
      geminiApiKey: '',
      isInitialized: false,
      deviceId: generateUUID(),
      lastSyncedAt: new Date(0).toISOString(),
      deletedRecords: []
    });
    
    try {
      await del('sokkarak-mazboot-storage');
    } catch (error) {
      console.error('Failed to clear IndexedDB store:', error);
    }

    localStorage.clear();
    sessionStorage.clear();

    set({ isInitialized: true });
  },
});