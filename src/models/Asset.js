import mongoose from 'mongoose';

const movementHistorySchema = new mongoose.Schema({
  date: Date,
  from: String,
  to: String,
  type: { type: String },
});

const lifecycleLogSchema = new mongoose.Schema({
  date: Date,
  event: String,
  user: String,
});

const assetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    assetTag: { type: String, unique: true, sparse: true },
    serialNumber: { type: String, unique: true, required: true },
    type: String,
    brand: String,
    model: String,
    configuration: String,
    configurations: String, // legacy field from seed
    addOnParts: String,
    purchaseDate: Date,
    purchasePrice: Number,
    currentValue: Number,
    status: { type: String, default: 'Available' },
    location: String,
    assignedCustomer: String, // Name or ID
    assignedContract: String, // ID
    assignment: String,
    serviceHistory: String,
    usageTracking: String,
    notes: String,
    movementHistory: [movementHistorySchema],
    lifecycleLogs: [lifecycleLogSchema],
    qrTag: String,
    barcodeTag: String,
  },
  { timestamps: true }
);

assetSchema.index({ status: 1 });

export const Asset = mongoose.model('Asset', assetSchema);
