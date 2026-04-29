import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    alertType: String,
    customerName: String,
    assetId: String,
    usage: Number,
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    suggestedAction: String,
    status: { type: String, default: 'New' },
    dueDate: Date,
    expiry: Date, // amcRenewals specific
    value: Number, // amcRenewals specific
    risk: String, // amcRenewals specific
    customer: String, // amcRenewals specific
  },
  { timestamps: true }
);

alertSchema.index({ alertType: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ severity: 1 });

export const Alert = mongoose.model('Alert', alertSchema);
