const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/adjustments', require('./routes/adjustments'));
app.use('/api/moves', require('./routes/moves'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/categories', require('./routes/categories'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CoreInventory server running on port ${PORT}`);
});

module.exports = app;
