/**
 * Advanced AI Service - OpenAI integration with intelligent analysis
 * Enhanced with response type detection, topic analysis, and contextual suggestions
 */

import { resourceManager } from './resourceManager';
import logger from '../utils/logger';

interface ChatRequest {
  message: string;
  context?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  content: string;
  timestamp: Date;
}

interface InsightRequest {
  text: string;
  source: string;
  context?: string[];
  metadata?: any;
}

interface AIInsight {
  title: string;
  content: string;
  category: 'technical' | 'business' | 'strategy' | 'implementation' | 'solution' | 'answer' | 'followup' | 'risk' | 'opportunity' | 'decision' | 'general';
  relevance: number;
  confidence: number;
  type?: 'suggestion' | 'detailed-answer' | 'template';
  responseType?: string;
  isAnswer?: boolean;
  keywords?: string[];
}

interface ResponseType {
  type: 'suggestion' | 'detailed_answer';
  isQuestion: boolean;
  needsImplementation?: boolean;
  needsSolution?: boolean;
  confidence: number;
}

interface DetectedTopic {
  category: string;
  keywords: string[];
  confidence: number;
  description: string;
}

interface TodoSuggestion {
  text: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  confidence: number;
}

export class AIService {
  private apiKey = '';
  private baseUrl = 'https://api.openai.com/v1';
  private model = 'gpt-3.5-turbo';
  private isInitialized = false;
  
  // Request management
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private currentRequests = new Map<string, AbortController>();
  
  // Advanced rate limiting
  private lastSuggestionTime = 0;
  private suggestionCount = 0;
  private suggestionResetTime = Date.now();
  private maxSuggestionsPerMinute = 30;
  private rateLimitDelay = 300;
  
  // Context management
  private conversationContext: any[] = [];
  private maxContextLength = 4000;
  
  // Configuration options
  private options = {
    temperature: 0.3,
    maxTokens: 300,
    answerMaxTokens: 800,
    enableDetailedAnswers: true,
    responseMode: 'auto' // 'auto', 'suggestions', 'answers'
  };

  constructor() {
    logger.debug('🤖 Advanced AIService initialized');
  }

