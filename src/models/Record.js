import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema(
  {
    bucket: { type: String, required: true, index: true },
    recordId: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

recordSchema.index({ bucket: 1, recordId: 1 }, { unique: true });

export const Record = mongoose.model('Record', recordSchema);
