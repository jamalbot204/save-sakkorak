import React from 'react';
import { GlassWater, Plus, Pill } from 'lucide-react';
import { UserProfile, MedicationLog } from '../../types';

interface MedicationWaterGridProps {
  userProfile: UserProfile | null;
  medicationLogs: MedicationLog[];
  today: string;
  waterCount: number;
  targetWater: number;
  onToggleMedication?: (id: string, name: string, dosage: string, slot: string) => void;
  onIncrementWater: (date: string) => void;
  onDecrementWater: (date: string) => void;
  onOpenAddMedication?: () => void;
  onOpenMedicationManager?: () => void;
}

export const MedicationWaterGrid = React.memo(({
  userProfile,
  medicationLogs,
  today,
  waterCount,
  targetWater,
  onIncrementWater,
  onDecrementWater,
  onOpenMedicationManager
}: MedicationWaterGridProps) => {
  const waterPct = Math.min((waterCount / targetWater) * 100, 100);

  // Compute total medication slots/tasks loaded
  const totalSlots = React.useMemo(() => {
    return userProfile?.medications?.reduce((acc, med) => acc + (med.timeSlots?.length || 0), 0) || 0;
  }, [userProfile]);

  // Compute successfully taken tasks for today
  const takenSlotsCount = React.useMemo(() => {
    if (!userProfile?.medications) return 0;
    let count = 0;
    userProfile.medications.forEach(med => {
      med.timeSlots.forEach(slot => {
        const isLogged = medicationLogs.some(
          log => log.medicationId === med.id && log.timeSlot === slot && log.loggedAt.startsWith(today)
        );
        if (isLogged) count++;
      });
    });
    return count;
  }, [userProfile, medicationLogs, today]);

  return (
    <div className="grid grid-cols-2 gap-4 shrink-0">
      {/* Right Column has been replaced by this gorgeous Entry control button */}
      <button
        onClick={onOpenMedicationManager}
        className="text-right bg-slate-900/40 hover:bg-slate-900/50 border border-slate-800/60 hover:border-slate-800 rounded-3xl p-4 flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer group select-none relative"
      >
        <div className="w-full">
          <div className="flex justify-between items-start w-full">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
              <Pill className="w-5 h-5 text-emerald-400" />
            </div>
            
            <span className="text-[8px] font-black text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800/40 tracking-wide">
              جدولة ومتابعة
            </span>
          </div>

          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-300 block">جرعات وجدول الأدوية</span>
            <span className="text-[10px] font-bold text-slate-500 block mt-1 leading-relaxed">
              {totalSlots > 0 ? (
                <>
                  أُخذت <span className="text-emerald-400 font-mono text-[11px] font-black">{takenSlotsCount}</span> من <span className="font-mono text-[11px] font-black">{totalSlots}</span> اليوم
                </>
              ) : (
                "اضغط لضبط جرعاتك"
              )}
            </span>
          </div>
        </div>

        <div className="w-full mt-3 pt-2.5 border-t border-slate-800/40 flex items-center justify-between text-emerald-400 group-hover:text-emerald-300">
          <span className="text-[9px] font-extrabold tracking-wide">
            {totalSlots > 0 ? (
              takenSlotsCount === totalSlots ? "أكملت كل جرعاتك! 🎉" : "متابعة ساعات ومواعيد التنبيه"
            ) : (
              "إدخال دوائك الأول"
            )}
          </span>
          <Plus className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {/* Water Tracker column remains intact */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-4 flex flex-col justify-between">
        <div className="select-none">
          <span className="text-xs font-semibold text-slate-300 block">راقب شرب المياه</span>
          <span className="text-[10px] font-bold text-sky-400 font-mono mt-0.5">{waterCount}/{targetWater} كوب</span>
        </div>

        <div className="my-3 flex flex-col items-center">
          <div className="w-14 h-14 bg-sky-950/60 border border-sky-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-sky-500/30 transition-all duration-300 transform-gpu"
              style={{ height: `${waterPct}%` }}
            ></div>
            <GlassWater className="w-6 h-6 text-sky-400 z-10 animate-bounce duration-1000" />
          </div>
          
          <div className="text-[9px] text-sky-300/80 mt-2 font-bold select-none">{waterPct.toFixed(0)}% تم إنجازه</div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
             onClick={() => onDecrementWater(today)}
             className="flex-1 py-1 text-xs font-black bg-slate-950/80 border border-slate-800 text-slate-400 rounded-lg active:scale-90"
          >
            -
          </button>
          <button
            onClick={() => onIncrementWater(today)}
            className="flex-1 py-1 text-xs font-black bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg active:scale-90"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
});
MedicationWaterGrid.displayName = 'MedicationWaterGrid';
