/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { AppStoreState } from '../useAppStore';
import { ChatMessage } from '../../types';

export interface ChatSlice {
  chatHistory: ChatMessage[];
  activeSessionId: string | null;
  setChatHistory: (history: ChatMessage[]) => void;
  setActiveSessionId: (id: string | null) => void;
}

export const createChatSlice: StateCreator<
  AppStoreState,
  [],
  [],
  ChatSlice
> = (set) => ({
  chatHistory: [],
  activeSessionId: null,

  setChatHistory: (history) => {
    set({ chatHistory: history });
  },

  setActiveSessionId: (id) => {
    set({ activeSessionId: id });
  },
});