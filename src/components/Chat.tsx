/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { ChatMessage } from '../types';
import { generateUUID } from '../lib/uuid';
import { localTimestamp } from '../lib/datetime';
import { AlertCircle } from 'lucide-react';
import { ChatHeader } from './chat/ChatHeader';
import { ChatWelcome } from './chat/ChatWelcome';
import { ChatMessageBubble } from './chat/ChatMessageBubble';
import { ChatInputArea } from './chat/ChatInputArea';
import { isOnline, subscribeToNetwork } from '../lib/networkStatus';
import { withRetry } from '../lib/retry';

export const Chat: React.FC = () => {
  const chatHistory = useAppStore((state) => state.chatHistory);
  const setChatHistory = useAppStore((state) => state.setChatHistory);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);

  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    isOnline().then((online) => {
      if (!cancelled) setIsOffline(!online);
    });

    const unsubscribe = subscribeToNetwork((online) => {
      if (!cancelled) setIsOffline(!online);
    });

    return () => {
      cancelled = true;
      unsubscribe();
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

  const findLastUserIndex = useCallback((hist: ChatMessage[]): number => {
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].role === 'user') return i;
    }
    return -1;
  }, []);

  const lastUserMessageIndex = useMemo(() => findLastUserIndex(chatHistory), [chatHistory, findLastUserIndex]);

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

  const submitChatRequest = useCallback(async (
    chatHistory: ChatMessage[],
    sessionId: string,
    controller: AbortController
  ): Promise<{ content: string; messageId: string; sessionId: string }> => {
    const state = useAppStore.getState();
    const session = state.session;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const chatUrl = apiBase ? (apiBase.endsWith('/') ? `${apiBase}api/chat` : `${apiBase}/api/chat`) : '/api/chat';

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        sessionId,
        chatHistory,
        profile: state.userProfile ? {
          age: state.userProfile.age,
          gender: state.userProfile.gender,
          diabetesType: state.userProfile.diabetesType,
          comorbidities: state.userProfile.comorbidities,
        } : null,
        healthData: {
          medications: state.healthData?.medications || [],
          glucoseReadings: state.healthData?.glucoseReadings || [],
        },
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(!response.ok ? `Server error (${response.status})` : text);
    }

    if (!response.ok) {
      throw new Error(data.error || `Server error (${response.status})`);
    }

    return data;
  }, []);

  const handleSendMessage = useCallback(async (text: string, attachment: ChatMessage['attachment'] = null) => {
    if (!text.trim() && !attachment) return;

    setErrorMessage(null);
    setEditingMessageId(null);

    if (abortControllerRef.current) { abortControllerRef.current.abort(); }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const optimisticMsg: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: text,
      timestamp: localTimestamp(),
      attachment: attachment,
    };

    const currentState = useAppStore.getState();
    const currentHistory = currentState.chatHistory;
    let sessionId = currentState.activeSessionId;

    if (!sessionId) {
      sessionId = generateUUID();
      setActiveSessionId(sessionId);
    }

    const updatedHistory = [...currentHistory, optimisticMsg];
    setChatHistory(updatedHistory);
    setIsTyping(true);

    try {
      const result = await submitChatRequest(updatedHistory, sessionId, controller);

      const modelMsg: ChatMessage = {
        id: result.messageId,
        role: 'model',
        content: result.content,
        timestamp: localTimestamp(),
      };

      setChatHistory([...updatedHistory, modelMsg]);

    } catch (err: any) {
      if (abortControllerRef.current !== controller) return;
      if (err.name === 'AbortError') {
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsTyping(false);
      }
    }
  }, [setChatHistory, setActiveSessionId, submitChatRequest]);

  const handleQuickPrompt = useCallback((promptText: string) => {
    handleSendMessage(promptText);
  }, [handleSendMessage]);

  const handleRetry = useCallback(() => {
    const currentHist = useAppStore.getState().chatHistory;

    const lastUserIdx = findLastUserIndex(currentHist);
    if (lastUserIdx === -1) return;
    if (lastUserIdx < currentHist.length - 1) {
      setErrorMessage('هذه الرسالة تم الرد عليها بالفعل.');
      return;
    }

    setErrorMessage(null);

    if (abortControllerRef.current) { abortControllerRef.current.abort(); }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);

    const sessionId = useAppStore.getState().activeSessionId;
    if (!sessionId) { setIsTyping(false); return; }

    submitChatRequest(currentHist, sessionId, controller)
      .then((result) => {
        const modelMsg: ChatMessage = {
          id: result.messageId,
          role: 'model',
          content: result.content,
          timestamp: localTimestamp(),
        };
        setChatHistory([...currentHist, modelMsg]);
      })
      .catch((err: any) => {
        if (abortControllerRef.current !== controller) return;
        if (err.name === 'AbortError') {
          setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
        } else {
          setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري.');
        }
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsTyping(false);
        }
      });
  }, [findLastUserIndex, setChatHistory, submitChatRequest]);

  const handleRegenerate = useCallback(async () => {
    const currentState = useAppStore.getState();
    const currentHist = currentState.chatHistory;
    if (currentHist.length === 0) return;

    const lastUserIdx = findLastUserIndex(currentHist);
    if (lastUserIdx === -1) return;

    const hasPairedReply =
      lastUserIdx + 1 < currentHist.length &&
      currentHist[lastUserIdx + 1].role === 'model';

    if (!hasPairedReply) {
      handleRetry();
      return;
    }

    setErrorMessage(null);

    if (abortControllerRef.current) { abortControllerRef.current.abort(); }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);

    const sendHistory = [...currentHist.slice(0, lastUserIdx + 1)];
    setChatHistory(sendHistory);

    const sessionId = currentState.activeSessionId;
    if (!sessionId) { setIsTyping(false); return; }

    try {
      const result = await submitChatRequest(sendHistory, sessionId, controller);

      const modelMsg: ChatMessage = {
        id: result.messageId,
        role: 'model',
        content: result.content,
        timestamp: localTimestamp(),
      };

      setChatHistory([...sendHistory, modelMsg]);

    } catch (err: any) {
      if (abortControllerRef.current !== controller) return;
      if (err.name === 'AbortError') {
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsTyping(false);
      }
    }
  }, [handleRetry, setChatHistory, submitChatRequest]);

  const handleSaveAndResubmit = useCallback(async (newContent: string) => {
    if (!newContent.trim()) return;
    const currentHist = useAppStore.getState().chatHistory;

    const userMsgIndex = findLastUserIndex(currentHist);
    if (userMsgIndex === -1) return;

    setEditingMessageId(null);
    setErrorMessage(null);

    if (abortControllerRef.current) { abortControllerRef.current.abort(); }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);

    const updatedUserMsg = { ...currentHist[userMsgIndex], content: newContent };
    const sendHistory = [...currentHist.slice(0, userMsgIndex), updatedUserMsg];

    setChatHistory(sendHistory);

    const sessionId = useAppStore.getState().activeSessionId;
    if (!sessionId) { setIsTyping(false); return; }

    try {
      const result = await submitChatRequest(sendHistory, sessionId, controller);

      const modelMsg: ChatMessage = {
        id: result.messageId,
        role: 'model',
        content: result.content,
        timestamp: localTimestamp(),
      };

      setChatHistory([...sendHistory, modelMsg]);

    } catch (err: any) {
      if (abortControllerRef.current !== controller) return;
      if (err.name === 'AbortError') {
        setErrorMessage('تم إلغاء توليد الإجابة من قبلك.');
      } else {
        setErrorMessage(err.message || 'فشل الاتصال بمساعد السكري.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsTyping(false);
      }
    }
  }, [findLastUserIndex, setChatHistory, submitChatRequest]);

  const handleClearChat = useCallback(async () => {
    const currentState = useAppStore.getState();
    const oldSessionId = currentState.activeSessionId;
    const currentHistory = currentState.chatHistory;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsTyping(false);
    setErrorMessage(null);
    setEditingMessageId(null);

    const newSessionId = generateUUID();

    if (oldSessionId && currentHistory.length > 0) {
      const token = currentState.session?.access_token;
      const apiBase = import.meta.env.VITE_API_URL || '';
      const base = apiBase ? (apiBase.endsWith('/') ? apiBase : apiBase + '/') : '/';

      try {
        await withRetry(async () => {
          const res = await fetch(base + 'api/chat/clear', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ sessionId: oldSessionId, chatHistory: currentHistory }),
          });
          if (!res.ok) throw new Error(`Archive returned ${res.status}`);
        }, 3, 'chat-clear-archive');
      } catch (err) {
        console.error('[ClearChat] Archive failed after retries:', err);
      }
    }

    setChatHistory([]);
    setActiveSessionId(newSessionId);
  }, [setChatHistory, setActiveSessionId]);

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
      
      <ChatHeader onClearChat={handleClearChat} isTyping={isTyping} />

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
          <ChatWelcome onQuickPrompt={handleQuickPrompt} errorMessage={errorMessage} isTyping={isTyping} />
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
                onRegenerate={handleRegenerate}
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
                <div className="flex-1 space-y-1.5 leading-none">
                  <h4 className="text-[11px] font-bold text-rose-400 leading-none">تنبيه المساعد</h4>
                  <p className="text-[9px] text-rose-300 leading-relaxed font-semibold">{errorMessage}</p>
                  <button
                    onClick={handleRetry}
                    disabled={isTyping}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 disabled:opacity-40 transition-colors leading-none"
                  >
                    إعادة المحاولة
                  </button>
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
