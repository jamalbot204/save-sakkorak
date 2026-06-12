/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Trash2, ShieldAlert, RefreshCw, HardDrive, Smartphone, Share2, MapPin } from 'lucide-react';

export const Settings: React.FC = () => {
  const userProfile = useAppStore((state) => state.userProfile);
  const clearAllData = useAppStore((state) => state.clearAllData);

  // States
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const triggerResetModal = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmReset = async () => {
    setShowConfirmModal(false);
    setIsResetting(true);
    try {
      await clearAllData();
      
      // Wipe cookies as well to be completely thorough
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Safe delay to let database delete flush finish cleanly
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error('Reset error:', err);
      window.location.reload();
    }
  };

  const diabetesTypeToLabel = (type: string) => {
    switch (type) {
      case 'type1': return 'النمط الأول (Type 1)';
      case 'type2': return 'النمط الثاني (Type 2)';
      case 'gestational': return 'سكري الحمل';
      default: return 'مرحلة ما قبل السكري';
    }
  };

  return (
    <div className="flex-1 p-5 pb-8 space-y-5 flex flex-col justify-start overflow-y-auto min-h-0">
      
      {/* Settings Screen Title header */}
      <div className="text-right border-b border-slate-800 pb-3 h-11 shrink-0 select-none">
        <h1 className="text-base font-bold text-slate-100 font-sans">إعدادات الملف والتطبيق</h1>
      </div>

      {/* USER PROFILE SUMMARY CARD */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 space-y-4 shrink-0">
        <div className="flex justify-between items-center select-none">
          <span className="text-xs font-bold text-slate-400">ملخص ملف الحالة الطبي</span>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2.5 py-1 rounded-full text-[9px] font-bold">الوضعية الآمنة✓</span>
        </div>

        <div className="space-y-2.5 text-right font-sans text-xs">
          <div className="flex justify-between border-b border-slate-800 pb-1.5 pt-0.5">
            <span className="text-slate-500">اسم المريض</span>
            <span className="text-slate-200 font-bold">{userProfile?.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1.5">
            <span className="text-slate-500">العمر</span>
            <span className="text-slate-200 font-bold">{userProfile?.age} سنة</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1.5">
            <span className="text-slate-500">نوع السكري</span>
            <span className="text-emerald-400 font-bold">{diabetesTypeToLabel(userProfile?.diabetesType || 'type2')}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 block pb-1">المضاعفات والقصور المصاحب:</span>
            <div className="flex flex-wrap gap-1.5">
              {userProfile?.comorbidities && userProfile.comorbidities.length > 0 && !userProfile.comorbidities.includes('none') ? (
                userProfile.comorbidities.map((c) => {
                  const map: Record<string, string> = {
                    hypertension: 'ارتفاع ضغط الدم',
                    cholesterol: 'ارتفاع الشحوم',
                    retinopathy: 'شبكية العين',
                    nephropathy: 'الكلى',
                    neuropathy: 'الأعصاب',
                    cardio: 'مشاكل القلب',
                  };
                  return (
                    <span key={c} className="bg-slate-950 border border-slate-800 text-[9px] font-bold text-slate-400 px-2 py-0.5 rounded-lg">
                      {map[c] || c}
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">خالي من أي مضاعفات أخرى والحمد لله</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DEFERRED FEATURES MOCKS (GPS, SMARTWATCH, NOTIFICATIONS, EXPORT) */}
      <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-5 space-y-3 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 block select-none uppercase">بوابات التقنيات المستقبلية (المرحلة 2)</span>
        
        <div className="grid grid-cols-2 gap-2 text-right text-[10px] font-semibold">
          
          <button 
            disabled 
            className="flex items-center justify-start gap-2 p-3 bg-slate-950/40 border border-slate-900 text-slate-600 rounded-xl cursor-not-allowed select-none"
          >
            <Smartphone className="w-4 h-4 text-slate-700 ml-1" />
            <span>مزامنة الساعة الذكية (PPG)</span>
          </button>

          <button 
            disabled 
            className="flex items-center justify-start gap-2 p-3 bg-slate-950/40 border border-slate-900 text-slate-600 rounded-xl cursor-not-allowed select-none"
          >
            <MapPin className="w-4 h-4 text-slate-700 ml-1" />
            <span>تقرير GPS لأقرب صيدلية في سوريا</span>
          </button>

          <button 
            disabled 
            className="flex items-center justify-start gap-2 p-3 bg-slate-950/40 border border-slate-900 text-slate-600 rounded-xl cursor-not-allowed select-none"
          >
            <Share2 className="w-4 h-4 text-slate-700 ml-1" />
            <span>تصدير PDF لتقارير السكر الشهريّة</span>
          </button>

          <button 
            disabled 
            className="flex items-center justify-start gap-2 p-3 bg-slate-950/40 border border-slate-900 text-slate-600 rounded-xl cursor-not-allowed select-none"
          >
            <ShieldAlert className="w-4 h-4 text-slate-700 ml-1" />
            <span>منبه الإشعارات والنواقل السلكية</span>
          </button>

        </div>
      </div>

      {/* RESET AND STORAGE REMOVAL CONTROLS */}
      <div className="bg-rose-500/5 border border-rose-500/15 rounded-3xl p-5 space-y-4 shrink-0">
        <h2 className="text-xs font-bold text-rose-400 select-none flex items-center">
          <Trash2 className="w-4 h-4 text-rose-400 mr-1.5 ml-1.5" />
          إدارة الذاكرة والخصوصية
        </h2>
        
        <p className="text-[10px] text-rose-300/80 leading-relaxed text-right select-none">
          سيؤدي النقر على الزر أدناه إلى مسح كافة البيانات من الذاكرة المحلية لجهازك وحذف التاريخ الطبي وملفك الشخصي.
        </p>

        <button
          onClick={triggerResetModal}
          disabled={isResetting}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            isResetting 
              ? 'bg-rose-500/5 border border-rose-500/10 text-rose-300/60 cursor-not-allowed select-none'
              : 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 active:scale-95'
          }`}
        >
          {isResetting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
              <span>جاري مسح الذاكرة وبدء التشغيل من الصفر...</span>
            </>
          ) : (
            <>
              <HardDrive className="w-4 h-4" />
              <span>مسح كافة البيانات وإعادة التشغيل</span>
            </>
          )}
        </button>
      </div>

      {/* CUSTOM ELEGANT CONFIRMATION DIALOG (IFRAME SAFE) */}
      {showConfirmModal && (
        <div id="confirm-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div 
            id="confirm-modal-card" 
            className="w-full max-w-xs bg-slate-900 border border-slate-800/90 rounded-3xl p-5 shadow-2xl space-y-4 text-right transform scale-100 transition-transform duration-300"
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-rose-400 font-sans">تأكيد مسح البيانات بالكامل</h3>
                <p className="text-[9px] text-slate-500 font-semibold font-mono">DANGER ZONE</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
              هل أنت متأكد من رغبتك في مسح كافة بياناتك الطبية، قراءات السكر المضافة، وجلسات الدردشة الذكية؟ سيتم حذف كل شيء نهائياً من هاتفك ولا يمكن التراجع عن هذا الإجراء مطلقاً.
            </p>

            <div className="flex gap-2 pt-1 font-sans">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-[10px] rounded-lg border border-slate-700/40 transition-colors active:scale-95"
              >
                تراجع وإلغاء
              </button>
              
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] rounded-lg transition-colors active:scale-95 flex items-center justify-center gap-1 shadow-md shadow-rose-600/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>نعم، امسح البيانات</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
