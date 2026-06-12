import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface AndroidSettingsExPluginType {
  isBatteryOptimizationIgnored(): Promise<{ ignored: boolean }>;
  requestIgnoreBatteryOptimization(): Promise<void>;
  checkMicrophonePermission(): Promise<{ granted: boolean }>;
  requestMicrophonePermission(): Promise<{ granted: boolean }>;
  startSpeechRecognition(options?: { language?: string }): Promise<void>;
  stopSpeechRecognition(): Promise<{ stopped: boolean }>;
  addListener(eventName: 'speechResult', listenerFunc: (data: { text: string; isFinal: boolean }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'speechStatus', listenerFunc: (data: { status: 'ready' | 'listening' | 'stopped' }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  addListener(eventName: 'speechError', listenerFunc: (data: { error: number; msg: string }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
  removeAllListeners(): Promise<void>;
}

export const AndroidSettingsEx = registerPlugin<AndroidSettingsExPluginType>('AndroidSettingsEx');
