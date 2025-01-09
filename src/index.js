require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const { errorResponse } = require('./utils/errorHandler');
const { pool } = require('./config/database');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Database connection warning:', error.message);
    console.warn('Continuing without database connection...');
  }
})();

// Import stock routes
const stockRoutes = require('./routes/stock.routes');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);

// 404 Handler
app.use((req, res) => {
  errorResponse(res, 404, 'Resource not found');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  errorResponse(res, 500, 'Internal server error');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});