/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Layout } from './components/common/Layout';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { Sparkles, HeartPulse, Activity, RefreshCw } from 'lucide-react';
import { NotificationService } from './services/NotificationService';
import { MedicationAlarm } from './plugins/MedicationAlarm';
import { Capacitor } from '@capacitor/core';
import { AuthGateway } from './components/AuthGateway';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  const userProfile = useAppStore((state) => state.userProfile);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const initializeStore = useAppStore((state) => state.initializeStore);
  const toggleMedicationLog = useAppStore((state) => state.toggleMedicationLog);
  const session = useAppStore((state) => state.session);
  const profileReady = useAppStore((state) => state.profileReady);
  const medications = useAppStore((state) => state.healthData.medications);

  // States
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [batteryIgnored, setBatteryIgnored] = useState<boolean>(true);
  const [showOptimizationModal, setShowOptimizationModal] = useState<boolean>(false);

  // Check if app was launched from 'Take Medication' native action
  useEffect(() => {
    async function checkTakeAction() {
      if (!isInitialized) return;
      if (!Capacitor.isNativePlatform()) return;
      try {
        const parsedPlugin: any = MedicationAlarm;
        if (parsedPlugin && typeof parsedPlugin.getLaunchIntentAction === 'function') {
          const res = await parsedPlugin.getLaunchIntentAction();
          if (res && res.isTakeAction && res.medicationId && res.timeSlot) {
            const medicationId = res.medicationId;
            const timeSlot = res.timeSlot;
            
            // Look up in profile for safest name/dosage Match
            const healthData = useAppStore.getState().healthData;
            const medInProfile = healthData?.medications?.find((m) => m.id === medicationId);
            
            const medName = medInProfile?.name || res.medicationName || 'دواء السكري';
            const medDosage = medInProfile?.dosage || res.dosage || '';

            // Check if already logged today
            const today = new Date().toLocaleDateString('en-CA');
            const logs = healthData?.medicationLogs || [];
            const isLogged = logs.some(
              (l) =>
                l.medicationId === medicationId &&
                l.timeSlot === timeSlot &&
                l.loggedAt.startsWith(today)
            );

            if (!isLogged) {
              toggleMedicationLog(medicationId, medName, medDosage, timeSlot);
              console.log(`[LaunchIntent] Successfully logged medication ${medName} for timeslot ${timeSlot}.`);
            }
          }
        }
      } catch (err: any) {
        // Suppress unimplemented errors silently on web and mock testing
        if (err?.message?.includes('not implemented') || err?.message?.includes('Unimplemented')) {
          return;
        }
        console.error('[LaunchIntent] Error checking launch action:', err);
      }
    }

    checkTakeAction();

    const handleResume = () => {
      checkTakeAction();
    };

    document.addEventListener('resume', handleResume, false);
    return () => {
      document.removeEventListener('resume', handleResume, false);
    };
  }, [isInitialized, toggleMedicationLog]);

  useEffect(() => {
    // Initialize Local Notifications action listeners early in the app lifecycle
    NotificationService.initialize();

    // Graceful native-like logo splash screen timeout
    const timer = setTimeout(() => {
      initializeStore();
      setShowSplash(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [initializeStore]);

  // Run settings evaluation for Battery optimization on Android
  useEffect(() => {
    async function checkPermissionsAndSettings() {
      if (isInitialized && userProfile?.isOnboarded) {
        const isBOn = await NotificationService.isBatteryOptimizationIgnored();
        
        setBatteryIgnored(isBOn);

        if (!isBOn) {
          setShowOptimizationModal(true);
        }
      }
    }
    checkPermissionsAndSettings();
  }, [isInitialized, userProfile?.isOnboarded]);

  // Sync scheduled native local notifications whenever store is ready/onboarded profile changes
  useEffect(() => {
    if (isInitialized && userProfile?.isOnboarded) {
      NotificationService.scheduleMedicationReminders().catch((err) => {
        console.error('[App] Error scheduling reminders:', err);
      });
    }
  }, [isInitialized, userProfile?.isOnboarded, medications, userProfile?.medicationTimes]);

  // 1. Render Splash Screen
  if (showSplash || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans select-none overflow-hidden">
        <div className="w-full max-w-[430px] h-[100dvh] md:h-[840px] flex flex-col items-center justify-between py-16 text-center">
          <div></div>

          <div className="space-y-6">
            {/* Pulsing smart medical ring logo */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full shadow-[0_4px_32px_rgba(16,185,129,0.15)] animate-pulse-slow">
              <Activity className="absolute inset-0 m-auto w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-100 Shami tracking-wide">سكرك مظبوط</h1>
              <p className="text-xs text-slate-400 font-medium">مساعد السكري وتنظيم الجرعات في سوريا</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Spinning inline loader */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold font-sans uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping mr-1"></span>
              <span>جاري تحميل الملفات المحليّة الآمنة ...</span>
            </div>
            
            <div className="text-[9px] text-slate-600 Shami">
              مصمّم وفق إرشادات الطبيب لتنظيم الحالة بأمان
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 1.5. Render Auth Gate if unauthenticated
  if (!session) {
    return <AuthGateway />;
  }

  // 1.6. Waiting for profile pull from Supabase before deciding onboarding vs dashboard
  if (!profileReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans select-none overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold font-sans uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping mr-1"></span>
          <span>جاري تحميل ملفك الطبي من السحابة...</span>
        </div>
      </div>
    );
  }

  // 2. Render Onboarding Workflow if first launch
  if (!userProfile?.isOnboarded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4 text-slate-100 overflow-hidden">
        <div className="relative w-full max-w-[430px] h-[100dvh] md:h-[840px] bg-slate-950 md:rounded-[48px] md:shadow-2xl overflow-y-auto md:border-8 md:border-slate-800 flex flex-col">
          <Onboarding />
        </div>
      </div>
    );
  }

  // 3. Render Normal Dashboard Console Layout tabs
  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasProfile={true}
      >
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <ErrorBoundary key={activeTab}>
            {activeTab === 'home' && <Dashboard />}
            {activeTab === 'chat' && <Chat />}
            {activeTab === 'settings' && <Settings />}
          </ErrorBoundary>
        </div>
      </Layout>

      {showOptimizationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-[360px] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-right font-sans" dir="rtl">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <HeartPulse className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-black text-slate-100">تحسينات التنبيهات الضرورية</h2>
                <p className="text-[10px] text-slate-400">لضمان رنين منبهات الدواء الحالية والجرعات</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              لضمان رنين منبهات السكري والأنسولين في وقتها المحدد دون أي تأخير من نظام توفير البطارية في أندرويد، يرجى تفعيل وضع التشغيل غير المقيد للتطبيق.
            </p>

            {/* Step Content */}
            <div className="p-4 rounded-2xl border bg-slate-950/60 border-slate-800 space-y-3">
              <div className="text-right font-sans">
                <h4 className="text-xs font-bold text-slate-200">وضع التشغيل غير المقيد (الخلفية)</h4>
                <p className="text-[10px] text-slate-400 leading-snug mt-1">يسمح للتطبيق بإطلاق منبهات الجرعات فوراً حتى لو كان الهاتف مقفلاً أو قيد السكون.</p>
              </div>

              <button
                id="battery_btn"
                onClick={async () => {
                  await NotificationService.requestIgnoreBatteryOptimization();
                  setTimeout(async () => {
                    const check = await NotificationService.isBatteryOptimizationIgnored();
                    setBatteryIgnored(check);
                    if (check) {
                      setShowOptimizationModal(false);
                    }
                  }, 2500);
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] rounded-xl transition duration-150 active:scale-95 cursor-pointer"
              >
                اضبط البطارية لضمان وصول التنبيهات 🔋
              </button>
            </div>

            {/* Bottom Panel */}
            <div className="flex gap-2 pt-1">
              <button
                id="recheck_btn"
                onClick={async () => {
                  const isBOn = await NotificationService.isBatteryOptimizationIgnored();
                  setBatteryIgnored(isBOn);
                  if (isBOn) {
                    setShowOptimizationModal(false);
                  }
                }}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-750 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحقق مجدداً</span>
              </button>
              <button
                id="skip_btn"
                onClick={() => setShowOptimizationModal(false)}
                className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 text-xs rounded-xl transition active:scale-95 cursor-pointer font-semibold"
              >
                تخطي مؤقتاً
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
