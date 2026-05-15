import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: String,
    phone: String,
    email: { type: String, unique: true, sparse: true },
    role: { type: String, default: 'Staff' },
    department: String,
    departmentSkill: String,
    designation: String,
    salary: String,
    joiningDate: String,
    jobType: { type: String, default: 'Full time' },
    address: String,
    aadhaarAddress: String,
    status: { type: String, default: 'Active' },
    attendanceStatus: String,
    assignedJobs: { type: Number, default: 0 },
    lastSeen: Date,
    notes: String,
    attachedDocuments: { type: Array, default: [] },
  },
  { timestamps: true }
);

staffSchema.index({ name: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ role: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
