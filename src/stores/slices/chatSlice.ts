/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { ChatMessage } from '../../types';
import { generateUUID } from '../../lib/uuid';

export interface ChatSlice {
  chatHistory: ChatMessage[];
  activeSessionId: string | null;
  geminiApiKey: string;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }) => void;
  clearChatHistory: () => void;
  setChatHistory: (history: ChatMessage[]) => void;
  updateChatMessage: (id: string, content: string) => void;
  setActiveSessionId: (id: string | null) => void;
  setGeminiApiKey: (key: string) => void;
  markMessagesDeleted: (ids: string[]) => void;
}

export const createChatSlice: StateCreator<
  AppStoreState,
  [],
  [],
  ChatSlice
> = (set, get) => {
  const triggerBackgroundSync = () => {
    if (navigator.onLine) {
      get().syncWithSupabase().catch((err) => {
        console.error("[BackgroundSync] Error syncing:", err);
      });
    }
  };

  return {
    chatHistory: [],
    activeSessionId: null,
    geminiApiKey: '',

    addChatMessage: (msg) => {
      const now = new Date().toISOString();
      const newMessage: ChatMessage = {
        id: msg.id || generateUUID(),
        role: msg.role,
        content: msg.content,
        timestamp: now,
        attachment: msg.attachment,
        updatedAt: now
      };
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return { chatHistory: [...state.chatHistory, newMessage] };
      });
    },

    clearChatHistory: () => {
      set((state) => {
        const now = new Date().toISOString();
        const newDeletes = state.chatHistory.map(msg => ({ id: msg.id, table: 'chat_messages', updatedAt: now }));
        setTimeout(triggerBackgroundSync, 500);
        return { 
          chatHistory: [],
          activeSessionId: null,
          deletedRecords: [...state.deletedRecords, ...newDeletes]
        };
      });
    },

    setChatHistory: (history) => {
      set({ chatHistory: history });
    },

    updateChatMessage: (id, content) => {
      const now = new Date().toISOString();
      set((state) => {
        setTimeout(triggerBackgroundSync, 500);
        return {
          chatHistory: state.chatHistory.map((m) => m.id === id ? { ...m, content, updatedAt: now } : m),
        };
      });
    },

    setActiveSessionId: (id) => {
      set({ activeSessionId: id });
    },

    setGeminiApiKey: (key) => {
      set({ geminiApiKey: key });
    },

    markMessagesDeleted: (ids) => {
      set((state) => {
        const now = new Date().toISOString();
        const newDeletes = ids.map(id => ({ id, table: 'chat_messages', updatedAt: now }));
        setTimeout(triggerBackgroundSync, 500);
        return {
          deletedRecords: [...state.deletedRecords, ...newDeletes]
        };
      });
    },
  };
};