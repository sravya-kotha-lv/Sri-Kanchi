const logsEnabled = process.env.LOGS_ENABLED !== 'false';

const logger = {
  log: (...args) => {
    if (logsEnabled) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (logsEnabled) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (logsEnabled) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (logsEnabled) {
      console.info(...args);
    }
  },
};

module.exports = logger;
