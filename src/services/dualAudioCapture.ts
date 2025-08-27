/**
 * Dual Audio Capture - Enhanced for Teams/Video Calls
 * Captures both microphone (your voice) AND system audio (remote participant's voice)
 * Based on the proven approach from the original SmartCallMate app
 */

interface DualAudioOptions {
  enableSystemAudio: boolean;
  enableMicrophone: boolean;
  sampleRate: number;
  bufferSize: number;
}

export class DualAudioCaptureService {
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private systemSource: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;
  private systemGainNode: GainNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isCapturing = false;
  private isDualMode = false;
  
  private readonly options: DualAudioOptions = {
    enableSystemAudio: true,
    enableMicrophone: true,
    sampleRate: 16000,
    bufferSize: 4096
  };
  
  // Event callbacks
  private onAudioDataCallback?: (audioData: ArrayBuffer) => void;
  private onErrorCallback?: (error: Error) => void;
  private onStatusCallback?: (status: string) => void;

  constructor() {
    console.log('🎙️🔊 DualAudioCaptureService initialized');
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
   * Start dual audio capture (microphone + system audio)
   * This will capture BOTH your voice AND the remote participant's voice
   */
  async startCapture(): Promise<void> {
    try {
      console.log('🚀 Starting dual audio capture...');
      this.onStatusCallback?.('Starting dual audio capture...');

      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.options.sampleRate
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Step 1: Get microphone stream
      await this.setupMicrophone();

      // Step 2: Try to get system audio (for Teams/video calls)
      if (this.options.enableSystemAudio) {
        await this.setupSystemAudio();
      }

      // Step 3: Create audio processing pipeline
      this.setupAudioProcessing();

      this.isCapturing = true;
      console.log('✅ Dual audio capture started successfully!');
      this.onStatusCallback?.(`Capture mode: ${this.isDualMode ? 'Dual (Mic + System)' : 'Microphone only'}`);
      
    } catch (error) {
      console.error('❌ Failed to start dual audio capture:', error);
      this.onErrorCallback?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Setup microphone capture
   */
  private async setupMicrophone(): Promise<void> {
    console.log('🎤 Setting up microphone...');
    
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: this.options.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const micTrack = this.micStream.getAudioTracks()[0];
    if (!micTrack) {
      throw new Error('No microphone track available');
    }

    console.log('✅ Microphone access granted:', micTrack.getSettings());
  }

  /**
   * Setup system audio capture (for Teams/video calls)
   * This uses the Chrome screen share API to capture system audio
   */
  private async setupSystemAudio(): Promise<void> {
    console.log('🔊 Setting up system audio capture...');
    console.log('📝 You will be prompted to share your screen/tab WITH AUDIO');
    console.log('⚠️  IMPORTANT: Make sure to check "Share system audio" or "Share tab audio"');
    
    try {
      // Request system audio through screen capture API
      // This will prompt user to select audio source
      this.systemStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.options.sampleRate,
          echoCancellation: false, // Don't cancel echo for system audio
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false // We only want audio
      });

      const systemTrack = this.systemStream.getAudioTracks()[0];
      if (!systemTrack) {
        throw new Error('No system audio track - make sure you selected "Share system audio"');
      }

      console.log('✅ System audio access granted:', systemTrack.getSettings());
      this.isDualMode = true;

      // Handle system audio track ending (user stops sharing)
      systemTrack.onended = () => {
        console.log('⚠️ System audio sharing stopped - switching to microphone only');
        this.isDualMode = false;
        this.onStatusCallback?.('System audio stopped - using microphone only');
      };
      
    } catch (error) {
      console.log('⚠️ System audio not available - continuing with microphone only');
      console.log('💡 To capture both sides of video calls, restart and select "Share system audio"');
      this.isDualMode = false;
    }
  }

  /**
   * Setup audio processing pipeline
   */
  private setupAudioProcessing(): void {
    if (!this.audioContext) return;

    console.log('🔧 Setting up audio processing...');

    // Create audio sources
    if (this.micStream) {
      this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
      this.micGainNode = this.audioContext.createGain();
      this.micGainNode.gain.value = 1.0; // Full volume for microphone
    }

    if (this.systemStream && this.isDualMode) {
      this.systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
      this.systemGainNode = this.audioContext.createGain();
      this.systemGainNode.gain.value = 0.8; // Slightly lower to prevent overpowering
    }

    // Create script processor for audio processing
    this.processor = this.audioContext.createScriptProcessor(
      this.options.bufferSize,
      1, // Input channels
      1  // Output channels
    );

    // Process audio data
    this.processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const channelData = inputBuffer.getChannelData(0);
      
      // Convert to ArrayBuffer for sending to transcription
      const arrayBuffer = new ArrayBuffer(channelData.length * 4);
      const view = new Float32Array(arrayBuffer);
      view.set(channelData);
      
      this.onAudioDataCallback?.(arrayBuffer);
    };

    // Connect the audio graph
    if (this.isDualMode) {
      // Dual mode: Mix microphone and system audio
      const mixer = this.audioContext.createGain();
      
      if (this.micSource && this.micGainNode) {
        this.micSource.connect(this.micGainNode);
        this.micGainNode.connect(mixer);
      }
      
      if (this.systemSource && this.systemGainNode) {
        this.systemSource.connect(this.systemGainNode);
        this.systemGainNode.connect(mixer);
      }
      
      mixer.connect(this.processor);
      console.log('🎵 Audio graph connected in dual mode (Mic + System)');
    } else {
      // Microphone only mode
      if (this.micSource && this.micGainNode) {
        this.micSource.connect(this.micGainNode);
        this.micGainNode.connect(this.processor);
      }
      console.log('🎵 Audio graph connected in microphone-only mode');
    }

    // Connect processor to destination (required for processing)
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Stop audio capture
   */
  async stopCapture(): Promise<void> {
    console.log('⏹️ Stopping dual audio capture...');
    
    this.isCapturing = false;

    // Stop all tracks
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach(track => track.stop());
      this.systemStream = null;
    }

    // Disconnect audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.systemSource) {
      this.systemSource.disconnect();
      this.systemSource = null;
    }

    if (this.micGainNode) {
      this.micGainNode.disconnect();
      this.micGainNode = null;
    }

    if (this.systemGainNode) {
      this.systemGainNode.disconnect();
      this.systemGainNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isDualMode = false;
    console.log('✅ Dual audio capture stopped');
    this.onStatusCallback?.('Audio capture stopped');
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Check if in dual mode (capturing both mic and system audio)
   */
  isDualModeActive(): boolean {
    return this.isDualMode;
  }
}

export const dualAudioCaptureService = new DualAudioCaptureService();