const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get system statistics
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM agencies) as total_agencies,
        (SELECT COUNT(*) FROM users WHERE role = 'agency') as total_agency_users,
        (SELECT COUNT(*) FROM referred_clients) as total_clients,
        (SELECT COUNT(*) FROM referred_clients WHERE status = 'enrolled') as enrolled_clients,
        (SELECT COALESCE(SUM(amount), 0) FROM commissions) as total_commissions_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE payment_status = 'pending') as pending_commissions_amount
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get recent activity
router.get('/activity', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const activity = await pool.query(`
      SELECT 'client' as type, c.id, c.name, c.status, c.created_at, a.name as agency_name
      FROM referred_clients c
      JOIN agencies a ON c.agency_id = a.id
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(activity.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
