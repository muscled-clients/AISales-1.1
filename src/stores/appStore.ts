import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Transcript, Todo, ChatMessage, Suggestion, RecordingState, AppSettings } from '../types';
import { nativeAudioCaptureService } from '../services/nativeAudioCapture';
import { dualAudioCaptureService } from '../services/dualAudioCapture';
import { electronTranscriptionService } from '../services/electronTranscriptionService';
// import { systemAudioCapture } from '../services/systemAudioCapture'; // Temporarily disabled
import { aiService } from '../services/aiService';
import { improvedAIProcessor } from './improvedAIProcessor';
import { transcriptDeduplicator } from '../utils/transcriptDeduplicator';
import { transcriptDeduplicator as efficientDeduplicator } from '../utils/transcriptDeduplication';
import logger from '../utils/logger';

interface AppState {
  // Recording
  recording: RecordingState;
  
  // Data
  transcripts: Transcript[];
  todos: Todo[];
  chatHistory: ChatMessage[];
  suggestions: Suggestion[];
  
  // Settings
  settings: AppSettings;
  
  // AI Processing State
  lastAIProcessingTime: number;
  pendingAITimeout: NodeJS.Timeout | null;
  
  // UI State (removed activePanel - showing all panels simultaneously)
  selectedContext: string[];
  showSettings: boolean;
  showTodos: boolean;
  
