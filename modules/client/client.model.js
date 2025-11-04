const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false },
  phone: { type: String, required: false },
  address: { type: String, required: false },
  meta: { type: Object, default: {} },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