  /**
   * Initialize with OpenAI API key
   */
  initialize(apiKey: string, model = 'gpt-3.5-turbo'): void {
    this.apiKey = apiKey;
    this.model = model;
    this.isInitialized = true;
    logger.debug(`🔑 OpenAI API configured with model: ${model}`);
    logger.debug(`🔑 API Key: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);
    logger.debug(`🔑 Service initialized: ${this.isInitialized}`);
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    const ready = this.isInitialized && this.apiKey.length > 0;
    logger.debug(`🤖 AI Service ready check: ${ready} (initialized: ${this.isInitialized}, keyLength: ${this.apiKey.length})`);
    return ready;
  }

  /**
   * Detect if transcript needs detailed answer or suggestions
   */
  private detectResponseType(transcript: string): ResponseType {
    const lowerTranscript = transcript.toLowerCase();
    
    // Question patterns that need detailed answers
    const questionPatterns = [
      /^(what|how|why|when|where|who|which|can you|could you|would you|should|do you know)/i,
      /\?$/,
      /(explain|describe|tell me|show me|help me|guide me|teach me)/i,
      /(what is|what are|how to|how do|how can|how should)/i,
      /(solve|solution|fix|resolve|answer|implement)/i,
      /(best way|best practice|recommend|advice on|approach for)/i
    ];
    
    // Check if it's a question needing detailed answer
    const isQuestion = questionPatterns.some(pattern => pattern.test(transcript));
    
    // Check if it's seeking implementation details
    const needsImplementation = /(?:implement|setup|configure|install|create|build|develop|code|program)/i.test(transcript);
    
    // Check if it's a problem statement needing solution
    const needsSolution = /(?:problem|issue|error|bug|failing|not working|broken|stuck|challenge)/i.test(transcript);
    
    // Determine response type
    if ((isQuestion || needsImplementation || needsSolution) && this.options.enableDetailedAnswers) {
      return {
        type: 'detailed_answer',
        isQuestion,
        needsImplementation,
        needsSolution,
        confidence: 0.9
      };
    }
    
    // Default to suggestions for statements and discussions
    return {
      type: 'suggestion',
      isQuestion: false,
      needsImplementation: false,
      needsSolution: false,
      confidence: 0.8
    };
  }

  /**
   * Detect topics in transcript using AI logic
   */
  private detectTopics(transcript: string): DetectedTopic[] {
    const topics: DetectedTopic[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    const topicPatterns = [
      {
        category: 'technology',
        patterns: ['api', 'database', 'server', 'cloud', 'docker', 'kubernetes', 'microservices', 'react', 'javascript', 'python', 'programming', 'software', 'development', 'code', 'framework', 'library'],
        confidence: 0.8
      },
      {
        category: 'data-science',
        patterns: ['machine learning', 'ai', 'artificial intelligence', 'ml', 'data science', 'analytics', 'algorithm', 'model', 'neural network', 'deep learning'],
        confidence: 0.9
      },
      {
        category: 'infrastructure',
        patterns: ['scalability', 'performance', 'security', 'authentication', 'load balancing', 'caching', 'monitoring', 'deployment', 'devops', 'ci/cd'],
        confidence: 0.8
      },
      {
        category: 'business',
        patterns: ['revenue', 'profit', 'customer', 'market', 'strategy', 'growth', 'budget', 'roi', 'sales', 'marketing', 'competition'],
        confidence: 0.7
      },
      {
        category: 'compliance',
        patterns: ['pci dss', 'hipaa', 'gdpr', 'compliance', 'regulation', 'audit', 'certification', 'privacy', 'data protection'],
        confidence: 0.9
      },
      {
        category: 'fintech',
        patterns: ['payment', 'fraud detection', 'transaction', 'billing', 'financial', 'banking', 'fintech', 'blockchain', 'cryptocurrency'],
        confidence: 0.8
      },
      {
        category: 'ecommerce',
        patterns: ['shopify', 'ecommerce', 'online store', 'product catalog', 'inventory', 'checkout', 'cart', 'marketplace'],
        confidence: 0.8
      }
    ];

    for (const pattern of topicPatterns) {
      const matches = pattern.patterns.filter(term => lowerTranscript.includes(term));
      
      if (matches.length > 0) {
        const confidence = Math.min(1.0, pattern.confidence * (0.5 + matches.length * 0.2));
        
        topics.push({
          category: pattern.category,
          keywords: matches,
          confidence: confidence,
          description: `Discussion about ${pattern.category.replace('-', ' ')}`
        });
      }
    }

    return topics.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  /**
   * Check rate limiting
   */
  private canMakeSuggestion(): boolean {
    const now = Date.now();
    
    // Reset counter every minute
    if (now - this.suggestionResetTime > 60000) {
      this.suggestionCount = 0;
      this.suggestionResetTime = now;
    }
    
    // Check rate limits
    if (this.suggestionCount >= this.maxSuggestionsPerMinute) {
      return false;
    }
    
    if (now - this.lastSuggestionTime < this.rateLimitDelay) {
      return false;
    }
    
    return true;
  }

  /**
   * Update rate limiting counters
   */
  private updateRateLimit(): void {
    this.lastSuggestionTime = Date.now();
    this.suggestionCount++;
  }

  /**
   * Send chat message to AI with timeout and cancellation support
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.isReady()) {
      throw new Error('AI service not initialized');
    }

    const requestId = `chat-${Date.now()}`;
    const controller = resourceManager.createAbortController(requestId);
    
    // Set up auto-timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.currentRequests.delete(requestId);
      logger.warn(`⏱️ Request ${requestId} timed out after ${this.REQUEST_TIMEOUT}ms`);
    }, this.REQUEST_TIMEOUT);

    try {
      logger.debug('💬 Sending chat message to OpenAI...');

      const messages = [
        {
          role: 'system' as const,
          content: `You are an AI sales assistant helping with call analysis and task management. 
                   You have access to conversation transcripts and can provide insights, suggestions, and help with follow-up tasks.
                   Be concise, helpful, and professional.
                   ${request.context ? `\n\nContext: ${request.context}` : ''}`
        },
        // Add conversation history
        ...(request.conversationHistory || []),
        {
          role: 'user' as const,
          content: request.message
        }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        }),
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      // Parse response progressively for large responses
      const text = await response.text();
      const data = text.length > 10000 
        ? await this.parseResponseProgressive(text)
        : JSON.parse(text);
      
      const content = data.choices?.[0]?.message?.content || 'No response generated';

      logger.debug('✅ OpenAI response received');
      
      return {
        content,
        timestamp: new Date()
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('⏱️ Request timed out');
        throw new Error('Request timeout - please try again');
      }
      logger.error('❌ OpenAI chat failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      this.currentRequests.delete(requestId);
      resourceManager.cancelRequest(requestId);
    }
  }

  /**
   * Parse large JSON responses progressively to avoid blocking
   */
  private async parseResponseProgressive(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }

  /**
   * Cancel all pending AI requests
   */
  cancelAllRequests(): void {
    logger.debug('❌ Cancelling all AI requests');
    this.currentRequests.forEach((controller, id) => {
      controller.abort();
      resourceManager.cancelRequest(id);
    });
    this.currentRequests.clear();
  }

  /**
   * Generate AI insights from text with advanced analysis
   */
  async generateInsights(request: InsightRequest): Promise<AIInsight[]> {
    logger.debug('🚨 AI SERVICE GENERATE INSIGHTS CALLED 🚨');
    
    if (!this.isReady()) {
      throw new Error('AI service not initialized');
    }

    // Check rate limiting
    if (!this.canMakeSuggestion()) {
      logger.warn('Rate limit reached, skipping suggestion generation');
      return [];
    }

    try {
      // Detect response type and topics
      const responseType = this.detectResponseType(request.text);
      const detectedTopics = this.detectTopics(request.text);
      
      logger.debug(`Detected response type: ${responseType.type}, topics: ${detectedTopics.map(t => t.category).join(', ')}`);

      // Generate insights using OpenAI with enhanced prompts
      const insights = await this.generateOpenAIInsights(request, responseType, detectedTopics);
      
      // Update rate limiting
      this.updateRateLimit();
      
      return insights;
    } catch (error) {
      logger.error('Failed to generate insights:', error);
      // Fallback to contextual suggestions
      return this.generateContextualSuggestions(request.text, this.detectTopics(request.text));
    }
  }

  /**
   * Generate insights using OpenAI with advanced prompts
   */
  private async generateOpenAIInsights(
    request: InsightRequest, 
    responseType: ResponseType, 
    topics: DetectedTopic[]
  ): Promise<AIInsight[]> {
    
    if (!this.isReady()) {
      logger.warn('⚠️ AI service not ready, using fallback insights');
      return this.generateFallbackInsights(request);
    }

    try {
      logger.debug('🔍 Generating AI insights...');

      const prompt = `You are a business intelligence assistant analyzing a business conversation. Extract ONLY meaningful, actionable business insights.

Conversation: "${request.text}"
${request.context ? `Previous context: ${request.context.slice(-2).join(' ')}` : ''}

FOCUS ON:
- Business requirements, project details, technical specifications
- Budget, timeline, resource discussions
- Client needs, pain points, expectations
- Action items, commitments, next steps
- Business risks, opportunities, decisions
- Technology, platform, feature discussions

IGNORE:
- General communication quality ("fragmented sentences", "hello")
- Basic conversational elements
- Social pleasantries unless business-relevant

Generate 1-2 specific business insights if found. Each insight should:
- Be directly actionable or decision-relevant
- Reference specific business content from the conversation
- Provide value to a business professional

Respond with ONLY a JSON array:
[{
  "title": "Specific business insight (max 8 words)",
  "content": "Detailed explanation with specific context from conversation",
  "category": "followup|risk|opportunity|decision|technical",
  "relevance": 0.7-1.0,
  "confidence": 0.8-1.0
}]

If no business-relevant insights found, respond with: []`;

      logger.debug('🌐 Making OpenAI API request for insights...');
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.3,
          stream: false
        })
      });

      logger.debug('🌐 OpenAI response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '[]';

      try {
        // Parse JSON response
        const insights: AIInsight[] = JSON.parse(content);
        logger.debug(`✅ Generated ${insights.length} AI insights`);
        return insights.filter(insight => 
          insight.title && insight.content && insight.category
        );
      } catch (parseError) {
        logger.warn('⚠️ Failed to parse AI insights, using fallback');
        return this.generateFallbackInsights(request);
      }
    } catch (error) {
      logger.error('❌ AI insight generation failed:', error);
      return this.generateFallbackInsights(request);
    }
  }

  /**
   * Generate contextual suggestions based on detected topics (fallback system)
   */
  private generateContextualSuggestions(transcript: string, topics: DetectedTopic[]): AIInsight[] {
    const suggestions: AIInsight[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Compliance and Security specific suggestions
    if (lowerTranscript.includes('pci dss') || lowerTranscript.includes('pci compliance')) {
      suggestions.push({
        title: 'PCI DSS Compliance Requirements',
        content: 'PCI DSS requires secure network, cardholder data protection, vulnerability management, access control, monitoring, and security policies. Use tokenization and encryption.',
        category: 'technical',
        confidence: 0.9,
        relevance: 0.9,
        type: 'template'
      });
    }
    
    if (lowerTranscript.includes('hipaa') || lowerTranscript.includes('medical records') || lowerTranscript.includes('patient')) {
      suggestions.push({
        title: 'HIPAA Compliance Guidelines',
        content: 'HIPAA requires: encryption at rest/transit, access logs, BAAs with vendors, minimum necessary rule, patient consent, breach notifications within 72 hours.',
        category: 'technical',
        confidence: 0.9,
        relevance: 0.9,
        type: 'template'
      });
    }
    
    if (lowerTranscript.includes('fraud detection') && lowerTranscript.includes('payment')) {
      suggestions.push({
        title: 'Payment Fraud Detection Systems',
        content: 'Implement ML-based anomaly detection, velocity checks, device fingerprinting, 3D Secure, and real-time scoring. Use services like Stripe Radar or AWS Fraud Detector.',
        category: 'technical',
        confidence: 0.8,
        relevance: 0.8,
        type: 'template'
      });
    }
    
    if (lowerTranscript.includes('shopify') || lowerTranscript.includes('ecommerce')) {
      suggestions.push({
        title: 'Ecommerce Platform Strategy',
        content: 'Consider custom solutions for unique requirements, API integrations for third-party services, scalable hosting, and user experience optimization.',
        category: 'business',
        confidence: 0.8,
        relevance: 0.8,
        type: 'template'
      });
    }
    
    if (lowerTranscript.includes('database') && (lowerTranscript.includes('scale') || lowerTranscript.includes('performance'))) {
      suggestions.push({
        title: 'Database Scaling Strategy',
        content: 'Use read replicas, connection pooling, database sharding, Redis caching, CDN for static assets, and implement database connection limits.',
        category: 'technical',
        confidence: 0.8,
        relevance: 0.8,
        type: 'template'
      });
    }
    
    if (lowerTranscript.includes('react') || lowerTranscript.includes('frontend')) {
      suggestions.push({
        title: 'React Performance Optimization',
        content: 'Implement React.memo, useMemo, lazy loading, code splitting, and bundle analysis for better performance.',
        category: 'technical',
        confidence: 0.8,
        relevance: 0.8,
        type: 'template'
      });
    }
    
    // If no specific suggestions and we have detected topics, generate based on topics
    if (suggestions.length === 0 && topics.length > 0) {
      const topTopic = topics[0];
      const keyTerms = topTopic.keywords.slice(0, 3);
      
      suggestions.push({
        title: 'Implementation Strategy',
        content: `For ${keyTerms.join(', ')}: Research best practices, evaluate vendor solutions, create POC, assess security requirements, and plan phased rollout.`,
        category: topTopic.category as any,
        confidence: 0.7,
        relevance: 0.7,
        type: 'template'
      });
    }
    
    return suggestions.slice(0, 2); // Limit to 2 contextual suggestions
  }

  /**
   * Detect todos from text using AI
   */
  async detectTodos(text: string): Promise<TodoSuggestion[]> {
    logger.debug('🚨 AI SERVICE DETECT TODOS CALLED 🚨');
    logger.debug('📋 detectTodos called with text length:', text.length);
    logger.debug('📋 AI service status:', {
      isReady: this.isReady(),
      apiKey: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NO KEY'
    });
    
    if (!this.isReady()) {
      logger.warn('⚠️ AI service not ready, using fallback todo detection');
      return this.detectFallbackTodos(text);
    }

    try {
      logger.debug('✅ Detecting todos with AI...');

      const prompt = `Analyze this text and extract actionable todo items:

"${text}"

Look for:
- Tasks mentioned that need to be done
- Follow-up actions required
- Commitments made by participants
- Deadlines or time-sensitive items

Respond with ONLY a JSON array (no markdown):
[{
  "text": "Todo item description",
  "priority": "low|medium|high", 
  "category": "followup|research|meeting|document|contact",
  "confidence": 0.1-1.0
}]

If no todos found, respond with: []`;

      logger.debug('🌐 Making OpenAI API request for todos...');
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.2,
          stream: false
        })
      });

      logger.debug('🌐 OpenAI response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '[]';

      try {
        const todos: TodoSuggestion[] = JSON.parse(content);
        logger.debug(`✅ Detected ${todos.length} AI todos`);
        return todos.filter(todo => todo.text && todo.text.length > 3);
      } catch (parseError) {
        logger.warn('⚠️ Failed to parse AI todos, using fallback');
        return this.detectFallbackTodos(text);
      }
    } catch (error) {
      logger.error('❌ AI todo detection failed:', error);
      return this.detectFallbackTodos(text);
    }
  }

  /**
   * Fallback insights using keyword analysis
   */
  private generateFallbackInsights(request: InsightRequest): AIInsight[] {
    const text = request.text.toLowerCase();
    const insights: AIInsight[] = [];

    // Risk detection
    const riskKeywords = ['problem', 'issue', 'concern', 'risk', 'challenge', 'difficulty', 'blocker'];
    if (riskKeywords.some(keyword => text.includes(keyword))) {
      insights.push({
        title: 'Potential Risk Identified',
        content: 'Discussion mentions challenges or problems that may need attention',
        category: 'risk',
        relevance: 0.7,
        confidence: 0.6
      });
    }

    // Opportunity detection
    const opportunityKeywords = ['opportunity', 'improve', 'optimize', 'enhance', 'grow', 'expand'];
    if (opportunityKeywords.some(keyword => text.includes(keyword))) {
      insights.push({
        title: 'Opportunity Identified',
        content: 'Potential improvements or growth opportunities discussed',
        category: 'opportunity',
        relevance: 0.6,
        confidence: 0.5
      });
    }

    // Follow-up detection
    const followupKeywords = ['follow up', 'next steps', 'action items', 'schedule', 'meeting'];
    if (followupKeywords.some(keyword => text.includes(keyword))) {
      insights.push({
        title: 'Follow-up Required',
        content: 'Discussion indicates next steps or follow-up actions needed',
        category: 'followup',
        relevance: 0.8,
        confidence: 0.7
      });
    }

    return insights;
  }

  /**
   * Fallback todo detection using keywords
   */
  private detectFallbackTodos(text: string): TodoSuggestion[] {
    const todos: TodoSuggestion[] = [];
    const lowerText = text.toLowerCase();

    // Action verbs that indicate todos
    const actionPatterns = [
      /(?:need to|have to|should|must|will|going to)\s+([^.!?]+)/gi,
      /(?:i'll|i will|let me)\s+([^.!?]+)/gi,
      /(?:action item|todo|task):\s*([^.!?]+)/gi
    ];

    actionPatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        const todoText = match[1]?.trim();
        if (todoText && todoText.length > 10) {
          let priority: 'low' | 'medium' | 'high' = 'medium';
          
          if (lowerText.includes('urgent') || lowerText.includes('asap')) {
            priority = 'high';
          } else if (lowerText.includes('later') || lowerText.includes('eventually')) {
            priority = 'low';
          }

          todos.push({
            text: todoText,
            priority,
            category: 'general',
            confidence: 0.6
          });
        }
      });
    });

    return todos.slice(0, 3); // Limit to 3 todos
  }
}

// Export singleton instance
export const aiService = new AIService();