import logger from './utils/logger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Type definitions are now in global.d.ts

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

logger.debug('🚀 AI Sales Assistant React app started');
logger.debug('📋 Window object:', window);
logger.debug('🔌 ElectronAPI available:', !!window.electronAPI);

// Add a global error handler to catch any issues
window.addEventListener('error', (event) => {
  logger.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('❌ Unhandled promise rejection:', event.reason);
});