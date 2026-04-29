import mongoose from 'mongoose';

const contractDeviceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    contractId: { type: String, required: true },
    amcId: String, // legacy/compatibility
    assetId: String,
    customerId: String,
    customerName: String,
    deviceType: String,
    type: String, // legacy/compatibility
    model: String,
    serialNumber: String,
    serial: String, // legacy/compatibility
    status: { type: String, default: 'Healthy' },
    lastService: Date,
    nextService: Date,
    location: String,
    coverage: String, // CMC specific
  },
  { timestamps: true }
);

contractDeviceSchema.index({ contractId: 1 });
contractDeviceSchema.index({ assetId: 1 });
contractDeviceSchema.index({ serialNumber: 1 });

export const ContractDevice = mongoose.model('ContractDevice', contractDeviceSchema);
