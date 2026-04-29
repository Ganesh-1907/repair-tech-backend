import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { authRouter } from './routes/authRoutes.js';
import { crudRouter } from './routes/crudRoutes.js';
import { moduleRouter } from './routes/moduleRoutes.js';

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'repairboy-api' });
});

app.use('/api/auth', authRouter);
app.use('/api', moduleRouter);
app.use('/api/records', crudRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  
  // Handle MongoDB Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({ 
      message: `A record with this ${field} already exists. Please use a unique ${field}.` 
    });
  }

  res.status(error.status || 500).json({ message: error.message || 'Internal server error' });
});
