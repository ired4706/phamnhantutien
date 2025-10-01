const Logger = require('../utils/core/logger');
const ErrorHandler = require('../utils/core/error-handler');

class BaseService {
  constructor() {
    this.logger = Logger;
    this.errorHandler = ErrorHandler;
  }

  async handleError(error, context) {
    return this.errorHandler.handle(error, context);
  }

  log(level, message, context = {}) {
    this.logger.log(level, message, context);
  }

  info(message, context = {}) {
    this.logger.info(message, context);
  }

  warn(message, context = {}) {
    this.logger.warn(message, context);
  }

  error(message, context = {}) {
    this.logger.error(message, context);
  }

  debug(message, context = {}) {
    this.logger.debug(message, context);
  }
}

module.exports = BaseService;
