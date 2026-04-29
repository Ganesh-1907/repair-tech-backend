import mongoose from 'mongoose';

const maintenanceLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    assetId: String,
    contractId: String,
    customerId: String,
    customerName: String,
    date: { type: Date, required: true },
    issueDescription: String,
    resolutionNotes: String,
    partsUsed: mongoose.Schema.Types.Mixed, // Can be string or array
    partName: String, // CMC specific
    sku: String, // CMC specific
    qty: Number, // CMC specific
    unitCost: Number, // CMC specific
    totalCost: Number, // CMC specific
    covered: Boolean, // CMC specific
    deducted: Boolean, // CMC specific
    status: String,
    technician: String,
  },
  { timestamps: true }
);

maintenanceLogSchema.index({ assetId: 1 });
maintenanceLogSchema.index({ contractId: 1 });
maintenanceLogSchema.index({ date: 1 });

export const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);
