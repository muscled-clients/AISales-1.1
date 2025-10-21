import Groq from 'groq-sdk';
import logger from '../utils/logger';
import { TranscriptContext } from '../types';

interface ChatMessageParams {
  message: string;
  context?: TranscriptContext;
  chatHistory?: Array<{ role: string; content: string }>;
  onChunk?: (chunk: string) => void;
}

interface ChatResponse {
  content: string;
  timestamp: Date;
}

class GroqService {
  private client: Groq | null = null;
  private apiKey: string = '';

  /**
   * Initialize the Groq client with API key
   */
  initialize(apiKey: string) {
    try {
      this.apiKey = apiKey;
      this.client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
      logger.debug('🤖 Groq service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Groq:', error);
      throw error;
    }
  }

  /**
   * Send a chat message with streaming support
   */
  async sendChatMessage(params: ChatMessageParams): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Groq service not initialized. Please call initialize() first.');
    }

    try {
      logger.debug('💬 Sending message to Groq:', params.message.substring(0, 50) + '...');

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(params);

      // Prepare messages array
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add chat history if available (last 6 messages)
      if (params.chatHistory && params.chatHistory.length > 0) {
        const recentHistory = params.chatHistory.slice(-6);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          });
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: params.message
      });

      logger.debug('📤 Sending to Groq with', messages.length, 'messages');

      // Create streaming completion
      const completion = await this.client.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      });

      // Handle streaming response
      let fullResponse = '';
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;

          // Call chunk callback if provided
          if (params.onChunk) {
            params.onChunk(content);
          }
        }
      }

      logger.debug('✅ Received complete response:', fullResponse.substring(0, 100) + '...');

      return {
        content: fullResponse,
        timestamp: new Date()
      };
    } catch (error: any) {
      logger.error('❌ Groq chat error:', error);

      // Provide helpful error messages
      if (error.message?.includes('401')) {
        throw new Error('Invalid Groq API key. Please check your settings.');
      } else if (error.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection.');
      }

      throw new Error(`Groq API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt with context prioritization
   */
  private buildSystemPrompt(params: ChatMessageParams): string {
    let systemPrompt = `You are a helpful AI assistant for sales calls. You help sales professionals analyze conversations, extract insights, and provide actionable recommendations.

Your responses should be:
- Clear and concise (prefer bullet points)
- Action-oriented with practical advice
- Based on the conversation context provided
- Professional but conversational in tone`;

    // Add selected transcript context (HIGHEST PRIORITY)
    if (params.context?.text) {
      systemPrompt += `\n\n🎯 CURRENT FOCUS SEGMENT`;

      if (params.context.startTime !== undefined && params.context.endTime !== undefined) {
        const startMin = Math.floor(params.context.startTime / 60);
        const startSec = Math.floor(params.context.startTime % 60);
        const endMin = Math.floor(params.context.endTime / 60);
        const endSec = Math.floor(params.context.endTime % 60);

        systemPrompt += ` (${startMin}:${startSec.toString().padStart(2, '0')} - ${endMin}:${endSec.toString().padStart(2, '0')})`;
      }

      systemPrompt += `:`;

      if (params.context.speaker) {
        systemPrompt += `\nSpeaker: ${params.context.speaker}`;
      }

      systemPrompt += `\n"${params.context.text}"`;

      systemPrompt += `\n\nThe user's question is specifically about this segment. Focus your response on this context.`;
    }

    return systemPrompt;
  }

  /**
   * Simple chat method for non-streaming requests
   */
  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
    if (!this.client) {
      throw new Error('Groq service not initialized. Please call initialize() first.');
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
        stream: false
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      logger.error('❌ Groq chat error:', error);
      throw new Error(`Groq API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Get current API key (for settings display)
   */
  getApiKey(): string {
    return this.apiKey ? this.apiKey.substring(0, 10) + '...' : '';
  }
}

// Export singleton instance
export const groqService = new GroqService();
