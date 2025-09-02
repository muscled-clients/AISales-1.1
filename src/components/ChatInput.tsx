import React, { useState, useRef, useCallback, memo } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onSendTranscriptMessage?: (text: string) => Promise<void>;
  isLoading: boolean;
  selectedContext: string[];
  onClearContext: () => void;
  onUpdateContext?: (context: string[]) => void;
}

const ChatInput: React.FC<ChatInputProps> = memo(({
  onSendMessage,
  onSendTranscriptMessage,
  isLoading,
  selectedContext,
  onClearContext,
  onUpdateContext
}) => {
  const [message, setMessage] = useState('');
  const [contextText, setContextText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Keep focus on input throughout the process
    const keepFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    // Focus immediately
    keepFocus();

    // Start the async operation
    const sendPromise = onSendMessage(userMessage);
    
    // Keep checking focus during send
    const focusInterval = setInterval(keepFocus, 50);
    
    // Wait for send to complete
    await sendPromise;
    
    // Clear interval and do final focus
    clearInterval(focusInterval);
    keepFocus();
  }, [message, isLoading, onSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  React.useEffect(() => {
    setContextText(selectedContext.join('\n'));
  }, [selectedContext]);

  // Auto-focus input when loading completes
  React.useEffect(() => {
    if (!isLoading && inputRef.current) {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isLoading]);

  // Focus on mount
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleContextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContextText(newText);
    if (onUpdateContext) {
      const newContext = newText.split('\n').filter(line => line.trim());
      onUpdateContext(newContext);
    }
  }, [onUpdateContext]);

  return (
    <div style={{ padding: '16px', borderTop: '1px solid #333' }}>
      {selectedContext.length > 0 && (
        <div style={{
          position: 'relative',
          marginBottom: '12px'
        }}>
          <button
            onClick={onClearContext}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '2px',
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: '1',
              fontWeight: 'bold',
              zIndex: 10,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
            title="Clear context"
          >
            ×
          </button>
          <textarea
            ref={contextRef}
            value={contextText}
            onChange={handleContextChange}
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '120px',
              padding: '8px 24px 8px 8px',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '13px',
              lineHeight: '1.4',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s'
            }}
            placeholder="Selected context..."
            onFocus={(e) => e.target.style.borderColor = '#444'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
        </div>
      )}
      
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            opacity: isLoading ? 0.7 : 1,
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007acc'}
          onBlur={(e) => e.target.style.borderColor = '#444'}
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          style={{
            padding: '12px 24px',
            background: isLoading || !message.trim() ? '#444' : '#007acc',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: isLoading || !message.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          {isLoading ? '⏳' : 'Send'}
        </button>
      </form>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.selectedContext === nextProps.selectedContext &&
    prevProps.onSendMessage === nextProps.onSendMessage &&
    prevProps.onSendTranscriptMessage === nextProps.onSendTranscriptMessage &&
    prevProps.onClearContext === nextProps.onClearContext &&
    prevProps.onUpdateContext === nextProps.onUpdateContext
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;