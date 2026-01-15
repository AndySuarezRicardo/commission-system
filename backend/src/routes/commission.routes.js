const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get commissions for user's agency
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, month, groupBy } = req.query;

    let query = `
      SELECT c.*, rc.name as client_name, a.name as agency_name
      FROM commissions c
      JOIN referred_clients rc ON c.client_id = rc.id
      JOIN agencies a ON c.agency_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (req.user.role !== 'admin') {
      query += ` AND c.agency_id IN (
        WITH RECURSIVE agency_tree AS (
          SELECT id FROM agencies WHERE id = $${paramCount}
          UNION ALL
          SELECT a.id FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT id FROM agency_tree
      )`;
      params.push(req.user.agency_id);
      paramCount++;
    }

    if (status) {
      query += ` AND c.payment_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (month) {
      query += ` AND c.month = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    if (groupBy === 'month') {
      query = `
        SELECT month, payment_status, COUNT(*) as count, SUM(amount) as total_amount
        FROM (${query}) as subquery
        GROUP BY month, payment_status
        ORDER BY month DESC, payment_status
      `;
    } else {
      query += ' ORDER BY c.created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get commission statistics
router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    let agencyFilter = '';
    const params = [];

    if (req.user.role !== 'admin') {
      agencyFilter = `WHERE agency_id IN (
        WITH RECURSIVE agency_tree AS (
          SELECT id FROM agencies WHERE id = $1
          UNION ALL
          SELECT a.id FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT id FROM agency_tree
      )`;
      params.push(req.user.agency_id);
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_commissions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count
      FROM commissions
      ${agencyFilter}
    `, params);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Mark commission as paid (admin only)
router.patch('/:id/pay', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const commissionId = parseInt(req.params.id);
    const { payment_notes } = req.body;

    const result = await pool.query(
      'UPDATE commissions SET payment_status = $1, paid_at = CURRENT_TIMESTAMP, payment_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['paid', payment_notes, commissionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
