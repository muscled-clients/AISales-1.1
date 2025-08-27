/**
 * System Audio Capture Service for Client Calls (Windows + Mac)
 * Captures audio from meeting applications like Teams, Zoom, etc.
 * Works on both Windows and macOS
 */

export class SystemAudioCapture {
  private isCapturing = false;
  private systemStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private systemAudioSource: MediaStreamAudioSourceNode | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private onAudioDataCallback?: (audioData: ArrayBuffer) => void;
  private platform: string = 'unknown';

  constructor() {
    console.log('🔊 SystemAudioCapture initialized (Cross-platform: Windows + Mac)');
    this.detectPlatform();
  }

  private async detectPlatform(): Promise<void> {
    try {
      if (window.electronAPI) {
        this.platform = await window.electronAPI.getPlatform();
        console.log(`🖥️ Platform detected: ${this.platform}`);
      }
    } catch (error) {
      console.warn('Failed to detect platform, using cross-platform approach');
    }
  }

  async startCapture(): Promise<boolean> {
    try {
      console.log('🔊 Starting system audio capture for client calls...');
      
      if (!window.electronAPI) {
        console.warn('⚠️ Electron API not available for system audio capture');
        return false;
      }
      
      // Ensure platform is detected
      if (this.platform === 'unknown') {
        await this.detectPlatform();
      }

      // Get available audio sources with timeout and error handling
      let audioSources: any;
      try {
        audioSources = await Promise.race([
          window.electronAPI.getAudioSources(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as any;
        
        if (!audioSources?.success || !audioSources?.sources || audioSources.sources.length === 0) {
          throw new Error('No audio sources available');
        }
      } catch (error) {
        console.warn('⚠️ Failed to get audio sources:', error);
        return false;
      }

      console.log('📋 Available sources:', audioSources.sources.map((s: any) => s.name));

      // Try to find meeting applications
      const meetingApps = audioSources.sources.filter((source: any) => {
        const name = source.name.toLowerCase();
        return name.includes('teams') || 
               name.includes('zoom') || 
               name.includes('meet') || 
               name.includes('discord') || 
               name.includes('skype') ||
               name.includes('webex') ||
               name.includes('slack') ||
               name.includes('call');
      });

      // Use meeting app if found, otherwise use entire screen
      const selectedSource = meetingApps.length > 0 ? meetingApps[0] : audioSources.sources[0];
      console.log(`🎯 Selected source for system audio: "${selectedSource.name}"`);

      // Create cross-platform constraints for system audio capture
      const constraints = this.platform === 'darwin' ? {
        // macOS: Use standard getDisplayMedia approach
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2,
          suppressLocalAudioPlayback: false // Important for Mac
        },
        video: false
      } : {
        // Windows/Linux: Use desktop capture with sourceId
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
          }
        },
        video: false
      };

      // Get system audio stream using appropriate method for each platform
      if (this.platform === 'darwin') {
        // macOS: Use getDisplayMedia for system audio
        console.log('🍎 Using macOS getDisplayMedia for system audio...');
        this.systemStream = await navigator.mediaDevices.getDisplayMedia(constraints as any);
      } else {
        // Windows/Linux: Use getUserMedia with desktop source
        console.log('🪟 Using Windows/Linux getUserMedia with desktop source...');
        this.systemStream = await (navigator.mediaDevices as any).getUserMedia(constraints);
      }

      if (!this.systemStream || this.systemStream.getAudioTracks().length === 0) {
        throw new Error('Failed to get system audio stream');
      }

      console.log('✅ System audio stream obtained');
      console.log(`🔊 Audio tracks: ${this.systemStream.getAudioTracks().length}`);

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Deepgram preferred rate
      });

      // Create system audio source
      this.systemAudioSource = this.audioContext.createMediaStreamSource(this.systemStream);

      // Create audio processor
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 2, 1);

      let packetCount = 0;
      this.audioProcessor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputBuffer = event.inputBuffer;
        const leftChannel = inputBuffer.getChannelData(0);
        const rightChannel = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : leftChannel;

        // Mix stereo to mono
        const monoData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
        }

        // Calculate volume
        let sum = 0;
        for (let i = 0; i < monoData.length; i++) {
          sum += monoData[i] * monoData[i];
        }
        const volume = Math.sqrt(sum / monoData.length);

        // Convert to Int16Array
        const int16Buffer = this.convertFloat32ToInt16(monoData);

        packetCount++;
        if (packetCount % 100 === 0) {
          if (volume > 0.001) {
            console.log(`🔊 SYSTEM AUDIO DETECTED - Packet ${packetCount}, volume: ${volume.toFixed(4)}`);
          } else {
            console.log(`🔇 System audio packet ${packetCount}, volume: ${volume.toFixed(4)} (no sound)`);
          }
        }

        // Send audio data if there's signal
        if (this.onAudioDataCallback && volume > 0.0001) {
          this.onAudioDataCallback(int16Buffer.buffer as ArrayBuffer);
        }
      };

      // Connect audio nodes
      this.systemAudioSource.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      // Resume audio context if needed
      if (this.audioContext.state === 'suspended') {
        console.log('🔄 Resuming audio context...');
        await this.audioContext.resume();
      }

      this.isCapturing = true;
      console.log('✅ System audio capture started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start system audio capture:', error);
      console.error('💡 Make sure to grant screen recording/audio permissions when prompted');
      this.cleanup();
      return false;
    }
  }

  stopCapture(): void {
    console.log('🛑 Stopping system audio capture...');
    this.isCapturing = false;
    this.cleanup();
  }

  setOnAudioData(callback: (audioData: ArrayBuffer) => void): void {
    this.onAudioDataCallback = callback;
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  private cleanup(): void {
    if (this.audioProcessor) {
      try {
        this.audioProcessor.disconnect();
        this.audioProcessor.onaudioprocess = null;
      } catch (e) {}
      this.audioProcessor = null;
    }

    if (this.systemAudioSource) {
      try {
        this.systemAudioSource.disconnect();
      } catch (e) {}
      this.systemAudioSource = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 Stopped system audio track');
      });
      this.systemStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
  }

  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }
}

// Export singleton instance
export const systemAudioCapture = new SystemAudioCapture();