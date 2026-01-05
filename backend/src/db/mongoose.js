import mongoose from 'mongoose';
import logger from '../logger.js';

async function connectMongoose() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/vouchers';
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => logger.info({ uri }, 'Mongo connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'Mongo connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('Mongo disconnected'));

  await mongoose.connect(uri, { maxPoolSize: 10 });
  return mongoose.connection;
}

export { connectMongoose };
