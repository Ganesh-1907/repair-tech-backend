import mongoose from 'mongoose';

export const connectDb = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/repairboy';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    family: 4,
  });
  console.log(`Database connected`);
};
