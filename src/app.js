import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { amcRouter } from './modules/amc/amc.routes.js';
import { cmcRouter } from './modules/cmc/cmc.routes.js';
import { authRouter } from './routes/authRoutes.js';
import { crudRouter } from './routes/crudRoutes.js';
import { discountRouter } from './routes/discountRoutes.js';
import { leadsRouter } from './routes/leadsRoutes.js';
import { moduleRouter } from './routes/moduleRoutes.js';

export const app = express();

const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowDevLocalhost = (origin = '') => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls or tools that omit origin.
    if (!origin) return callback(null, true);
    if (configuredOrigins.includes(origin) || allowDevLocalhost(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'repairboy-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/amc', amcRouter);
app.use('/api/cmc', cmcRouter);
app.use('/api/discounts', discountRouter);
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
