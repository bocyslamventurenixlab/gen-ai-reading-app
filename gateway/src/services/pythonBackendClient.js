// Python Backend Client for gateway
import logger from '../middleware/logger.js';
import FormData from 'form-data';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const backendClient = {
  async uploadFile(fileBuffer, filename) {
    try {
      logger.info('Backend', `Uploading file: ${filename} (size: ${fileBuffer.length} bytes)`);
      
      // Create FormData instance
      const form = new FormData();
      
      // Append as a stream-like object with metadata
      form.append('file', fileBuffer, filename);
      
      logger.debug('Backend', `Headers: ${JSON.stringify(form.getHeaders())}`);
      
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });
      
      logger.debug('Backend', `Upload response status: ${response.status}`);
      
      if (!response.ok) {
        const text = await response.text();
        logger.error('Backend', `Upload failed: ${text}`);
        throw new Error(`Backend error: ${response.status} - ${text}`);
      }
      
      return await response.json();
    } catch (err) {
      logger.error('Backend', 'Upload failed', err);
      throw err;
    }
  },

  async processQuery(documentId, query, userId) {
    try {
      logger.info('Backend', `Processing query for doc_id: ${documentId}, user: ${userId}`);
      
      const response = await fetch(`${BACKEND_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId  // Pass user ID to backend for RLS enforcement
        },
        body: JSON.stringify({
          document_id: documentId,
          query: query
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      logger.error('Backend', 'Query processing failed', err);
      throw err;
    }
  },

  async getDocuments() {
    try {
      logger.info('Backend', 'Fetching documents');
      const response = await fetch(`${BACKEND_URL}/documents`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (err) {
      logger.error('Backend', 'Failed to fetch documents', err);
      throw err;
    }
  },

  async healthCheck() {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET'
      });
      return response.ok;
    } catch (err) {
      logger.error('Backend', 'Health check failed', err);
      return false;
    }
  }
};

export default backendClient;
