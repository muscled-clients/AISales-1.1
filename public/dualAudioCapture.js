const { desktopCapturer } = require('electron');

class DualAudioCapture {
  constructor(deepgramService) {
    this.deepgramService = deepgramService;
    this.micStream = null;
    this.systemStream = null;
    this.audioContext = null;
    this.isCapturing = false;
  }

  async startCapture(mode = 'both') {
    if (this.isCapturing) {
      console.log('⚠️ Capture already in progress');
      return false;
    }

    try {
      console.log(`🎤 Starting dual audio capture in ${mode} mode...`);
      
      // For microphone-only mode, just capture mic
      if (mode === 'microphone') {
        return await this.startMicrophoneCapture();
      }
      
      // For system or both modes, we need screen/window capture
      if (mode === 'system' || mode === 'both') {
        // Get audio sources from screen capture
        const sources = await desktopCapturer.getSources({ 
          types: ['screen', 'window'],
          fetchWindowIcons: false 
        });
        
        if (!sources || sources.length === 0) {
          console.error('❌ No audio sources available');
          return false;
        }
        
        // Use the entire screen as default source
        const source = sources.find(s => s.name === 'Entire screen') || sources[0];
        console.log(`🔊 Using audio source: ${source.name}`);
        
        // For both mode, also start microphone capture
        if (mode === 'both') {
          await this.startMicrophoneCapture();
        }
        
        // Note: System audio capture requires special handling in Electron
        // For now, we'll rely on microphone to capture both sides of conversation
        console.log('ℹ️ System audio capture requires screen recording permissions');
        console.log('💡 Make sure to grant screen recording access for full audio capture');
      }
      
      this.isCapturing = true;
      console.log('✅ Audio capture started');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start dual audio capture:', error);
      this.stopCapture();
      return false;
    }
  }
  
  async startMicrophoneCapture() {
    try {
      console.log('🎤 Starting microphone capture...');
      
      // In Electron main process, we don't have direct access to getUserMedia
      // Audio should be captured in the renderer process and sent via IPC
      // For now, we'll just ensure the WebSocket is ready
      
      // Note: Real audio data should be sent from renderer process
      console.log('ℹ️ Microphone capture ready, waiting for audio data from renderer...');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start microphone capture:', error);
      return false;
    }
  }
  
  stopCapture() {
    console.log('🛑 Stopping dual audio capture...');
    this.isCapturing = false;
    console.log('✅ Audio capture stopped');
  }
  
  sendAudioData(audioData) {
    if (!this.isCapturing) return;
    
    if (this.deepgramService) {
      this.deepgramService.sendAudioData(audioData);
    }
  }
}

module.exports = DualAudioCapture;