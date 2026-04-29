import mongoose from 'mongoose';

const amcDetailsSchema = new mongoose.Schema({
  planName: String,
  amcType: { type: String, enum: ['Comprehensive', 'Non-Comprehensive'] },
  visitsDone: { type: Number, default: 0 },
  visitsTotal: mongoose.Schema.Types.Mixed, // Can be number or "Unlimited"
  devicesCount: { type: Number, default: 0 },
  locationsCount: { type: Number, default: 0 },
  contactPerson: String,
  contactPhone: String,
  gst: String,
  revenue: Number,
  cost: Number,
});

const cmcDetailsSchema = new mongoose.Schema({
  planName: String,
  devicesCount: { type: Number, default: 0 },
  revenue: Number,
  cost: Number,
  profit: Number,
  contactPerson: String,
  gst: String,
});

const rentalDetailsSchema = new mongoose.Schema({
  agreementType: { type: String, enum: ['Corporate', 'Individual'] },
  monthlyRent: Number,
  noticePeriod: Number, // in days
});

const contractSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    contractNo: { type: String, unique: true, sparse: true },
    contractType: { type: String, enum: ['AMC', 'CMC', 'Rental'], required: true },
    customerId: { type: String, required: true },
    customerName: String, // Denormalized for convenience
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    expiryDate: Date, // Some seed data uses expiryDate instead of endDate
    status: { type: String, default: 'Active' },
    billingCycle: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], default: 'Yearly' },
    contractValue: Number,
    revenue: Number, // Common for AMC/CMC
    cost: Number, // Common for AMC/CMC
    createdBy: String,
    approvedBy: String,
    amcDetails: amcDetailsSchema,
    cmcDetails: cmcDetailsSchema,
    rentalDetails: rentalDetailsSchema,
  },
  { timestamps: true }
);

contractSchema.index({ contractType: 1, status: 1 });
contractSchema.index({ customerId: 1 });
contractSchema.index({ endDate: 1 });

export const Contract = mongoose.model('Contract', contractSchema);
