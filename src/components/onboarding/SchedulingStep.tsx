import React from 'react';
import { CalendarDays } from 'lucide-react';

interface SchedulingStepProps {
  medicationTimes: {
    Breakfast: string;
    Lunch: string;
    Dinner: string;
    Bedtime: string;
  };
  setMedicationTimes: (times: {
    Breakfast: string;
    Lunch: string;
    Dinner: string;
    Bedtime: string;
  }) => void;
}

export const SchedulingStep = React.memo(({ medicationTimes, setMedicationTimes }: SchedulingStepProps) => {

  const handleChange = (key: string, value: string) => {
    setMedicationTimes({ ...medicationTimes, [key]: value });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2 mb-1 select-none">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
          <CalendarDays className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-200">جدولة مواعيد الوجبات والأدوية</h2>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed select-none">
        يرجى تخصيص التوقيتات التقريبية لنمط حياتك اليومي في سوريا لجدولة التنبيهات:
      </p>

      <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
        {[
          { key: 'Breakfast', label: 'موعد وجبة الفطور' },
          { key: 'Lunch', label: 'موعد وجبة الغداء' },
          { key: 'Dinner', label: 'موعد وجبة العشاء' },
          { key: 'Bedtime', label: 'موعد النوم' },
        ].map((item) => (
          <div key={item.key} className="flex justify-between items-center bg-slate-900/30 px-3.5 py-2.5 rounded-xl border border-slate-800/60">
            <span className="text-xs font-semibold text-slate-300">{item.label}</span>
            <input 
              type="text" 
              value={(medicationTimes as any)[item.key]} 
              onChange={(e) => handleChange(item.key, e.target.value)}
              placeholder="e.g. 08:00 AM"
              className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-center text-xs font-bold text-emerald-400 rounded-lg py-1 px-3 w-28 uppercase font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
});
SchedulingStep.displayName = 'SchedulingStep';
