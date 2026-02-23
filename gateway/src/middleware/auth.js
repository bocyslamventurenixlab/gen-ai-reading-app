// Authentication middleware using Supabase JWT
import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For development/testing, allow requests without auth token
    if (process.env.NODE_ENV === 'development' && !authHeader) {
      logger.debug('Auth', 'Development mode: allowing unauthenticated request');
      req.user = { id: 'dev-user', email: 'dev@example.com' };
      return next();
    }

    if (!authHeader) {
      logger.error('Auth', 'Missing authorization header');
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      logger.error('Auth', 'Invalid token', error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = data.user;
    logger.debug('Auth', `Authenticated user: ${data.user.email}`);
    next();
  } catch (err) {
    logger.error('Auth', 'Authentication error', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabase.auth.getUser(token);
    
    if (data?.user) {
      req.user = data.user;
    }
    next();
  } catch (err) {
    logger.debug('Auth', 'Optional auth failed, continuing');
    req.user = null;
    next();
  }
};
