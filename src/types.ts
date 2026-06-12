/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// واجهة أساسية تشترك فيها جميع الجداول لدعم المزامنة الذكية والحذف الناعم
export interface SyncableRecord {
  isDeleted?: boolean;
  updatedAt?: string;
}

export interface Medication extends SyncableRecord {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g. "Once daily", "Twice daily"
  timeSlots: string[]; // e.g. ["Breakfast", "Dinner"]
}

export interface MedicationLog extends SyncableRecord {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  timeSlot: string; // "Breakfast" | "Lunch" | "Dinner" | "Bedtime"
  loggedAt: string; // ISO date-time
}

export interface GlucoseReading extends SyncableRecord {
  id: string;
  value: number; // mg/dL
  mealRelation: 'fasting' | 'post-meal' | 'before-meal' | 'bedtime' | 'random';
  loggedAt: string; // ISO date-time
  status: 'low' | 'normal' | 'high'; // low < 70, normal 70-130 (fasting) or 70-180 (post), high > 130/180
  notes?: string;
}

export interface WaterLog extends SyncableRecord {
  id: string;
  count: number; // current cups
  target: number; // e.g., 10 cups
  date: string; // YYYY-MM-DD
}

export interface FoodLog extends SyncableRecord {
  id: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  description: string;
  loggedAt: string;
}

export interface ChatMessage extends SyncableRecord {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    mimeType: string;
    dataUrl: string; // Base64 representation or mockup reference
  };
}

export interface UserProfile extends SyncableRecord {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  diabetesType: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  comorbidities: string[]; // e.g., 'Hypertension', 'Dyslipidemia'
  medications: Medication[];
  medicationTimes: {
    Breakfast: string; // e.g. "08:00 AM"
    Lunch: string; // e.g. "01:00 PM"
    Dinner: string; // e.g. "08:00 PM"
    Bedtime: string; // e.g. "10:00 PM"
  };
  isOnboarded: boolean;
  currentDeviceId?: string; // بصمة الجهاز الحالي لمنع الدخول من أجهزة متعددة
}