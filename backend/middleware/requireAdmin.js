const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const COOKIE_NAME = 'formcraft_admin';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }
  return secret;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(item.slice(separator + 1).trim()); }
    catch { return null; }
  }
  return null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
  };
}

function setAdminCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: 60 * 60 * 1000 });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

async function requireAdmin(req, res, next) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return res.status(401).json({ success: false, message: 'Admin authentication is required.' });

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'formcraft',
      audience: 'formcraft-admin',
    });
  } catch {
    clearAdminCookie(res);
    return res.status(401).json({ success: false, message: 'Your admin session has expired. Please log in again.' });
  }

  if (payload.role !== 'admin' || !mongoose.isValidObjectId(payload.sub)) {
    clearAdminCookie(res);
    return res.status(403).json({ success: false, message: 'Admin access is required.' });
  }

  const admin = await Admin.findById(payload.sub).select('email role').lean();
  if (!admin || admin.role !== 'admin') {
    clearAdminCookie(res);
    return res.status(401).json({ success: false, message: 'Your admin account is no longer available.' });
  }
  req.admin = { id: String(admin._id), email: admin.email, role: admin.role };
  return next();
}

module.exports = { requireAdmin, getJwtSecret, setAdminCookie, clearAdminCookie };
