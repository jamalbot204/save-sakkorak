/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { ChatMessage } from '../types';
import { AlertCircle } from 'lucide-react';
import { ChatHeader } from './chat/ChatHeader';
import { ChatWelcome } from './chat/ChatWelcome';
import { ChatMessageBubble } from './chat/ChatMessageBubble';
import { ChatInputArea } from './chat/ChatInputArea';

export const Chat: React.FC = () => {
  const chatHistory = useAppStore((state) => state.chatHistory);
  const addChatMessage = useAppStore((state) => state.addChatMessage);
  const clearChatHistory = useAppStore((state) => state.clearChatHistory);
  const setChatHistory = useAppStore((state) => state.setChatHistory);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);

  // States
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop/cancel active generation
  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const lastUserMessageIndex = (() => {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].role === 'user') return i;
    }
    return -1;
  })();

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceToBottom > 15) {
        isPinnedRef.current = false;
      } else {
        isPinnedRef.current = true;
      }
    });
  }, []);

  const handleManualScrollInteraction = useCallback(() => {
    isPinnedRef.current = false;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (isPinnedRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    if (el.firstElementChild) {
       ro.observe(el.firstElementChild);
    }

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const listEl = scrollRef.current;
    if (!listEl) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize ? entry.borderBoxSize[0].blockSize : entry.contentRect.height;
        listEl.style.setProperty('--input-area-height', `${height}px`);
        if (isPinnedRef.current) {
          listEl.scrollTop = listEl.scrollHeight;
        }
      }
    });

    if (inputAreaRef.current) {
      ro.observe(inputAreaRef.current);
    }

    return () => ro.disconnect();
  }, []);

  const handleSendMessage = useCallback(async (text: string, attachment: any = null) => {
    if (!text.trim() && !attachment) return;

    setErrorMessage(null);
    setEditingMessageId(null);

    // Cancel any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Capture history BEFORE adding the new message
    const historyBefore = useAppStore.getState().chatHistory;

    // Save user message locally
    addChatMessage({
      role: 'user',
      content: text,
      attachment: attachment || undefined,
    });

    setIsTyping(true);

    const session = useAppStore.getState().session;
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    const chatUrl = apiBase ? (apiBase.endsWith('/') ? `${apiBase}api/chat` : `${apiBase}/api/chat`) : '/api/chat';

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: historyBefore,
          attachment: attachment,
          sessionId: useAppStore.getState().activeSessionId,
          keyOverride: useAppStore.getState().geminiApiKey || undefined, 
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء التواصل مع سيرفر السكري الذكي.');
      }

      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }

      addChatMessage({
        role: 'model',
        content: data.content,
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Sending message aborted by user.');
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        console.error(err);
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري. يرجى مراجعة الإعدادات ومفتاح API.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsTyping(false);
    }
  }, [addChatMessage, setActiveSessionId]);

  const handleQuickPrompt = useCallback((promptText: string) => {
    handleSendMessage(promptText);
  }, [handleSendMessage]);

  const handleRegenerateAndResubmit = useCallback(async () => {
    const currentState = useAppStore.getState();
    const currentHist = currentState.chatHistory;
    
    if (currentHist.length === 0) return;

    setErrorMessage(null);

    // Cancel any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);

    let userMsg: ChatMessage | null = null;
    let historyToUse: ChatMessage[] = [];

    const lastMsgIndex = currentHist.length - 1;
    const lastMsg = currentHist[lastMsgIndex];

    if (lastMsg.role === 'model') {
      if (currentHist.length >= 2) {
        userMsg = currentHist[currentHist.length - 2];
        historyToUse = currentHist.slice(0, currentHist.length - 2);
        const newHistory = currentHist.slice(0, currentHist.length - 1);
        setChatHistory(newHistory);
      }
    } else {
      userMsg = lastMsg;
      historyToUse = currentHist.slice(0, currentHist.length - 1);
    }

    if (!userMsg) {
      setIsTyping(false);
      abortControllerRef.current = null;
      return;
    }

    const session = currentState.session;
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    const chatUrl = apiBase ? (apiBase.endsWith('/') ? `${apiBase}api/chat` : `${apiBase}/api/chat`) : '/api/chat';

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: historyToUse,
          attachment: userMsg.attachment,
          sessionId: currentState.activeSessionId,
          keyOverride: currentState.geminiApiKey || undefined,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء التواصل مع سيرفر السكري الذكي.');
      }

      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }

      addChatMessage({
        role: 'model',
        content: data.content,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Regenerating message aborted by user.');
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        console.error(err);
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري. يرجى مراجعة الإعدادات ومفتاح API.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsTyping(false);
    }
  }, [setChatHistory, addChatMessage, setActiveSessionId]);

  const handleSaveAndResubmit = useCallback(async (newContent: string) => {
    if (!newContent.trim()) return;
    const currentHist = useAppStore.getState().chatHistory;
    
    // Find last user msg safely
    let lastUserMsg: ChatMessage | null = null;
    let userMsgIndex = -1;
    for (let i = currentHist.length - 1; i >= 0; i--) {
      if (currentHist[i].role === 'user') {
         lastUserMsg = currentHist[i];
         userMsgIndex = i;
         break;
      }
    }

    if (!lastUserMsg || userMsgIndex === -1) return;

    setEditingMessageId(null);
    setErrorMessage(null);

    // Cancel any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);

    const historyBefore = currentHist.slice(0, userMsgIndex);
    const updatedUserMsg = { ...lastUserMsg, content: newContent, timestamp: new Date().toISOString() };
    const newChatHistory = [...historyBefore, updatedUserMsg];
    setChatHistory(newChatHistory);

    const session = useAppStore.getState().session;
    const apiBase = (import.meta as any).env.VITE_API_URL || '';
    const chatUrl = apiBase ? (apiBase.endsWith('/') ? `${apiBase}api/chat` : `${apiBase}/api/chat`) : '/api/chat';

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: newContent,
          history: historyBefore,
          attachment: lastUserMsg.attachment,
          sessionId: useAppStore.getState().activeSessionId,
          keyOverride: useAppStore.getState().geminiApiKey || undefined,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء التواصل مع سيرفر السكري الذكي.');
      }

      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }

      addChatMessage({
        role: 'model',
        content: data.content,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Save and resubmit aborted by user.');
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        console.error(err);
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري. يرجى مراجعة الإعدادات ومفتاح API.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsTyping(false);
    }
  }, [setChatHistory, addChatMessage, setActiveSessionId]);

  const handleClearChat = useCallback(() => {
    clearChatHistory();
  }, [clearChatHistory]);

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
      
      <ChatHeader onClearChat={handleClearChat} />

      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs text-amber-300 flex items-center justify-center gap-2 font-bold animate-[fadeIn_0.2s_ease-out]" dir="rtl">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>لا يوجد اتصال بالإنترنت لإجراء الاستشارة الذكية حالياً. تم تعطيل الإرسال مؤقتاً.</span>
        </div>
      )}

      {/* Message Stream Area */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        onWheel={handleManualScrollInteraction}
        onTouchMove={handleManualScrollInteraction}
        onMouseDown={handleManualScrollInteraction}
        onKeyDown={handleManualScrollInteraction}
        className="flex-1 overflow-y-auto p-5 relative"
      >
        
        {chatHistory.length === 0 && (
          <ChatWelcome onQuickPrompt={handleQuickPrompt} errorMessage={errorMessage} />
        )}

        {/* Message bubbles list */}
        {chatHistory.length > 0 && (
          <div className="w-full flex flex-col gap-4 pb-4">
            {chatHistory.map((msg, index) => (
              <ChatMessageBubble
                key={msg.id || index}
                msg={msg}
                isLastUserMessage={index === lastUserMessageIndex}
                isTyping={isTyping}
                isEditing={editingMessageId === msg.id}
                onStartEdit={() => setEditingMessageId(msg.id)}
                onCancelEdit={() => setEditingMessageId(null)}
                onSaveEdit={handleSaveAndResubmit}
                onRegenerate={handleRegenerateAndResubmit}
              />
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 mr-auto ml-0 bg-slate-900 p-3.5 rounded-2.5xl rounded-bl-sm border border-slate-800/80 max-w-[120px] select-none text-right shadow-md animate-pulse">
                <span className="text-[10px] text-sky-400 font-bold leading-none ml-1">مظبوط يحلل...</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}

            {errorMessage && chatHistory.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex items-start gap-3.5 max-w-[90%] mx-auto text-right">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="flex-1 space-y-1 leading-none">
                  <h4 className="text-[11px] font-bold text-rose-400 leading-none">تنبيه المساعد</h4>
                  <p className="text-[9px] text-rose-300 leading-relaxed font-semibold">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInputArea 
        isTyping={isTyping} 
        onSendMessage={handleSendMessage} 
        onStopGeneration={handleCancelGeneration}
        inputAreaRef={inputAreaRef}
        isOffline={isOffline}
      />
    </div>
  );
};
