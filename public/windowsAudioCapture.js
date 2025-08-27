/**
 * Windows System Audio Capture for Client Calls
 * Uses Electron's desktopCapturer API to capture system audio from applications
 */

const { desktopCapturer } = require('electron');

class WindowsAudioCapture {
  constructor(deepgramService) {
    this.deepgramService = deepgramService;
    this.isCapturing = false;
    this.systemStream = null;
    this.audioContext = null;
    this.systemAudioSource = null;
    this.audioProcessor = null;
    this.mixer = null;
  }

  async startSystemAudioCapture() {
    try {
      console.log('🔊 Starting Windows system audio capture...');
      
      // Get available audio sources with high quality options
      const sources = await desktopCapturer.getSources({ 
        types: ['screen', 'window'],
        fetchWindowIcons: false,
        // Request high quality audio capture
        thumbnailSize: { width: 0, height: 0 }, // Don't need video thumbnails
      });
      
      console.log('📋 Available audio sources:', sources.map(s => s.name));
      
      if (!sources || sources.length === 0) {
        throw new Error('No capturable sources found');
      }
      
      // Try to find meeting/call applications first
      const meetingApps = sources.filter(source => {
        const name = source.name.toLowerCase();
        return name.includes('teams') || 
               name.includes('zoom') || 
               name.includes('meet') || 
               name.includes('discord') || 
               name.includes('skype') ||
               name.includes('webex') ||
               name.includes('slack');
      });
      
      // Use meeting app if found, otherwise use entire screen
      const selectedSource = meetingApps.length > 0 ? meetingApps[0] : sources[0];
      console.log(`🎯 Selected audio source: "${selectedSource.name}"`);
      
      // Create constraints for high quality audio capture
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            // High quality audio settings
            echoCancellation: false,
            googEchoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googNoiseSuppression: false,
            googAutoGainControl: false,
            // Audio quality
            sampleRate: 48000, // High sample rate for better quality
            channelCount: 2,    // Stereo capture
            sampleSize: 16,
            // Latency settings
            googTypingNoiseDetection: false,
            googBeamforming: false,
            googArrayGeometry: false,
          }
        },
        video: false // We only want audio
      };
      
      // Get the system audio stream
      this.systemStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!this.systemStream || this.systemStream.getAudioTracks().length === 0) {
        throw new Error('Failed to capture system audio - no audio tracks available');
      }
      
      console.log('✅ System audio stream obtained');
      console.log('🔊 System audio tracks:', this.systemStream.getAudioTracks().length);
      
      // Create audio context for processing
      this.audioContext = new (global.AudioContext || global.webkitAudioContext)({
        sampleRate: 16000 // Deepgram prefers 16kHz
      });
      
      // Create system audio source
      this.systemAudioSource = this.audioContext.createMediaStreamSource(this.systemStream);
      console.log('✅ System audio source node created');
      
      // Create audio processor
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 2, 1);
      
      // Set up audio processing
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
        
        // Calculate volume level
        let sum = 0;
        for (let i = 0; i < monoData.length; i++) {
          sum += monoData[i] * monoData[i];
        }
        const volume = Math.sqrt(sum / monoData.length);
        
        // Convert to Int16Array for Deepgram
        const int16Buffer = this.convertFloat32ToInt16(monoData);
        
        // Log progress
        packetCount++;
        if (packetCount % 50 === 0) {
          console.log(`🔊 System audio packet ${packetCount}, volume: ${volume.toFixed(4)}`);
          
          if (volume > 0.001) {
            console.log('🎵 SYSTEM AUDIO DETECTED! Sending to Deepgram...');
          }
        }
        
        // Send to Deepgram
        if (this.deepgramService && volume > 0.0001) { // Only send if there's actual audio
          this.deepgramService.sendAudioData(int16Buffer.buffer);
        }
      };
      
      // Connect audio nodes
      this.systemAudioSource.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isCapturing = true;
      console.log('✅ Windows system audio capture started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start Windows system audio capture:', error);
      console.error('💡 Make sure to grant screen recording permissions when prompted');
      this.cleanup();
      return false;
    }
  }

  stopSystemAudioCapture() {
    console.log('🛑 Stopping Windows system audio capture...');
    this.isCapturing = false;
    this.cleanup();
  }

  cleanup() {
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

  convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }
}

module.exports = WindowsAudioCapture;