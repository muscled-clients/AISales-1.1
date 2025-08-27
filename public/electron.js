const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const DeepgramService = require('./deepgramService');
const DualAudioCapture = require('./dualAudioCapture');
const { createOverlayWindow, closeOverlayWindow, sendToOverlay, syncDataToOverlay } = require('./overlayWindow');
const isDev = process.env.ELECTRON_IS_DEV === 'true' || false;

// Initialize Deepgram service
const deepgramService = new DeepgramService();
let dualAudioCapture = null;

// Settings storage
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
  deepgramKey: '',
  openaiKey: '',
  autoTranscription: true,
  autoTodos: true,
  autoSuggestions: true
};

// Load settings on startup
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...settings, ...JSON.parse(data) };
      console.log('✅ Settings loaded from:', settingsPath);
    }
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
  }
}

// Save settings to disk
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('✅ Settings saved to:', settingsPath);
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
  }
}

let mainWindow;
let tray = null;
let isQuiting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'), // Add app icon
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  // Make window globally accessible for Deepgram service
  global.mainWindow = mainWindow;

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Only open dev tools in development mode
    if (isDev) {
      // Uncomment next line if you need dev tools in development:
      // mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close - minimize to tray instead of quit
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification on first minimize
      if (process.platform === 'win32') {
        mainWindow.webContents.executeJavaScript(`
          new Notification('AI Sales Assistant', {
            body: 'App minimized to system tray',
            icon: '/icon.png'
          });
        `);
      }
    }
  });

  mainWindow.on('closed', () => mainWindow = null);

  // Create application menu
  createMenu();
  
  // Create system tray
  createTray();
}

app.on('ready', () => {
  // Load settings from disk
  loadSettings();
  
  // Request microphone permission on macOS
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone');
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  // Keep app running in background for both platforms
  // Only quit when explicitly chosen from tray menu
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuiting = true;
});

// ================================
// NATIVE DESKTOP FEATURES
// ================================

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Recording',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-recording');
          }
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuiting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        {
          label: 'Show/Hide',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  // Don't create duplicate tray
  if (tray) {
    console.log('⚠️ Tray already exists, skipping creation');
    return;
  }
  
  // Create tray icon (you'll need to add icon files)
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.png'));
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show AI Sales Assistant',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow.webContents.send('tray-start-recording');
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('AI Sales Assistant');
  tray.setContextMenu(contextMenu);
  
  // Show window on tray click
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

// ================================
// IPC HANDLERS
// ================================

// Basic app info
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-platform', () => {
  return process.platform;
});

// Audio permissions and capabilities
ipcMain.handle('check-audio-permissions', async () => {
  if (process.platform === 'darwin') {
    const micAccess = systemPreferences.getMediaAccessStatus('microphone');
    return { microphone: micAccess };
  }
  return { microphone: 'granted' }; // Windows doesn't have the same API
});

ipcMain.handle('request-audio-permissions', async () => {
  if (process.platform === 'darwin') {
    const micAccess = await systemPreferences.askForMediaAccess('microphone');
    return { microphone: micAccess };
  }
  return { microphone: true };
});

// Window management
ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Notifications
ipcMain.handle('show-notification', (event, { title, body, silent = false }) => {
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.webContents.executeJavaScript(`
      new Notification('${title}', {
        body: '${body}',
        icon: '/icon.png',
        silent: ${silent}
      });
    `);
  }
});

// Settings handlers
ipcMain.handle('get-setting', (event, key) => {
  return settings[key];
});

ipcMain.handle('get-all-settings', () => {
  return settings;
});

ipcMain.handle('set-setting', (event, key, value) => {
  settings[key] = value;
  saveSettings();
  return true;
});

ipcMain.handle('update-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return settings;
});

// Test API connections
ipcMain.handle('test-deepgram', async (event, apiKey) => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.deepgram.com',
        path: '/v1/projects',
        method: 'GET',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'Deepgram API key is valid' });
        } else {
          resolve({ success: false, message: `Invalid API key (status: ${res.statusCode})` });
        }
      });

      req.on('error', (error) => {
        resolve({ success: false, message: error.message });
      });

      req.end();
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('test-openai', async (event, apiKey) => {
  try {
    const https = require('https');
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve({ success: true, message: 'OpenAI API key is valid' });
        } else {
          resolve({ success: false, message: `Invalid API key (status: ${res.statusCode})` });
        }
      });

      req.on('error', (error) => {
        resolve({ success: false, message: error.message });
      });

      req.end();
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Overlay mode handlers
ipcMain.handle('open-overlay', () => {
  console.log('🪟 Opening overlay window...');
  createOverlayWindow(mainWindow, isDev);
  // Hide main window when overlay opens
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  return { success: true };
});

