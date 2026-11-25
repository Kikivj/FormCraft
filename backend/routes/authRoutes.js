const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerInitialAdmin, login, logout, currentAdmin } = require('../controllers/authController');
const { requireAdmin } = require('../middleware/requireAdmin');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Try again later.' },
});

const router = express.Router();
router.post('/register', registrationLimiter, registerInitialAdmin);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAdmin, currentAdmin);

module.exports = router;
