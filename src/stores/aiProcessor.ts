// AI Processor for real-time transcript analysis
import logger from '../utils/logger';
import { aiService } from '../services/aiService';
import { Todo } from '../types';

interface ProcessingState {
  isProcessing: boolean;
  lastProcessedText: string;
  lastProcessingTime: number;
  recentContext: string[];
}

class AIProcessor {
  private state: ProcessingState = {
    isProcessing: false,
    lastProcessedText: '',
    lastProcessingTime: 0,
    recentContext: []
  };

  // Process transcript immediately for real-time response
  async processTranscript(
    text: string,
    settings: { autoTodos: boolean; autoSuggestions: boolean; openaiKey?: string },
    callbacks: {
      onTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
      onSuggestion: (message: string) => void;
    }
  ) {
    // Skip if AI not ready or text too similar to last processed
    if (!aiService.isReady() || !settings.openaiKey) {
      logger.debug('⚠️ AI not ready or no API key');
      return;
    }

    // Avoid processing duplicates
    if (this.state.lastProcessedText === text) {
      logger.debug('⏭️ Skipping duplicate text');
      return;
    }

    // Check minimum time between processing (reduced for real-time)
    const timeSinceLastProcess = Date.now() - this.state.lastProcessingTime;
    if (timeSinceLastProcess < 500 && this.state.isProcessing) {
      logger.debug('⏳ Still processing previous request');
      return;
    }

    // Add to context
    this.state.recentContext.push(text);
    if (this.state.recentContext.length > 10) {
      this.state.recentContext.shift();
    }

    this.state.isProcessing = true;
    this.state.lastProcessedText = text;
    this.state.lastProcessingTime = Date.now();

    logger.debug('🚀 Processing transcript in real-time:', text.substring(0, 50) + '...');

    try {
      // Process todos and suggestions in parallel for speed
      const promises: Promise<void>[] = [];

      // Process todos if enabled
      if (settings.autoTodos) {
        promises.push(
          aiService.detectTodos(text).then(todos => {
            if (todos && todos.length > 0) {
              logger.debug(`✅ Found ${todos.length} todos`);
              todos.forEach(todo => {
                callbacks.onTodo({
                  text: todo.text,
                  completed: false,
                  priority: todo.priority,
                  source: 'ai'
                });
              });
            }
          }).catch(err => logger.error('❌ Todo detection failed:', err))
        );
      }

      // Process contextual suggestions if enabled
      if (settings.autoSuggestions) {
        const fullContext = this.state.recentContext.join(' ');
        
        // Determine the type of response needed
        const responseType = this.detectResponseType(text);
        
        promises.push(
          this.generateContextualResponse(text, fullContext, responseType).then(response => {
            if (response) {
              logger.debug('💡 Generated response:', response.substring(0, 50) + '...');
              callbacks.onSuggestion(response);
            }
          }).catch(err => logger.error('❌ Suggestion generation failed:', err))
        );
      }

      // Wait for all processing to complete
      await Promise.all(promises);
      
    } catch (error) {
      logger.error('❌ AI processing error:', error);
    } finally {
      this.state.isProcessing = false;
    }
  }

  private detectResponseType(text: string): 'question' | 'statement' | 'task' | 'technical' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?') || /^(what|how|why|when|where|who|which|can|could|should|would)/i.test(lowerText)) {
      return 'question';
    }
    
    if (/\b(build|create|implement|develop|design|setup|configure|deploy)\b/i.test(lowerText)) {
      return 'task';
    }
    
    if (/\b(mongodb|react|node|express|api|database|server|frontend|backend|electron)\b/i.test(lowerText)) {
      return 'technical';
    }
    
    return 'statement';
  }

  private async generateContextualResponse(
    text: string,
    context: string,
    responseType: string
  ): Promise<string | null> {
    try {
      // Generate appropriate response based on type
      const prompt = this.buildPrompt(text, context, responseType);
      
      const response = await aiService.generateInsights({
        text: prompt,
        source: 'transcript',
        context: [context]
      });

      if (response && response.length > 0) {
        // Format response based on type
        const insight = response[0];
        
        switch (responseType) {
          case 'question':
            return `💬 **Answer:** ${insight.content}`;
          
          case 'task':
            return `🎯 **Action Plan:**\n${insight.content}`;
          
          case 'technical':
            return `🔧 **Technical Insight:**\n${insight.content}`;
          
          default:
            return `💡 **Suggestion:**\n${insight.content}`;
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error generating contextual response:', error);
      return null;
    }
  }

  private buildPrompt(text: string, context: string, responseType: string): string {
    switch (responseType) {
      case 'question':
        return `Answer this question concisely and helpfully: "${text}"\nContext: ${context}`;
      
      case 'task':
        return `Provide a brief action plan for: "${text}"\nContext: ${context}`;
      
      case 'technical':
        return `Provide technical guidance for: "${text}"\nContext: ${context}`;
      
      default:
        return `Provide a helpful suggestion for: "${text}"\nContext: ${context}`;
    }
  }

  reset() {
    this.state = {
      isProcessing: false,
      lastProcessedText: '',
      lastProcessingTime: 0,
      recentContext: []
    };
  }
}

export const aiProcessor = new AIProcessor();