const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
  createForm,
  listForms,
  getForm,
  getPublicForm,
  updateForm,
  deleteForm,
  createSubmission,
  listSubmissions,
  getSubmission,
  deleteSubmission,
} = require('../controllers/formController');

const router = express.Router();
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions from this address. Try again later.' },
});

router.route('/').post(requireAdmin, createForm).get(requireAdmin, listForms);
router.route('/:id/submissions').post(publicSubmissionLimiter, createSubmission).get(requireAdmin, listSubmissions);
router.route('/:id/submissions/:submissionId').get(requireAdmin, getSubmission).delete(requireAdmin, deleteSubmission);
router.get('/admin/:id', requireAdmin, getForm);
router.route('/:id').get(getPublicForm).put(requireAdmin, updateForm).delete(requireAdmin, deleteForm);

module.exports = router;
