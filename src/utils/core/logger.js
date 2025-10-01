class Logger {
  static log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const levels = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[35m'
    };

    const color = levels[level] || '';
    const reset = '\x1b[0m';

    try {
      const ctx = Object.keys(context).length ? ` | context=${JSON.stringify(context)}` : '';
      // eslint-disable-next-line no-console
      console.log(`${color}[${level.toUpperCase()}] ${timestamp} - ${message}${ctx}${reset}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`[${level.toUpperCase()}] ${timestamp} - ${message}`);
    }
  }

  static info(message, context = {}) {
    this.log('info', message, context);
  }

  static warn(message, context = {}) {
    this.log('warn', message, context);
  }

  static error(message, context = {}) {
    this.log('error', message, context);
  }

  static debug(message, context = {}) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, context);
    }
  }
}

module.exports = Logger;


