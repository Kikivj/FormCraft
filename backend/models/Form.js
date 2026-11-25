const mongoose = require('mongoose');

const supportedFieldTypes = [
  'TEXT',
  'EMAIL',
  'NUMBER',
  'PHONE',
  'TEXTAREA',
  'DATE',
  'SELECT',
  'RADIO',
  'CHECKBOX',
];

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: supportedFieldTypes },
    placeholder: { type: String, trim: true, default: '' },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: undefined },
    required: { type: Boolean, default: false },
    options: { type: [mongoose.Schema.Types.Mixed], default: [] },
    minLength: { type: Number, min: 0 },
    maxLength: { type: Number, min: 0 },
    min: { type: Number },
    max: { type: Number },
  },
  { _id: false },
);

const formSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    fields: {
      type: [fieldSchema],
      default: [],
      validate: {
        validator(fields) {
          const keys = fields.map((field) => field.key);
          return new Set(keys).size === keys.length;
        },
        message: 'Field keys must be unique within a form.',
      },
    },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  },
  { timestamps: true },
);

formSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Form', formSchema);
module.exports.supportedFieldTypes = supportedFieldTypes;
