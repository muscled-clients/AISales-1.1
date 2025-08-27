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

console.log('🚀 AI Sales Assistant React app started');
console.log('📋 Window object:', window);
console.log('🔌 ElectronAPI available:', !!window.electronAPI);

// Add a global error handler to catch any issues
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});