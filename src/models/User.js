import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    staffId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
