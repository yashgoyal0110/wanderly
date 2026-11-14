import 'dotenv/config';
import mongoose from 'mongoose';
import { seedCosts } from './db.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'trip_planner' });
const n = await seedCosts({ force: true });
console.log(`Seeded ${n} country cost profiles`);
await mongoose.disconnect();
