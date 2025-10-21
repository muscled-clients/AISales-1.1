import React, { memo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
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
 * Discord-like minimalistic transcript item with inline editing
 * - Double-click to edit
 * - Click outside or press Enter to save
 * - Press Escape to cancel
 */
const TranscriptItem = memo<TranscriptItemProps>(({
  transcript,
  isSelected,
  onSelect
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateTranscript = useAppStore((state) => state.updateTranscript);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(transcript.text);
  };

  const handleSave = () => {
    if (editText.trim() && editText !== transcript.text) {
      updateTranscript(transcript.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(transcript.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // Compute class names
  const className = `${styles.transcriptItem} ${isSelected ? styles.selected : ''} ${isEditing ? (styles as any).editing : ''}`;

  return (
    <div
      className={className}
      onClick={() => !isEditing && onSelect(transcript.id)}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      title="Double-click to edit"
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className={(styles as any).transcriptEditArea}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          rows={3}
        />
      ) : (
        <div className={styles.transcriptText}>
          {transcript.text}
        </div>
      )}
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