import { registerPlugin } from '@capacitor/core';

export interface MedicationAlarmPluginType {
  scheduleExactAlarm(options: {
    timestamp: number;
    medicationId: string;
    title: string;
    body: string;
  }): Promise<{ success: boolean; requestCode: number }>;

  cancelExactAlarm(options: {
    timestamp: number;
    medicationId: string;
  }): Promise<{ success: boolean }>;

  canScheduleExactAlarms(): Promise<{ granted: boolean }>;
  requestExactAlarmPermission(): Promise<{ opened: boolean }>;
  getLaunchIntentAction(): Promise<{
    isTakeAction: boolean;
    medicationId?: string;
    timeSlot?: string;
    medicationName?: string;
    dosage?: string;
  }>;
}

export const MedicationAlarm = registerPlugin<MedicationAlarmPluginType>('MedicationAlarm');
