import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import fs from 'fs';
import path from 'path';

async function bootstrap(): Promise<void> {
  // Ensure upload directories exist
  const uploadDirs = [
    env.UPLOAD_DIR,
    `${env.UPLOAD_DIR}/invoices`,
    `${env.UPLOAD_DIR}/assets`,
    `${env.UPLOAD_DIR}/amc`,
    `${env.UPLOAD_DIR}/maintenance`,
    `${env.UPLOAD_DIR}/purchases`,
    `${env.UPLOAD_DIR}/general`,
  ];

  uploadDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Connect to database
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║     IT Operations Manager — Backend API Server    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`  Environment  : ${env.NODE_ENV}`);
    console.log(`  Server URL   : http://localhost:${env.PORT}`);
    console.log(`  API Base     : http://localhost:${env.PORT}/api/v1`);
    console.log(`  Health Check : http://localhost:${env.PORT}/health`);
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n[SIGTERM] Shutting down gracefully...');
    server.close(async () => {
      await disconnectDatabase();
      console.log('[SIGTERM] Server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('\n[SIGINT] Shutting down gracefully...');
    server.close(async () => {
      await disconnectDatabase();
      console.log('[SIGINT] Server closed.');
      process.exit(0);
    });
  });
}

bootstrap().catch((error) => {
  console.error('[FATAL] Failed to start server:', error);
  process.exit(1);
});
