import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { aiService } from '../services/aiService';

const ChatPanel: React.FC = () => {
  // Refs for scroll and input
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Zustand performance optimization: subscribe only to needed state slices
  const chatHistory = useAppStore((state) => state.chatHistory);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const transcripts = useAppStore((state) => state.transcripts);
  const selectedContext = useAppStore((state) => state.selectedContext);
  const clearSelectedContext = useAppStore((state) => state.clearSelectedContext);
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  // Track transcript count for debugging
  React.useEffect(() => {
    if (transcripts.length > 0) {
      const lastTranscript = transcripts[transcripts.length - 1];
      setAiStatus(`📝 Last: "${lastTranscript.text.substring(0, 30)}..."`);
      setTimeout(() => setAiStatus(''), 2000);
    }
  }, [transcripts]);

  // Debug chat history changes
  React.useEffect(() => {
    console.log('🗨️ Chat history changed in ChatPanel, total messages:', chatHistory.length);
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      console.log('🗨️ Last message:', lastMessage.role, lastMessage.content.substring(0, 50) + '...');
    }
  }, [chatHistory]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    
    // Keep focus on input for smooth typing
    if (inputRef.current) {
      inputRef.current.focus();
    }

    try {
      // Use the Zustand store action which handles AI integration
      await sendChatMessage(userMessage);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [message, isLoading, sendChatMessage]);
  
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
  
  // Optimize input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const handleQuickAction = async (action: string) => {
    if (action === 'debug') {
      // Debug AI settings and status
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
          setMessage(`✅ ${result.message}`);
          setAiStatus('✅ AI suggestions working!');
        } else {
          setMessage(`❌ Failed: ${result.message}`);
          setAiStatus(`❌ AI failed: ${result.message}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setMessage(`❌ Error: ${errorMessage}`);
        setAiStatus(`❌ Error: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        setTimeout(() => setAiStatus(''), 3000); // Clear status after 3s
      }
      return;
    }
    
    const quickMessages = {
      summarize: "Please summarize the key points from my recent transcripts.",
      todos: "Extract action items from my recent conversations and convert them to todos.",
      insights: "What insights can you provide from my recent call transcripts?",
      sentiment: "Analyze the sentiment and tone of my recent conversations."
    };
    
    setMessage(quickMessages[action as keyof typeof quickMessages] || action);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
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

        {/* Quick actions */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '6px',
          marginBottom: '12px'
        }}>
          {[
            { key: 'summarize', label: '📄 Summarize', action: 'summarize' },
            { key: 'todos', label: '✅ Find Todos', action: 'todos' },
            { key: 'insights', label: '💡 Insights', action: 'insights' },
            { key: 'sentiment', label: '😊 Sentiment', action: 'sentiment' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleQuickAction(item.action)}
              disabled={isLoading}
              style={{
                padding: '6px 8px',
                fontSize: '11px',
                background: '#444',
                border: 'none',
                borderRadius: '4px',
                color: '#ccc',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {item.label}
            </button>
          ))}
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
      
      {/* Message input */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid #333',
        background: 'rgba(35, 35, 35, 0.95)',
        flexShrink: 0,
        marginTop: 'auto'
      }}>
        {/* Context indicator */}
        {selectedContext.length > 0 && (
          <div style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'rgba(0, 122, 204, 0.1)',
            border: '1px solid rgba(0, 122, 204, 0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#007acc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div>
              <span style={{ fontWeight: '500' }}>📎 Selected context:</span>{' '}
              <span style={{ opacity: 0.8 }}>
                "{selectedContext.join(' ').substring(0, 60)}..."
              </span>
            </div>
            <button
              onClick={clearSelectedContext}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#007acc',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px'
              }}
              title="Clear context"
            >
              ✕
            </button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder={selectedContext.length > 0 
              ? "Ask about the selected context..." 
              : "Ask about your transcripts..."}
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#333',
              border: '1px solid #555',
              borderRadius: '20px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              willChange: 'transform'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007acc'}
            onBlur={(e) => e.target.style.borderColor = '#555'}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            style={{
              padding: '10px 16px',
              background: message.trim() && !isLoading ? '#007acc' : '#444',
              border: 'none',
              borderRadius: '20px',
              color: '#fff',
              fontSize: '14px',
              cursor: message.trim() && !isLoading ? 'pointer' : 'not-allowed',
              minWidth: '60px'
            }}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;