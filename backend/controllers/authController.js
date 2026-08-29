const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id, name, email, role, created_at',
      [name, email, password_hash, role || 'user']
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email belongs to someone else
    const existing = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const result = await pool.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING id, name, email, role, created_at',
      [name, email, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Simple in-memory store for OTPs (In production, use Redis or Postgres table with expiration)
const otpStore = new Map();

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userResult = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
    if (userResult.rows.length === 0) {
      // Return success even if not found for security (stop email enumeration)
      return res.json({ message: 'If the email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 15-minute expiration
    const expiresAt = Date.now() + 15 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    // Simulate sending email/SMS
    console.log(`\n================================`);
    console.log(`[SIMULATED OTP DISPATCH]`);
    console.log(`To: ${email} (${userResult.rows[0].name})`);
    console.log(`OTP Code: ${otp}`);
    console.log(`================================\n`);

    res.json({ message: 'If the email exists, an OTP has been sent.' });
  } catch (err) {
    console.error('Reset request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const result = await pool.query(
      'UPDATE users SET password_hash = ? WHERE email = ? RETURNING id',
      [password_hash, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // OTP successful, clear it
    otpStore.delete(email);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
