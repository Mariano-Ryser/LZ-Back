const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  artikelName: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }
});

const saleSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientSnapshot: { type: Object }, // guardar dirección/nombre al momento
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending','paid','cancelled'], default: 'paid' },
  lieferschein: { type: String, unique: true }, // <--- nuevo campo único
  meta: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
