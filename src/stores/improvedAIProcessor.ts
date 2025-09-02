// Improved AI Processor based on proven original app approach
import logger from '../utils/logger';
import { provenAIService } from '../services/provenAIService';
import { Todo } from '../types';

interface ProcessingState {
  isProcessingTodos: boolean;
  isProcessingSuggestions: boolean;
  lastProcessedText: string;
  lastProcessingTime: number;
  recentContext: string[];
  todoDebounceTimeout: NodeJS.Timeout | null;
  suggestionDebounceTimeout: NodeJS.Timeout | null;
}

class ImprovedAIProcessor {
  private state: ProcessingState = {
    isProcessingTodos: false,
    isProcessingSuggestions: false,
    lastProcessedText: '',
    lastProcessingTime: 0,
    recentContext: [],
    todoDebounceTimeout: null,
    suggestionDebounceTimeout: null
  };

  // Proven timings from original app
  private readonly TODO_DEBOUNCE_MS = 3000; // 3 seconds like original
  private readonly SUGGESTION_TIMEOUT_MS = 3000; // 3 second timeout for speed
  private readonly MIN_TEXT_LENGTH = 15; // Minimum text length to process

  /**
   * Process transcript for todos and suggestions using proven approach
   */
  async processTranscript(
    text: string,
    settings: { autoTodos: boolean; autoSuggestions: boolean; openaiKey?: string },
    callbacks: {
      onTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
      onSuggestion: (message: string) => void;
    }
  ) {
    // Set API key if provided
    if (settings.openaiKey) {
      provenAIService.setApiKey(settings.openaiKey);
    }

    if (!provenAIService.isReady()) {
      logger.debug('⚠️ AI not ready or no API key');
      return;
    }

    if (text.length < this.MIN_TEXT_LENGTH) {
      logger.debug('⏭️ Text too short for analysis');
      return;
    }

    // Avoid processing duplicates
    if (this.state.lastProcessedText === text) {
      logger.debug('⏭️ Skipping duplicate text');
      return;
    }

    this.state.lastProcessedText = text;
    this.state.lastProcessingTime = Date.now();

    logger.debug('🚀 Processing transcript:', text.substring(0, 50) + '...');

    // Process todos with debouncing (like original app)
    if (settings.autoTodos) {
      this.processWithDebounce('todos', text, callbacks);
    }

    // Process suggestions with debouncing
    if (settings.autoSuggestions) {
      this.processWithDebounce('suggestions', text, callbacks);
    }
  }

  /**
   * Process with debouncing to prevent spam (proven approach)
   */
  private processWithDebounce(
    type: 'todos' | 'suggestions',
    text: string,
    callbacks: {
      onTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
      onSuggestion: (message: string) => void;
    }
  ) {
    // Clear existing timeout
    if (type === 'todos' && this.state.todoDebounceTimeout) {
      clearTimeout(this.state.todoDebounceTimeout);
    }
    if (type === 'suggestions' && this.state.suggestionDebounceTimeout) {
      clearTimeout(this.state.suggestionDebounceTimeout);
    }

    // Set new debounced timeout
    const timeout = setTimeout(async () => {
      if (type === 'todos') {
        await this.processTodosWithProvenMethod(text, callbacks.onTodo);
      } else {
        await this.processSuggestionsWithProvenMethod(text, callbacks.onSuggestion);
      }
    }, this.TODO_DEBOUNCE_MS);

    if (type === 'todos') {
      this.state.todoDebounceTimeout = timeout;
    } else {
      this.state.suggestionDebounceTimeout = timeout;
    }
  }

  /**
   * Process todos using the exact proven method from original app
   */
  private async processTodosWithProvenMethod(
    text: string,
    onTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void
  ) {
    if (this.state.isProcessingTodos) {
      logger.debug('⏳ Already processing todos');
      return;
    }

    this.state.isProcessingTodos = true;
    logger.debug('📋 Analyzing transcript for todos...');

    try {
      // Use the exact prompt from original app that worked
      const prompt = `Analyze this conversation excerpt for specific action items or tasks that need to be done. Look for:
- Direct requests like "I want you to build X", "can you implement Y", "we need to Z"
- Implied tasks from discussion like "the system needs fixing" → "Fix the system"
- Project requirements mentioned in conversation
- Development or business tasks that are actionable
- Only return actual actionable tasks, not general discussion points

Text: "${text}"

Respond with ONLY a JSON array of todo items (max 3 new items), or empty array if no clear todos found:
[{"task": "specific actionable task description", "priority": "high|medium|low"}]

If no clear actionable tasks are found, respond with: []`;

      // Use the working aiService directly for todo detection
      const { aiService } = await import('../services/aiService');
      
      const todos = await Promise.race([
        aiService.detectTodos(text),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Todo detection timeout')), this.SUGGESTION_TIMEOUT_MS)
        )
      ]);

      if (todos && todos.length > 0) {
        logger.debug('✅ AI todos detected:', todos.length);
        
        // Add todos directly from aiService response
        for (const todo of todos) {
          if (todo.text && todo.text.length > 5) {
            logger.debug('➕ Adding todo:', todo.text);
            onTodo({
              text: todo.text,
              completed: false,
              priority: todo.priority || 'medium',
              source: 'ai'
            });
          }
        }
      } else {
        logger.debug('ℹ️ No todos detected in transcript');
      }
    } catch (error) {
      logger.error('❌ Todo detection failed:', error);
    } finally {
      this.state.isProcessingTodos = false;
    }
  }

  /**
   * Process suggestions using the proven method from original app
   */
  private async processSuggestionsWithProvenMethod(
    text: string,
    onSuggestion: (message: string) => void
  ) {
    if (this.state.isProcessingSuggestions) {
      logger.debug('⏳ Already processing suggestions');
      return;
    }

    this.state.isProcessingSuggestions = true;
    logger.debug('💡 Generating AI suggestion...');

    try {
      // Use ultra-short prompt for FAST responses (like original app)
      const prompt = `"${text}" - Quick technical tip (1 sentence):`;

      // Use the working aiService for suggestions
      const { aiService } = await import('../services/aiService');
      
      const insights = await Promise.race([
        aiService.generateInsights({
          text: prompt,
          source: 'transcript',
          context: [text]
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('AI response timeout')), this.SUGGESTION_TIMEOUT_MS)
        )
      ]);

      if (insights && insights.length > 0) {
        const suggestion = insights[0].content;
        logger.debug('💡 AI suggestion generated');
        onSuggestion(`🤖 **AI Insight:**\n\n${suggestion.trim()}`);
      }
    } catch (error) {
      logger.error('❌ Suggestion generation failed:', error);
      if (error instanceof Error && error.message === 'AI response timeout') {
        logger.debug('⚠️ AI taking too long, skipping suggestion');
      }
    } finally {
      this.state.isProcessingSuggestions = false;
    }
  }


  /**
   * Clear all timeouts and reset state
   */
  reset(): void {
    if (this.state.todoDebounceTimeout) {
      clearTimeout(this.state.todoDebounceTimeout);
    }
    if (this.state.suggestionDebounceTimeout) {
      clearTimeout(this.state.suggestionDebounceTimeout);
    }

    this.state = {
      isProcessingTodos: false,
      isProcessingSuggestions: false,
      lastProcessedText: '',
      lastProcessingTime: 0,
      recentContext: [],
      todoDebounceTimeout: null,
      suggestionDebounceTimeout: null
    };
  }
}

export const improvedAIProcessor = new ImprovedAIProcessor();