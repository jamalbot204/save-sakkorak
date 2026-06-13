import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface ChatWelcomeProps {
  onQuickPrompt: (prompt: string) => void;
  errorMessage: string | null;
  isTyping?: boolean;
}

export const ChatWelcome = React.memo(({ onQuickPrompt, errorMessage, isTyping = false }: ChatWelcomeProps) => {
  const quickPrompts = [
    'شوربة العدس والبرغل بترفع السكري كتير؟',
    'شو أعمل إذا رحت مشوار ونزل السكري تحت 70؟',
    'نظام غذائي سوري مناسب للنمط الثاني',
    'جرعة حبة المساعد متفورمين مع الفطور الشامي',
  ];

  return (
    <div className="text-center py-6 space-y-4 select-none animate-fadeIn">
      <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mx-auto">
        <Sparkles className="w-7 h-7 animate-pulse" />
      </div>
      
      <div className="space-y-1">
        <h2 className="text-xs font-bold text-slate-200">أهلاً بك في عيادة "مظبوط" الرقمية الشاميّة</h2>
        <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
          اسألني عن نوع السحور السوري الآمن، أو صحة الأطباق المحلية كالفريكة والقمح، أو كيف تتصرف عند ارتفاع أو انخفاض قراءاتك!
        </p>
      </div>

      <div className="pt-2 text-right">
        <span className="text-[9px] text-slate-500 font-bold block mb-2 px-1">استفسارات سريعة شائعة بقريتنا:</span>
        <div className="flex flex-col space-y-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => onQuickPrompt(q)}
              disabled={isTyping}
              className="w-full text-right text-[10px] text-slate-300 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 p-2.5 rounded-xl transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              💡 {q}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex items-start gap-3.5 max-w-[90%] mx-auto text-right mt-4">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1 space-y-1 leading-none">
            <h4 className="text-[11px] font-bold text-rose-400 leading-none">تنبيه المساعد</h4>
            <p className="text-[9px] text-rose-300 leading-relaxed font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
});
ChatWelcome.displayName = 'ChatWelcome';
