/**
 * Simple logger for Electron main process
 * Only logs in development mode
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    return `[${timestamp}] [${level}] ${message}`;
  }

  debug(message, data) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('DEBUG', message);
      console.log(formattedMessage, data || '');
    }
  }

  info(message, data) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('INFO', message);
      console.log(formattedMessage, data || '');
    }
  }

  warn(message, data) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('WARN', message);
      console.warn(formattedMessage, data || '');
    }
  }

  error(message, data) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('ERROR', message);
      console.error(formattedMessage, data || '');
    }
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;