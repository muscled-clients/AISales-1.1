// Global type definitions for Electron API

interface ElectronAPI {
  // App Info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  test: () => string;
  
  // Audio Permissions
  checkAudioPermissions: () => Promise<{ microphone: string }>;
  requestAudioPermissions: () => Promise<{ microphone: boolean }>;
  getAudioSources: () => Promise<{ success: boolean; sources?: any[]; error?: string }>;
  
  // Window Management
  minimizeToTray: () => Promise<void>;
  showWindow: () => Promise<void>;
  
  // Overlay Mode
  openOverlay: () => Promise<{ success: boolean }>;
  closeOverlay: () => Promise<{ success: boolean }>;
  switchToMain: () => Promise<{ success: boolean }>;
  syncToOverlay: (data: any) => Promise<{ success: boolean }>;
  requestOverlayState: () => Promise<any>;
  onSyncState: (callback: (data: any) => void) => void;
  removeSyncStateListener: (callback: (data: any) => void) => void;
  onOverlayClosed: (callback: () => void) => void;
  
  // Notifications
  showNotification: (options: any) => Promise<void>;
  
  // Settings
  getSetting: (key: string) => Promise<any>;
  getAllSettings: () => Promise<any>;
  setSetting: (key: string, value: any) => Promise<boolean>;
  updateSettings: (settings: any) => Promise<any>;
  
  // API Testing
  testDeepgram: (apiKey: string) => Promise<{ success: boolean; message: string }>;
  testOpenAI: (apiKey: string) => Promise<{ success: boolean; message: string }>;
  
  // Deepgram
  startDeepgram: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  stopDeepgram: () => Promise<{ success: boolean }>;
  sendAudioData: (audioData: ArrayBuffer) => Promise<{ success: boolean }>;
  deepgramStart: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
  deepgramStop: () => Promise<{ success: boolean }>;
  deepgramSendAudio: (audioData: ArrayBuffer) => Promise<{ success: boolean }>;
  
  // Legacy Recording APIs
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  
  // Event Listeners
  onTranscript: (callback: (transcript: any) => void) => void;
  removeTranscriptListener: (callback: (transcript: any) => void) => void;
  onRecordingStateChanged: (callback: (isRecording: boolean) => void) => void;
  onMenuNewRecording: (callback: () => void) => void;
  onMenuExportData: (callback: () => void) => void;
  onTrayStartRecording: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};