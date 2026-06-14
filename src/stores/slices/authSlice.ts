/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabaseClient';
import { AppStoreState } from '../useAppStore';
import { localTimestamp } from '../../lib/datetime';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export interface AuthSlice {
  session: Session | null;
  user: User | null;
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
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.initialize();
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication.idToken;

        const supabase = getSupabase();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) throw error;
        return { success: true, message: "تم تسجيل الدخول بحساب Google بنجاح!" };
      }

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
      console.error("[GoogleSignIn] Raw error:", error);
      console.error("[GoogleSignIn] Error message:", error?.message);
      console.error("[GoogleSignIn] Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return { success: false, message: error.message || "فشل تسجيل الدخول بـ Google." };
    }
  },

  signOut: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try { await GoogleAuth.signOut(); } catch (_) {}
      }
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
      app_metadata: {},
      user_metadata: { name: 'مستخدم تجريبي' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    const mockSession: Session = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 1e15,
      expires_at: 1e15,
      token_type: 'bearer',
      user: mockUser as User,
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
        updatedAt: localTimestamp()
      }
    });
  },
});