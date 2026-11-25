const mongoose = require('mongoose');
const dns = require('node:dns');
const path = require('node:path');
const dotenv = require('dotenv');

const backendEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: backendEnvPath });

function configError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validateMongoUri(uri) {
  if (uri !== uri.trim()) {
    throw configError('MONGO_URI_WHITESPACE', 'MONGO_URI has leading or trailing whitespace.');
  }

  if (/\s/.test(uri)) {
    throw configError('MONGO_URI_WHITESPACE', 'MONGO_URI contains whitespace.');
  }

  if (/['"`]/.test(uri)) {
    throw configError('MONGO_URI_QUOTES', 'MONGO_URI contains quote characters. Remove surrounding quotes if they are part of the value.');
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw configError('MONGO_URI_SCHEME', 'MONGO_URI must start with mongodb:// or mongodb+srv://.');
  }

  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw configError('MONGO_URI_FORMAT', 'MONGO_URI is not a valid MongoDB URI.');
  }

  if (!parsedUri.hostname) {
    throw configError('MONGO_URI_HOST', 'MONGO_URI is missing its hostname.');
  }

  if (/%(?![0-9a-fA-F]{2})/.test(uri)) {
    throw configError('MONGO_URI_ENCODING', 'MONGO_URI contains an invalid percent escape.');
  }

  try {
    // The driver constructor validates URI grammar without opening a connection.
    new mongoose.mongo.MongoClient(uri);
  } catch {
    throw configError('MONGO_URI_FORMAT', 'The MongoDB driver rejected MONGO_URI format. Encode reserved characters in credentials.');
  }
}

function classifyMongoError(error) {
  const details = `${error.name || ''} ${error.code || ''} ${error.codeName || ''} ${error.message || ''}`;

  if (/AuthenticationFailed|authenticat(?:e|ion)|not authorized/i.test(details) || error.code === 18) {
    return 'authentication';
  }
  if (/querySrv|getaddrinfo|ENOTFOUND|EAI_AGAIN|ENODATA|ESERVFAIL|DNS/i.test(details)) {
    return 'dns';
  }
  if (/MongoNetwork|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|socket hang up/i.test(details)) {
    return 'network';
  }
  return 'connection';
}

function redactSecret(message, secret) {
  if (!secret) return message;
  return message.replace(new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[REDACTED]');
}

function safeMongoErrorMessage(error, uri) {
  let message = error.message || 'No error message was provided.';
  message = message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, '[REDACTED_MONGODB_URI]');

  try {
    const parsedUri = new URL(uri);
    const secrets = [parsedUri.username, parsedUri.password];
    for (const encoded of secrets) {
      if (!encoded) continue;
      message = redactSecret(message, encoded);
      try {
        message = redactSecret(message, decodeURIComponent(encoded));
      } catch {
        // Keep the encoded value redacted even if it cannot be decoded.
      }
    }
    message = redactSecret(message, `${parsedUri.username}:${parsedUri.password}`);
  } catch {
    // URI validation runs first; this fallback still strips URI-shaped text.
  }

  return message;
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw configError('MONGO_URI_MISSING', 'MONGO_URI is missing from backend/.env.');
  }

  validateMongoUri(uri);
  try {
    if (process.env.NODE_ENV === 'development') {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(uri);
  } catch (error) {
    error.mongoCategory = classifyMongoError(error);
    error.safeMessage = safeMongoErrorMessage(error, uri);
    throw error;
  }
  console.log('MongoDB connected successfully.');
}

module.exports = connectDB;
