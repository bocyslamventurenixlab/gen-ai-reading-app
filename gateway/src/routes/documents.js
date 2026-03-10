// Document routes - handles PDF uploads
import express from 'express';
import Busboy from 'busboy';
import FormData from 'form-data';
import http from 'http';
import logger from '../middleware/logger.js';
import { verifyAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload', verifyAuth, (req, res) => {
  try {
    const userId = req.user?.id;
    logger.info('Documents', `Upload request from user: ${userId}`);
    
    const bb = Busboy({ headers: req.headers });
    const files = {};
    const fields = {};
    
    bb.on('file', (fieldname, file, info) => {
      logger.debug('Documents', `Parsing file field: ${fieldname}, filename: ${info.filename}`);
      const chunks = [];
      
      file.on('data', (data) => {
        chunks.push(data);
      });
      
      file.on('end', () => {
        files[fieldname] = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType
        };
        logger.debug('Documents', `Received file: ${info.filename} (${chunks.length} chunks)`);
      });
    });
    
    bb.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });
    
    bb.on('close', () => {
      logger.debug('Documents', 'Multipart parsing complete, forwarding to backend');
      
      // Reconstruct multipart and send to backend
      const form = new FormData();
      
      Object.entries(files).forEach(([fieldname, file]) => {
        form.append(fieldname, file.buffer, {
          filename: file.filename,
          contentType: file.mimetype
        });
      });
      
      Object.entries(fields).forEach(([fieldname, value]) => {
        form.append(fieldname, value);
      });
      
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
      const backendURL = new URL(`${BACKEND_URL}/upload`);
      
      const options = {
        hostname: backendURL.hostname,
        port: backendURL.port || 8000,
        path: backendURL.pathname,
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'X-User-ID': userId  // Pass user ID to backend for RLS enforcement
        }
      };
      
      logger.debug('Documents', `Forwarding to ${backendURL.toString()}`);
      
      const backendReq = http.request(options, (backendRes) => {
        logger.debug('Documents', `Backend responded with ${backendRes.statusCode}`);
        
        let body = '';
        backendRes.on('data', chunk => {
          body += chunk;
        });
        
        backendRes.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (backendRes.statusCode === 200 || backendRes.statusCode === 201) {
              logger.info('Documents', 'Upload successful');
              return res.status(200).json(data);
            } else {
              logger.error('Documents', `Backend error: ${backendRes.statusCode} - ${body}`);
              return res.status(backendRes.statusCode).json(JSON.parse(body));
            }
          } catch (e) {
            logger.error('Documents', `Failed to parse backend response: ${body}`);
            res.status(500).json({ error: 'Invalid response from backend', raw: body });
          }
        });
      });
      
      backendReq.on('error', (err) => {
        logger.error('Documents', 'Backend connection error', err);
        res.status(503).json({ error: 'Cannot reach backend' });
      });
      
      form.pipe(backendReq);
    });
    
    req.pipe(bb);
  } catch (err) {
    logger.error('Documents', 'Upload handler error', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/scrape', verifyAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { url } = req.body;
    logger.info('Documents', `Scrape request from user: ${userId} for URL: ${url}`);

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${BACKEND_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error('Documents', `Scrape backend error: ${response.status}`);
      return res.status(response.status).json(data);
    }

    logger.info('Documents', `Scrape successful, doc_id: ${data.document_id}`);
    return res.status(200).json(data);
  } catch (err) {
    logger.error('Documents', 'Scrape handler error', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', verifyAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    logger.info('Documents', `Fetching documents for user: ${userId}`);
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${BACKEND_URL}/documents`, {
      method: 'GET',
      headers: {
        'X-User-ID': userId  // Pass user ID to backend for RLS enforcement
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    logger.error('Documents', 'Error fetching documents', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
