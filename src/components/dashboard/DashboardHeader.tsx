/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string;
  isSyncing: boolean;
  syncError: string | null;
  isOffline: boolean;
  onForceSync: () => Promise<void>;
}

export const DashboardHeader = React.memo(({
  userName,
  isSyncing,
  syncError,
  isOffline,
  onForceSync
}: DashboardHeaderProps) => {

  // دالة إطلاق المزامنة اليدوية عند النقر على المؤشر
  const handleSyncClick = () => {
    if (isOffline || isSyncing) return;
    onForceSync().catch((err) => console.error("[Header] Manual sync failed:", err));
  };

  // رسم وتحديد حالة المؤشر التفاعلي بناءً على حالة الشبكة والمزامنة
  const renderSyncStatus = () => {
    if (isOffline) {
      return (
        <div className="flex flex-col items-center justify-center transform-gpu">
          <div className="relative flex h-5 w-5 items-center justify-center">
            {/* نبض أحمر دائري مسرع عبر الـ GPU */}
            <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-rose-500 opacity-75"></span>
            <CloudOff className="w-5 h-5 text-rose-400 relative z-10" strokeWidth={2} />
          </div>
          <span className="text-[8px] text-rose-400 font-black mt-1.5 leading-none">حفظ محلي (أوفلاين)</span>
        </div>
      );
    }

    if (isSyncing) {
      return (
        <div className="flex flex-col items-center justify-center transform-gpu">
          {/* حلقة دوران زرقاء سريعة */}
          <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" strokeWidth={2.5} />
          <span className="text-[8px] text-sky-400 font-black mt-1.5 leading-none">جاري المزامنة...</span>
        </div>
      );
    }

    if (syncError) {
      return (
        <div className="flex flex-col items-center justify-center transform-gpu">
          {/* مثلث تحذير برتقالي ينبض عمودياً */}
          <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" strokeWidth={2} />
          <span className="text-[8px] text-amber-400 font-black mt-1.5 leading-none">فشلت! اضغط للإعادة</span>
        </div>
      );
    }

    // الحالة الافتراضية: متصل ومزامن بنجاح
    return (
      <div className="flex flex-col items-center justify-center transform-gpu">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" strokeWidth={2} />
        <span className="text-[8px] text-emerald-400 font-black mt-1.5 leading-none">مزامنة سحابية آمنة ✓</span>
      </div>
    );
  };

  return (
    <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40 select-none shrink-0 text-right">
      <div>
        <h2 className="text-sm font-semibold text-slate-400 font-sans tracking-tight">صحتك بالدنيا، الله يقويك</h2>
        <h1 className="text-lg font-bold text-slate-100 Shami mt-0.5">أهلاً، {userName || ''}</h1>
      </div>
      
      {/* زر المؤشر التفاعلي */}
      <button
        onClick={handleSyncClick}
        disabled={isOffline || isSyncing}
        className={`p-2.5 min-w-[85px] bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner text-center transition-all duration-200 active:scale-95 ${
          isOffline 
            ? 'cursor-not-allowed opacity-80' 
            : 'cursor-pointer hover:border-slate-700'
        }`}
        title={isOffline ? "أنت غير متصل بالإنترنت حالياً" : "اضغط لإطلاق مزامنة فورية مع السحابة"}
      >
        {renderSyncStatus()}
      </button>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';