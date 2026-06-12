/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { GlucoseReading, MedicationLog, FoodLog } from '../../types';
import { generateUUID } from '../../lib/uuid';

export interface HealthSlice {
  glucoseReadings: GlucoseReading[];
  medicationLogs: MedicationLog[];
  waterLogs: Record<string, number>; // date "YYYY-MM-DD" -> cup count
  foodLogs: FoodLog[];
  addGlucoseReading: (reading: { value: number; mealRelation: 'fasting' | 'post-meal' | 'before-meal' | 'bedtime' | 'random'; notes?: string }) => void;
  deleteGlucoseReading: (id: string) => void;
  toggleMedicationLog: (medicationId: string, medicationName: string, dosage: string, timeSlot: string, targetDate?: string) => void;
  incrementWater: (date: string) => void;
  decrementWater: (date: string) => void;
  addFoodLog: (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', description: string) => void;
}

export const createHealthSlice: StateCreator<
  AppStoreState,
  [],
  [],
  HealthSlice
> = (set, get) => {
  const triggerBackgroundSync = () => {
    if (navigator.onLine) {
      get().syncWithSupabase().catch((err) => {
        console.error("[BackgroundSync] Error syncing:", err);
      });
    }
  };

  return {
    glucoseReadings: [],
    medicationLogs: [],
    waterLogs: {},
    foodLogs: [],

    addGlucoseReading: (reading) => {
      const now = new Date().toISOString();
      let status: 'low' | 'normal' | 'high' = 'normal';

      if (reading.value < 70) {
        status = 'low';
      } else if (reading.mealRelation === 'fasting' || reading.mealRelation === 'before-meal') {
        status = reading.value > 130 ? 'high' : 'normal';
      } else if (reading.mealRelation === 'post-meal') {
        status = reading.value > 180 ? 'high' : 'normal';
      } else {
        status = reading.value > 140 ? 'high' : 'normal';
      }

      const newReading: GlucoseReading = {
        id: generateUUID(),
        ...reading,
        status,
        loggedAt: now,
        updatedAt: now
      };

      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return { glucoseReadings: [newReading, ...state.glucoseReadings] };
      });
    },

    deleteGlucoseReading: (id) => {
      set((state) => {
        const now = new Date().toISOString();
        setTimeout(triggerBackgroundSync, 500);
        return {
          glucoseReadings: state.glucoseReadings.filter((r) => r.id !== id),
          deletedRecords: [...state.deletedRecords, { id, table: 'glucose_readings', updatedAt: now }]
        };
      });
    },

    toggleMedicationLog: (medicationId, medicationName, dosage, timeSlot, targetDate) => {
      const today = targetDate || new Date().toLocaleDateString('en-CA');
      const state = get();
      const now = new Date().toISOString();
      
      const existingLogIndex = state.medicationLogs.findIndex(
        (log) => log.medicationId === medicationId && log.timeSlot === timeSlot && log.loggedAt.startsWith(today)
      );

      if (existingLogIndex >= 0) {
        const logId = state.medicationLogs[existingLogIndex].id;
        set((state) => {
          setTimeout(triggerBackgroundSync, 500);
          return {
            medicationLogs: state.medicationLogs.filter((_, i) => i !== existingLogIndex),
            deletedRecords: [...state.deletedRecords, { id: logId, table: 'medication_logs', updatedAt: now }]
          };
        });
      } else {
        const loggedAt = new Date().toLocaleString('sv-SE').replace(' ', 'T');
        const newLog: MedicationLog = {
          id: generateUUID(),
          medicationId,
          medicationName,
          dosage,
          timeSlot,
          loggedAt,
          updatedAt: now
        };
        set((state) => {
          setTimeout(triggerBackgroundSync, 500);
          return { medicationLogs: [newLog, ...state.medicationLogs] };
        });
      }
    },

    incrementWater: (date) => {
      set((state) => {
        const currentCount = state.waterLogs[date] || 0;
        const newCount = Math.min(currentCount + 1, 20);
        setTimeout(triggerBackgroundSync, 500);
        return { waterLogs: { ...state.waterLogs, [date]: newCount } };
      });
    },

    decrementWater: (date) => {
      set((state) => {
        const currentCount = state.waterLogs[date] || 0;
        if (currentCount <= 0) return state;
        setTimeout(triggerBackgroundSync, 500);
        return { waterLogs: { ...state.waterLogs, [date]: currentCount - 1 } };
      });
    },

    addFoodLog: (mealType, description) => {
      const now = new Date().toISOString();
      const newLog: FoodLog = {
        id: generateUUID(),
        mealType,
        description,
        loggedAt: now,
        updatedAt: now
      };
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return { foodLogs: [newLog, ...state.foodLogs] };
      });
    },
  };
};