  // Actions
  setShowSettings: (show: boolean) => void;
  setShowTodos: (show: boolean) => void;
  setRecording: (recording: RecordingState) => void;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<void>;
  addTranscript: (transcript: Omit<Transcript, 'id'>) => void;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
  toggleTodo: (id: string) => void;
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void;
  sendChatMessage: (message: string) => Promise<void>;
  addSuggestion: (suggestion: Omit<Suggestion, 'id' | 'createdAt'>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  initializeServices: () => Promise<void>;
  triggerAISuggestions: () => Promise<{ success: boolean; message: string }>;
  calculateSimilarity: (text1: string, text2: string) => number;
  setSelectedContext: (context: string[]) => void;
  clearSelectedContext: () => void;
  
  // Event-based actions for transcript-to-chat communication
  setSelectedContextFromTranscript: (texts: string[]) => void;
  sendTranscriptAsMessage: (text: string) => Promise<void>;
  clearSelectedContextFromTranscript: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Initial state
    recording: {
      isRecording: false,
      duration: 0
    },
    transcripts: [],
    todos: [],
    chatHistory: [],
    suggestions: [],
    lastAIProcessingTime: 0,
    pendingAITimeout: null,
    selectedContext: [],
    showSettings: false,
    showTodos: false,
    settings: {
      deepgramKey: '',
      openaiKey: '',
      autoTranscription: true,
      autoTodos: true,
      autoSuggestions: true,
      audioMode: 'both',
      selectedAudioSource: undefined
    },
    // No activePanel needed anymore
    
    // Actions
    setShowSettings: (show) => set((state) => {
      state.showSettings = show;
    }),
    
    setShowTodos: (show) => set((state) => {
      state.showTodos = show;
    }),
    
    setRecording: (recording) => set((state) => {
      state.recording = recording;
    }),

    initializeServices: async () => {
      logger.debug('🚀 Initializing audio and AI services...');
      
      // Load settings from Electron storage first
      if (window.electronAPI) {
        try {
          logger.debug('📂 Loading settings from Electron storage...');
          const savedSettings = await window.electronAPI.getAllSettings();
          logger.debug('📋 Loaded settings:', {
            hasDeepgramKey: !!savedSettings?.deepgramKey,
            hasOpenAIKey: !!savedSettings?.openaiKey,
            deepgramKeyLength: savedSettings?.deepgramKey?.length || 0,
            openAIKeyLength: savedSettings?.openaiKey?.length || 0,
            fullSettings: savedSettings
          });
          
          if (savedSettings && (savedSettings.deepgramKey || savedSettings.openaiKey)) {
            set((state) => {
              state.settings = { ...state.settings, ...savedSettings };
            });
            logger.debug('✅ Settings applied to store');
            
            // Initialize AI service immediately after loading settings
            if (savedSettings.openaiKey) {
              logger.debug('🤖 Initializing AI service with loaded key...');
              aiService.initialize(savedSettings.openaiKey);
              logger.debug('🤖 AI service initialized and ready:', aiService.isReady());
              logger.debug('🤖 Settings after loading:', {
                autoSuggestions: savedSettings.autoSuggestions,
                autoTodos: savedSettings.autoTodos,
                hasOpenAI: !!savedSettings.openaiKey
              });
            }
          } else {
            logger.warn('⚠️ No valid settings found in storage');
          }
        } catch (error) {
          logger.error('❌ Failed to load settings:', error);
        }
      } else {
        logger.warn('⚠️ Electron API not available');
      }
      
      // Set up transcription service callbacks
      logger.debug('🔗 Setting up transcript callback...');
      electronTranscriptionService.setOnTranscript((result) => {
        const { addTranscript, settings } = useAppStore.getState();
        
        logger.debug('📝 Raw transcript received:', {
          text: result.text,
          isInterim: result.isInterim,
          length: result.text.length
        });

        // Use the proven deduplicator from original app
        const cleanedText = transcriptDeduplicator.clean(result.text, result.isInterim);
        
        if (!cleanedText) {
          logger.debug('⏭️ Transcript filtered out by deduplicator');
          return;
        }

        // Only process final transcripts for display and AI processing
        if (!result.isInterim) {
          logger.debug('✅ Adding cleaned transcript:', cleanedText);
          
          // Add to transcript store
          addTranscript({
            text: cleanedText,
            timestamp: result.timestamp,
            isInterim: result.isInterim,
            speaker: result.speaker || 'user'
          });

          // Process with AI if transcript is meaningful
          const words = cleanedText.split(/\s+/);
          const isMeaningful = (
            words.length >= 3 && // Reduced from 4 to 3 words
            cleanedText.length >= 15 && // Reduced from 20 to 15 characters
            // Much broader detection - any business/tech/action context
            !/^(hi|hello|okay|yes|no|um|uh|ah|oh|well)$/i.test(cleanedText) // Not just greetings
          );

          logger.debug('📊 AI Check:', {
            text: cleanedText.substring(0, 50) + '...',
            wordCount: words.length,
            charLength: cleanedText.length,
            isMeaningful,
            autoTodos: settings.autoTodos,
            autoSuggestions: settings.autoSuggestions,
            hasOpenAIKey: !!settings.openaiKey,
            openAIKeyLength: settings.openaiKey?.length || 0
          });

          if (isMeaningful) {
            logger.debug('🎯 Processing with AI:', cleanedText.substring(0, 50) + '...');
            
            // Use improved AI processor with proven approach
            improvedAIProcessor.processTranscript(
              cleanedText,
              settings,
              {
                onTodo: (todo) => {
                  logger.debug('➕ Adding todo:', todo.text);
                  const { addTodo } = useAppStore.getState();
                  addTodo(todo);
                },
                onSuggestion: (message) => {
                  logger.debug('💡 Adding AI response');
                  const { addChatMessage } = useAppStore.getState();
                  addChatMessage({
                    role: 'assistant',
                    content: message,
                    timestamp: new Date()
                  });
                }
              }
            );
          }
        } else {
          // For interim transcripts, just log but don't process  
          logger.debug('📝 Interim transcript cleaned:', cleanedText);
        }
      });

      // Set up native audio capture callback (microphone)
      nativeAudioCaptureService.setOnAudioData((audioData) => {
        // Send audio to Electron transcription service
        electronTranscriptionService.sendAudioData(audioData);
      });

      // System audio capture callback disabled for stability
      // systemAudioCapture.setOnAudioData((audioData) => {
      //   electronTranscriptionService.sendAudioData(audioData);
      // });

      // Set up error handlers
      nativeAudioCaptureService.setOnError((error) => {
        logger.error('🎤 Native audio capture error:', error);
      });

      // Set up status updates
      nativeAudioCaptureService.setOnStatus((status) => {
        logger.debug('🔊 Audio status:', status);
      });

      electronTranscriptionService.setOnError((error) => {
        logger.error('📝 Transcription error:', error);
      });

      logger.debug('✅ Services initialized');
    },

    startRecording: async () => {
      try {
        logger.debug('🎬 Starting recording session...');
        
        // First, ensure services are initialized (which loads settings)
        const { initializeServices } = useAppStore.getState();
        await initializeServices();
        
        // Now get the updated settings after initialization
        const { settings } = useAppStore.getState();
        
        logger.debug('📋 Current settings after initialization:', {
          hasDeepgramKey: !!settings.deepgramKey,
          hasOpenAIKey: !!settings.openaiKey,
          deepgramKeyLength: settings.deepgramKey?.length || 0,
          openAIKeyLength: settings.openaiKey?.length || 0
        });

        // Initialize AI service with the loaded settings
        if (settings.openaiKey) {
          logger.debug('🤖 Initializing AI service with key:', settings.openaiKey.substring(0, 10) + '...');
          aiService.initialize(settings.openaiKey);
          logger.debug('🤖 AI service ready:', aiService.isReady());
        } else {
          logger.warn('⚠️ No OpenAI key configured - AI features will not work');
        }

        // Initialize Electron transcription service
        if (settings.deepgramKey) {
          logger.debug('🎙️ Initializing Electron transcription service with key:', settings.deepgramKey.substring(0, 10) + '...');
          electronTranscriptionService.initialize(settings.deepgramKey);
        } else {
          logger.error('❌ No Deepgram API key found in settings');
          throw new Error('Please configure your Deepgram API key in Settings');
        }

        // Always capture both mic + system for client calls
        logger.debug('🎤 Starting dual audio capture (mic + system) for client calls...');
        logger.debug('📋 Current settings:', settings);
        
        // Start the transcription service (always uses both mode)
        logger.debug('📝 Step 1: Starting Electron transcription service...');
        const transcriptionStarted = await electronTranscriptionService.startTranscription();
        logger.debug('📝 Transcription service result:', transcriptionStarted);
        
        if (!transcriptionStarted) {
          logger.error('❌ Failed to start transcription service');
          throw new Error('Failed to start transcription service');
        }
        logger.debug('✅ Transcription service started successfully');
        
        // Start microphone capture
        logger.debug('🎙️ Step 2: Starting microphone capture...');
        const micStarted = await nativeAudioCaptureService.startCapture({
          includeMicrophone: true,
          includeSystemAudio: false,
          sampleRate: 16000,
          bufferSize: 4096
        });
        logger.debug('🎙️ Microphone capture result:', micStarted);
        
        // Focus on reliable microphone capture for now (like working version)
        logger.debug('🔊 Step 3: Focusing on reliable microphone capture');
        logger.debug('💡 Using proven approach from working SmartCallMate project');
        let systemStarted = false; // Keeping simple for stability
        
        const audioStarted = micStarted; // At least microphone should work
        
        if (!audioStarted) {
          logger.error('❌ Audio capture failed to start');
          throw new Error('Failed to start audio capture - check microphone permissions');
        }
        logger.debug('✅ Audio capture and transcription started successfully');

        // Update recording state
        set((state) => {
          state.recording = {
            isRecording: true,
            startTime: new Date(),
            duration: 0
          };
        });

        logger.debug('✅ Recording started successfully');
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('❌ Failed to start recording:', errorMessage);
        logger.error('Full error details:', error);
        
        // Check if it's a network connectivity issue
        if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          logger.error('🌐 NETWORK CONNECTIVITY ISSUE DETECTED');
          logger.error('📋 Troubleshooting steps:');
          logger.error('   1. ✅ Check internet connection');
          logger.error('   2. 🔄 Try refreshing the app'); 
          logger.error('   3. 🚫 Disable VPN/proxy temporarily');
          logger.error('   4. 🔍 Check if api.deepgram.com is accessible');
          logger.error('   5. 🛡️ Check firewall/antivirus settings');
          
          // Test basic connectivity
          setTimeout(() => {
            fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-cache' })
              .then(() => logger.debug('✅ Internet connectivity test: PASSED'))
              .catch(() => logger.error('❌ Internet connectivity test: FAILED'));
          }, 1000);
        }
        
        // Cleanup on failure
        try {
          logger.debug('🧹 Cleaning up after error...');
          await nativeAudioCaptureService.stopCapture();
          await electronTranscriptionService.stopTranscription();
        } catch (cleanupError) {
          logger.error('❌ Cleanup failed:', cleanupError);
        }

        throw new Error(errorMessage);
      }
    },

