import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Transcript, Todo, ChatMessage, Suggestion, RecordingState, AppSettings, RecordingSession } from '../types';
import { nativeAudioCaptureService } from '../services/nativeAudioCapture';
import { dualAudioCaptureService } from '../services/dualAudioCapture';
import { electronTranscriptionService } from '../services/electronTranscriptionService';
// import { systemAudioCapture } from '../services/systemAudioCapture'; // Temporarily disabled
import { aiService } from '../services/aiService';
import { groqService } from '../services/groqService';
import { improvedAIProcessor } from './improvedAIProcessor';
import { transcriptDeduplicator } from '../utils/transcriptDeduplicator';
import { transcriptDeduplicator as efficientDeduplicator } from '../utils/transcriptDeduplication';
import logger from '../utils/logger';

interface AppState {
  // Recording
  recording: RecordingState;

  // Session Management
  currentSessionId: string | null;
  sessions: RecordingSession[];
  viewingHistoricalSession: boolean;

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
  updateTranscript: (id: string, text: string) => void;
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

  // Session Management Actions
  createSession: () => string;
  endSession: (sessionId: string, transcriptCount: number) => Promise<void>;
  loadSessionConversations: (sessionId: string) => Promise<void>;
  loadHistoricalSession: (sessionId: string) => Promise<void>;
  clearHistoricalSession: () => void;
  getAllSessions: () => Promise<RecordingSession[]>;

  // Testing function - load fake transcripts
  loadFakeTranscripts: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // Initial state
    recording: {
      isRecording: false,
      duration: 0
    },
    currentSessionId: null,
    sessions: [],
    viewingHistoricalSession: false,
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

        // Create new session for this recording
        const { createSession } = useAppStore.getState();
        const sessionId = createSession();
        logger.debug('✅ Created new session for recording:', sessionId);

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

        // End current session
        const { currentSessionId, transcripts, endSession } = useAppStore.getState();
        if (currentSessionId) {
          await endSession(currentSessionId, transcripts.length);
          logger.debug('✅ Session ended:', currentSessionId);
        }

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

      // Save to database if we have a current session and it's not interim
      const { currentSessionId, viewingHistoricalSession } = useAppStore.getState();
      if (currentSessionId && !viewingHistoricalSession && !transcript.isInterim) {
        if (window.electronAPI && (window.electronAPI as any).saveTranscript) {
          (window.electronAPI as any).saveTranscript({
            id: newTranscript.id,
            sessionId: currentSessionId,
            text: newTranscript.text,
            timestamp: newTranscript.timestamp,
            isInterim: newTranscript.isInterim,
            speaker: newTranscript.speaker || null
          }).catch((error: any) => {
            logger.error('❌ Failed to save transcript to DB:', error);
          });
        }
      }
      
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

    updateTranscript: (id, text) => set((state) => {
      const transcript = state.transcripts.find(t => t.id === id);
      if (transcript) {
        transcript.text = text;
        logger.debug('✏️ Updated transcript:', id);

        // Save update to database if not viewing historical session
        const { currentSessionId, viewingHistoricalSession } = useAppStore.getState();
        if (currentSessionId && !viewingHistoricalSession) {
          if (window.electronAPI && (window.electronAPI as any).updateTranscript) {
            (window.electronAPI as any).updateTranscript(id, text).catch((error: any) => {
              logger.error('❌ Failed to update transcript in DB:', error);
            });
          }
        }
      }
    }),


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
        const { addChatMessage, transcripts, settings, selectedContext, clearSelectedContext, currentSessionId } = useAppStore.getState();

        // Initialize Groq service if not already done
        if (!groqService.isReady() && settings.openaiKey) {
          logger.debug('🤖 Initializing Groq service with API key');
          groqService.initialize(settings.openaiKey);
        }

        // Build the message with context displayed (like ChatGPT)
        let displayMessage = message;
        let transcriptContext = undefined;
        let startTime = undefined;
        let endTime = undefined;
        let speakerInfo = undefined;

        // Add selected context if available
        if (selectedContext.length > 0) {
          const selectedText = selectedContext.join('\n');
          // Show context in the chat message (minimalist, no label)
          displayMessage = `"${selectedText}"\n\n${message}`;

          // Try to find timestamps for selected text in transcripts
          const matchingTranscript = transcripts.find(t => selectedText.includes(t.text.substring(0, 20)));
          if (matchingTranscript) {
            startTime = transcripts.indexOf(matchingTranscript) * 5; // Rough estimate
            endTime = startTime + 10; // Rough estimate
            speakerInfo = matchingTranscript.speaker || 'user';
          }

          transcriptContext = selectedText;
        }

        // Add user message with context shown
        addChatMessage({
          role: 'user',
          content: displayMessage,
          timestamp: new Date()
        });

