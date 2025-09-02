import React, { useState, useMemo, useRef, useCallback, memo, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

const TranscriptPanel: React.FC = () => {
  // Zustand performance optimization: only subscribe to transcripts array
  const transcripts = useAppStore((state) => state.transcripts);
  const recording = useAppStore((state) => state.recording);
  const selectedContext = useAppStore((state) => state.selectedContext);
  const setSelectedContextFromTranscript = useAppStore((state) => state.setSelectedContextFromTranscript);
  const sendTranscriptAsMessage = useAppStore((state) => state.sendTranscriptAsMessage);
  const clearSelectedContextFromTranscript = useAppStore((state) => state.clearSelectedContextFromTranscript);
  
  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  
  // Smart selection state
  const [selectedTexts, setSelectedTexts] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'none' | 'multi' | 'custom'>('none');
  
  // Filter transcripts based on search query
  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) return transcripts;
    return transcripts.filter(transcript =>
      transcript.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcripts, searchQuery]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Smart text selection handlers - memoized for performance
  const handleDoubleClick = useCallback((text: string) => {
    setSelectedTexts([text]);
    setSelectionMode('custom');
    setSelectedContextFromTranscript([text]);
  }, [setSelectedContextFromTranscript]);

  const handleCtrlClick = useCallback((e: React.MouseEvent, text: string) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setSelectedTexts(prev => {
        const newSelection = prev.includes(text) 
          ? prev.filter(t => t !== text)
          : [...prev, text];
        setSelectionMode('multi');
        setSelectedContextFromTranscript(newSelection);
        return newSelection;
      });
    }
  }, [setSelectedContextFromTranscript]);

  const handleTextSelection = useCallback((text: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      setSelectedTexts([selectedText]);
      setSelectionMode('custom');
      setSelectedContextFromTranscript([selectedText]);
    }
  }, [setSelectedContextFromTranscript]);


  const clearSelection = useCallback(() => {
    setSelectedTexts([]);
    setSelectionMode('none');
    clearSelectedContextFromTranscript();
  }, [clearSelectedContextFromTranscript]);
  
  const handleSendToChat = useCallback(async (text: string) => {
    await sendTranscriptAsMessage(text);
  }, [sendTranscriptAsMessage]);
  
  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (scrollContainerRef.current && !userHasScrolled) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcripts.length, userHasScrolled]);
  
  // Handle user scroll to disable auto-scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    setUserHasScrolled(!isAtBottom);
  }, []);

  // Memoized transcript item component for better performance
  const TranscriptItem = memo(({ transcript }: { transcript: any }) => {
    const [hovering, setHovering] = useState(false);
    
    return (
      <div 
        className="transcript-item"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div 
          className="transcript-text" 
          style={{
            padding: '12px',
            background: selectedTexts.includes(transcript.text) ? '#2a4a6b' : '#2a2a2a',
            border: selectedTexts.includes(transcript.text) ? '1px solid #007acc' : '1px solid #333',
            borderRadius: '8px',
            marginBottom: '8px',
            lineHeight: '1.5',
            fontSize: '14px',
            cursor: 'pointer',
            userSelect: 'text',
            transition: 'all 0.2s ease',
            willChange: 'background, border',
            position: 'relative'
          }}
          onDoubleClick={() => handleDoubleClick(transcript.text)}
          onClick={(e) => handleCtrlClick(e, transcript.text)}
          onMouseUp={() => handleTextSelection(transcript.text)}
          onTouchEnd={() => handleTextSelection(transcript.text)}
        >
          <div style={{ fontSize: '14px', color: '#e0e0e0' }}>
            {transcript.text}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#888',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{transcript.speaker || 'Speaker'}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {hovering && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendToChat(transcript.text);
                  }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    background: '#007acc',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#fff',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                  title="Send to chat"
                >
                  💬 Send
                </button>
              )}
              <span>{formatTime(transcript.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {selectedTexts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                fontSize: '11px', 
                color: '#007acc',
                background: 'rgba(0, 122, 204, 0.1)',
                padding: '2px 6px',
                borderRadius: '3px'
              }}>
                {selectedTexts.length} selected
              </span>
              <button
                onClick={clearSelection}
                style={{
                  fontSize: '10px',
                  background: 'transparent',
                  border: '1px solid #666',
                  borderRadius: '3px',
                  color: '#666',
                  padding: '2px 6px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Search input */}
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              background: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007acc'}
            onBlur={(e) => e.target.style.borderColor = '#444'}
          />
        </div>
        
      </div>
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0',
          scrollBehavior: 'smooth',
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch'
        } as React.CSSProperties}>
        {transcripts.length === 0 ? (
          <div className="empty-state">
            <h4>📝 No Transcripts Yet</h4>
            <p>Start recording to see live transcription</p>
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <div className="empty-state">
            <h4>🔍 No Results Found</h4>
            <p>No transcripts match "{searchQuery}"</p>
          </div>
        ) : (
          <div style={{ padding: '12px', paddingBottom: '24px' }}>
            {/* Render filtered transcripts in chronological order (oldest first) */}
            {filteredTranscripts.map((transcript) => (
              <TranscriptItem key={transcript.id} transcript={transcript} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;