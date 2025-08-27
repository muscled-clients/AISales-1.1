import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import '../styles/overlay.css';

const OverlayMode: React.FC = () => {
  const transcripts = useAppStore((state) => state.transcripts);
  const todos = useAppStore((state) => state.todos);
  const chatHistory = useAppStore((state) => state.chatHistory);
  const suggestions = useAppStore((state) => state.suggestions);
  const recording = useAppStore((state) => state.recording);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'chat' | 'todos'>('transcript');

  useEffect(() => {
    // Request initial state sync when overlay opens
    const syncState = async () => {
      if (window.electronAPI) {
        const state = await window.electronAPI.requestOverlayState();
        if (state) {
          // Sync the state to our store
          const { 
            addTranscript, 
            addTodo, 
            addChatMessage,
            setRecording 
          } = useAppStore.getState();
          
          // Sync transcripts
          state.transcripts?.forEach((t: any) => addTranscript(t));
          // Sync todos
          state.todos?.forEach((t: any) => addTodo(t));
          // Sync chat
          state.chatHistory?.forEach((m: any) => addChatMessage(m));
          // Sync recording state
          if (state.recording) setRecording(state.recording);
        }
      }
    };
    
    syncState();

    // Listen for real-time updates
    const handleTranscript = (transcript: any) => {
      const { addTranscript } = useAppStore.getState();
      addTranscript(transcript);
    };

    const handleSyncState = (state: any) => {
      const { 
        addTranscript, 
        addTodo, 
        addChatMessage 
      } = useAppStore.getState();
      
      // Update with new data
      state.transcripts?.forEach((t: any) => addTranscript(t));
      state.todos?.forEach((t: any) => addTodo(t));
      state.chatHistory?.forEach((m: any) => addChatMessage(m));
    };

    if (window.electronAPI) {
      window.electronAPI.onTranscript(handleTranscript);
      window.electronAPI.onSyncState?.(handleSyncState);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeTranscriptListener?.(handleTranscript);
        window.electronAPI.removeSyncStateListener?.(handleSyncState);
      }
    };
  }, []);

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeOverlay();
    }
  };

  const handleSwitchToMain = () => {
    if (window.electronAPI) {
      window.electronAPI.switchToMain();
    }
  };

  // Get latest AI suggestion
  const latestSuggestion = chatHistory
    .filter(msg => msg.role === 'assistant')
    .slice(-1)[0];

  // Get active todos
  const activeTodos = todos.filter(todo => !todo.completed).slice(0, 3);

  // Get recent transcripts
  const recentTranscripts = transcripts.slice(-5);

  return (
    <div className="overlay-container">
      {/* Title Bar */}
      <div 
        className="overlay-titlebar"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
      >
        <div className="overlay-title">
          <span className="overlay-icon">🤖</span>
          AI Assistant
          {recording.isRecording && (
            <span className="recording-indicator">● REC</span>
          )}
        </div>
        <div className="overlay-controls">
          <button onClick={handleSwitchToMain} className="overlay-btn" title="Open Main Window">
            <span>⬜</span>
          </button>
          <button onClick={handleClose} className="overlay-btn close" title="Close Overlay">
            <span>✕</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="overlay-tabs">
        <button 
          className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          📝 Live
        </button>
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button 
          className={`tab ${activeTab === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveTab('todos')}
        >
          ✅ Todos
        </button>
      </div>

      {/* Content Area */}
      <div className="overlay-content">
        {/* Live Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="overlay-transcript-panel">
            <div className="transcript-list">
              {recentTranscripts.length === 0 ? (
                <div className="empty-state">
                  <p>Start recording to see live transcription</p>
                </div>
              ) : (
                recentTranscripts.map((transcript) => (
                  <div key={transcript.id} className="transcript-item-overlay">
                    <div className="transcript-text">{transcript.text}</div>
                    <div className="transcript-time">
                      {new Date(transcript.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Latest AI Suggestion */}
            {latestSuggestion && (
              <div className="ai-suggestion-overlay">
                <div className="suggestion-header">💡 AI Insight</div>
                <div className="suggestion-content">
                  {latestSuggestion.content}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="overlay-chat-panel">
            <div className="chat-messages">
              {chatHistory.length === 0 ? (
                <div className="empty-state">
                  <p>No chat messages yet</p>
                </div>
              ) : (
                chatHistory.slice(-10).map((msg) => (
                  <div key={msg.id} className={`chat-msg ${msg.role}`}>
                    <div className="msg-content">{msg.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Todos Tab */}
        {activeTab === 'todos' && (
          <div className="overlay-todos-panel">
            <div className="todos-list">
              {activeTodos.length === 0 ? (
                <div className="empty-state">
                  <p>No active todos</p>
                </div>
              ) : (
                activeTodos.map((todo) => (
                  <div key={todo.id} className="todo-item-overlay">
                    <input 
                      type="checkbox" 
                      checked={todo.completed}
                      onChange={() => {
                        const { toggleTodo } = useAppStore.getState();
                        toggleTodo(todo.id);
                      }}
                    />
                    <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                      {todo.text}
                    </span>
                    <span className={`priority-badge ${todo.priority}`}>
                      {todo.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="todos-summary">
              {todos.filter(t => !t.completed).length} active, {todos.filter(t => t.completed).length} completed
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="overlay-status-bar">
        <div className="status-item">
          {recording.isRecording ? '🔴 Recording' : '⭕ Ready'}
        </div>
        <div className="status-item">
          📝 {transcripts.length} transcripts
        </div>
        <div className="status-item">
          ✅ {todos.filter(t => !t.completed).length} todos
        </div>
      </div>
    </div>
  );
};

export default OverlayMode;