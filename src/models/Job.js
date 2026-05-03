import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  id: String,
  action: String,
  at: Date,
  user: String,
  channel: String,
  status: String,
});

const partUsedSchema = new mongoose.Schema({
  id: String,
  name: String,
  quantity: Number,
  unitPrice: Number,
  availableStock: Number,
});

const quoteHistorySchema = new mongoose.Schema({
  version: Number,
  issue: String,
  estimate: Number,
  status: String,
  sentAt: Date,
  channel: String,
});

const jobCloseReportSchema = new mongoose.Schema({
  beforeJobPhoto: String,
  beforeJobPhotoName: String,
  afterJobPhoto: String,
  afterJobPhotoName: String,
  customerSignature: String,
  customerSignatureName: String,
  customerSignatureImage: String,
  customerSignatureImageName: String,
  customerName: String,
  workSummary: String,
  closedAt: Date,
  closedBy: String,
  closedByStaffId: String,
});

const jobSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ticketId: String,
    customerId: String, // Linking to Customer if available, otherwise using name/phone
    customerName: String,
    phoneNumber: String,
    email: String,
    title: String,
    device: String,
    issue: String,
    campaignSource: String,
    campaignId: String,
    deviceType: String,
    deviceModel: String,
    serialNumber: String,
    problem: String,
    problemNotes: String,
    technician: String, // Name or ID
    staffId: String,
    staffName: String,
    assignedTo: String,
    status: String,
    jobStatus: String,
    quoteStatus: String,
    paymentStatus: String,
    deliveryStatus: String,
    expectedDelivery: Date,
    condition: [String],
    accessories: [String],
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    quote: {
      issue: String,
      estimate: Number,
      status: String,
      version: Number,
    },
    quoteHistory: [quoteHistorySchema],
    partsUsed: [partUsedSchema],
    labourCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    delivery: {
      type: { type: String },
      person: String,
      route: String,
      dateTime: Date,
      notes: String,
      status: String,
    },
    closeReport: jobCloseReportSchema,
    activity: [activitySchema],
  },
  { timestamps: true }
);

jobSchema.index({ jobStatus: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ customerName: 1 });
jobSchema.index({ technician: 1 });
jobSchema.index({ staffId: 1 });

export const Job = mongoose.model('Job', jobSchema);
