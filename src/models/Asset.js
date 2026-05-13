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
    serialNumber: { type: String, unique: true, sparse: true, trim: true },
    type: String,
    brand: String,
    model: String,
    subType: String,
    specs: String,
    configuration: String,
    configurations: String, // legacy field from seed
    inputField: String,
    addOnParts: String,
    purchaseDate: Date,
    purchasePrice: Number,
    currentValue: Number,
    status: { type: String, default: 'Available' },
    customerId: String,
    customerName: String,
    customerLocation: String,
    installationDate: String,
    plannedInstallationDate: String,
    technician: String,
    billingFrequency: String,
    billingType: String,
    meterStart: String,
    quantity: Number,
    deviceStatus: String,
    installationRequirements: String,
    accessories: String,
    remarks: String,
    monthlyRent: Number,
    isSerialPending: { type: Boolean, default: false },
    deviceType: String,
    installationStatus: { type: String, default: 'Pending' },
    installationChecklist: {
      deviceVerified: { type: Boolean, default: false },
      serialConfirmed: { type: Boolean, default: false },
      installedAtLocation: { type: Boolean, default: false },
      connectivityChecked: { type: Boolean, default: false },
      customerConfirmed: { type: Boolean, default: false },
    },
    location: String,
    assignedCustomer: String, // Name or ID
    assignedContract: String, // ID
    assignment: String,
    serviceHistory: String,
    usageTracking: String,
    notes: String,
    deviceDetails: mongoose.Schema.Types.Mixed,
    movementHistory: [movementHistorySchema],
    lifecycleLogs: [lifecycleLogSchema],
    qrTag: String,
    barcodeTag: String,
  },
  { timestamps: true }
);

assetSchema.index({ status: 1 });

export const Asset = mongoose.model('Asset', assetSchema);
