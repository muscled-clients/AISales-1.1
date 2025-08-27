/**
 * Electron Transcription Service - Uses main process for WebSocket connection
 * This solves browser CORS/WebSocket restrictions
 */

interface TranscriptResult {
  text: string;
  timestamp: Date;
  isInterim: boolean;
  speaker?: 'user' | 'system';
}

export class ElectronTranscriptionService {
  private apiKey: string = '';
  private isTranscribing: boolean = false;
  private onTranscriptCallback?: (result: TranscriptResult) => void;
  private onErrorCallback?: (error: Error) => void;
  private audioPacketCount: number = 0;

  constructor() {
    console.log('🎙️ ElectronTranscriptionService initialized');
    
    // Set up transcript listener
    if (window.electronAPI) {
      window.electronAPI.onTranscript((data) => {
        console.log('📨 ELECTRON SERVICE: Transcript received from main process:', data);
        if (this.onTranscriptCallback) {
          console.log('✅ ELECTRON SERVICE: Calling registered transcript callback');
          this.onTranscriptCallback(data);
        } else {
          console.warn('⚠️ ELECTRON SERVICE: No transcript callback registered!');
        }
      });
    }
  }

  /**
   * Initialize with Deepgram API key
   */
  initialize(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('🔑 Electron transcription service configured with key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NO KEY');
  }

  /**
   * Start transcription using Electron main process
   */
  async startTranscription(): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    if (this.isTranscribing) {
      console.warn('⚠️ Transcription already in progress');
      return false;
    }

    try {
      console.log('🚀 Starting transcription via Electron main process...');
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.deepgramStart(this.apiKey);
      
      if (result.success) {
        this.isTranscribing = true;
        console.log('✅ Transcription started successfully, isTranscribing:', this.isTranscribing);
        return true;
      } else {
        throw new Error(result.error || 'Failed to start transcription');
      }
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  /**
   * Stop transcription
   */
  async stopTranscription(): Promise<void> {
    if (!this.isTranscribing) {
      console.warn('⚠️ No transcription in progress');
      return;
    }

    try {
      console.log('🛑 Stopping transcription...');
      
      if (window.electronAPI) {
        await window.electronAPI.deepgramStop();
      }
      
      this.isTranscribing = false;
      console.log('✅ Transcription stopped');
    } catch (error) {
      console.error('❌ Failed to stop transcription:', error);
      throw error;
    }
  }

  /**
   * Send audio data for transcription
   */
  sendAudioData(audioData: ArrayBuffer): void {
    if (!this.isTranscribing) {
      console.warn('⚠️ Cannot send audio - transcription not active, isTranscribing:', this.isTranscribing);
      return;
    }
    
    // Log every 100th packet to avoid spam but show activity
    this.audioPacketCount = (this.audioPacketCount || 0) + 1;
    if (this.audioPacketCount % 100 === 0) {
      console.log(`📄 Sent ${this.audioPacketCount} audio packets to Deepgram (latest: ${audioData.byteLength} bytes)`);
    }

    if (!window.electronAPI) {
      console.error('❌ Electron API not available');
      return;
    }

    try {
      // Send audio data to main process
      window.electronAPI.deepgramSendAudio(audioData);
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
   * Check if currently transcribing
   */
  isActive(): boolean {
    return this.isTranscribing;
  }
}

// Export singleton instance
export const electronTranscriptionService = new ElectronTranscriptionService();