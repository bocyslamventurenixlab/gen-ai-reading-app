// Query processing routes
import express from 'express';
import backendClient from '../services/pythonBackendClient.js';
import logger from '../middleware/logger.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/process', verifyAuth, async (req, res) => {
  try {
    const { document_id, query } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!document_id || !query) {
      return res.status(400).json({
        error: 'Missing required fields: document_id and query'
      });
    }

    logger.info('Query', `Processing query for doc_id: ${document_id}, user: ${userId}`);

    // Call backend with user context
    const result = await backendClient.processQuery(document_id, query, userId);

    logger.info('Query', 'Query processed successfully');
    res.json(result);
  } catch (err) {
    logger.error('Query', 'Query processing error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
