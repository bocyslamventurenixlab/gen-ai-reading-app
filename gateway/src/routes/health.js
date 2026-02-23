// Health check routes
import express from 'express';
import backendClient from '../services/pythonBackendClient.js';
import logger from '../middleware/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const backendHealthy = await backendClient.healthCheck();
    
    res.json({
      status: 'healthy',
      service: 'gateway',
      backend: backendHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Health', 'Health check error', err);
    res.status(503).json({
      status: 'unhealthy',
      error: err.message
    });  }
});

export default router;