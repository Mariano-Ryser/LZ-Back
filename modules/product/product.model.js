const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  artikelName: { type: String, required: true },
  lagerPlatz: { type: String },
  artikelNumber: { type: String },
  description: { type: String },
  publicId: { type: String, default: '' },
  imagen: { type: String },
  stock: { type: Number, default: 0 }, // nuevo campo
  price: { type: Number, default: 0 }, // nuevo campo
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
 