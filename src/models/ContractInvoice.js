import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  id: mongoose.Schema.Types.Mixed,
  name: String,
  description: String,
  qty: Number,
  rate: Number,
  amount: Number,
  assetId: String,
});

const contractInvoiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, unique: true, sparse: true },
    contractId: String,
    customerId: String,
    customerName: String,
    customerCompany: String,
    issueDate: Date,
    dueDate: Date,
    billingMonth: String,
    status: { type: String, default: 'Pending' },
    paymentStatus: { type: String, default: 'Unpaid' },
    subtotal: Number,
    gstAmount: Number,
    gst: Number, // legacy/compatibility
    total: Number,
    paidAmount: { type: Number, default: 0 },
    outstanding: { type: Number, default: 0 },
    gstEnabled: Boolean,
    gstOption: String,
    items: [invoiceItemSchema],
    lines: [invoiceItemSchema], // legacy/compatibility for rentalInvoices
    terms: String,
    mode: String,
  },
  { timestamps: true }
);

contractInvoiceSchema.index({ customerId: 1 });
contractInvoiceSchema.index({ status: 1 });
contractInvoiceSchema.index({ issueDate: 1 });

export const ContractInvoice = mongoose.model('ContractInvoice', contractInvoiceSchema);
