// client.model.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vorname: { type: String, required: true },
  email: { 
    type: String, 
    lowercase: true,
    trim: true
  },
  adresse: String,
  phone: String,
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Índice único para email (solo clientes no eliminados)
clientSchema.index({ email: 1 }, { 
  unique: true, 
  partialFilterExpression: { 
    deleted: false,
    email: { $exists: true, $ne: null } 
  } 
});

module.exports = mongoose.model('Client', clientSchema);