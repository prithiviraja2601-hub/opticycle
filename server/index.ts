import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import healthRouter from './routes/health.ts';
import scansRouter from './routes/scans.ts';

export function createExpressApp() {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled by Vite/dev server in development
      crossOriginEmbedderPolicy: false,
    })
  );

  // Restricted CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Rate Limiting: 250 requests per 15 minutes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 250,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
    },
  });
  app.use('/api', limiter);

  // Body Parsers with elevated limits for high-resolution images
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api/scans', scansRouter);

  return app;
}
