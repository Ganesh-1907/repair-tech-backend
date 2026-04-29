import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Sales', 'Service'], default: 'Sales' },
    sku: { type: String, unique: true, sparse: true },
    category: String,
    brand: String,
    model: String,
    supplier: String,
    unit: String,
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    status: { type: String, default: 'Active' },
    isStockDependent: { type: Boolean, default: true },
    usedIn: [String],
  },
  { timestamps: true }
);

inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ category: 1 });

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
