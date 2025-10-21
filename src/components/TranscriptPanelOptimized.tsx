import logger from '../utils/logger';
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { resourceManager } from '../services/resourceManager';
import TranscriptItem from './TranscriptItem';

const TranscriptPanelOptimized: React.FC = () => {
  // Component ID for resource tracking
  const componentId = useRef(`transcript-panel-${Date.now()}`).current;
  
  // Zustand performance optimization
  const transcripts = useAppStore((state) => state.transcripts);
  const recording = useAppStore((state) => state.recording);
  const setSelectedContextFromTranscript = useAppStore((state) => state.setSelectedContextFromTranscript);
  
  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  
  // Smart selection state - Use Set for O(1) lookups
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Track selected text for Cmd+D shortcut
  const [highlightedText, setHighlightedText] = useState<string>('');
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resourceManager.cleanupComponent(componentId);
    };
  }, [componentId]);
  
  // Handle Cmd+D shortcut for setting context - ONLY within this component
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're actually in the transcript panel
      const target = e.target as HTMLElement;
      const transcriptPanel = scrollContainerRef.current?.parentElement;
      
      // Only process if event originated from within transcript panel
      if (!transcriptPanel || !transcriptPanel.contains(target)) {
        return; // Let other components handle their own events
      }
      
      // Only handle Cmd+D, and ONLY when we have selected text
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
          // Check if selection is within our panel
          const selectionNode = selection?.anchorNode;
          if (selectionNode && transcriptPanel.contains(selectionNode as Node)) {
            e.preventDefault(); // Only prevent default for our Cmd+D
            e.stopPropagation(); // Stop event from bubbling
            
            logger.debug('📎 Setting context from selection:', selectedText);
            setSelectedContextFromTranscript([selectedText]);
            
            // Visual feedback - flash background
            const selectedElement = selection?.anchorNode?.parentElement;
            if (selectedElement) {
              selectedElement.style.backgroundColor = 'rgba(0, 122, 204, 0.3)';
              setTimeout(() => {
                selectedElement.style.backgroundColor = '';
              }, 200);
            }
            
            // Clear the selection
            selection?.removeAllRanges();
          }
        }
      }
      // All other key combinations pass through untouched
    };
    
    // Use capture phase to get events early, but only for our component
    const element = scrollContainerRef.current?.parentElement;
    if (element) {
      element.addEventListener('keydown', handleKeyDown, false);
      return () => {
        element.removeEventListener('keydown', handleKeyDown, false);
      };
    }
  }, [setSelectedContextFromTranscript]);
  
  // Filter transcripts based on search query
  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) return transcripts;
    return transcripts.filter(transcript =>
      transcript.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transcripts, searchQuery]);
  
  // Memoized selection check for O(1) performance
  const isSelected = useCallback((id: string) => 
    selectedIds.has(id),
    [selectedIds]
  );
  
  // Memoized selection handler
  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  // Auto-scroll to bottom when new transcripts arrive
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
  }, [transcripts.length, userHasScrolled]);
  
  // Handle user scroll to disable auto-scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 50;
    setUserHasScrolled(!isAtBottom);
  }, []);

  return (
    <div className="panel" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#1e1e1e'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(30, 30, 30, 0.8)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '6px',
              color: '#dcddde',
              fontSize: '14px',
              outline: 'none',
              transition: 'background 0.2s'
            }}
            onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
            onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.06)'}
          />
          
          {/* Status bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '12px',
            color: '#72767d'
          }}>
            <span>
              {filteredTranscripts.length} message{filteredTranscripts.length !== 1 ? 's' : ''}
            </span>
            {recording.isRecording && (
              <span style={{ 
                color: '#43b581',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#43b581',
                  animation: 'pulse 2s infinite'
                }}></span>
                Recording
              </span>
            )}
          </div>
          
          {/* Tip */}
          <div style={{
            fontSize: '11px',
            color: '#4f545c',
            fontStyle: 'italic'
          }}>
            💡 Tip: Select text and press Cmd+D to set as AI context
          </div>
        </div>
      </div>

      {/* Messages area - Discord style */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          background: '#1e1e1e'
        }}>
        {filteredTranscripts.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: '#72767d'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600',
              marginBottom: '8px',
              color: '#dcddde'
            }}>
              No transcripts yet
            </h4>
            <p style={{ fontSize: '14px' }}>
              Start recording to see live transcripts
            </p>
          </div>
        ) : (
          filteredTranscripts.map((transcript, index) => {
            // Show timestamp divider for first message or if >5 min gap
            const showTimestamp = index === 0 || 
              (index > 0 && 
                new Date(transcript.timestamp).getTime() - 
                new Date(filteredTranscripts[index - 1].timestamp).getTime() > 300000);
            
            return (
              <React.Fragment key={transcript.id}>
                {showTimestamp && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '16px 0 8px',
                    position: 'relative',
                    fontSize: '12px',
                    color: '#72767d',
                    fontWeight: '600',
                    userSelect: 'none'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      background: '#1e1e1e',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      {new Date(transcript.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.06)'
                    }}></div>
                  </div>
                )}
                <TranscriptItem
                  transcript={transcript}
                  isSelected={isSelected(transcript.id)}
                  onSelect={handleSelect}
                />
              </React.Fragment>
            );
          })
        )}
      </div>
      
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TranscriptPanelOptimized;