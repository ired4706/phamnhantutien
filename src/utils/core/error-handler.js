const Logger = require('../core/logger');

class ErrorHandler {
  static handle(error, context = '', severity = 'error') {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack,
      context
    };

    switch (severity) {
      case 'critical':
        Logger.error(`[CRITICAL] ${context}`, payload);
        break;
      case 'warn':
        Logger.warn(`[WARN] ${context}`, payload);
        break;
      default:
        Logger.error(`[ERROR] ${context}`, payload);
    }

    return {
      success: false,
      message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
      details: process.env.NODE_ENV === 'development' ? payload : undefined
    };
  }
}

module.exports = ErrorHandler;


