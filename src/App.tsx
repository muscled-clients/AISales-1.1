import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import Header from './components/Header';
import MainContent from './components/MainContent';
import OverlayMode from './components/OverlayMode';
import './App.css';
import './ModernUI.css';

const MainApp: React.FC = () => {
  const initializeServices = useAppStore((state) => state.initializeServices);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);

  useEffect(() => {
    console.log('🚀 AI Sales Assistant React app initialized');
    
    // Initialize services and load settings
    console.log('📋 Calling initializeServices...');
    initializeServices().then(() => {
      console.log('✅ Services initialization complete');
    }).catch((error: unknown) => {
      console.error('❌ Services initialization failed:', error);
    });
    
    // Test Electron API
    if (window.electronAPI) {
      console.log('✅ Electron API available');
      window.electronAPI.test();
      
      // Listen for chat messages from overlay
      const handleOverlayChatMessage = (data: {message: string, context?: string[]}) => {
        console.log('💬 Received chat message from overlay:', data.message);
        console.log('📎 With context:', data.context);
        
        // Set context if provided
        if (data.context && data.context.length > 0) {
          const setSelectedContext = useAppStore.getState().setSelectedContext;
          setSelectedContext(data.context);
        }
        
        sendChatMessage(data.message);
      };
      
      if ((window.electronAPI as any).onOverlayChatMessage) {
        (window.electronAPI as any).onOverlayChatMessage(handleOverlayChatMessage);
      }
      
      // Listen for selection changes from overlay
      const handleOverlaySelectionChanged = (selectedContext: string[]) => {
        console.log('📎 Received selection change from overlay:', selectedContext);
        const setSelectedContext = useAppStore.getState().setSelectedContext;
        setSelectedContext(selectedContext);
      };
      
      if ((window.electronAPI as any).onOverlaySelectionChanged) {
        (window.electronAPI as any).onOverlaySelectionChanged(handleOverlaySelectionChanged);
      }
      
      // Direct test listener removed - it was overriding the service listener
      console.log('🔗 Electron API is ready for transcript events and overlay chat');
    } else {
      console.error('❌ Electron API not available!');
    }

    // Listen for overlay sync requests
    if ((window.electronAPI as any).onSyncToOverlayRequested) {
      (window.electronAPI as any).onSyncToOverlayRequested(() => {
        console.log('⚡ Immediate sync to overlay requested');
        // Get current state and sync immediately
        const state = useAppStore.getState();
        (window.electronAPI as any).syncToOverlay({
          action: 'syncState',
          chatHistory: state.chatHistory,
          transcripts: state.transcripts,
          recording: state.recording,
          selectedContext: state.selectedContext
        });
      });
    }

    // Cleanup function
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('overlay-chat-message');
      }
    };
  }, [initializeServices, sendChatMessage]);

  return (
    <div className="app">
      <Header />
      <MainContent />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/overlay" element={<OverlayMode />} />
      </Routes>
    </Router>
  );
};

export default App;