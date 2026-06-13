import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw, Pencil } from 'lucide-react';
import { ChatMessage } from '../../types';

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  isLastUserMessage: boolean;
  isTyping: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (newContent: string) => void;
  onRegenerate: () => void;
}

export const ChatMessageBubble = React.memo(({
  msg,
  isLastUserMessage,
  isTyping,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRegenerate,
}: ChatMessageBubbleProps) => {
  const [editContent, setEditContent] = useState(msg.content);

  useEffect(() => {
    if (isEditing) setEditContent(msg.content);
  }, [isEditing, msg.content]);

  return (
    <div
      className={`flex flex-col max-w-[85%] ${
        msg.role === 'user' ? 'ml-auto mr-0 items-start text-right' : 'mr-auto ml-0 items-end text-right animate-fadeIn'
      }`}
    >
      {msg.attachment && (
        <div className="rounded-2xl overflow-hidden shadow mb-1.5 border border-slate-800 select-none max-w-[200px]">
          <img 
            src={msg.attachment.dataUrl} 
            alt="Attached meal description" 
            className="w-full h-auto object-cover max-h-[140px]" 
          />
        </div>
      )}

      <div 
        className={`p-3.5 rounded-2.5xl leading-relaxed text-xs shadow-md w-fit ${
          msg.role === 'user'
            ? (isEditing ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-br-sm text-right w-full min-w-[250px]' : 'bg-sky-500 text-slate-950 font-semibold rounded-br-sm text-right')
            : 'bg-slate-900 text-slate-200 border border-slate-800/80 rounded-bl-sm text-right'
        }`}
      >
        {isEditing ? (
          <div className="w-full flex flex-col gap-2 p-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[70px] p-2 text-slate-200 bg-slate-950 rounded-xl border border-slate-850 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs text-right"
              dir="rtl"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => onSaveEdit(editContent)}
                disabled={isTyping}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-sky-400 border border-slate-800 rounded-lg text-[10px] font-bold active:scale-95 transition-all text-center"
              >
                حفظ وإرسال
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800 rounded-lg text-[10px] font-bold active:scale-95 transition-all text-center"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {msg.role === 'user' && isLastUserMessage && !isTyping && !isEditing && (
        <div className="flex items-center gap-2 mt-2 select-none">
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-300 hover:text-sky-400 active:scale-95 transition-all"
            title="إعادة طلب الإجابة"
          >
            <RefreshCw className="w-3 h-3 text-sky-400" />
            <span>إعادة طلب الإجابة</span>
          </button>

          <button
            type="button"
            onClick={onStartEdit}
            className="flex items-center gap-1 px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-300 hover:text-emerald-400 active:scale-95 transition-all"
            title="تعديل الرسالة"
          >
            <Pencil className="w-3 h-3 text-emerald-400" />
            <span>تعديل رسالتي</span>
          </button>
        </div>
      )}

      <span className="text-[8px] text-slate-600 mt-1 font-sans select-none px-1">
        {(() => {
          if (!msg.timestamp) return '';
          const d = new Date(msg.timestamp);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
        })()}
      </span>
    </div>
  );
});
ChatMessageBubble.displayName = 'ChatMessageBubble';
