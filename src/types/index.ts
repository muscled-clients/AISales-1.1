// Type definitions for SmartCallMate React

export interface Transcript {
  id: string;
  text: string;
  timestamp: Date;
  isInterim: boolean;
  speaker?: 'user' | 'system' | 'call' | 'mixed';
  audioSource?: 'microphone' | 'system' | 'both';
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
  source: 'manual' | 'ai';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Suggestion {
  id: string;
  title: string;
  content: string;
  category: string;
  relevance: number;
  createdAt: Date;
}

export interface AppSettings {
  deepgramKey: string;
  openaiKey: string;
  autoTranscription: boolean;
  autoTodos: boolean;
  autoSuggestions: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  startTime?: Date;
  duration: number;
}