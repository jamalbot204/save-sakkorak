/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { BloodGlucoseCard } from './dashboard/BloodGlucoseCard';
import { MedicationWaterGrid } from './dashboard/MedicationWaterGrid';
import { FoodLogger } from './dashboard/FoodLogger';
import { SmartAlertCard } from './dashboard/SmartAlertCard';
import { GlucoseLogModal } from './dashboard/GlucoseLogModal';
import { AddMedicationModal } from './dashboard/AddMedicationModal';
import { MedicationManagerModal } from './dashboard/MedicationManagerModal';
import { ExtendedGlucoseModal } from './dashboard/ExtendedGlucoseModal';
import { Medication } from '../types';
import { isOnline, subscribeToNetwork } from '../lib/networkStatus';

export const Dashboard: React.FC = () => {
  const userProfile = useAppStore((state) => state.userProfile);
  const healthData = useAppStore((state) => state.healthData);

  const isSyncing = useAppStore((state) => state.isSyncing);
  const lastSyncStatus = useAppStore((state) => state.lastSyncStatus);
  const syncWithSupabase = useAppStore((state) => state.syncWithSupabase);

  const addGlucoseReading = useAppStore((state) => state.addGlucoseReading);
  const toggleMedicationLog = useAppStore((state) => state.toggleMedicationLog);
  const incrementWater = useAppStore((state) => state.incrementWater);
  const addMedication = useAppStore((state) => state.addMedication);
  const decrementWater = useAppStore((state) => state.decrementWater);
  const addFoodLog = useAppStore((state) => state.addFoodLog);

  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState<boolean>(false);
  const [showMedicationManager, setShowMedicationManager] = useState<boolean>(false);
  const [showDetailedModal, setShowDetailedModal] = useState<boolean>(false);
  
  const [isOffline, setIsOffline] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    isOnline().then((online) => {
      if (!cancelled) setIsOffline(!online);
    });

    const unsubscribe = subscribeToNetwork((online) => {
      if (cancelled) return;
      setIsOffline(!online);
      if (online) {
        syncWithSupabase().catch((err) => console.error("[Dashboard] Auto sync on reconnect failed:", err));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [syncWithSupabase]);

  const handleOpenLogModal = useCallback(() => {
    setShowLogModal(true);
  }, []);

  const handleCloseLogModal = useCallback(() => {
    setShowLogModal(false);
  }, []);

  const handleOpenDetailedModal = useCallback(() => {
    setShowDetailedModal(true);
  }, []);

  const handleCloseDetailedModal = useCallback(() => {
    setShowDetailedModal(false);
  }, []);

  const handleOpenAddMedication = useCallback(() => {
    setShowAddMedicationModal(true);
  }, []);

  const handleCloseAddMedication = useCallback(() => {
    setShowAddMedicationModal(false);
  }, []);

  const handleOpenMedicationManager = useCallback(() => {
    setShowMedicationManager(true);
  }, []);

  const handleCloseMedicationManager = useCallback(() => {
    setShowMedicationManager(false);
  }, []);

  const today = new Date().toLocaleDateString('en-CA');
  const waterCount = healthData.waterLogs[today] || 0;
  const targetWater = 10;

  const handleSaveGlucose = useCallback((
    value: number, 
    mealRelation: 'fasting' | 'post-meal' | 'before-meal' | 'bedtime' | 'random', 
    notes?: string
  ) => {
    addGlucoseReading({ value, mealRelation, notes });
    setShowLogModal(false);
  }, [addGlucoseReading]);

  const handleToggleMedication = useCallback((id: string, name: string, dosage: string, slot: string) => {
    toggleMedicationLog(id, name, dosage, slot);
  }, [toggleMedicationLog]);

  const handleIncrementWater = useCallback((date: string) => {
    incrementWater(date);
  }, [incrementWater]);

  const handleDecrementWater = useCallback((date: string) => {
    decrementWater(date);
  }, [decrementWater]);

  const handleAddFoodLog = useCallback((meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', desc: string) => {
    addFoodLog(meal, desc);
  }, [addFoodLog]);

  const handleSaveMedication = useCallback(async (medication: Medication) => {
    addMedication(medication);
    setShowAddMedicationModal(false);

    // Explicitly schedule exact alarms right after saving
    try {
      const { NotificationService } = await import('../services/NotificationService');
      await NotificationService.scheduleMedicationReminders();
    } catch (e) {
      console.error('[Dashboard] Error scheduling exact alarm on save:', e);
    }
  }, [addMedication]);

  const latestReading = healthData.glucoseReadings[0];

  return (
    <div className="flex-1 p-5 pb-8 space-y-5 flex flex-col justify-start overflow-y-auto min-h-0">
      <DashboardHeader 
        userName={userProfile?.name} 
        isSyncing={isSyncing}
        lastSyncStatus={lastSyncStatus}
        isOffline={isOffline}
        onForceSync={syncWithSupabase}
      />

      <BloodGlucoseCard 
        latestReading={latestReading} 
        glucoseReadings={healthData.glucoseReadings} 
        onShowLogModal={handleOpenLogModal} 
        onShowDetailedModal={handleOpenDetailedModal}
      />

      <MedicationWaterGrid 
        medications={healthData.medications}
        medicationLogs={healthData.medicationLogs}
        today={today}
        waterCount={waterCount}
        targetWater={targetWater}
        onToggleMedication={handleToggleMedication}
        onIncrementWater={handleIncrementWater}
        onDecrementWater={handleDecrementWater}
        onOpenAddMedication={handleOpenAddMedication}
        onOpenMedicationManager={handleOpenMedicationManager}
      />

      <FoodLogger 
        foodLogs={healthData.foodLogs} 
        onAddFoodLog={handleAddFoodLog} 
      />

      <SmartAlertCard />

      {showLogModal && (
        <GlucoseLogModal 
          onClose={handleCloseLogModal} 
          onSave={handleSaveGlucose} 
        />
      )}

      {showAddMedicationModal && (
        <AddMedicationModal
          onClose={handleCloseAddMedication}
          onSave={handleSaveMedication}
        />
      )}

      {showMedicationManager && (
        <MedicationManagerModal
          onClose={handleCloseMedicationManager}
          onSaveMedication={handleSaveMedication}
        />
      )}

      {showDetailedModal && (
        <ExtendedGlucoseModal
          onClose={handleCloseDetailedModal}
        />
      )}
    </div>
  );
};