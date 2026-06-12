import React from 'react';
import { User, Check } from 'lucide-react';

interface BasicInfoStepProps {
  name: string;
  setName: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  gender: 'male' | 'female' | 'other';
  setGender: (v: 'male' | 'female' | 'other') => void;
  diabetesType: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  setDiabetesType: (v: 'type1' | 'type2' | 'gestational' | 'prediabetes') => void;
}

export const BasicInfoStep = React.memo(({
  name, setName,
  age, setAge,
  gender, setGender,
  diabetesType, setDiabetesType
}: BasicInfoStepProps) => {

  const diabetesTypes = [
    { key: 'type1', label: 'النمط الأول (Type 1)', desc: 'يعتمد على الأنسولين' },
    { key: 'type2', label: 'النمط الثاني (Type 2)', desc: 'مقاومة الأنسولين' },
    { key: 'gestational', label: 'سكري الحمل', desc: 'مؤقت أثناء الحمل' },
    { key: 'prediabetes', label: 'مرحلة ما قبل السكري', desc: 'مؤشر خطر مرتفع' },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
          <User className="w-4 h-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-200">البيانات الأساسية</h2>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">الاسم الكامل</label>
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: يوسف الشامي"
          className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-200 transition-colors placeholder:text-slate-600 font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 font-sans">العمر بالسنوات</label>
          <input 
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="مثال: 45"
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-200 transition-colors placeholder:text-slate-600 font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">الجنس</label>
          <select 
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-3 text-sm text-slate-200 transition-colors font-medium"
          >
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-3">نوع السكري</label>
        <div className="grid grid-cols-2 gap-3">
          {diabetesTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setDiabetesType(type.key as any)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
                diabetesType === type.key 
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold' 
                  : 'border-slate-800 bg-slate-900/40 text-slate-300'
              }`}
            >
              {diabetesType === type.key && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <span className="text-xs">{type.label}</span>
              <span className="text-[9px] text-slate-500 mt-1 font-medium select-none">{type.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
BasicInfoStep.displayName = 'BasicInfoStep';
