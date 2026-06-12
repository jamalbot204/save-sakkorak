import React from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { GlucoseReading } from '../../types';
import { BloodSugarChart } from './BloodSugarChart';

interface BloodGlucoseCardProps {
  latestReading?: GlucoseReading;
  glucoseReadings: GlucoseReading[];
  onShowLogModal: () => void;
  onShowDetailedModal: () => void;
}

export const BloodGlucoseCard = React.memo(({ latestReading, glucoseReadings, onShowLogModal, onShowDetailedModal }: BloodGlucoseCardProps) => {
  const getStatusBadge = (status: 'low' | 'normal' | 'high') => {
    switch (status) {
      case 'low':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold">منخفض ⚠️</span>;
      case 'high':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold">مرتفع ⚠️</span>;
      default:
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-bold">طبيعي ✓</span>;
    }
  };

  const translateRelation = (relation: string) => {
    const mappings: Record<string, string> = {
      fasting: 'صائم',
      'before-meal': 'قبل الوجبة',
      'post-meal': 'بعد الوجبة',
      bedtime: 'قبل النوم',
      random: 'قراءة عشوائية',
    };
    return mappings[relation] || relation;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 rounded-3xl p-5 border border-slate-800/80 shadow-xl flex flex-col space-y-3">
      <div className="flex justify-between items-center select-none">
        <span className="text-xs font-semibold text-slate-300">مستوى سكر الدم الأخير</span>
        {latestReading ? (
          getStatusBadge(latestReading.status)
        ) : (
          <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-lg text-[9px] font-bold">لا توجد قراءات اليوم</span>
        )}
      </div>

      <div className="flex items-baseline justify-start gap-2 select-none">
        <span className="text-3xl font-black text-slate-100 font-sans">
          {latestReading ? latestReading.value : '110'}
        </span>
        <span className="text-xs text-slate-400 font-medium">ملغ / ديسيلتر (mg/dL)</span>
        {latestReading && (
          <span className="text-[10px] text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-full mx-2">
            {translateRelation(latestReading.mealRelation)}
          </span>
        )}
      </div>

      <BloodSugarChart glucoseReadings={glucoseReadings} />

      <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 select-none text-[10px] text-slate-500 font-medium">
        <span>الهدف الطبي: 70 - 130 ملغ✓</span>
        <span>آخر فحص: {latestReading ? new Date(latestReading.loggedAt).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }) : 'منذ ساعتين'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1.5">
        <button
          onClick={onShowLogModal}
          className="bg-sky-500/10 border border-sky-500/20 text-sky-400 py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.95]"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>تسجيل قراءة جديده</span>
        </button>
        <button
          onClick={onShowDetailedModal}
          className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 text-slate-300 py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.95]"
        >
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <span>سجل القراءات والمخطط</span>
        </button>
      </div>
    </div>
  );
});
BloodGlucoseCard.displayName = 'BloodGlucoseCard';
