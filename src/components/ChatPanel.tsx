import logger from '../utils/logger';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { aiService } from '../services/aiService';
import ChatInput from './ChatInput';
import MessageContent from './MessageContent';

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
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile'); // Default to free Groq model
  const [wordLimit, setWordLimit] = useState(100); // Default 100 words
  
  // Estimate tokens based on context (rough: 1 token ≈ 4 characters)
  const estimateTokens = useCallback(() => {
    const contextLength = selectedContext.join(' ').length;
    const historyLength = chatHistory.slice(-6).reduce((acc, msg) => acc + msg.content.length, 0);
    const systemPromptLength = 100; // Approximate system prompt tokens
    
    const estimatedInputTokens = Math.ceil((contextLength + historyLength + systemPromptLength) / 4);
    
    // Suggest output tokens based on input size
    // More input = likely need more output
    if (estimatedInputTokens < 100) {
      return 500; // Small input, standard response
    } else if (estimatedInputTokens < 500) {
      return 1000; // Medium input, longer response
    } else {
      return 2000; // Large input, detailed response
    }
  }, [selectedContext, chatHistory]);

  // Removed auto-adjust - using manual word limit control instead
  
  // Debug chat history changes
  React.useEffect(() => {
    logger.debug('🗨️ Chat history changed in ChatPanel, total messages:', chatHistory.length);
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      logger.debug('🗨️ Last message:', lastMessage.role, lastMessage.content.substring(0, 50) + '...');
    }
  }, [chatHistory]);

  // Memoized send message handler
  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    try {
      // Update AI service with selected model
      const apiKey = settings.openaiKey || '';
      logger.debug(`🔑 Using API key for chat: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);
      aiService.initialize(apiKey, selectedModel);
      await sendChatMessage(message);
    } catch (error) {
      logger.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sendChatMessage, settings.openaiKey, selectedModel]);
  
  // Memoized send transcript message handler
  const handleSendTranscriptMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    try {
      await sendTranscriptAsMessage(text);
    } catch (error) {
      logger.error('Transcript message error:', error);
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
      
      logger.debug('🐛 AI Debug Info:', debugInfo);
      
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
        logger.debug('Manual trigger result:', result);
        
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
    
    // Handle summarize with selected context or recent transcripts
    if (action === 'summarize') {
      const { transcripts } = useAppStore.getState();
      
      // Use selected context if available, otherwise last 50 words from transcripts
      if (selectedContext.length > 0) {
        // Already have selected context, just summarize it
        const message = `Provide a summary in exactly ${wordLimit} words or less. Be concise and capture the main points.`;
        await handleSendMessage(message);
      } else {
        // Get last 50 words from recent transcripts
        const recentTranscripts = transcripts.slice(-5).map(t => t.text).join(' ');
        const words = recentTranscripts.split(' ');
        const last50Words = words.slice(-50).join(' ');
        
        if (last50Words) {
          // Set as context and summarize
          setSelectedContext([last50Words]);
          setTimeout(async () => {
            const message = `Provide a summary in exactly ${wordLimit} words or less. Be concise and capture the main points.`;
            await handleSendMessage(message);
          }, 100);
        } else {
          await handleSendMessage("No recent conversation to summarize. Please select some text or start a conversation.");
        }
      }
      return;
    }
    
    // Handle technical analysis
    if (action === 'technical') {
      const { transcripts } = useAppStore.getState();
      
      // Use selected context if available, otherwise last 100 words from transcripts
      if (selectedContext.length > 0) {
        const message = `Give me 3 technical questions that need answering. Keep response under ${wordLimit} words total.`;
        
        await handleSendMessage(message);
      } else {
        // Get last 100 words from recent transcripts
        const recentTranscripts = transcripts.slice(-8).map(t => t.text).join(' ');
        const words = recentTranscripts.split(' ');
        const last100Words = words.slice(-100).join(' ');
        
        if (last100Words) {
          // Set as context and analyze
          setSelectedContext([last100Words]);
          setTimeout(async () => {
            const message = `Analyze this technically and provide solutions. Format your response EXACTLY like this:

**Understanding:** So basically you're saying [brief summary of their technical challenge]

**Technical Solutions:**
• [First technical solution with specific implementation approach]
• [Second technical solution with specific tools/technologies]

**Follow-up Questions:**
• [Any clarifying questions needed to refine the solution]`;
            
            await handleSendMessage(message);
          }, 100);
        } else {
          await handleSendMessage("No recent conversation to analyze. Please select some text or start a conversation.");
        }
      }
      return;
    }
    
    // Handle explain - how does that work?
    if (action === 'explain') {
      const { transcripts } = useAppStore.getState();
      
      // Use selected context if available, otherwise last 80 words from transcripts
      if (selectedContext.length > 0) {
        const message = `Explain how this works in exactly ${wordLimit} words. Focus on the key concepts and main functionality.`;
        
        await handleSendMessage(message);
      } else {
        // Get last 80 words from recent transcripts
        const recentTranscripts = transcripts.slice(-6).map(t => t.text).join(' ');
        const words = recentTranscripts.split(' ');
        const last80Words = words.slice(-80).join(' ');
        
        if (last80Words) {
          // Set as context and explain
          setSelectedContext([last80Words]);
          setTimeout(async () => {
            const message = `Explain how this works. Provide TWO versions:

**🙂 Non-Technical Explanation:**
[Simple explanation using analogies and everyday language that anyone can understand - 2-3 sentences]

**🔬 Technical Deep-Dive:**
[Detailed technical explanation with specifics about architecture, data flow, algorithms, and implementation details - 3-4 sentences]

**Key Components:**
• [Main component 1 and its role]
• [Main component 2 and its role]
• [Main component 3 and its role]`;
            
            await handleSendMessage(message);
          }, 100);
        } else {
          await handleSendMessage("No recent conversation to explain. Please select some text or start a conversation.");
        }
      }
      return;
    }
    
    const quickMessages = {
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
                <MessageContent content={msg.content} role={msg.role} />
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
      
      {/* Quick actions bar - below input */}
      <div style={{ 
        padding: '8px 16px', 
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'transparent'
      }}>
        {/* Left side - Action buttons and Model selector */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
          {/* Summarize button */}
          <button
            onClick={() => handleQuickAction('summarize')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
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
            title="Summarize selected context or last 50 words"
          >
            📄 Summarize
          </button>
          
          {/* Explain button */}
          <button
            onClick={() => handleQuickAction('explain')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
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
            title="Explain how it works - both technical and simple"
          >
            ❓ Explain
          </button>
          
          {/* Technical button */}
          <button
            onClick={() => handleQuickAction('technical')}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
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
            title="Technical analysis with solutions"
          >
            🔧 Technical
          </button>
          </div>
          
          {/* Model selector dropdown */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '12px',
            color: '#888'
          }}>
            <span>Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                padding: '4px 8px',
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#ccc',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#555'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
            >
              <optgroup label="OpenAI">
                <option value="gpt-5-nano">GPT-5 Nano</option>
                <option value="gpt-5">GPT-5 Flagship</option>
              </optgroup>
              <optgroup label="Groq (Free)">
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Best)</option>
                <option value="llama-3.2-90b-vision-preview">Llama 3.2 90B Vision</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Fast)</option>
                <option value="gemma2-9b-it">Gemma2 9B (Fastest)</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Auto AI Suggestions Toggle */}
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          fontSize: '12px',
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
  );
};

export default ChatPanel;