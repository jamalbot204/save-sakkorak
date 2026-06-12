import React from 'react';
import { Heart, Check } from 'lucide-react';

interface ComorbiditiesStepProps {
  selectedComorbidities: string[];
  toggleComorbidity: (key: string) => void;
}

export const ComorbiditiesStep = React.memo(({ selectedComorbidities, toggleComorbidity }: ComorbiditiesStepProps) => {

  const comorbiditiesList = [
    { key: 'hypertension', label: 'ارتفاع ضغط الدم (ضغط)' },
    { key: 'cholesterol', label: 'ارتفاع الكوليسترول / الشحوم' },
    { key: 'retinopathy', label: 'اعتلال شبكية العين' },
    { key: 'nephropathy', label: 'قصور أو مشاكل الكلى' },
    { key: 'neuropathy', label: 'ألم أو خدر الأعصاب الطرفية' },
    { key: 'cardio', label: 'مشاكل قلبيّة وعائية' },
    { key: 'none', label: 'الحمد لله، لا يوجد أمراض أخرى' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Heart className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-200">التاريخ الطبي والمضاعفات</h2>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed select-none">
        يرجى تحديد أي حالات مرافقة أو مضاعفات تعاني منها لمساعدتنا في تقديم الاستشارات الأكثر أماناً لك:
      </p>

      <div className="space-y-2.5 pt-2">
        {comorbiditiesList.map((c) => {
          const isSelected = selectedComorbidities.includes(c.key);
          return (
            <button
              key={c.key}
              onClick={() => toggleComorbidity(c.key)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all duration-150 active:scale-[0.98] ${
                isSelected 
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                  : 'border-slate-800 bg-slate-900/30 text-slate-300'
              }`}
            >
              <span className="text-xs font-semibold leading-none">{c.label}</span>
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                isSelected ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700 bg-slate-900'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
ComorbiditiesStep.displayName = 'ComorbiditiesStep';
