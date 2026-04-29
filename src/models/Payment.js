import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    invoiceId: { type: String, required: true },
    amount: { type: Number, required: true },
    mode: String,
    paidOn: Date,
    notes: String,
    referenceNumber: String,
  },
  { timestamps: true }
);

paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ paidOn: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
