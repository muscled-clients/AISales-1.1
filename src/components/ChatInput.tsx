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
  const [editingContext, setEditingContext] = useState(false);
  const [contextText, setContextText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    if (inputRef.current) {
      inputRef.current.focus();
    }

    await onSendMessage(userMessage);
  }, [message, isLoading, onSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  }, []);

  const startEditingContext = useCallback(() => {
    setContextText(selectedContext.join('\n'));
    setEditingContext(true);
  }, [selectedContext]);

  const saveEditedContext = useCallback(() => {
    if (onUpdateContext) {
      const newContext = contextText.split('\n').filter(line => line.trim());
      onUpdateContext(newContext);
    }
    setEditingContext(false);
  }, [contextText, onUpdateContext]);

  const cancelEditingContext = useCallback(() => {
    setEditingContext(false);
    setContextText('');
  }, []);

  return (
    <div style={{ padding: '16px', borderTop: '1px solid #333' }}>
      {selectedContext.length > 0 && (
        <div style={{
          background: '#2a3f5f',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          border: '1px solid #3a4f6f'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#007acc', fontWeight: 'bold' }}>
              Selected Context ({selectedContext.length} items)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!editingContext ? (
                <>
                  <button
                    onClick={startEditingContext}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'transparent',
                      border: '1px solid #007acc',
                      borderRadius: '4px',
                      color: '#007acc',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={onClearContext}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'transparent',
                      border: '1px solid #666',
                      borderRadius: '4px',
                      color: '#666',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={saveEditedContext}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: '#007acc',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditingContext}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'transparent',
                      border: '1px solid #666',
                      borderRadius: '4px',
                      color: '#666',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          {!editingContext ? (
            <div style={{
              fontSize: '13px',
              color: '#e0e0e0',
              maxHeight: '100px',
              overflowY: 'auto',
              lineHeight: '1.5'
            }}>
              {selectedContext.map((text, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  • {text}
                </div>
              ))}
            </div>
          ) : (
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                background: '#1e1e1e',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none'
              }}
              placeholder="Edit context..."
            />
          )}
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