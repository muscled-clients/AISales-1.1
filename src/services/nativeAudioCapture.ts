/**
 * Native Audio Capture Service - Enhanced for Desktop
 * Combines WebAudio API with native Electron capabilities
 */

// Enhanced Audio Capture with Electron Integration

interface AudioCaptureOptions {
  includeMicrophone: boolean;
  includeSystemAudio: boolean;
  sampleRate: number;
  bufferSize: number;
}

export class NativeAudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private systemAudioSource: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;
  private platform: string = 'unknown';
  
  // Configuration
  private readonly defaultOptions: AudioCaptureOptions = {
    includeMicrophone: true,
    includeSystemAudio: false, // Will be enabled when native support is available
    sampleRate: 16000,
    bufferSize: 4096
  };
  
  // Event callbacks
  private onAudioDataCallback?: (audioData: ArrayBuffer) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStatusCallback?: (status: string) => void;

  constructor() {
    console.log('🎙️ NativeAudioCaptureService initialized');
    this.initializePlatformInfo();
  }

  /**
   * Initialize platform information
   */
  private async initializePlatformInfo(): Promise<void> {
    try {
      if (window.electronAPI) {
        this.platform = await window.electronAPI.getPlatform();
        console.log(`🖥️ Platform detected: ${this.platform}`);
      }
    } catch (error) {
      console.warn('Failed to get platform info:', error);
    }
  }

  /**
   * Check audio permissions
   */
  async checkPermissions(): Promise<{ microphone: boolean; systemAudio: boolean }> {
    try {
      if (window.electronAPI) {
        const permissions = await window.electronAPI.checkAudioPermissions();
        return {
          microphone: permissions.microphone === 'granted',
          systemAudio: this.platform !== 'darwin' // System audio available on Windows/Linux
        };
      }
      
      // Fallback for web
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return {
        microphone: micPermission.state === 'granted',
        systemAudio: false
      };
    } catch (error) {
      console.error('Permission check failed:', error);
      return { microphone: false, systemAudio: false };
    }
  }

  /**
   * Request audio permissions
   */
  async requestPermissions(): Promise<{ microphone: boolean; systemAudio: boolean }> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.requestAudioPermissions();
        
        // Show notification about permissions
        await window.electronAPI.showNotification({
          title: 'AI Sales Assistant',
          body: result.microphone ? 'Microphone access granted' : 'Microphone access denied',
          silent: false
        });
        
        return {
          microphone: result.microphone,
          systemAudio: this.platform !== 'darwin'
        };
      }
      
      // Fallback - request microphone access
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return { microphone: true, systemAudio: false };
      } catch {
        return { microphone: false, systemAudio: false };
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      throw error;
    }
  }

  /**
   * Get available audio sources
   */
  async getAudioSources(): Promise<Array<{ id: string; name: string; type: 'microphone' | 'system' }>> {
    const sources: Array<{ id: string; name: string; type: 'microphone' | 'system' }> = [];
    
    try {
      // Get microphone devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      audioInputs.forEach(device => {
        sources.push({
          id: device.deviceId,
          name: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          type: 'microphone'
        });
      });
      
      // Get system audio sources (Electron only)
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.getAudioSources();
          if (result.success && result.sources) {
            result.sources.forEach(source => {
              sources.push({
                id: source.id,
                name: source.name,
                type: 'system'
              });
            });
          }
        } catch (error) {
          console.warn('Failed to get system audio sources:', error);
        }
      }
      
    } catch (error) {
      console.error('Failed to enumerate audio sources:', error);
    }
    
    return sources;
  }

  /**
   * Start enhanced audio capture
   */
  async startCapture(options: Partial<AudioCaptureOptions> = {}): Promise<boolean> {
    if (this.isCapturing) {
      console.warn('Audio capture already in progress');
      return false;
    }

    const config = { ...this.defaultOptions, ...options };
    
    try {
      console.log('🎤 Starting enhanced audio capture...');
      this.updateStatus('Starting audio capture...');
      
      // Check permissions first
      const permissions = await this.checkPermissions();
      if (!permissions.microphone) {
        const requested = await this.requestPermissions();
        if (!requested.microphone) {
          throw new Error('Microphone permission denied');
        }
      }

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: config.sampleRate
      });

      // Start microphone capture
      if (config.includeMicrophone) {
        await this.startMicrophoneCapture(config);
      }

      // Start system audio capture (if available and requested)
      if (config.includeSystemAudio && this.platform === 'win32') {
        await this.startSystemAudioCapture(config);
      }

      // Set up audio processing
      this.setupAudioProcessing(config);

      this.isCapturing = true;
      this.updateStatus('Audio capture active');
      
      // Show desktop notification
      if (window.electronAPI) {
        await window.electronAPI.showNotification({
          title: 'Recording Started',
          body: 'AI Sales Assistant is now capturing audio',
          silent: true
        });
      }

      console.log('✅ Enhanced audio capture started successfully');
      console.log(`📊 Config: ${config.sampleRate}Hz, ${config.bufferSize} buffer`);
      console.log(`🎙️ Microphone: ${config.includeMicrophone ? 'enabled' : 'disabled'}`);
      console.log(`🔊 System Audio: ${config.includeSystemAudio ? 'enabled' : 'disabled'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start enhanced audio capture:', error);
      this.cleanup();
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Start microphone capture
   */
  private async startMicrophoneCapture(config: AudioCaptureOptions): Promise<void> {
    console.log('🎤 Starting microphone capture...');
    
    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: config.sampleRate,
          channelCount: 1
        }
      });

      console.log('✅ Microphone permission granted, stream obtained');
      console.log('🔊 Audio tracks:', stream.getAudioTracks().length);
      
      if (stream.getAudioTracks().length === 0) {
        throw new Error('No audio tracks found in stream');
      }

      this.mediaStream = stream;
      this.microphoneSource = this.audioContext!.createMediaStreamSource(this.mediaStream);
      console.log('✅ Microphone source created successfully');
      
      // Test if the audio context is running
      if (this.audioContext!.state === 'suspended') {
        console.log('🔄 Audio context suspended, resuming...');
        await this.audioContext!.resume();
      }
      
      console.log('🔊 Audio context state:', this.audioContext!.state);
      
    } catch (error) {
      console.error('❌ Failed to start microphone capture:', error);
      throw error;
    }
  }

  /**
   * Start system audio capture (Windows/Linux)
   */
  private async startSystemAudioCapture(config: AudioCaptureOptions): Promise<void> {
    try {
      console.log('🔊 Starting system audio capture...');
      
      // This is a placeholder for future native implementation
      // For now, we'll use screen capture with audio
      if (navigator.mediaDevices.getDisplayMedia) {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: config.sampleRate
          },
          video: false
        } as any);

        if (systemStream.getAudioTracks().length > 0) {
          this.systemAudioSource = this.audioContext!.createMediaStreamSource(systemStream);
          console.log('✅ System audio source created');
        }
      }
    } catch (error) {
      console.warn('⚠️ System audio capture not available:', error);
      // Don't fail the entire capture if system audio fails
    }
  }

  /**
   * Set up audio processing pipeline
   */
  private setupAudioProcessing(config: AudioCaptureOptions): void {
    if (!this.audioContext) return;

    // Create script processor for real-time audio processing
    this.audioProcessor = this.audioContext.createScriptProcessor(
      config.bufferSize,
      1, // 1 input channel
      1  // 1 output channel
    );

    // Create mixer if we have multiple sources
    const mixer = this.audioContext.createGain();
    
    // Connect microphone source
    if (this.microphoneSource) {
      this.microphoneSource.connect(mixer);
    }
    
    // Connect system audio source
    if (this.systemAudioSource) {
      this.systemAudioSource.connect(mixer);
    }

    // Connect mixer to processor
    mixer.connect(this.audioProcessor);
    this.audioProcessor.connect(this.audioContext.destination);

    // Process audio data in real-time
    let audioPacketCount = 0;
    let lastVolumeCheck = 0;
    
    this.audioProcessor.onaudioprocess = (audioProcessingEvent) => {
      if (!this.isCapturing) return;

      const inputBuffer = audioProcessingEvent.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Check audio volume level
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const volume = Math.sqrt(sum / inputData.length);
      
      // Convert Float32Array to Int16Array for Deepgram
      const int16Buffer = this.convertFloat32ToInt16(inputData);
      
      // Log every 50th packet to avoid console spam but show activity
      audioPacketCount++;
      if (audioPacketCount % 50 === 0) {
        console.log(`🎵 Audio packet ${audioPacketCount}, size: ${int16Buffer.buffer.byteLength} bytes, volume: ${volume.toFixed(4)}`);
        console.log(`🎵 Raw audio sample (first 10): [${Array.from(inputData.slice(0, 10)).map(x => x.toFixed(3)).join(', ')}]`);
        console.log(`🎵 Converted sample (first 10): [${Array.from(int16Buffer.slice(0, 10)).join(', ')}]`);
      }
      
      // Check if we're getting any audio signal
      if (audioPacketCount % 200 === 0) {
        if (volume > 0.001) {
          console.log(`🔊 AUDIO DETECTED - Volume level: ${volume.toFixed(4)}`);
        } else {
          console.warn(`🔇 NO AUDIO SIGNAL - Volume level: ${volume.toFixed(4)} (mic might be muted or not working)`);
        }
      }
      
      // Send audio data via callback
      if (this.onAudioDataCallback) {
        this.onAudioDataCallback(int16Buffer.buffer as ArrayBuffer);
        
        // First time sending audio
        if (audioPacketCount === 1) {
          console.log('✅ First audio packet sent to callback successfully');
        }
      } else {
        console.warn('⚠️ No audio callback set!');
      }
    };
  }

  /**
   * Stop audio capture
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      console.warn('No audio capture in progress');
      return;
    }

    console.log('🛑 Stopping enhanced audio capture...');
    this.isCapturing = false;
    this.updateStatus('Stopping audio capture...');
    
    this.cleanup();
    
    // Show desktop notification
    if (window.electronAPI) {
      await window.electronAPI.showNotification({
        title: 'Recording Stopped',
        body: 'AI Sales Assistant has stopped capturing audio',
        silent: true
      });
    }
    
    this.updateStatus('Audio capture stopped');
    console.log('✅ Enhanced audio capture stopped');
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
   * Set callback for status updates
   */
  setOnStatus(callback: (status: string) => void): void {
    this.onStatusCallback = callback;
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: string): void {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
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

    // Disconnect sources
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }

    if (this.systemAudioSource) {
      this.systemAudioSource.disconnect();
      this.systemAudioSource = null;
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

  /**
   * Get platform-specific capabilities
   */
  getCapabilities(): {
    microphone: boolean;
    systemAudio: boolean;
    notifications: boolean;
    traySupport: boolean;
    nativeMenus: boolean;
  } {
    return {
      microphone: true,
      systemAudio: this.platform === 'win32' || this.platform === 'linux',
      notifications: !!window.electronAPI,
      traySupport: !!window.electronAPI,
      nativeMenus: !!window.electronAPI
    };
  }
}

// Export singleton instance
export const nativeAudioCaptureService = new NativeAudioCaptureService();