import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import path from 'path';

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID = '7c51803a16f3ad7a943ef98403a0e3cc',
  R2_BUCKET = 'repair-boy',
  R2_PUBLIC_URL = '',
} = process.env;

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const getExtension = (filename) => path.extname(filename || '').toLowerCase();

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

export const uploadToR2 = async (fileBuffer, originalName) => {
  const ext = getExtension(originalName);
  const key = `uploads/${crypto.randomUUID()}${ext}`;
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  console.log('[R2] Uploading:', { key, bucket: R2_BUCKET, size: fileBuffer.length, contentType });

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3.send(command);
  console.log('[R2] Upload success:', key);

  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    : null;

  return {
    key,
    url,
    name: originalName,
    size: fileBuffer.length,
    contentType,
  };
};

export const getFileUrl = (key) => {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
  }
  return null;
};

export const getPresignedFileUrl = async (key) => {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
  }
  try {
    console.log('[R2] Generating presigned URL for key:', key);
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log('[R2] Presigned URL generated');
    return url;
  } catch (e) {
    console.error('[R2] Presigned URL error:', e.message);
    return '';
  }
};
