const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
    },
    responses: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value) {
          return value !== null && typeof value === 'object' && !Array.isArray(value);
        },
        message: 'Responses must be an object containing submitted answers.',
      },
    },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false, timestamps: true },
);

submissionSchema.index({ formId: 1, submittedAt: -1, _id: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
