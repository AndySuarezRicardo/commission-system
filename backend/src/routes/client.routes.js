const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { registerClientValidation } = require('../middleware/validation');

// Get all clients for user's agency (and sub-agencies)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT c.*, a.name as agency_name 
      FROM referred_clients c
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
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.phone ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single client
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT c.*, a.name as agency_name 
       FROM referred_clients c
       JOIN agencies a ON c.agency_id = a.id
       WHERE c.id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check access
    if (req.user.role !== 'admin') {
      const accessCheck = await pool.query(
        `WITH RECURSIVE agency_tree AS (
          SELECT id FROM agencies WHERE id = $1
          UNION ALL
          SELECT a.id FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT EXISTS (SELECT 1 FROM agency_tree WHERE id = $2) as has_access`,
        [req.user.agency_id, result.rows[0].agency_id]
      );

      if (!accessCheck.rows[0].has_access) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Register new client
router.post('/', authenticateToken, requireRole('agency', 'admin'), registerClientValidation, async (req, res, next) => {
  try {
    const { name, email, phone, notes } = req.body;
    const agency_id = req.user.role === 'admin' ? req.body.agency_id : req.user.agency_id;

    if (!agency_id) {
      return res.status(400).json({ error: 'Agency ID required' });
    }

    const result = await pool.query(
      'INSERT INTO referred_clients (name, email, phone, status, agency_id, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, phone, 'pending', agency_id, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update client status (admin only)
router.patch('/:id/status', authenticateToken, requireRole('admin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const clientId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['pending', 'enrolled', 'not_enrolled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const clientResult = await client.query(
      'SELECT * FROM referred_clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientData = clientResult.rows[0];

    // Update client status
    const updateResult = await client.query(
      'UPDATE referred_clients SET status = $1, enrollment_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, status === 'enrolled' ? new Date() : null, clientId]
    );

    // Create commission if enrolled
    if (status === 'enrolled' && clientData.status !== 'enrolled') {
      const commissionAmount = parseFloat(process.env.COMMISSION_RATE || 0.50) * 1000; // Base amount
      const currentMonth = new Date().toISOString().substring(0, 7);

      await client.query(
        'INSERT INTO commissions (amount, month, payment_status, client_id, agency_id) VALUES ($1, $2, $3, $4, $5)',
        [commissionAmount, currentMonth, 'pending', clientId, clientData.agency_id]
      );
    }

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update client
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const { name, email, phone, notes } = req.body;

    const result = await pool.query(
      'UPDATE referred_clients SET name = $1, email = $2, phone = $3, notes = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [name, email, phone, notes, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete client
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);

    await pool.query('DELETE FROM referred_clients WHERE id = $1', [clientId]);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
