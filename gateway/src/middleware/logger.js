// Gateway middleware for logging

const logger = {
  info: (component, message) => {
    console.log(`[${new Date().toISOString()}] [${component}] INFO: ${message}`);
  },
  error: (component, message, err) => {
    console.error(`[${new Date().toISOString()}] [${component}] ERROR: ${message}`, err || '');
  },
  debug: (component, message) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[${new Date().toISOString()}] [${component}] DEBUG: ${message}`);
    }
  }
};

export default logger;
