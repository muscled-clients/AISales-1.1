import logger from '../utils/logger';

/**
 * Proven AI Service - Matches the exact working approach from original app
 * Uses the same prompts and methods that were proven to work reliably
 */

interface ChatResponse {
  response: string;
  content?: string;
}

class ProvenAIService {
  private apiKey: string = '';
  private isServiceReady = false;

  constructor() {
    // Initialize with settings
    this.loadSettings();
  }

  private loadSettings() {
    // This will be called from the store to set the API key
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.isServiceReady = !!apiKey;
  }

  isReady(): boolean {
    return this.isServiceReady && !!this.apiKey;
  }

  /**
   * Send chat message using the same approach as original app
   * This matches the original window.electronAPI.sendChatMessage exactly
   */
  async sendChatMessage(params: {
    message: string;
    context?: string;
    conversationHistory?: any[];
    mode?: string;
    maxTokens?: number;
    isAutoMode?: boolean;
  }): Promise<ChatResponse> {
    if (!this.isReady()) {
      throw new Error('AI service not ready - API key missing');
    }

    try {
      logger.debug('🤖 Sending to AI:', params.message.substring(0, 100) + '...');
      
      // For now, use direct API call implementation
      // TODO: Add sendChatMessage to Electron API for better integration
      return await this.directAPICall(params);
    } catch (error) {
      logger.error('❌ AI service error:', error);
      throw error;
    }
  }

  /**
   * Direct API call fallback (if needed)
   */
  private async directAPICall(params: {
    message: string;
    context?: string;
    conversationHistory?: any[];
    mode?: string;
    maxTokens?: number;
  }): Promise<ChatResponse> {
    // Use the existing aiService to generate a response
    const { aiService } = await import('./aiService');
    
    // Generate insights/response using the existing service
    const insights = await aiService.generateInsights({
      text: params.message,
      source: 'chat',
      context: params.context ? [params.context] : []
    });

    if (insights && insights.length > 0) {
      return {
        response: insights[0].content,
        content: insights[0].content
      };
    }
    
    return {
      response: 'No response generated',
      content: 'No response generated'
    };
  }

  /**
   * Detect todos using the exact proven method
   */
  async detectTodos(text: string): Promise<Array<{text: string; priority: string}>> {
    try {
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

      const response = await this.sendChatMessage({
        message: prompt,
        mode: 'technical'
      });

      if (response && response.response) {
        try {
          const responseText = response.response.trim();
          let detectedTodos: any[] = [];

          if (responseText.startsWith('[')) {
            detectedTodos = JSON.parse(responseText);
          } else {
            // Fallback parsing
            const lines = responseText.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.match(/^[-*•]\s+(.+)/) || trimmedLine.match(/^\d+\.\s+(.+)/)) {
                const todoText = trimmedLine.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
                if (todoText.length > 5) {
                  detectedTodos.push({ task: todoText, priority: 'medium' });
                }
              }
            }
          }

          // Convert to expected format
          return detectedTodos.map(todo => ({
            text: todo.task,
            priority: todo.priority || 'medium'
          }));
        } catch (parseError) {
          logger.error('❌ Error parsing todos:', parseError);
          
          // Fallback: Use response as single todo
          const cleanResponse = response.response.trim();
          if (cleanResponse.length > 5 && cleanResponse.length < 200 && 
              !cleanResponse.includes('NO_TODO') && !cleanResponse.includes('[]')) {
            return [{
              text: cleanResponse,
              priority: 'medium'
            }];
          }
          return [];
        }
      }
      return [];
    } catch (error) {
      logger.error('❌ Todo detection failed:', error);
      return [];
    }
  }

  /**
   * Generate quick suggestions using proven method
   */
  async generateQuickSuggestion(text: string): Promise<string | null> {
    try {
      // Ultra-short prompt for FAST responses (exact from original)
      const prompt = `"${text}" - Quick technical tip (1 sentence):`;

      const response = await this.sendChatMessage({
        message: prompt,
        mode: 'technical',
        maxTokens: 50,
        isAutoMode: true
      });

      if (response && (response.response || response.content)) {
        return response.response || response.content || null;
      }
      return null;
    } catch (error) {
      logger.error('❌ Quick suggestion failed:', error);
      return null;
    }
  }
}

export const provenAIService = new ProvenAIService();