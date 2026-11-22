import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from './config/db.js';
import { config } from './config/env.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  AEROMARINE MARITIME BACKEND SERVER IS RUNNING     `);
    console.log(`  Environment: ${config.env.toUpperCase()} | Mode: ${config.appMode}`);
    console.log(`  Listening on: http://0.0.0.0:${config.port}`);
    console.log(`  Client Origin: ${config.clientUrl}`);
    console.log(`====================================================`);
  });

  const handleShutdown = async (signal) => {
    console.log(`[AeroMarine] Received ${signal}. Gracefully shutting down...`);
    try {
      await mongoose.connection.close();
      console.log('[AeroMarine] MongoDB connection closed.');
    } catch (e) {
      console.error('[AeroMarine] Error closing MongoDB connection:', e);
    }
    server.close(() => {
      console.log('[AeroMarine] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();
