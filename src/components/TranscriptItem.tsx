import React, { memo } from 'react';
import styles from '../styles/TranscriptItem.module.css';

interface Transcript {
  id: string;
  text: string;
  speaker?: string;
  timestamp: Date;
  isInterim?: boolean;
}

interface TranscriptItemProps {
  transcript: Transcript;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Discord-like minimalistic transcript item
 * - No boxes, just text
 * - No speaker labels
 * - No timestamps on every message
 * - Clean and minimal
 */
const TranscriptItem = memo<TranscriptItemProps>(({
  transcript,
  isSelected,
  onSelect
}) => {
  // Compute class names
  const className = `${styles.transcriptItem} ${isSelected ? styles.selected : ''}`;
  
  return (
    <div 
      className={className}
      onClick={() => onSelect(transcript.id)}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <div className={styles.transcriptText}>
        {transcript.text}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-rendering
  return (
    prevProps.transcript.id === nextProps.transcript.id &&
    prevProps.transcript.text === nextProps.transcript.text &&
    prevProps.isSelected === nextProps.isSelected
  );
});

TranscriptItem.displayName = 'TranscriptItem';

export default TranscriptItem;