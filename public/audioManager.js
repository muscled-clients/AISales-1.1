const logger = require('./logger');
const { desktopCapturer } = require('electron');

class AudioManager {
  constructor() {
    this.audioContext = null;
    this.microphoneStream = null;
    this.systemAudioStream = null;
    this.mixedStream = null;
    this.audioSources = [];
    this.selectedMicrophone = null;
    this.selectedSystemAudio = null;
    this.captureMode = 'microphone'; // 'microphone', 'system', 'both'
  }

  async getAudioSources() {
    try {
      const sources = await desktopCapturer.getSources({ 
        types: ['screen', 'window'] 
      });
      
      // Filter for audio-capable sources
      this.audioSources = sources.filter(source => {
        // Include screens and applications that typically have audio
        return source.name.includes('Entire Screen') || 
               source.name.toLowerCase().includes('zoom') ||
               source.name.toLowerCase().includes('teams') ||
               source.name.toLowerCase().includes('skype') ||
               source.name.toLowerCase().includes('discord') ||
               source.name.toLowerCase().includes('slack') ||
               source.name.toLowerCase().includes('meet') ||
               source.name.toLowerCase().includes('webex') ||
               source.name.toLowerCase().includes('chrome') ||
               source.name.toLowerCase().includes('firefox') ||
               source.name.toLowerCase().includes('safari') ||
               source.name.toLowerCase().includes('browser');
      });

      logger.debug('🎙️ Available audio sources:', this.audioSources.map(s => s.name));
      return this.audioSources;
    } catch (error) {
      logger.error('❌ Failed to get audio sources:', error);
      return [];
    }
  }

  async getMicrophoneDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      logger.debug('🎤 Available microphones:', microphones.map(m => m.label));
      return microphones;
    } catch (error) {
      logger.error('❌ Failed to get microphone devices:', error);
      return [];
    }
  }

  async startCapture(mode = 'microphone', options = {}) {
    this.captureMode = mode;
    logger.debug(`🎙️ Starting audio capture in mode: ${mode}`);

    try {
      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      let streams = [];

      // Capture microphone if needed
      if (mode === 'microphone' || mode === 'both') {
        const micStream = await this.captureMicrophone(options.microphoneId);
        if (micStream) {
          streams.push(micStream);
          this.microphoneStream = micStream;
        }
      }

      // Capture system audio if needed
      if (mode === 'system' || mode === 'both') {
        const systemStream = await this.captureSystemAudio(options.systemSourceId);
        if (systemStream) {
          streams.push(systemStream);
          this.systemAudioStream = systemStream;
        }
      }

      if (streams.length === 0) {
        throw new Error('No audio streams available');
      }

      // Mix audio streams if multiple sources
      if (streams.length === 1) {
        this.mixedStream = streams[0];
      } else {
        this.mixedStream = await this.mixAudioStreams(streams);
      }

      return this.mixedStream;
    } catch (error) {
      logger.error('❌ Failed to start audio capture:', error);
      throw error;
    }
  }

  async captureMicrophone(deviceId) {
    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.debug('✅ Microphone captured successfully');
      return stream;
    } catch (error) {
      logger.error('❌ Failed to capture microphone:', error);
      return null;
    }
  }

  async captureSystemAudio(sourceId) {
    try {
      if (!sourceId) {
        // Try to capture entire screen audio
        const sources = await this.getAudioSources();
        const screenSource = sources.find(s => s.name.includes('Entire Screen'));
        sourceId = screenSource?.id;
      }

      if (!sourceId) {
        logger.warn('⚠️ No system audio source selected');
        return null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        },
        video: false
      });

      logger.debug('✅ System audio captured successfully');
      return stream;
    } catch (error) {
      logger.error('❌ Failed to capture system audio:', error);
      logger.error('💡 Make sure to allow screen recording permission');
      return null;
    }
  }

  async mixAudioStreams(streams) {
    try {
      // Create a mixer that combines multiple audio streams
      const mixer = this.audioContext.createGain();
      mixer.gain.value = 1.0;

      streams.forEach(stream => {
        const source = this.audioContext.createMediaStreamSource(stream);
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.5; // Reduce volume to prevent clipping
        
        source.connect(gain);
        gain.connect(mixer);
      });

      // Create output stream
      const destination = this.audioContext.createMediaStreamDestination();
      mixer.connect(destination);

      logger.debug('✅ Audio streams mixed successfully');
      return destination.stream;
    } catch (error) {
      logger.error('❌ Failed to mix audio streams:', error);
      throw error;
    }
  }

  processAudioForDeepgram(stream, callback) {
    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for Deepgram
        const int16Buffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        callback(int16Buffer.buffer);
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      logger.debug('✅ Audio processing setup for Deepgram');
      return processor;
    } catch (error) {
      logger.error('❌ Failed to setup audio processing:', error);
      throw error;
    }
  }

  stopCapture() {
    logger.debug('🛑 Stopping audio capture');
    
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    if (this.systemAudioStream) {
      this.systemAudioStream.getTracks().forEach(track => track.stop());
      this.systemAudioStream = null;
    }
    
    if (this.mixedStream) {
      this.mixedStream.getTracks().forEach(track => track.stop());
      this.mixedStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    logger.debug('✅ Audio capture stopped');
  }

  // Get available capture modes based on permissions
  async getAvailableModes() {
    const modes = [];
    
    try {
      // Test microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(track => track.stop());
      modes.push({ id: 'microphone', name: 'Microphone Only', icon: '🎤' });
    } catch (error) {
      logger.warn('⚠️ Microphone not available');
    }
    
    try {
      // Test system audio access (requires screen capture permission)
      const sources = await this.getAudioSources();
      if (sources.length > 0) {
        modes.push({ id: 'system', name: 'System Audio Only', icon: '🔊' });
        if (modes.length > 1) {
          modes.push({ id: 'both', name: 'Microphone + System Audio', icon: '🎙️🔊' });
        }
      }
    } catch (error) {
      logger.warn('⚠️ System audio not available');
    }
    
    return modes;
  }
}

module.exports = AudioManager;