ipcMain.handle('close-overlay', () => {
  console.log('🪟 Closing overlay window...');
  closeOverlayWindow();
  // Show main window when overlay closes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  return { success: true };
});

ipcMain.handle('sync-to-overlay', (event, data) => {
  console.log('🔄 Syncing data to overlay:', data.action);
  
  if (data.action === 'sendChatMessage') {
    // Forward chat message to main window for processing
    console.log('💬 Forwarding chat message from overlay to main window:', data.message);
    console.log('📎 With context:', data.context);
    mainWindow.webContents.send('overlay-chat-message', { message: data.message, context: data.context });
  } else if (data.action === 'syncSelection') {
    // Forward selection changes to main window
    console.log('📎 Syncing selection from overlay to main:', data.selectedContext);
    mainWindow.webContents.send('overlay-selection-changed', data.selectedContext);
  } else if (data.action === 'syncState') {
    // Other sync actions with proper data
    syncDataToOverlay(data);
  } else {
    // Handle undefined actions
    console.log('⚠️ Undefined sync action, syncing full state');
    syncDataToOverlay(data);
  }
  
  return { success: true };
});

// Audio source management
ipcMain.handle('get-audio-sources', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({ 
      types: ['screen', 'window'] 
    });
    
    // Filter for common calling applications and screen
    const audioSources = sources.filter(source => {
      const name = source.name.toLowerCase();
      return name.includes('entire screen') || 
             name.includes('zoom') ||
             name.includes('teams') ||
             name.includes('skype') ||
             name.includes('discord') ||
             name.includes('slack') ||
             name.includes('meet') ||
             name.includes('webex') ||
             name.includes('chrome') ||
             name.includes('firefox') ||
             name.includes('safari') ||
             name.includes('browser') ||
             name.includes('call') ||
             name.includes('conference');
    });

    console.log('🎙️ Available audio sources:', audioSources.map(s => s.name));
    return { success: true, sources: audioSources };
  } catch (error) {
    console.error('❌ Failed to get audio sources:', error);
    return { success: false, error: error.message, sources: [] };
  }
});

// Deepgram transcription handlers
ipcMain.handle('deepgram-start', async (event, apiKey) => {
  try {
    console.log(`🎙️ Starting Deepgram transcription for client calls (mic + system)...`);
    deepgramService.initialize(apiKey);
    deepgramService.setAudioMode('both'); // Always use both for client calls
    await deepgramService.connect();
    
    // Initialize dual audio capture
    if (!dualAudioCapture) {
      dualAudioCapture = new DualAudioCapture(deepgramService);
    }
    await dualAudioCapture.startCapture('both');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to start Deepgram:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deepgram-stop', () => {
  console.log('🛑 Stopping Deepgram transcription...');
  if (dualAudioCapture) {
    dualAudioCapture.stopCapture();
  }
  deepgramService.disconnect();
  return { success: true };
});

ipcMain.handle('deepgram-send-audio', (event, audioData) => {
  // Log every 100th packet to track audio flow
  global.audioPacketCount = (global.audioPacketCount || 0) + 1;
  if (global.audioPacketCount % 100 === 0) {
    console.log(`📡 Main process received ${global.audioPacketCount} audio packets (latest: ${audioData.byteLength} bytes)`);
  }
  
  if (dualAudioCapture && dualAudioCapture.isCapturing) {
    dualAudioCapture.sendAudioData(audioData);
  } else if (deepgramService) {
    deepgramService.sendAudioData(audioData);
  } else {
    console.warn('⚠️ No audio service available to send data to');
  }
  return { success: true };
});

console.log('🚀 AI Sales Assistant - Native Desktop App Started');
console.log(`📱 Platform: ${process.platform}`);
console.log(`🔧 Dev Mode: ${isDev}`);