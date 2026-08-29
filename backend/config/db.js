const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'coreinventory',
});

// Wrapper to convert SQLite ? to PostgreSQL $1, $2, etc.
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  if (typeof text === 'string' && text.includes('?')) {
    let index = 1;
    // Replace ? not inside quotes. Simplistic regex, works for these simple queries
    text = text.replace(/\?/g, () => `$${index++}`);
  }
  return originalQuery(text, params);
};

// Test the connection
pool.on('connect', () => {
  // console.log('Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize schema on first run
const initializeSchema = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schema);
      console.log('Database schema initialized');
    }
  } catch (err) {
    console.error('Failed to initialize schema:', err);
  }
};

initializeSchema();

module.exports = pool;
