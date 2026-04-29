import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Staff } from './src/models/Staff.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const staff = await Staff.find({ name: /Ganesh/i });
  console.log('Found staff:', staff.length);
  console.log(JSON.stringify(staff, null, 2));
  await mongoose.disconnect();
}

check().catch(console.error);
