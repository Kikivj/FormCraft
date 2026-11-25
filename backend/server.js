const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { getJwtSecret } = require('./middleware/requireAdmin');
const Admin = require('./models/Admin');
const Submission = require('./models/Submission');
const authRoutes = require('./routes/authRoutes');
const formRoutes = require('./routes/formRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'FormCraft API is healthy',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body exceeds the 1 MB limit.' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'The form data is invalid.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with the same unique value already exists.' });
  }

  console.error('API request failed:', error.name || 'Error');
  return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

async function startServer() {
  try {
    getJwtSecret();
    await connectDB();
    await Promise.all([Admin.init(), Submission.init()]);
    app.listen(port, () => {
      console.log(`FormCraft API listening on port ${port}`);
    });
  } catch (error) {
    if (error.message === 'JWT_SECRET must contain at least 32 bytes.') {
      console.error('Server configuration failed: JWT_SECRET must contain at least 32 bytes.');
    } else if (typeof error.code === 'string' && error.code.startsWith('MONGO_URI_')) {
      console.error(`MongoDB configuration failed (${error.name || 'Error'}): ${error.message}`);
    } else {
      const category = error.mongoCategory || 'connection';
      const safeMessage = error.safeMessage || 'No safe error message is available.';
      console.error(`MongoDB ${category} failure (${error.name || 'Error'}): ${safeMessage}`);
    }
    process.exit(1);
  }
}

startServer();
