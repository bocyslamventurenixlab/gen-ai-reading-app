// Main Gateway API Server
import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';

import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { authMiddleware, optionalAuth } from './middleware/auth.js';

import healthRoutes from './routes/health.js';
import documentsRoutes from './routes/documents.js';
import queryRoutes from './routes/query.js';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Request logging
app.use((req, res, next) => {
  logger.info('Gateway', `${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRoutes);

// Documents endpoints - optional auth for now
app.use('/documents', optionalAuth, documentsRoutes);

// Query endpoints - optional auth for now
app.use('/query', optionalAuth, queryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Gateway', `🚀 Gateway Server running on http://0.0.0.0:${PORT}`);
  logger.info('Gateway', `Backend URL: ${process.env.BACKEND_URL || 'http://localhost:8000'}`);
  logger.info('Gateway', `Environment: ${process.env.NODE_ENV || 'development'}`);
});
