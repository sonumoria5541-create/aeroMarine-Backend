import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Managed per deployment domain
  })
);

// CORS Whitelist — Strict enforcement to prevent cross-origin credential theft
const allowedOrigins = [
  'https://aeromarine.site',
  'https://www.aeromarine.site',
  'https://api.aeromarine.site',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.clientUrl,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[Security Warning] Blocked CORS request from unauthorized origin: ${origin}`);
        callback(new Error('CORS Not Allowed: Origin is not authorized'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploads statically
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Comprehensive Health & Readiness Check Endpoint
const handleHealthCheck = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'healthy' : 'unhealthy',
    service: 'AeroMarine Maritime Backend',
    version: '1.0.0',
    environment: config.env,
    appMode: config.appMode,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStates[mongoose.connection.readyState] || 'unknown',
      readyState: mongoose.connection.readyState,
    },
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

// API routes mounted at multiple entrypoints for maximum client compatibility
app.use('/api', apiRoutes);
app.use('/api/v1', apiRoutes);
app.use('/system', apiRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'failed', message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Production-Safe Error Handler (Never expose stack traces in production)
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS Not Allowed')) {
    return res.status(403).json({ status: 'failed', message: 'Cross-Origin Request Blocked by Security Policy' });
  }

  console.error('[Error caught by global handler]:', err.message || err);
  const status = err.status || 500;
  const response = {
    status: 'failed',
    message: err.message || 'Internal server error occurred',
  };

  if (config.env !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

export default app;
