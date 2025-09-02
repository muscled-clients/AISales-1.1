import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { aiService } from '../services/aiService';
import ChatInput from './ChatInput';

const ChatPanel: React.FC = () => {
  // Refs for scroll 
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Zustand performance optimization: subscribe only to needed state slices
  // REMOVED transcript subscription to prevent re-renders
  const chatHistory = useAppStore((state) => state.chatHistory);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const sendTranscriptAsMessage = useAppStore((state) => state.sendTranscriptAsMessage);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const selectedContext = useAppStore((state) => state.selectedContext);
  const setSelectedContext = useAppStore((state) => state.setSelectedContext);
  const clearSelectedContext = useAppStore((state) => state.clearSelectedContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Debug chat history changes
  React.useEffect(() => {
    console.log('🗨️ Chat history changed in ChatPanel, total messages:', chatHistory.length);
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      console.log('🗨️ Last message:', lastMessage.role, lastMessage.content.substring(0, 50) + '...');
    }
  }, [chatHistory]);

  // Memoized send message handler
  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    try {
      await sendChatMessage(message);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sendChatMessage]);
  
  // Memoized send transcript message handler
  const handleSendTranscriptMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      await sendTranscriptAsMessage(text);
    } catch (error) {
      console.error('Transcript message error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sendTranscriptAsMessage]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current && !userHasScrolled) {
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [chatHistory.length, userHasScrolled]);
  
  // Handle user scroll to disable auto-scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    setUserHasScrolled(!isAtBottom);
  }, []);

  const handleQuickAction = async (action: string) => {
    if (action === 'debug') {
      // Debug AI settings and status
      const { transcripts } = useAppStore.getState();
      const debugInfo = {
        aiReady: aiService.isReady(),
        settings: settings,
        hasOpenAI: !!settings.openaiKey,
        openaiKeyLength: settings.openaiKey?.length || 0,
        autoSuggestions: settings.autoSuggestions,
        autoTodos: settings.autoTodos,
        transcriptCount: transcripts.length,
        lastTranscript: transcripts.length > 0 ? transcripts[transcripts.length - 1].text : 'None'
      };
      
      console.log('🐛 AI Debug Info:', debugInfo);
      
      // Add debug info to chat
      const { addChatMessage } = useAppStore.getState();
      addChatMessage({
        role: 'assistant',
        content: `🐛 **AI Debug Status**\n\n` +
          `• AI Service Ready: ${debugInfo.aiReady ? '✅' : '❌'}\n` +
          `• OpenAI Key: ${debugInfo.hasOpenAI ? `✅ (${debugInfo.openaiKeyLength} chars)` : '❌ Not configured'}\n` +
          `• Auto Suggestions: ${debugInfo.autoSuggestions ? '✅ Enabled' : '❌ Disabled'}\n` +
          `• Auto Todos: ${debugInfo.autoTodos ? '✅ Enabled' : '❌ Disabled'}\n` +
          `• Transcripts: ${debugInfo.transcriptCount}\n` +
          `• Last: "${debugInfo.lastTranscript.substring(0, 50)}..."`,
        timestamp: new Date()
      });
      return;
    }

    if (action === 'trigger-ai') {
      // Manually trigger AI suggestions
      setIsLoading(true);
      setAiStatus('🔄 Testing AI suggestions...');
      
      try {
        const result = await useAppStore.getState().triggerAISuggestions();
        console.log('Manual trigger result:', result);
        
        if (result.success) {
          setAiStatus('✅ AI suggestions working!');
        } else {
          setAiStatus(`❌ AI failed: ${result.message}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setAiStatus(`❌ Error: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        setTimeout(() => setAiStatus(''), 3000);
      }
      return;
    }
    
    const quickMessages = {
      summarize: "Please summarize the key points from my recent transcripts.",
      todos: "Extract action items from my recent conversations and convert them to todos.",
      insights: "What insights can you provide from my recent call transcripts?",
      sentiment: "Analyze the sentiment and tone of my recent conversations."
    };
    
    const message = quickMessages[action as keyof typeof quickMessages] || action;
    if (message) {
      await handleSendMessage(message);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          {/* Summarize button */}
          <button
            onClick={() => handleQuickAction('summarize')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              background: '#444',
              border: 'none',
              borderRadius: '4px',
              color: '#ccc',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.background = '#555')}
            onMouseLeave={(e) => e.currentTarget.style.background = '#444'}
          >
            📄 Summarize
          </button>

          {/* Auto AI Suggestions Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '11px',
            color: '#ccc',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.autoSuggestions}
              onChange={(e) => updateSettings({ autoSuggestions: e.target.checked })}
              style={{
                accentColor: '#007acc',
                transform: 'scale(0.9)'
              }}
            />
            Auto AI
          </label>
        </div>
      </div>
      
      {/* Chat messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '12px',
          paddingBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          scrollBehavior: 'smooth',
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch'
        } as React.CSSProperties}>
        {chatHistory.length === 0 ? (
          <div className="empty-state">
            <h4>💬 AI Assistant</h4>
            <p>Ask questions about your transcripts</p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
              Use quick actions above or type a message
            </p>
          </div>
        ) : (
          <>
            {/* Render messages using optimized Zustand state */}
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: msg.role === 'user' ? '#007acc' : 'rgba(45, 45, 45, 0.8)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}
              >
                <div>{msg.content}</div>
                {msg.timestamp && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'rgba(255,255,255,0.5)', 
                    marginTop: '4px' 
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(45, 45, 45, 0.8)',
                padding: '10px 14px',
                borderRadius: '16px',
                fontSize: '14px',
                color: '#888'
              }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>🤖 Thinking...</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Use the new ChatInput component */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendTranscriptMessage={handleSendTranscriptMessage}
        isLoading={isLoading}
        selectedContext={selectedContext}
        onClearContext={clearSelectedContext}
        onUpdateContext={setSelectedContext}
      />
    </div>
  );
};

export default ChatPanel;