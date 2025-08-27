/**
 * Audio Capture Service - WebAudio API implementation
 * Captures microphone audio and streams to Electron main process
 */

export class AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private isCapturing = false;
  private readonly bufferSize = 4096;
  private readonly sampleRate = 16000;
  
  // Event callbacks
  private onAudioDataCallback?: (audioData: ArrayBuffer) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor() {
    console.log('🎙️ AudioCaptureService initialized');
  }

  /**
   * Start audio capture from microphone
   */
  async startCapture(): Promise<boolean> {
    if (this.isCapturing) {
      console.warn('Audio capture already in progress');
      return false;
    }

    try {
      console.log('🎤 Starting audio capture...');
      
      // Request microphone access with optimal settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.sampleRate,
          channelCount: 1
        }
      });

      // Create audio context with the desired sample rate
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for real-time audio processing
      this.audioProcessor = this.audioContext.createScriptProcessor(
        this.bufferSize, 
        1, // 1 input channel
        1  // 1 output channel
      );

      // Process audio data in real-time
      this.audioProcessor.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isCapturing) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for Deepgram
        const int16Buffer = this.convertFloat32ToInt16(inputData);
        
        // Send audio data via callback
        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(int16Buffer.buffer as ArrayBuffer);
        }
      };

      // Connect the audio nodes
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('✅ Audio capture started successfully');
      console.log(`📊 Audio config: ${this.sampleRate}Hz, ${this.bufferSize} buffer, 1 channel`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start audio capture:', error);
      this.cleanup();
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Stop audio capture
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      console.warn('No audio capture in progress');
      return;
    }

    console.log('🛑 Stopping audio capture...');
    this.isCapturing = false;
    this.cleanup();
    console.log('✅ Audio capture stopped');
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Set callback for audio data
   */
  setOnAudioData(callback: (audioData: ArrayBuffer) => void): void {
    this.onAudioDataCallback = callback;
  }

  /**
   * Set callback for errors
   */
  setOnError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Get microphone permission status
   */
  async checkPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ 
        name: 'microphone' as PermissionName 
      });
      return result.state;
    } catch (error) {
      console.error('Failed to check microphone permission:', error);
      return 'prompt';
    }
  }

  /**
   * Get available audio input devices
   */
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Disconnect and clear audio processor
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor.onaudioprocess = null;
      this.audioProcessor = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    // Stop all media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔇 Stopped track: ${track.kind}`);
      });
      this.mediaStream = null;
    }
  }

  /**
   * Convert Float32Array to Int16Array for Deepgram
   */
  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp values to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      
      // Convert to 16-bit signed integer
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return int16Array;
  }
}

// Export singleton instance
export const audioCaptureService = new AudioCaptureService();