/**
 * Transcription Service - Deepgram WebSocket integration
 * Handles real-time speech-to-text transcription
 */

interface TranscriptResult {
  text: string;
  isInterim: boolean;
  confidence: number;
  timestamp: Date;
  speaker?: 'user' | 'system';
}

export class TranscriptionService {
  private websocket: WebSocket | null = null;
  private isConnected = false;
  private isTranscribing = false;
  private apiKey = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 2000;

  // Event callbacks
  private onTranscriptCallback?: (result: TranscriptResult) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStatusCallback?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  constructor() {
    console.log('🎤 TranscriptionService initialized');
  }

  /**
   * Initialize with API key
   */
  initialize(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('🔑 Deepgram API key configured');
  }

  /**
   * Start transcription session
   */
  async startTranscription(): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    if (this.isTranscribing) {
      console.warn('Transcription already in progress');
      return false;
    }

    try {
      await this.connectToDeepgram();
      this.isTranscribing = true;
      console.log('✅ Transcription started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Stop transcription session
   */
  async stopTranscription(): Promise<void> {
    if (!this.isTranscribing) {
      console.warn('No transcription in progress');
      return;
    }

    console.log('🛑 Stopping transcription...');
    this.isTranscribing = false;
    
    if (this.websocket) {
      this.websocket.close(1000, 'Transcription stopped');
    }
    
    console.log('✅ Transcription stopped');
  }

  /**
   * Send audio data for transcription
   */
  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.websocket || !this.isTranscribing) {
      console.warn('Cannot send audio - not connected to Deepgram');
      return;
    }

    try {
      this.websocket.send(audioData);
    } catch (error) {
      console.error('❌ Failed to send audio data:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
    }
  }

  /**
   * Set callback for transcript results
   */
  setOnTranscript(callback: (result: TranscriptResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  /**
   * Set callback for errors
   */
  setOnError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for status updates
   */
  setOnStatus(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): void {
    this.onStatusCallback = callback;
  }

  /**
   * Check if currently transcribing
   */
  isActive(): boolean {
    return this.isTranscribing && this.isConnected;
  }

  /**
   * Connect to Deepgram WebSocket
   */
  private async connectToDeepgram(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to Deepgram...');
      console.log('🔑 Using API key:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'NO KEY');
      this.updateStatus('connecting');

      // Deepgram WebSocket URL with optimized parameters
      const deepgramUrl = this.buildDeepgramUrl();
      console.log('🌐 Deepgram URL:', deepgramUrl);

      try {
        this.websocket = new WebSocket(deepgramUrl);
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(new Error('Failed to connect to Deepgram - check your API key'));
        return;
      }

      this.websocket.onopen = () => {
        console.log('✅ Connected to Deepgram');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        resolve();
      };

      this.websocket.onmessage = (event) => {
        this.handleDeepgramMessage(event.data);
      };

      this.websocket.onclose = (event) => {
        console.log('🔌 Deepgram connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.updateStatus('disconnected');
        
        // Auto-reconnect if transcription is still active
        if (this.isTranscribing && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error);
        console.error('Error details:', {
          readyState: this.websocket?.readyState,
          url: deepgramUrl.substring(0, 50) + '...',
          hasApiKey: !!this.apiKey,
          apiKeyLength: this.apiKey?.length || 0
        });
        this.isConnected = false;
        this.updateStatus('error');
        
        const errorMessage = 'Deepgram connection failed - please verify your API key is correct';
        
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error('Deepgram WebSocket connection failed'));
        }
        
        reject(error);
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          this.websocket?.close();
          reject(new Error('Deepgram connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Build Deepgram WebSocket URL with optimized parameters
   */
  private buildDeepgramUrl(): string {
    const baseUrl = 'wss://api.deepgram.com/v1/listen';
    const params = new URLSearchParams({
      language: 'en-US',
      model: 'nova-2',
      smart_format: 'true',
      punctuate: 'true',
      interim_results: 'true',
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      endpointing: '300', // 300ms silence for utterance end
      utterance_end_ms: '1000' // 1 second utterance timeout
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Handle incoming messages from Deepgram
   */
  private handleDeepgramMessage(data: string): void {
    try {
      const response = JSON.parse(data);
      
      if (response.type === 'Results') {
        const result = response.channel?.alternatives?.[0];
        
        if (result) {
          const transcriptResult: TranscriptResult = {
            text: result.transcript,
            isInterim: !response.is_final,
            confidence: result.confidence || 0,
            timestamp: new Date(),
            speaker: 'user' // Default to user, could be enhanced with speaker detection
          };

          // Only process non-empty transcripts
          if (transcriptResult.text.trim()) {
            console.log(`📝 Transcript (${transcriptResult.isInterim ? 'interim' : 'final'}):`, 
                       transcriptResult.text);
            
            if (this.onTranscriptCallback) {
              this.onTranscriptCallback(transcriptResult);
            }
          }
        }
      } else if (response.type === 'Metadata') {
        console.log('📊 Deepgram metadata:', response);
      } else if (response.type === 'SpeechStarted') {
        console.log('🎙️ Speech started');
      } else if (response.type === 'UtteranceEnd') {
        console.log('🔚 Utterance end');
      }
    } catch (error) {
      console.error('❌ Failed to parse Deepgram response:', error);
      console.error('Raw data:', data);
    }
  }

  /**
   * Attempt to reconnect to Deepgram
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    setTimeout(async () => {
      try {
        await this.connectToDeepgram();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('💔 Max reconnection attempts reached');
          this.isTranscribing = false;
          
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error('Failed to reconnect to Deepgram after multiple attempts'));
          }
        }
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();