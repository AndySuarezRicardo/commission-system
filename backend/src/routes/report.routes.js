const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard summary
router.get('/dashboard', authenticateToken, async (req, res, next) => {
  try {
    let agencyFilter = '';
    const params = [];

    if (req.user.role !== 'admin') {
      agencyFilter = `
        agency_id IN (
          WITH RECURSIVE agency_tree AS (
            SELECT id FROM agencies WHERE id = $1
            UNION ALL
            SELECT a.id FROM agencies a
            INNER JOIN agency_tree at ON a.parent_agency_id = at.id
          )
          SELECT id FROM agency_tree
        ) AND
      `;
      params.push(req.user.agency_id);
    }

    const clientsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'enrolled' THEN 1 END) as enrolled,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'not_enrolled' THEN 1 END) as not_enrolled
      FROM referred_clients
      WHERE ${agencyFilter} 1=1
    `;

    const commissionsQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
      FROM commissions
      WHERE ${agencyFilter} 1=1
    `;

    const monthlyQuery = `
      SELECT month, SUM(amount) as amount, payment_status
      FROM commissions
      WHERE ${agencyFilter} 1=1
      GROUP BY month, payment_status
      ORDER BY month DESC
      LIMIT 12
    `;

    const [clients, commissions, monthly] = await Promise.all([
      pool.query(clientsQuery, params),
      pool.query(commissionsQuery, params),
      pool.query(monthlyQuery, params)
    ]);

    res.json({
      clients: clients.rows[0],
      commissions: commissions.rows[0],
      monthly: monthly.rows
    });
  } catch (error) {
    next(error);
  }
});

// Export report (CSV format)
router.get('/export', authenticateToken, async (req, res, next) => {
  try {
    const { type, start_date, end_date } = req.query;

    let query;
    const params = [];

    if (type === 'clients') {
      query = `
        SELECT c.id, c.name, c.email, c.phone, c.status, c.created_at, a.name as agency_name
        FROM referred_clients c
        JOIN agencies a ON c.agency_id = a.id
        WHERE 1=1
      `;
    } else {
      query = `
        SELECT c.id, c.amount, c.month, c.payment_status, c.paid_at, rc.name as client_name, a.name as agency_name
        FROM commissions c
        JOIN referred_clients rc ON c.client_id = rc.id
        JOIN agencies a ON c.agency_id = a.id
        WHERE 1=1
      `;
    }

    if (req.user.role !== 'admin') {
      query += ` AND ${type === 'clients' ? 'c' : 'c'}.agency_id = $1`;
      params.push(req.user.agency_id);
    }

    const result = await pool.query(query, params);

    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
