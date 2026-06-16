/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { MedicationAlarm } from '../plugins/MedicationAlarm';
import tipsData from '../data/tips.json';
import { TipCard } from '../types';

const allTips: TipCard[] = tipsData as TipCard[];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomTips(count: number): TipCard[] {
  const pool = [...allTips];
  const picked: TipCard[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randomInt(0, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function getNextAlarmTime(hour: number, minute: number): Date {
  const now = new Date();
  const alarmDate = new Date();
  alarmDate.setHours(hour, minute, 0, 0);

  if (alarmDate.getTime() <= now.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }
  return alarmDate;
}

export class TipsNotificationService {
  private static lastScheduledDate = '';

  static async scheduleDailyTipReminders(): Promise<void> {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (this.lastScheduledDate === todayStr) {
      console.log('[TipsNotification] Already scheduled for today.');
      return;
    }
    this.lastScheduledDate = todayStr;

    const tips = pickRandomTips(2);
    if (tips.length === 0) return;

    const isNative = Capacitor.isNativePlatform();

    for (const tip of tips) {
      const hour = randomInt(11, 22);
      const minute = randomInt(0, 59);
      const alarmDate = getNextAlarmTime(hour, minute);
      const timestamp = alarmDate.getTime();

      const title = `نصيحة السكري: ${tip.title} 💡`;
      const body = tip.body;

      if (!isNative) {
        console.log(`[TipsNotification Simulator] "${tip.title}" scheduled at ${alarmDate.toLocaleString()}`);
        continue;
      }

      try {
        await MedicationAlarm.scheduleExactAlarm({
          timestamp,
          medicationId: `tip_${tip.id}`,
          title,
          body,
        });
        console.log(`[TipsNotification] Scheduled tip "${tip.title}" at ${alarmDate.toISOString()}`);
      } catch (error) {
        console.error(`[TipsNotification] Failed to schedule tip alarm "${tip.title}":`, error);
      }
    }
  }

  static async scheduleTestTip(minutesFromNow: number = 1): Promise<void> {
    const tip = pickRandomTips(1)[0];
    if (!tip) return;

    const timestamp = Date.now() + minutesFromNow * 60_000;
    const title = `نصيحة السكري: ${tip.title} 💡`;
    const body = tip.body;

    const isNative = Capacitor.isNativePlatform();
    if (!isNative) {
      console.log(`[TipsNotification Test] "${tip.title}" would fire in ${minutesFromNow} min`);
      return;
    }

    try {
      await MedicationAlarm.scheduleExactAlarm({
        timestamp,
        medicationId: `tip_test_${tip.id}`,
        title,
        body,
      });
      console.log(`[TipsNotification Test] Scheduled test tip "${tip.title}" to fire in ${minutesFromNow} min`);
    } catch (error) {
      console.error(`[TipsNotification Test] Failed to schedule test alarm:`, error);
    }
  }

  static resetSchedule(): void {
    this.lastScheduledDate = '';
  }
}
