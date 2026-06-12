import React, { useState } from 'react';
import { Apple, Plus } from 'lucide-react';
import { FoodLog } from '../../types';

interface FoodLoggerProps {
  foodLogs: FoodLog[];
  onAddFoodLog: (meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', desc: string) => void;
}

export const FoodLogger = React.memo(({ foodLogs, onAddFoodLog }: FoodLoggerProps) => {
  const [foodText, setFoodText] = useState<string>('');
  const [foodMeal, setFoodMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodText.trim()) return;
    onAddFoodLog(foodMeal, foodText.trim());
    setFoodText('');
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-5 space-y-3 shrink-0">
      <div className="flex justify-between items-center select-none">
        <div className="flex items-center gap-1.5">
          <Apple className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">سجل طعامك لمنع ارتفاع السكر</span>
        </div>
        <span className="text-[9px] text-slate-500 font-bold">يومي متاح</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full min-w-0">
        <select
          value={foodMeal}
          onChange={(e) => setFoodMeal(e.target.value as any)}
          className="bg-slate-950 border border-slate-800/80 text-[10px] text-slate-300 rounded-xl px-2 font-bold shrink-0 max-w-[70px]"
        >
          <option value="Breakfast">فطور</option>
          <option value="Lunch">غداء</option>
          <option value="Dinner">عشاء</option>
          <option value="Snack">سناك</option>
        </select>
        <input
          type="text"
          value={foodText}
          onChange={(e) => setFoodText(e.target.value)}
          placeholder="مثال: قطعتين خبز نخالة مع زيت وزعتر..."
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 font-medium"
        />
        <button
          type="submit"
          disabled={!foodText.trim()}
          className="px-3 bg-emerald-500/15 border border-emerald-500/25 disabled:opacity-50 rounded-xl text-emerald-400 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {foodLogs.length > 0 && (
        <div className="space-y-1.5 pt-1.5 max-h-[110px] overflow-y-auto">
          {foodLogs.slice(0, 3).map((log) => {
            const mealMap: Record<string, string> = {
              Breakfast: 'فطور',
              Lunch: 'غداء',
              Dinner: 'عشاء',
              Snack: 'سناك',
            };
            return (
              <div key={log.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 px-3 py-2 rounded-xl text-xs">
                <span className="text-slate-300 text-[11px] font-medium leading-normal pr-1 truncate">{log.description}</span>
                <span className="text-[9px] text-amber-400/85 font-extrabold shrink-0 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                  {mealMap[log.mealType]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
FoodLogger.displayName = 'FoodLogger';
