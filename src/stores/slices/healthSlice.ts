/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { GlucoseReading, MedicationLog, FoodLog, HealthData, Medication } from '../../types';
import { generateUUID } from '../../lib/uuid';
import { localTimestamp } from '../../lib/datetime';

export interface HealthSlice {
  healthData: HealthData;
  addMedication: (medication: Medication) => void;
  deleteMedication: (id: string) => void;
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
    get().syncWithSupabase().catch((err) => {
      console.error("[BackgroundSync] Error syncing:", err);
    });
  };

  return {
    healthData: {
      medications: [],
      glucoseReadings: [],
      medicationLogs: [],
      foodLogs: [],
      waterLogs: {},
    },

    addMedication: (medication) => {
      const now = localTimestamp();
      set((state) => {
        const newMed = { ...medication, updatedAt: now };
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: {
            ...state.healthData,
            medications: [...state.healthData.medications, newMed],
          },
          healthDataUpdatedAt: now
        };
      });
    },

    deleteMedication: (id) => {
      const now = localTimestamp();
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: {
            ...state.healthData,
            medications: state.healthData.medications.filter((m) => m.id !== id),
          },
          healthDataUpdatedAt: now
        };
      });
    },

    addGlucoseReading: (reading) => {
      const now = localTimestamp();
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
        return {
          healthData: {
            ...state.healthData,
            glucoseReadings: [newReading, ...state.healthData.glucoseReadings],
          },
          healthDataUpdatedAt: now
        };
      });
    },

    deleteGlucoseReading: (id) => {
      const nowDel = localTimestamp();
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: {
            ...state.healthData,
            glucoseReadings: state.healthData.glucoseReadings.filter((r) => r.id !== id),
          },
          healthDataUpdatedAt: nowDel
        };
      });
    },

    toggleMedicationLog: (medicationId, medicationName, dosage, timeSlot, targetDate) => {
      const today = targetDate || new Date().toLocaleDateString('en-CA');
      const state = get();
      const now = localTimestamp();
      
      const existingLogIndex = state.healthData.medicationLogs.findIndex(
        (log) => log.medicationId === medicationId && log.timeSlot === timeSlot && log.loggedAt.startsWith(today)
      );

      if (existingLogIndex >= 0) {
        set((state) => {
          const filtered = state.healthData.medicationLogs.filter((_, i) => i !== existingLogIndex);
          setTimeout(triggerBackgroundSync, 500);
          return {
            healthData: { ...state.healthData, medicationLogs: filtered },
            healthDataUpdatedAt: now
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
          return {
            healthData: { ...state.healthData, medicationLogs: [newLog, ...state.healthData.medicationLogs] },
            healthDataUpdatedAt: now
          };
        });
      }
    },

    incrementWater: (date) => {
      set((state) => {
        const currentCount = state.healthData.waterLogs[date] || 0;
        const newCount = Math.min(currentCount + 1, 20);
        const now = localTimestamp();
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: {
            ...state.healthData,
            waterLogs: { ...state.healthData.waterLogs, [date]: newCount }
          },
          healthDataUpdatedAt: now
        };
      });
    },

    decrementWater: (date) => {
      set((state) => {
        const currentCount = state.healthData.waterLogs[date] || 0;
        if (currentCount <= 0) return state;
        const now = localTimestamp();
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: {
            ...state.healthData,
            waterLogs: { ...state.healthData.waterLogs, [date]: currentCount - 1 }
          },
          healthDataUpdatedAt: now
        };
      });
    },

    addFoodLog: (mealType, description) => {
      const now = localTimestamp();
      const newLog: FoodLog = {
        id: generateUUID(),
        mealType,
        description,
        loggedAt: now,
        updatedAt: now
      };
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return {
          healthData: { ...state.healthData, foodLogs: [newLog, ...state.healthData.foodLogs] },
          healthDataUpdatedAt: now
        };
      });
    },
  };
};