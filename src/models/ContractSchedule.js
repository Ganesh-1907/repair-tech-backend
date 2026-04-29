import mongoose from 'mongoose';

const contractScheduleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    contractId: { type: String, required: true },
    amcId: String, // legacy/compatibility
    cmcId: String, // legacy/compatibility
    customerId: String,
    customerName: String,
    location: String,
    visitNo: Number,
    date: Date,
    scheduledDate: Date,
    technicianId: String,
    tech: String, // legacy/compatibility
    technician: String, // legacy/compatibility
    status: { type: String, default: 'Scheduled' },
    notes: String,
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contractScheduleSchema.index({ contractId: 1 });
contractScheduleSchema.index({ date: 1 });
contractScheduleSchema.index({ technicianId: 1 });

export const ContractSchedule = mongoose.model('ContractSchedule', contractScheduleSchema);
