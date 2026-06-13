import React from 'react';
import { Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  onClearChat: () => void;
  isTyping?: boolean;
}

export const ChatHeader = React.memo(({ onClearChat, isTyping = false }: ChatHeaderProps) => {
  return (
    <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-800/80 flex justify-between items-center select-none z-30 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-sky-500/15 border border-sky-500/30 rounded-full flex items-center justify-center text-sky-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xs font-bold text-slate-100 Shami">مساعد السكري الذكي "مظبوط"</h1>
          <p className="text-[9px] text-sky-400 mt-0.5 leading-none">مدعوم بـ نموذج Gemini 3.5 Flash</p>
        </div>
      </div>

      <button 
        onClick={onClearChat}
        disabled={isTyping}
        className="text-[9px] font-bold text-slate-400 hover:text-rose-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800/80 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        حذف المحادثة
      </button>
    </div>
  );
});
ChatHeader.displayName = 'ChatHeader';
