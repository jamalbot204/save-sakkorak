import React from 'react';
import { Sparkles } from 'lucide-react';

export const SmartAlertCard = React.memo(() => {
  return (
    <div className="bg-gradient-to-l from-emerald-900/15 to-teal-900/5 border border-emerald-500/10 rounded-2.5xl p-4.5 flex items-start gap-3 shrink-0">
      <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 select-none">
        <Sparkles className="w-4 h-4 animate-spin duration-3000" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-xs font-bold text-slate-100 font-sans leading-none flex items-center">
          تنبيه عياري ذكي من "مظبوط"
        </h3>
        <p className="text-[10px] text-slate-300 leading-normal font-sans">
          مستويات سكر الدم لديك مستقرة وبوضع آمن جداً اليوم. ننصحك بالحديث مع مساعدنا الذكي في التبويب أسفله لأخذ نصائح طبية تفصيلية سريعة.
        </p>
      </div>
    </div>
  );
});
SmartAlertCard.displayName = 'SmartAlertCard';
