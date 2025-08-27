const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let overlayWindow = null;
let mainWindowRef = null;

function createOverlayWindow(mainWindow, isDev) {
  if (overlayWindow) {
    overlayWindow.focus();
    return overlayWindow;
  }

  mainWindowRef = mainWindow;

  overlayWindow = new BrowserWindow({
    width: 450,
    height: 700,
    minWidth: 350,
    minHeight: 500,
    maxWidth: 600,
    maxHeight: 900,
    x: 20,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const overlayUrl = isDev 
    ? 'http://localhost:3000/#/overlay'
    : `file://${path.join(__dirname, '../build/overlay.html')}`;
    
  overlayWindow.loadURL(overlayUrl);

  // Handle window closed
  overlayWindow.on('closed', () => {
    overlayWindow = null;
    // Show main window when overlay closes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('overlay-closed');
    }
  });

  // Show when ready
  overlayWindow.on('ready-to-show', () => {
    overlayWindow.show();
    
    // Hide main window when overlay is ready
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      // Request current state from main window for sync
      mainWindow.webContents.send('sync-to-overlay-requested');
    }
  });

  // Setup IPC handlers for overlay
  setupOverlayIPC();

  return overlayWindow;
}

function setupOverlayIPC() {
  // Remove existing handlers first
  ipcMain.removeHandler('overlay-request-state');
  ipcMain.removeHandler('close-overlay');
  ipcMain.removeHandler('switch-to-main');
  
  // Handle overlay requesting current state
  ipcMain.handle('overlay-request-state', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      return new Promise((resolve) => {
        // Request state from main window
        mainWindowRef.webContents.send('get-current-state-for-overlay');
        
        // Listen for response
        ipcMain.once('current-state-for-overlay', (event, state) => {
          resolve(state);
        });
        
        // Timeout after 2 seconds
        setTimeout(() => resolve(null), 2000);
      });
    }
    return null;
  });

  // Handle closing overlay
  ipcMain.handle('close-overlay', () => {
    closeOverlayWindow();
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });

  // Handle switching back to main window
  ipcMain.handle('switch-to-main', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.show();
      mainWindowRef.focus();
    }
    closeOverlayWindow();
  });
}

function closeOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
}

function sendToOverlay(channel, data) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channel, data);
  }
}

function syncDataToOverlay(data) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('sync-state', data);
  }
}

module.exports = {
  createOverlayWindow,
  closeOverlayWindow,
  sendToOverlay,
  syncDataToOverlay,
  getOverlayWindow: () => overlayWindow
};