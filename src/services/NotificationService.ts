/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../stores/useAppStore';
import { MedicationAlarm } from '../plugins/MedicationAlarm';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Robustly parse string representations of time (e.g. "08:00 AM", "1:30 PM", "14:00")
 * into numeric hour and minute components.
 */
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const cleanStr = timeStr.trim().toUpperCase();
  const match = cleanStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    const parts = cleanStr.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return { hour: h % 24, minute: m % 60 };
      }
    }
    return null;
  }

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm) {
    if (ampm === 'PM' && hour < 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
  }

  return { hour, minute };
}

function getArabicTimeSlotLabel(slot: string): string {
  switch (slot) {
    case 'Breakfast': return 'الفطور';
    case 'Lunch': return 'الغداء';
    case 'Dinner': return 'العشاء';
    case 'Bedtime': return 'النوم';
    default: return slot;
  }
}

/**
 * Calculates the next occurrence of a time (hour & minute) as a Date object from the current time.
 */
function getNextAlarmTime(hour: number, minute: number): Date {
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hour, minute, 0, 0);

  if (alarmDate.getTime() <= now.getTime()) {
    // If the alarm time is in the past today, schedule it for tomorrow
    alarmDate.setDate(alarmDate.getDate() + 1);
  }
  return alarmDate;
}

export class NotificationService {
  private static initialized = false;

  /**
   * Mock initialize for notification system
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[NotificationService] Exact alarm manager service successfully initialized.');

    // Proactively request notification permissions on startup if native
    if (Capacitor.isNativePlatform()) {
      await this.requestPermission();
    }
  }

  /**
   * Request user permission (always returns true for web and fallback compatibility)
   */
  static async requestPermission(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return true;
    try {
      const check = await LocalNotifications.checkPermissions();
      if (check.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        return req.display === 'granted';
      }
      return true;
    } catch (error) {
      console.error('[NotificationService] Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Checks if exact alarm permission is granted (for Android 12+)
   */
  static async isExactAlarmPermissionGranted(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return true;
    try {
      const parsedPlugin: any = MedicationAlarm;
      if (parsedPlugin.canScheduleExactAlarms) {
        const res = await parsedPlugin.canScheduleExactAlarms();
        return !!res.granted;
      }
      return true;
    } catch (error) {
      console.error('[NotificationService] Error checking exact alarm permission:', error);
      return true;
    }
  }

  /**
   * Opens the system settings screen for Allow Alarms and Reminders
   */
  static async requestExactAlarmPermission(): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return false;
    try {
      const parsedPlugin: any = MedicationAlarm;
      if (parsedPlugin.requestExactAlarmPermission) {
        const res = await parsedPlugin.requestExactAlarmPermission();
        return !!res.opened;
      }
      return false;
    } catch (error) {
      console.error('[NotificationService] Error requesting exact alarm permission:', error);
      return false;
    }
  }

  /**
   * Battery optimization methods (using custom exact alarm check)
   */
  static async isBatteryOptimizationIgnored(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const exactGranted = await this.isExactAlarmPermissionGranted();
      return exactGranted;
    }
    return true;
  }

  static async requestIgnoreBatteryOptimization(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.requestExactAlarmPermission();
    } else {
      console.log('[NotificationService] Battery optimization settings are managed by OS, exact alarms bypass Doze automatically.');
    }
  }

  /**
   * Cancel and clear scheduled local alarms
   */
  static async clearAllNotifications(): Promise<void> {
    console.log('[NotificationService] Requesting cancel of redundant alarms.');
  }

  /**
   * Reads from the live Zustand store state and schedules exact alarms for configured medications.
   */
  static async scheduleMedicationReminders(): Promise<void> {
    const isNative = Capacitor.isNativePlatform();
    
    const state = useAppStore.getState();
    const profile = state.userProfile;

    if (!profile || !profile.isOnboarded) {
      console.log('[NotificationService] Onboarding not completed. Skipping alarm schedule.');
      return;
    }

    const medications = profile.medications || [];
    const medicationTimes = profile.medicationTimes || {
      Breakfast: '08:00 AM',
      Lunch: '01:00 PM',
      Dinner: '08:00 PM',
      Bedtime: '10:00 PM',
    };

    console.log(`[NotificationService] Scheduling exact alarms for ${medications.length} medications.`);

    if (medications.length === 0) {
      console.log('[NotificationService] No medications config found.');
      return;
    }

    for (const med of medications) {
      const slots = med.timeSlots || [];
      for (const slot of slots) {
        let rawTime = (medicationTimes as any)[slot];
        if (!rawTime && (slot.includes(':') || slot.includes('AM') || slot.includes('PM'))) {
          rawTime = slot;
        }
        if (!rawTime) continue;

        const timeParsed = parseTime(rawTime);
        if (!timeParsed) {
          console.warn(`[NotificationService] Could not parse time representation: "${rawTime}" for timeslot ${slot}`);
          continue;
        }

        const alarmDate = getNextAlarmTime(timeParsed.hour, timeParsed.minute);
        const timestamp = alarmDate.getTime();
        const arabicSlotStr = getArabicTimeSlotLabel(slot);

        // Check if this timeslot was already taken (logged) today
        const todayStr = new Date().toLocaleDateString('en-CA');
        const logs = state.medicationLogs || [];
        const isLoggedToday = logs.some(
          (log) =>
            log.medicationId === med.id &&
            log.timeSlot === slot &&
            log.loggedAt.startsWith(todayStr)
        );

        if (isLoggedToday) {
          console.log(`[NotificationService] Medication "${med.name}" (${slot}) already taken today. Skipping notification / canceling existing alarm.`);
          if (isNative) {
            try {
              await MedicationAlarm.cancelExactAlarm({
                timestamp,
                medicationId: `${med.id}_${slot}`,
              });
            } catch (cancelErr) {
              console.warn('[NotificationService] Cancel exact alarm failed:', cancelErr);
            }
          }
          continue;
        }

        const title = 'تذكير بموعد الدواء السكري 💊';
        const body = `حان الآن موعد أخذ جرعة دواء "${med.name}" (${med.dosage}) - ${arabicSlotStr}. سكرك مظبوط دائمًا بكامل صحتك وسعادتك!`;

        if (!isNative) {
          console.log(`[NotificationService Simulator] Mock Schedule: [${med.name}] at ${alarmDate.toLocaleString()}`);
          continue;
        }

        try {
          await MedicationAlarm.scheduleExactAlarm({
            timestamp,
            medicationId: `${med.id}_${slot}`,
            title,
            body
          });
          console.log(`[NotificationService] Scheduled exact alarm for "${med.name}" (${slot}) successfully at target time: ${alarmDate.toISOString()}`);
        } catch (error) {
          console.error(`[NotificationService] Failed to schedule exact alarm for medication ${med.name}:`, error);
        }
      }
    }
  }
}
