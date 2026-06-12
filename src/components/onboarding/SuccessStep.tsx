import React from 'react';
import { Award } from 'lucide-react';

export const SuccessStep = React.memo(() => {
  return (
    <div className="text-center py-8 space-y-6 animate-fadeIn flex flex-col items-center">
      <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center animate-bounce duration-1000 select-none">
        <Award className="w-10 h-10 stroke-[1.5]" />
      </div>

      <div className="space-y-2 px-4">
        <h2 className="text-lg font-bold text-slate-100 Shami font-sans">سكرك مظبوط ومرتب! 🎉</h2>
        <div className="text-xs text-slate-300 leading-relaxed max-w-[320px] mx-auto pt-2 space-y-4">
          <p>تم إعداد ملفك الشخصي الطبي بنجاح وحفظه محلياً وآمنًا تمامًا داخل جهازك.</p>
          <p className="text-slate-400">ستتمكن الآن من تنظيم قراءات سكر الدم، شرب المياه، وجداول الأدوية، والحديث مع المساعد الذكي "مظبوط".</p>
        </div>
      </div>

      <div className="text-[10px] text-zinc-500 tracking-wide select-none">
        صُمم بكل حب لدعم وتسهيل تتبع السكري لمرضانا في سوريا
      </div>
    </div>
  );
});
SuccessStep.displayName = 'SuccessStep';
