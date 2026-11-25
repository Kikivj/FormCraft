const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 320 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin'], default: 'admin', required: true },
    // Enforces one initial admin even if bootstrap requests race.
    singleton: { type: String, default: 'formcraft-admin', unique: true, select: false },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model('Admin', adminSchema);
