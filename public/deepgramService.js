const logger = require('./logger');
const WebSocket = require('ws');
const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

class DeepgramService {
  constructor() {
    this.ws = null;
    this.apiKey = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.audioMode = 'microphone'; // 'microphone', 'system', 'both'
  }

  setAudioMode(mode) {
    this.audioMode = mode;
    logger.debug(`🎙️ Audio mode set to: ${mode}`);
  }

  initialize(apiKey) {
    this.apiKey = apiKey;
    logger.debug('🎙️ Deepgram service initialized with key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NO KEY');
  }

  async connect() {
    return new Promise(async (resolve, reject) => {
      if (!this.apiKey) {
        reject(new Error('No Deepgram API key provided'));
        return;
      }

      logger.debug('🔗 Connecting to Deepgram WebSocket...');
      logger.debug('🌐 Network connectivity check: attempting to reach api.deepgram.com');
      
      // Try to resolve DNS first
      try {
        const address = await lookup('api.deepgram.com');
        logger.debug(`✅ DNS resolved api.deepgram.com to ${address.address}`);
      } catch (dnsError) {
        logger.error('❌ DNS resolution failed:', dnsError.message);
        logger.debug('🔄 Attempting with direct WebSocket connection...');
      }
      
      const url = 'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
        model: 'nova-2',
        language: 'en-US',
        punctuate: 'true',
        interim_results: 'true',
        endpointing: '300',  // Increased for better sentence boundaries
        utterance_end_ms: '1000',  // Added for better sentence completion
        vad_events: 'true',  // Voice activity detection
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1'
      }).toString();

      try {
        this.ws = new WebSocket(url, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'audio/raw'
          }
        });

        this.ws.on('open', () => {
          logger.debug('✅ Connected to Deepgram WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.ws.on('message', (data) => {
          try {
            const response = JSON.parse(data.toString());
            
            if (response.channel && response.channel.alternatives && response.channel.alternatives.length > 0) {
              const transcript = response.channel.alternatives[0].transcript;
              const isFinal = response.is_final || false;
              
              if (transcript) {
                logger.debug(`📝 Deepgram transcript: "${transcript}" (final: ${isFinal})`);
                // Send transcript to renderer and overlay
                const transcriptData = {
                  text: transcript,
                  timestamp: new Date(),
                  isInterim: !isFinal,
                  speaker: this.audioMode === 'system' ? 'call' : (this.audioMode === 'both' ? 'mixed' : 'user'),
                  audioSource: this.audioMode
                };
                
                if (global.mainWindow) {
                  global.mainWindow.webContents.send('transcript', transcriptData);
                  logger.debug('✅ Transcript sent to renderer');
                  
                  // Also send to overlay if it exists
                  const { sendToOverlay } = require('./overlayWindow');
                  sendToOverlay('transcript', transcriptData);
                } else {
                  logger.error('❌ mainWindow not available to send transcript');
                }
              }
            }
          } catch (error) {
            logger.error('❌ Error parsing Deepgram response:', error);
          }
        });

        this.ws.on('error', (error) => {
          logger.error('❌ Deepgram WebSocket error:', error.message);
          logger.error('❌ Full error details:', error);
          
          if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            logger.error('🌐 Network connectivity issue detected:');
            logger.error('   - Check internet connection');
            logger.error('   - Try disabling VPN if using one');  
            logger.error('   - Check firewall settings');
            logger.error('   - DNS server might be blocking api.deepgram.com');
          }
          
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          logger.debug(`🔌 Deepgram WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          
          // Only attempt reconnection for certain close codes and if not intentionally disconnected
          if (this.reconnectAttempts < this.maxReconnectAttempts && code !== 1000) {
            this.reconnectAttempts++;
            logger.debug(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            setTimeout(() => {
              if (this.apiKey) { // Only reconnect if we still have an API key
                this.connect().catch(error => {
                  logger.error('❌ Reconnection failed:', error.message);
                });
              }
            }, 2000 * this.reconnectAttempts); // Exponential backoff
          } else {
            logger.debug('🛑 Max reconnection attempts reached or intentional disconnect');
          }
        });

      } catch (error) {
        logger.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  sendAudioData(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(audioData);
    } else {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.01) { // Log ~1% of the time
        logger.warn('⚠️ WebSocket not ready, skipping audio data', {
          wsExists: !!this.ws,
          readyState: this.ws?.readyState,
          isConnected: this.isConnected
        });
      }
    }
  }

  disconnect() {
    logger.debug('🛑 Disconnecting from Deepgram...');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnections
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect'); // Normal closure
      this.ws = null;
    }
    this.isConnected = false;
    logger.debug('✅ Deepgram disconnected');
  }
}

module.exports = DeepgramService;