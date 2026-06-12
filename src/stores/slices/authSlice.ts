/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { getSupabase } from '../../lib/supabaseClient';
import { AppStoreState } from '../useAppStore';

export interface AuthSlice {
  session: any | null;
  user: any | null;
  signUp: (email: string) => Promise<{ success: boolean; message: string }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  sendOtpCode: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  bypassLogin: () => void;
}

export const createAuthSlice: StateCreator<
  AppStoreState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  session: null,
  user: null,

  signUp: async (email) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return { success: true, message: "تم إرسال بريد لتأكيد التسجيل بنجاح!" };
    } catch (error: any) {
      return { success: false, message: error.message || "فشل تسجيل الحساب." };
    }
  },

  sendMagicLink: async (email) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return { success: true, message: "تم إرسال رابط تسجيل الدخول السري بنجاح إلى بريدك الإلكتروني!" };
    } catch (error: any) {
      return { success: false, message: error.message || "فشل إرسال رابط الدخول السري." };
    }
  },

  sendOtpCode: async (email) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });
      if (error) throw error;
      return { success: true, message: "تم إرسال كود التحقق المكون من 6 أرقام بنجاح إلى بريدك الإلكتروني! يرجى إدخاله للمتابعة." };
    } catch (error: any) {
      return { success: false, message: error.message || "فشل إرسال كود التحقق." };
    }
  },

  verifyOtp: async (email, code) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });
      if (error) throw error;
      return { success: true, message: "تم التحقق وتسجيل الدخول بنجاح!" };
    } catch (error: any) {
      return { success: false, message: error.message || "الرمز المدخل غير صحيح أو منتهي الصلاحية. يرجى التأكد وإعادة المحاولة." };
    }
  },

  signInWithGoogle: async () => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return { success: true, message: "جاري إعادة التوجيه إلى تسجيل دخول Google..." };
    } catch (error: any) {
      return { success: false, message: error.message || "فشل تسجيل الدخول بـ Google." };
    }
  },

  signOut: async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[Auth] Error signing out:", error);
    } finally {
      // استدعاء دالة مسح البيانات بالكامل من شريحة المزامنة عبر get() المشترك
      await get().clearAllData();
    }
  },

  bypassLogin: () => {
    const mockUser = {
      id: 'mock-user-id',
      email: 'demo.user@example.com',
      user_metadata: { name: 'مستخدم تجريبي' }
    };
    const mockSession = {
      access_token: 'mock-token',
      user: mockUser,
      expires_at: 1e15
    };
    set({ 
      session: mockSession, 
      user: mockUser,
      userProfile: {
        isOnboarded: false,
        name: 'مستخدم تجريبي',
        age: 45,
        gender: 'male',
        diabetesType: 'type2',
        comorbidities: [],
        medicationTimes: { Breakfast: '08:00', Lunch: '14:00', Dinner: '20:00', Bedtime: '22:00' },
        medications: [],
        updatedAt: new Date().toISOString()
      }
    });
  },
});