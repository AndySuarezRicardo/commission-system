const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { loginValidation } = require('../middleware/validation');

// Login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ requiresTwoFactor: true });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: twoFactorCode
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agency_id: user.agency_id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Setup 2FA
router.post('/2fa/setup', authenticateToken, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Commission System (${req.user.email})`
    });

    await pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
      [secret.base32, req.user.id]
    );

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ qrCode, secret: secret.base32 });
  } catch (error) {
    next(error);
  }
});

// Verify and enable 2FA
router.post('/2fa/verify', authenticateToken, async (req, res, next) => {
  try {
    const { code } = req.body;

    const result = await pool.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [req.user.id]
    );

    const verified = speakeasy.totp.verify({
      secret: result.rows[0].two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    await pool.query(
      'UPDATE users SET two_factor_enabled = true WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.agency_id, u.two_factor_enabled, u.last_login,
              a.name as agency_name, a.parent_agency_id
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
