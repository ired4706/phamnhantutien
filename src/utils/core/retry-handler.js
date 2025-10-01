const Logger = require('../core/logger');

class RetryHandler {
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async executeWithRetry(operation, maxRetries = 3, delayMs = 300) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        Logger.warn('Operation failed, retrying...', { attempt, error: error?.message });
        if (attempt >= maxRetries) {
          throw error;
        }
        const backoff = delayMs * Math.pow(2, attempt - 1);
        await this.wait(backoff);
      }
    }
  }
}

module.exports = RetryHandler;