        // Clear selected context after using it
        if (selectedContext.length > 0) {
          clearSelectedContext();
        }

        // Get conversation history for context
        const { chatHistory } = useAppStore.getState();
        const conversationHistory = chatHistory.slice(-6).map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Send to Groq service
        if (groqService.isReady()) {
          // Add placeholder message for streaming
          const assistantMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant' as const,
            content: '',
            timestamp: new Date()
          };
          addChatMessage(assistantMessage);

          let fullResponse = '';

          const response = await groqService.sendChatMessage({
            message,
            context: transcriptContext ? {
              text: transcriptContext,
              startTime,
              endTime,
              speaker: speakerInfo
            } : undefined,
            chatHistory: conversationHistory,
            onChunk: (chunk) => {
              fullResponse += chunk;
              // Update the message content as it streams
              set((state) => {
                const lastMessage = state.chatHistory[state.chatHistory.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = fullResponse;
                }
              });
            }
          });

          // Final update with complete content
          set((state) => {
            const lastMessage = state.chatHistory[state.chatHistory.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = response.content;
              lastMessage.timestamp = response.timestamp;
            }
          });

          // Save conversation to database
          if (currentSessionId && window.electronAPI && (window.electronAPI as any).saveConversation) {
            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            try {
              await (window.electronAPI as any).saveConversation({
                id: conversationId,
                sessionId: currentSessionId,
                userMessage: message,
                aiResponse: response.content,
                contextUsed: transcriptContext || '',
                selectedTranscript: transcriptContext,
                transcriptStartTime: startTime,
                transcriptEndTime: endTime,
                speakerInfo,
                modelUsed: 'llama-3.3-70b-versatile'
              });

              logger.debug('✅ Conversation saved to database:', conversationId);
            } catch (dbError) {
              logger.error('❌ Failed to save conversation to DB:', dbError);
            }
          }
        } else {
          // Fallback response
          addChatMessage({
            role: 'assistant',
            content: 'I need a Groq API key to be configured in settings to provide AI-powered responses. Please add your API key in Settings.',
            timestamp: new Date()
          });
        }
      } catch (error: any) {
        logger.error('❌ Chat message failed:', error);
        logger.error('Error details:', error.message);
        const { addChatMessage } = useAppStore.getState();

        // Show the actual error message to help debug
        const errorMessage = error.message || 'Unknown error occurred';
        addChatMessage({
          role: 'assistant',
          content: `❌ Error: ${errorMessage}`,
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
    },

    // Session Management Actions
    createSession: () => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSession: RecordingSession = {
        id: sessionId,
        startedAt: new Date(),
        transcriptCount: 0
      };

      set((state) => {
        state.currentSessionId = sessionId;
        state.sessions.unshift(newSession);
        // Clear chat history for new session
        state.chatHistory = [];
        state.transcripts = [];
        state.todos = [];
      });

      // Save to database via Electron IPC
      if (window.electronAPI && (window.electronAPI as any).saveSession) {
        (window.electronAPI as any).saveSession(newSession).catch((error: any) => {
          logger.error('❌ Failed to save session to DB:', error);
        });
      }

      logger.debug('✅ Created new session:', sessionId);
      return sessionId;
    },

    endSession: async (sessionId: string, transcriptCount: number) => {
      const endedAt = new Date();
      const { sessions, transcripts, chatHistory } = useAppStore.getState();
      const session = sessions.find(s => s.id === sessionId);

      if (session) {
        const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

        // Generate AI summary for title and description
        let title = session.title || 'Sales Call';
        let description = '';

        try {
          // Prepare content for AI summary
          const transcriptText = transcripts.map(t => t.text).join(' ').substring(0, 2000);
          const conversationText = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n').substring(0, 1000);

          const summaryPrompt = `Based on this sales call, generate:
1. A concise title (10-15 words) that explains what the call was about
2. A brief description (30-50 words) summarizing the key points of the call

Transcripts:
${transcriptText}

Conversations:
${conversationText}

Format your response as:
TITLE: [your title here]
DESCRIPTION: [your description here]`;

          const summaryResponse = await groqService.chat([
            { role: 'system', content: 'You are a sales call summarizer. Generate concise, professional summaries.' },
            { role: 'user', content: summaryPrompt }
          ]);

          // Parse the response
          const titleMatch = summaryResponse.match(/TITLE:\s*(.+)/i);
          const descMatch = summaryResponse.match(/DESCRIPTION:\s*(.+)/i);

          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
          }
          if (descMatch && descMatch[1]) {
            description = descMatch[1].trim();
          }

          logger.debug('✅ Generated AI summary:', { title, description });
        } catch (error) {
          logger.error('❌ Failed to generate AI summary:', error);
          description = 'No summary available';
        }

        set((state) => {
          const sessionToUpdate = state.sessions.find(s => s.id === sessionId);
          if (sessionToUpdate) {
            sessionToUpdate.endedAt = endedAt;
            sessionToUpdate.duration = duration;
            sessionToUpdate.transcriptCount = transcriptCount;
            sessionToUpdate.title = title;
            sessionToUpdate.description = description;
          }
        });

        // Update in database
        if (window.electronAPI && (window.electronAPI as any).updateSession) {
          try {
            await (window.electronAPI as any).updateSession(sessionId, {
              endedAt,
              duration,
              transcriptCount,
              title,
              description
            });
            logger.debug('✅ Session ended:', sessionId);
          } catch (error) {
            logger.error('❌ Failed to update session in DB:', error);
          }
        }
      }
    },

    loadSessionConversations: async (sessionId: string) => {
      if (!window.electronAPI || !(window.electronAPI as any).getSessionConversations) {
        logger.warn('⚠️ Electron API not available for loading conversations');
        return;
      }

      try {
        const result = await (window.electronAPI as any).getSessionConversations(sessionId);

        if (result.success && result.conversations) {
          set((state) => {
            state.chatHistory = result.conversations.map((conv: any) => ({
              id: conv.id,
              role: conv.user_message ? 'user' : 'assistant',
              content: conv.user_message || conv.ai_response,
              timestamp: new Date(conv.createdAt)
            }));
            state.currentSessionId = sessionId;
          });

          logger.debug(`✅ Loaded ${result.conversations.length} conversations for session:`, sessionId);
        }
      } catch (error) {
        logger.error('❌ Failed to load session conversations:', error);
      }
    },

    getAllSessions: async () => {
      if (!window.electronAPI || !(window.electronAPI as any).getAllSessions) {
        logger.warn('⚠️ Electron API not available for loading sessions');
        return [];
      }

      try {
        const result = await (window.electronAPI as any).getAllSessions();

        if (result.success && result.sessions) {
          set((state) => {
            state.sessions = result.sessions;
          });

          logger.debug(`✅ Loaded ${result.sessions.length} sessions`);
          return result.sessions;
        }

        return [];
      } catch (error) {
        logger.error('❌ Failed to load sessions:', error);
        return [];
      }
    },

    loadHistoricalSession: async (sessionId: string) => {
      if (!window.electronAPI) {
        logger.warn('⚠️ Electron API not available for loading historical session');
        return;
      }

      try {
        logger.debug('📚 Loading historical session:', sessionId);

        // Load session details
        const sessionResult = await (window.electronAPI as any).getSession(sessionId);
        if (!sessionResult.success) {
          throw new Error(sessionResult.error || 'Failed to load session');
        }

        // Load conversations
        const conversationsResult = await (window.electronAPI as any).getSessionConversations(sessionId);
        if (!conversationsResult.success) {
          throw new Error(conversationsResult.error || 'Failed to load conversations');
        }

        // Load transcripts
        const transcriptsResult = await (window.electronAPI as any).getSessionTranscripts(sessionId);
        if (!transcriptsResult.success) {
          logger.warn('⚠️ Failed to load transcripts:', transcriptsResult.error);
        }

        // Update state with historical data
        set((state) => {
          state.currentSessionId = sessionId;
          state.viewingHistoricalSession = true;

          // Load conversations into chat history - each conversation has both user and AI message
          state.chatHistory = conversationsResult.conversations?.flatMap((conv: any) => [
            {
              id: `${conv.id}_user`,
              role: 'user' as const,
              content: conv.user_message,
              timestamp: new Date(conv.created_at)
            },
            {
              id: `${conv.id}_assistant`,
              role: 'assistant' as const,
              content: conv.ai_response,
              timestamp: new Date(conv.created_at)
            }
          ]) || [];

          // Load transcripts from database
          state.transcripts = transcriptsResult.transcripts?.map((t: any) => ({
            id: t.id,
            text: t.text,
            timestamp: new Date(t.timestamp),
            isInterim: t.isInterim || false,
            speaker: t.speaker || undefined
          })) || [];

          state.todos = [];
        });

        logger.debug('✅ Historical session loaded successfully:', {
          sessionId,
          conversationCount: conversationsResult.conversations?.length || 0,
          transcriptCount: transcriptsResult.transcripts?.length || 0,
          conversations: conversationsResult.conversations,
          transcripts: transcriptsResult.transcripts
        });
      } catch (error) {
        logger.error('❌ Failed to load historical session:', error);
        throw error;
      }
    },

    clearHistoricalSession: () => {
      set((state) => {
        state.viewingHistoricalSession = false;
        state.currentSessionId = null;
        state.chatHistory = [];
        state.transcripts = [];
        state.todos = [];
        state.selectedContext = [];
      });
      logger.debug('✅ Cleared historical session view');
    },

    // Load fake transcripts for testing
    loadFakeTranscripts: () => {
      const fakeTranscripts = [
        { speaker: 'You', text: "Hi Sarah, great to connect! I saw your post about the GenAI platform you're building for your enterprise client. Sounds like an exciting project that's already showing promise in MVP stage." },
        { speaker: 'Client', text: "Yes, hi! Thanks for reaching out. We've been working on this for about three months now and we've got something functional, but we're hitting some walls as we try to scale." },
        { speaker: 'You', text: "I noticed you mentioned you're dealing with RAG optimization issues and hitting OpenAI rate limits. Before we dive into the technical challenges, can you tell me a bit about what this platform does for your enterprise client?" },
        { speaker: 'Client', text: "Sure, so we're building an AI-powered knowledge assistant for one of the largest insurance companies in the country. They have decades of documentation, policies, claims data, and they want their agents to be able to query all of this instantly. Right now we have about 50 beta users, but they want to roll this out to 5,000 agents by Q2 next year." },
        { speaker: 'You', text: "That's a significant scale jump. And with insurance data, I imagine accuracy is critical?" },
        { speaker: 'Client', text: "Exactly. That's why the RAG retrieval issues are killing us. Sometimes it pulls completely irrelevant policy sections when an agent asks about specific coverage details." },
        { speaker: 'You', text: "Let's talk about your current RAG setup. You mentioned you're using Pinecone - how are you chunking your documents currently?" },
        { speaker: 'Client', text: "We're doing 512 token chunks with 50 token overlaps. We tried smaller chunks but then we lose context, and bigger chunks seem to make relevance worse." },
        { speaker: 'You', text: "Are you using any metadata filtering or hybrid search approaches?" },
        { speaker: 'Client', text: "We have basic metadata like document type and date, but honestly, we haven't really optimized the metadata strategy. What do you mean by hybrid search?" },
        { speaker: 'You', text: "So beyond just vector similarity, you can combine that with keyword search, BM25 scoring, or even knowledge graphs. I worked on a similar project for a legal firm where we improved retrieval accuracy by 40% by implementing a hybrid approach with metadata filtering based on practice areas and case precedence." },
        { speaker: 'Client', text: "That sounds exactly like what we need. Our insurance policies have similar hierarchical structures - different coverage types, state regulations, policy versions." },
        { speaker: 'You', text: "Right, and for your chunking strategy, have you considered using semantic chunking instead of fixed-size chunks? For structured documents like insurance policies, you want chunks that respect section boundaries." },
        { speaker: 'Client', text: "We haven't tried that. To be honest, our team is strong on general backend development, but this specialized AI optimization is where we're struggling." },
        { speaker: 'You', text: "Now about those 429 errors - tell me about your current API call patterns. Are you hitting rate limits during normal operations or just during peak usage?" },
        { speaker: 'Client', text: "It's frustrating. Even with just 50 users, if more than 10 people use it simultaneously, we start hitting TPM limits. We're on OpenAI's tier 3, so we have 1 million TPM, but complex insurance queries can easily be 8-10k tokens per request." },
        { speaker: 'You', text: "Are you implementing any caching strategies currently?" },
        { speaker: 'Client', text: "Basic response caching, but insurance agents often ask very specific, unique questions, so cache hit rate is pretty low, maybe 15%." },
        { speaker: 'You', text: "I see several opportunities here. First, semantic caching - instead of exact match caching, you can cache responses for semantically similar queries. Second, request queuing with priority levels. Third, have you considered using multiple API keys or even multiple providers?" },
        { speaker: 'Client', text: "Multiple providers? Wouldn't that affect consistency?" },
        { speaker: 'You', text: "Not if you implement it correctly. I recently helped a fintech company set up a multi-provider strategy - OpenAI for complex reasoning, Claude for document analysis, and Mistral for simple queries. We reduced costs by 60% and eliminated rate limit issues entirely. Plus, we implemented automatic fallbacks." },
        { speaker: 'Client', text: "That's interesting. Our CFO would love the cost reduction aspect. The enterprise client is already concerned about the per-query costs scaling to 5,000 users." }
      ];
      
      const { addTranscript } = useAppStore.getState();
      
      // Add transcripts with slight delays to simulate real conversation
      fakeTranscripts.forEach((item, index) => {
        setTimeout(() => {
          addTranscript({
            text: `[${item.speaker}]: ${item.text}`,
            timestamp: new Date(Date.now() + index * 1000),
            isInterim: false
          });
        }, index * 100); // Add each transcript 100ms apart
      });
      
      logger.info('🎭 Loaded fake transcripts for testing');
    }
  }))
);