    stopRecording: async () => {
      try {
        logger.debug('🛑 Stopping recording session...');

        // Stop audio capture services
        await nativeAudioCaptureService.stopCapture();
        // systemAudioCapture.stopCapture(); // Disabled
        await electronTranscriptionService.stopTranscription();

        // Update recording state
        set((state) => {
          const endTime = new Date();
          const duration = state.recording.startTime 
            ? Math.floor((endTime.getTime() - state.recording.startTime.getTime()) / 1000)
            : 0;
            
          state.recording = {
            isRecording: false,
            duration
          };
        });

        logger.debug('✅ Recording stopped successfully');
      } catch (error) {
        logger.error('❌ Failed to stop recording:', error);
        throw error;
      }
    },
    
    addTranscript: (transcript) => set((state) => {
      // Skip very short interim results
      if (transcript.isInterim && transcript.text.length < 3) {
        return;
      }
      
      // OPTIMIZATION: Use O(1) hash-based deduplication instead of O(n²) similarity
      if (efficientDeduplicator.isDuplicate(transcript.text)) {
        logger.debug('🚫 Skipping duplicate transcript (hash match)');
        return;
      }
      
      const newTranscript: Transcript = {
        ...transcript,
        id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Add to transcripts
      state.transcripts.push(newTranscript);
      logger.debug('➕ Added new transcript:', transcript.text.substring(0, 50));
      
      // OPTIMIZATION: Implement memory bounds to prevent infinite growth
      if (state.transcripts.length > 500) {
        // Keep only the most recent 250 transcripts
        state.transcripts = state.transcripts.slice(-250);
        logger.debug('🧹 Cleaned old transcripts, kept last 250');
      }
      
      // Sync to overlay immediately after state update
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        queueMicrotask(() => {
          const currentState = useAppStore.getState();
          (window.electronAPI as any).syncToOverlay({
            action: 'syncState',
            chatHistory: currentState.chatHistory,
            transcripts: currentState.transcripts,
            recording: currentState.recording,
            selectedContext: currentState.selectedContext
          });
        });
      }
    }),
    
