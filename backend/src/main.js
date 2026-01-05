import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectMongoose } from './db/mongoose.js';
import logger from './logger.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await connectMongoose();

  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Backend listening');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start backend');
  process.exit(1);
});
