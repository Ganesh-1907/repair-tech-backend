import express from 'express';
import multer from 'multer';
import { uploadToR2, getFileUrl, getPresignedFileUrl } from '../services/r2Storage.js';

export const uploadRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|csv|txt)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

uploadRouter.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const result = await uploadToR2(req.file.buffer, req.file.originalname);
    console.log('[Upload] File uploaded to R2:', result.key, result.name);
    res.json(result);
  } catch (error) {
    console.error('[Upload] R2 upload error:', error.message);
    next(error);
  }
});

uploadRouter.post('/files', upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    const results = await Promise.all(
      req.files.map((file) => uploadToR2(file.buffer, file.originalname))
    );
    res.json(results);
  } catch (error) {
    next(error);
  }
});

uploadRouter.get('/view', async (req, res, next) => {
  try {
    const key = req.query.key;
    console.log('[View] Requesting presigned URL for key:', key);
    if (!key) return res.status(400).json({ error: 'No key provided' });
    const url = await getPresignedFileUrl(key);
    if (!url) {
      console.log('[View] No URL generated for key:', key);
      return res.status(404).json({ error: 'File not found' });
    }
    console.log('[View] Redirecting to presigned URL');
    res.redirect(url);
  } catch (error) {
    console.error('[View] Error:', error.message);
    next(error);
  }
});
