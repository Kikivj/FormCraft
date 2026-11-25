const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { getJwtSecret, setAdminCookie, clearAdminCookie } = require('../middleware/requireAdmin');

const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.4B8m20T9D7Hf4y3rG4p9N9wX8CkM8fW';

function safeUser(admin) {
  return { id: String(admin._id), email: admin.email, role: admin.role };
}

function signAdmin(admin) {
  return jwt.sign({ role: admin.role }, getJwtSecret(), {
    subject: String(admin._id),
    expiresIn: '1h',
    issuer: 'formcraft',
    audience: 'formcraft-admin',
    algorithm: 'HS256',
  });
}

function sameSecret(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const left = crypto.createHash('sha256').update(provided).digest();
  const right = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(left, right);
}

function normalizeBootstrapToken(value) {
  if (typeof value !== 'string') return null;
  let token = value.trim();
  if (token.length >= 2 && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
    token = token.slice(1, -1).trim();
  }
  return token;
}

async function registerInitialAdmin(req, res) {
  const bodyIsObject = req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body);
  const suppliedToken = bodyIsObject ? req.body.bootstrapToken : undefined;
  const configuredToken = normalizeBootstrapToken(process.env.ADMIN_BOOTSTRAP_TOKEN);
  const submittedToken = normalizeBootstrapToken(suppliedToken);
  const suppliedTokenMatches = sameSecret(submittedToken, configuredToken);

  const allowed = new Set(['bootstrapToken']);
  if (!bodyIsObject || Object.keys(req.body).some((key) => !allowed.has(key))) {
    return res.status(400).json({ success: false, message: 'Request must contain only the bootstrapToken property.' });
  }
  if (typeof suppliedToken !== 'string' || !submittedToken) {
    return res.status(400).json({ success: false, message: 'bootstrapToken must be a non-empty string.' });
  }

  const bootstrapToken = configuredToken;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!bootstrapToken || Buffer.byteLength(bootstrapToken, 'utf8') < 32 || !email || !password) {
    return res.status(503).json({ success: false, message: 'Initial admin setup is not configured.' });
  }
  if (!suppliedTokenMatches) {
    return res.status(401).json({ success: false, message: 'Invalid bootstrap token.' });
  }
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(500).json({ success: false, message: 'Configured ADMIN_EMAIL must be a valid email address.' });
  }
  if (await Admin.exists({})) {
    return res.status(409).json({ success: false, message: 'Initial admin registration is already closed.' });
  }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(500).json({ success: false, message: 'Configured ADMIN_PASSWORD must be 12 to 72 UTF-8 bytes.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ email, passwordHash });
    return res.status(201).json({ success: true, message: 'Initial admin account created. Log in to start an admin session.', user: safeUser(admin) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Initial admin registration is already closed.' });
    throw error;
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 320 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Enter a valid email and password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const admin = await Admin.findOne({ email: normalizedEmail }).select('+passwordHash');
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
  const roleAllowed = admin?.role === 'admin';
  if (!admin || !passwordMatches || !roleAllowed) {
    return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
  }

  const token = signAdmin(admin);
  setAdminCookie(res, token);
  return res.status(200).json({ success: true, user: safeUser(admin) });
}

function logout(_req, res) {
  clearAdminCookie(res);
  return res.status(200).json({ success: true, message: 'Logged out.' });
}

function currentAdmin(req, res) {
  return res.status(200).json({ success: true, user: req.admin });
}

module.exports = { registerInitialAdmin, login, logout, currentAdmin, normalizeBootstrapToken, sameSecret };
