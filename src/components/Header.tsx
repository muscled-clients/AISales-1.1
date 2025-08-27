import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

const Header: React.FC = () => {
  const { recording, startRecording, stopRecording } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingToggle = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (recording.isRecording) {
        // Stop recording
        console.log('🛑 Stopping recording...');
        await stopRecording();
        console.log('✅ Recording stopped successfully');
      } else {
        // Start recording
        console.log('🎬 Starting recording...');
        const started = await startRecording();
        
        if (started) {
          console.log('✅ Recording started successfully');
        } else {
          throw new Error('Failed to start recording');
        }
      }
    } catch (error) {
      console.error('❌ Recording toggle failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      
      // Show error to user temporarily
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };


  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update duration every second when recording
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (recording.isRecording && recording.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recording.startTime!.getTime()) / 1000);
        // We don't call setRecording here to avoid triggering re-renders
        // The duration will be calculated on-demand for display
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording.isRecording, recording.startTime]);

  // Calculate current duration for display
  const currentDuration = recording.isRecording && recording.startTime
    ? Math.floor((Date.now() - recording.startTime.getTime()) / 1000)
    : recording.duration;

  return (
    <div className="modern-header" style={{ position: 'relative' }}>
      <h1 className="modern-logo">🎙️ AI Sales Assistant</h1>
      
      <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        <button
          onClick={() => {
            console.log('Overlay button clicked');
            if (window.electronAPI) {
              console.log('Opening overlay...');
              window.electronAPI.openOverlay();
            } else {
              console.error('Electron API not available');
            }
          }}
          className="overlay-mode-btn"
          title="Switch to Overlay Mode"
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: '1px solid #667eea',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            marginRight: '12px',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '36px',
            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.2)';
          }}
        >
          ⬜ Overlay
        </button>
        
        {error && (
          <span style={{ 
            color: '#dc3545', 
            fontSize: '12px', 
            marginRight: '12px',
            background: 'rgba(220, 53, 69, 0.1)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(220, 53, 69, 0.3)'
          }}>
            ❌ {error}
          </span>
        )}
        
        {recording.isRecording && (
          <span style={{ 
            color: '#dc3545', 
            fontSize: '14px', 
            fontWeight: '500',
            marginRight: '12px' 
          }}>
            🔴 {formatDuration(currentDuration)}
          </span>
        )}
        
        <button
          className={`btn ${recording.isRecording ? 'recording' : ''}`}
          onClick={handleRecordingToggle}
          disabled={isProcessing}
          style={{
            opacity: isProcessing ? 0.7 : 1,
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? (
            <>⏳ {recording.isRecording ? 'Stopping...' : 'Starting...'}</>
          ) : recording.isRecording ? (
            <>⏹️ Stop Recording</>
          ) : (
            <>🎤 Start Recording</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;