    // Helper function to calculate text similarity
    calculateSimilarity: (text1: string, text2: string): number => {
      const words1 = text1.toLowerCase().split(' ');
      const words2 = text2.toLowerCase().split(' ');
      const commonWords = words1.filter(word => words2.includes(word));
      return commonWords.length / Math.max(words1.length, words2.length);
    },

    setSelectedContext: (context: string[]) => {
      set((state) => {
        state.selectedContext = context;
      });
      
      // Sync context changes to overlay
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        queueMicrotask(() => {
          const currentState = useAppStore.getState();
          (window.electronAPI as any).syncToOverlay({
            action: 'syncState',
            selectedContext: currentState.selectedContext,
            chatHistory: currentState.chatHistory,
            transcripts: currentState.transcripts,
            recording: currentState.recording
          });
        });
      }
    },

    clearSelectedContext: () => {
      set((state) => {
        state.selectedContext = [];
      });
      
      // Sync context clear to overlay
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        queueMicrotask(() => {
          const currentState = useAppStore.getState();
          (window.electronAPI as any).syncToOverlay({
            action: 'syncState',
            selectedContext: currentState.selectedContext,
            chatHistory: currentState.chatHistory,
            transcripts: currentState.transcripts,
            recording: currentState.recording
          });
        });
      }
    },
    
    // Event-based actions for transcript-to-chat communication
    setSelectedContextFromTranscript: (texts: string[]) => {
      set((state) => {
        state.selectedContext = texts;
      });
      
      // Sync context to overlay
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        queueMicrotask(() => {
          const currentState = useAppStore.getState();
          (window.electronAPI as any).syncToOverlay({
            action: 'syncState',
            selectedContext: currentState.selectedContext,
            chatHistory: currentState.chatHistory,
            transcripts: currentState.transcripts,
            recording: currentState.recording
          });
        });
      }
    },
    
    sendTranscriptAsMessage: async (text: string) => {
      const { addChatMessage, settings } = useAppStore.getState();
      
      // Add transcript as user message
      addChatMessage({
        role: 'user',
        content: text,
        timestamp: new Date()
      });
      
      // Generate AI response if OpenAI is configured
      if (settings.openaiKey && aiService.isReady()) {
        try {
          const response = await aiService.sendChatMessage({
            message: text,
            context: '',
            conversationHistory: []
          });
          
          addChatMessage({
            role: 'assistant',
            content: response.content,
            timestamp: new Date()
          });
        } catch (error) {
          logger.error('❌ AI response error:', error);
          addChatMessage({
            role: 'assistant',
            content: '❌ Failed to generate AI response. Please check your OpenAI configuration.',
            timestamp: new Date()
          });
        }
      }
    },
    
    clearSelectedContextFromTranscript: () => {
      set((state) => {
        state.selectedContext = [];
      });
      
      // Sync context clear to overlay
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        queueMicrotask(() => {
          const currentState = useAppStore.getState();
          (window.electronAPI as any).syncToOverlay({
            action: 'syncState',
            selectedContext: currentState.selectedContext,
            chatHistory: currentState.chatHistory,
            transcripts: currentState.transcripts,
            recording: currentState.recording
          });
        });
      }
    },

    
    addTodo: (todo) => set((state) => {
      const newTodo: Todo = {
        ...todo,
        id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };
      state.todos.unshift(newTodo); // Add to beginning
    }),
    
    toggleTodo: (id) => set((state) => {
      const todo = state.todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }),
    
    addChatMessage: (message) => set((state) => {
      const newMessage: ChatMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      logger.debug('💬 Adding message to chat store:', newMessage.content.substring(0, 50) + '...');
      state.chatHistory.push(newMessage);
      logger.debug('📊 Chat history now has:', state.chatHistory.length, 'messages');
      
      // Sync to overlay immediately after state update - NO DELAYS
      if (window.electronAPI && (window.electronAPI as any).syncToOverlay) {
        // Sync immediately without any delay
        const currentState = useAppStore.getState();
        (window.electronAPI as any).syncToOverlay({
          action: 'syncState',
          chatHistory: currentState.chatHistory,
          transcripts: currentState.transcripts,
          recording: currentState.recording,
          selectedContext: currentState.selectedContext
        });
      }
    }),

    sendChatMessage: async (message: string) => {
      try {
        const { addChatMessage, transcripts, settings, selectedContext, clearSelectedContext } = useAppStore.getState();
        
        // Add user message immediately
        addChatMessage({
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Prepare context from recent transcripts and selected text
        const recentTranscripts = transcripts.slice(-10);
        let context = recentTranscripts.length > 0
          ? `Recent conversation context: ${recentTranscripts.map(t => t.text).join(' ')}`
          : undefined;

        // Add selected context if available
        if (selectedContext.length > 0) {
          const selectedText = selectedContext.join(' ');
          context = context 
            ? `${context}\n\nSelected text for reference: ${selectedText}`
            : `Selected text for reference: ${selectedText}`;
          
          // Clear selected context after using it
          clearSelectedContext();
        }

        // Get conversation history for context
        const { chatHistory } = useAppStore.getState();
        const conversationHistory = chatHistory.slice(-6).map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Send to AI service
        if (aiService.isReady()) {
          const response = await aiService.sendChatMessage({
            message,
            context,
            conversationHistory
          });

          addChatMessage({
            role: 'assistant',
            content: response.content,
            timestamp: response.timestamp
          });
        } else {
          // Fallback response
          addChatMessage({
            role: 'assistant',
            content: 'I need an OpenAI API key to be configured in settings to provide AI-powered responses.',
            timestamp: new Date()
          });
        }
      } catch (error) {
        logger.error('❌ Chat message failed:', error);
        const { addChatMessage } = useAppStore.getState();
        addChatMessage({
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        });
      }
    },
    
    addSuggestion: (suggestion) => set((state) => {
      const newSuggestion: Suggestion = {
        ...suggestion,
        id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };
      state.suggestions.unshift(newSuggestion); // Add to beginning
    }),
    
    updateSettings: async (newSettings) => {
      // Get the merged settings
      const mergedSettings = { ...useAppStore.getState().settings, ...newSettings };
      
      // Update state
      set((state) => {
        state.settings = mergedSettings;
      });
      
      // Re-initialize AI service if OpenAI key changed
      if (newSettings.openaiKey) {
        logger.debug('🤖 Re-initializing AI service with updated key...');
        aiService.initialize(newSettings.openaiKey);
      }
      
      // Save full settings to Electron storage
      if (window.electronAPI) {
        try {
          await window.electronAPI.updateSettings(mergedSettings);
          logger.debug('✅ Settings saved to disk:', mergedSettings);
        } catch (error) {
          logger.error('❌ Failed to save settings:', error);
        }
      }
    },

    // Manual AI suggestion trigger for testing
    triggerAISuggestions: async () => {
      const { transcripts, addSuggestion, addChatMessage, settings } = useAppStore.getState();
      
      logger.debug('🧪 Manual AI suggestions trigger called');
      logger.debug('Settings:', { autoSuggestions: settings.autoSuggestions, hasOpenAI: !!settings.openaiKey });
      logger.debug('AI Ready:', aiService.isReady());
      
      if (!settings.autoSuggestions) {
        logger.warn('⚠️ Auto suggestions disabled in settings');
        return { success: false, message: 'Auto suggestions disabled' };
      }
      
      if (!aiService.isReady()) {
        logger.warn('⚠️ AI service not ready');
        return { success: false, message: 'AI service not ready' };
      }
      
      const recentTranscripts = transcripts.slice(-5);
      if (recentTranscripts.length === 0) {
        logger.warn('⚠️ No transcripts to analyze');
        return { success: false, message: 'No transcripts available' };
      }
      
      const contextText = recentTranscripts.map(t => t.text).join(' ');
      logger.debug('🔍 Manually triggering AI suggestions for context:', contextText.substring(0, 100));
      
      try {
        const insights = await aiService.generateInsights({
          text: contextText,
          source: 'manual_trigger',
          context: recentTranscripts.map(t => `${t.speaker || 'user'}: ${t.text}`)
        });
        
        logger.debug('✅ Manual AI suggestions generated:', insights);
        
        if (insights && insights.length > 0) {
          insights.forEach(insight => {
            addSuggestion({
              title: insight.title,
              content: insight.content,
              category: insight.category,
              relevance: insight.relevance
            });
            
            addChatMessage({
              role: 'assistant',
              content: `🤖 **AI Insight: ${insight.title}**\n\n${insight.content}`,
              timestamp: new Date()
            });
          });
          return { success: true, message: `Generated ${insights.length} suggestions` };
        } else {
          return { success: false, message: 'No insights generated' };
        }
      } catch (error: unknown) {
        logger.error('❌ Manual AI suggestions failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { success: false, message: errorMessage };
      }
    }
  }))
);