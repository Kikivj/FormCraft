const mongoose = require('mongoose');
const Form = require('../models/Form');
const Submission = require('../models/Submission');
const { validateFormPayload } = require('../utils/formValidation');
const { validateSubmission } = require('../utils/submissionValidation');

function sendValidationErrors(res, errors) {
  return res.status(400).json({ success: false, errors });
}

function validateId(id) {
  return mongoose.isValidObjectId(id);
}

async function createForm(req, res) {
  const errors = validateFormPayload(req.body);
  if (errors.length) return sendValidationErrors(res, errors);

  const form = await Form.create(req.body);
  return res.status(201).json({ success: true, form });
}

async function listForms(_req, res) {
  const forms = await Form.find().sort({ updatedAt: -1, _id: -1 }).lean();
  return res.status(200).json({ success: true, forms });
}

async function getForm(req, res) {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid form id.' });
  }

  const form = await Form.findById(req.params.id).lean();
  if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });
  return res.status(200).json({ success: true, form });
}

async function getPublicForm(req, res) {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid form id.' });
  }

  const form = await Form.findOne({ _id: req.params.id, status: 'published' }).lean();
  if (!form) return res.status(404).json({ success: false, message: 'Published form not found.' });
  return res.status(200).json({ success: true, form });
}

async function updateForm(req, res) {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid form id.' });
  }

  const errors = validateFormPayload(req.body, { partial: true });
  if (errors.length) return sendValidationErrors(res, errors);

  const form = await Form.findById(req.params.id);
  if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });

  for (const property of ['name', 'description', 'fields', 'status']) {
    if (Object.hasOwn(req.body, property)) form.set(property, req.body[property]);
  }
  await form.save();
  return res.status(200).json({ success: true, form });
}

async function deleteForm(req, res) {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid form id.' });
  }

  const form = await Form.findByIdAndDelete(req.params.id);
  if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });
  return res.status(200).json({ success: true, message: 'Form deleted successfully.' });
}

async function createSubmission(req, res) {
  if (!validateId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid form id.' });
  }

  const form = await Form.findById(req.params.id).lean();
  if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });
  if (form.status !== 'published') {
    return res.status(403).json({ success: false, message: 'Submissions are only accepted for published forms.' });
  }

  const validation = validateSubmission(form, req.body);
  if (validation.errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the submitted answers.',
      errors: validation.errors,
      fieldErrors: validation.fieldErrors,
    });
  }

  const submission = await Submission.create({ formId: form._id, responses: validation.responses });
  return res.status(201).json({
    success: true,
    message: 'Submission saved successfully.',
    submission: { id: submission._id, formId: submission.formId, submittedAt: submission.submittedAt },
  });
}

function positiveQueryInteger(value, fallback, name, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return { value: fallback };
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return { error: `${name} must be a positive integer.` };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    return { error: `${name} must be between 1 and ${max}.` };
  }
  return { value: parsed };
}

async function listSubmissions(req, res) {
  const formId = req.params.id;
  if (!validateId(formId)) return res.status(400).json({ success: false, message: 'Invalid form id.' });
  const form = await Form.findById(formId).select('name').lean();
  if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });

  const pageResult = positiveQueryInteger(req.query.page, 1, 'page');
  const limitResult = positiveQueryInteger(req.query.limit, 10, 'limit', 100);
  if (pageResult.error || limitResult.error) {
    return res.status(400).json({ success: false, message: pageResult.error || limitResult.error });
  }

  const { value: page } = pageResult;
  const { value: limit } = limitResult;
  const filter = { formId };
  const total = await Submission.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const submissions = page > totalPages ? [] : await Submission.find(filter)
    .select('_id formId responses submittedAt createdAt updatedAt')
    .sort({ submittedAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return res.status(200).json({
    success: true,
    form: { id: String(formId), name: form.name },
    total,
    page,
    limit,
    totalPages,
    submissions,
  });
}

async function getSubmission(req, res) {
  const { id: formId, submissionId } = req.params;
  if (!validateId(formId) || !validateId(submissionId)) {
    return res.status(400).json({ success: false, message: 'Invalid form or submission id.' });
  }
  if (!(await Form.exists({ _id: formId }))) return res.status(404).json({ success: false, message: 'Form not found.' });

  const submission = await Submission.findOne({ _id: submissionId, formId })
    .select('_id formId responses submittedAt createdAt updatedAt')
    .lean();
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found for this form.' });
  return res.status(200).json({ success: true, submission });
}

async function deleteSubmission(req, res) {
  const { id: formId, submissionId } = req.params;
  if (!validateId(formId) || !validateId(submissionId)) {
    return res.status(400).json({ success: false, message: 'Invalid form or submission id.' });
  }
  if (!(await Form.exists({ _id: formId }))) return res.status(404).json({ success: false, message: 'Form not found.' });

  const submission = await Submission.findOneAndDelete({ _id: submissionId, formId }).select('_id').lean();
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found for this form.' });
  return res.status(200).json({ success: true, message: 'Submission deleted successfully.', id: String(submission._id) });
}

module.exports = { createForm, listForms, getForm, getPublicForm, updateForm, deleteForm, createSubmission, listSubmissions, getSubmission, deleteSubmission };
