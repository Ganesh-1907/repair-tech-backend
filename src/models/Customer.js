import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  id: String,
  locationName: String,
  address: String,
  contactPerson: String,
  phone: String,
  email: String,
  gstBranch: String,
});

const contactSchema = new mongoose.Schema(
  {
    name: String,
    mobile: String,
    email: String,
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    customerType: { type: String, enum: ['Corporate', 'Individual'], default: 'Individual' },
    companyName: String,
    customerName: { type: String, required: true },
    authorizedPerson1: String,
    authorizedPerson2: String,
    gstNumber: String,
    address: String,
    registeredAddress: String,
    primaryAddress: String,
    contactNumber: String,
    email: String,
    primaryContact: contactSchema,
    secondaryContact: contactSchema,
    billingAddress: String,
    notes: String,
    devices: [mongoose.Schema.Types.Mixed],
    quotation: mongoose.Schema.Types.Mixed,
    status: { type: String, default: 'Active' },
    locations: [locationSchema],
    planId: String,
    planName: String,
    planDetails: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

customerSchema.index({ customerName: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ contactNumber: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
