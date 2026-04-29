import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { seedDatabase } from './seed.js';
import { seedRecords } from './seedData.js';

const reset = process.argv.includes('--reset');
const demo = process.argv.includes('--demo');

try {
  await connectDb();
  await seedDatabase({ reset, demo });

  const totalRecords = Object.values(seedRecords).reduce((total, rows) => total + rows.length, 0);
  if (demo) {
    console.log(`${reset ? 'Reset and seeded' : 'Seeded'} ${totalRecords} demo module records.`);
  } else {
    console.log(`${reset ? 'Reset and seeded' : 'Seeded'} admin user only. Demo module records were skipped.`);
  }
  console.log('Admin user ready: ganesh.bora@gmail.com / Ganesh@1907');
  await mongoose.connection.close();
  process.exit(0);
} catch (error) {
  console.error('Seed failed:', error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
}
