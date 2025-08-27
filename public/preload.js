const { contextBridge, ipcRenderer } = require('electron');

// ================================
// NATIVE DESKTOP API BRIDGE
// ================================

contextBridge.exposeInMainWorld('electronAPI', {
  // ================================
  // APP INFO & PLATFORM
  // ================================
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('app-platform'),
  
  // ================================
  // AUDIO PERMISSIONS & CAPABILITIES
  // ================================
  checkAudioPermissions: () => ipcRenderer.invoke('check-audio-permissions'),
  requestAudioPermissions: () => ipcRenderer.invoke('request-audio-permissions'),
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  
  // ================================
  // WINDOW MANAGEMENT
  // ================================
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  // Overlay Mode
  openOverlay: () => ipcRenderer.invoke('open-overlay'),
  closeOverlay: () => ipcRenderer.invoke('close-overlay'),
  switchToMain: () => ipcRenderer.invoke('switch-to-main'),
  syncToOverlay: (data) => ipcRenderer.invoke('sync-to-overlay', data),
  requestOverlayState: () => ipcRenderer.invoke('overlay-request-state'),
  
  // Overlay Event Listeners
  onSyncState: (callback) => {
    ipcRenderer.on('sync-state', (event, data) => callback(data));
  },
  removeSyncStateListener: (callback) => {
    ipcRenderer.removeListener('sync-state', callback);
  },
  onOverlayClosed: (callback) => {
    ipcRenderer.on('overlay-closed', () => callback());
  },
  
  // ================================
  // NOTIFICATIONS
  // ================================
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // ================================
  // MENU & TRAY EVENTS
  // ================================
  onMenuNewRecording: (callback) => {
    ipcRenderer.on('menu-new-recording', () => callback());
  },
  onMenuExportData: (callback) => {
    ipcRenderer.on('menu-export-data', () => callback());
  },
  onTrayStartRecording: (callback) => {
    ipcRenderer.on('tray-start-recording', () => callback());
  },
  
  // ================================
  // LEGACY APIS (keep for compatibility)
  // ================================
  test: () => {
    console.log('Electron API test successful');
    return 'Native Desktop API working!';
  },
  
  // Audio and recording APIs (enhanced)
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Settings APIs
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  
  // API Testing
  testDeepgram: (apiKey) => ipcRenderer.invoke('test-deepgram', apiKey),
  testOpenAI: (apiKey) => ipcRenderer.invoke('test-openai', apiKey),
  
  // Audio source management
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  
  // Deepgram transcription (main process)
  deepgramStart: (apiKey, audioMode) => ipcRenderer.invoke('deepgram-start', apiKey, audioMode),
  deepgramStop: () => ipcRenderer.invoke('deepgram-stop'),
  deepgramSendAudio: (audioData) => ipcRenderer.invoke('deepgram-send-audio', audioData),
  
  // Event listeners for real-time updates
  onTranscript: (callback) => {
    ipcRenderer.on('transcript', (event, data) => callback(data));
  },
  
  onRecordingStateChanged: (callback) => {
    ipcRenderer.on('recording-state-changed', (event, isRecording) => callback(isRecording));
  },
  
  onOverlayChatMessage: (callback) => {
    ipcRenderer.on('overlay-chat-message', (event, message) => callback(message));
  },
  
  onOverlaySelectionChanged: (callback) => {
    ipcRenderer.on('overlay-selection-changed', (event, selectedContext) => callback(selectedContext));
  },
  
  onSyncToOverlayRequested: (callback) => {
    ipcRenderer.on('sync-to-overlay-requested', (event) => callback());
  },
  
  // ================================
  // UTILITIES
  // ================================
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('Preload script loaded');