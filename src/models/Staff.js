import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: String,
    email: { type: String, unique: true, sparse: true },
    role: { type: String, default: 'Staff' },
    departmentSkill: String,
    address: String,
    status: { type: String, default: 'Active' },
    attendanceStatus: String,
    assignedJobs: { type: Number, default: 0 },
    lastSeen: Date,
    notes: String,
  },
  { timestamps: true }
);

staffSchema.index({ name: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ role: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
