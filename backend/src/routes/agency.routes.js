const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createAgencyValidation } = require('../middleware/validation');

// Get agency tree (multilevel hierarchy)
router.get('/tree', authenticateToken, async (req, res, next) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees all agencies
      query = `
        WITH RECURSIVE agency_tree AS (
          SELECT id, name, email, phone, parent_agency_id, 0 as level
          FROM agencies WHERE parent_agency_id IS NULL
          UNION ALL
          SELECT a.id, a.name, a.email, a.phone, a.parent_agency_id, at.level + 1
          FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT * FROM agency_tree ORDER BY level, name
      `;
    } else {
      // Agency sees only their tree
      query = `
        WITH RECURSIVE agency_tree AS (
          SELECT id, name, email, phone, parent_agency_id, 0 as level
          FROM agencies WHERE id = $1
          UNION ALL
          SELECT a.id, a.name, a.email, a.phone, a.parent_agency_id, at.level + 1
          FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT * FROM agency_tree ORDER BY level, name
      `;
      params = [req.user.agency_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get single agency details
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT a.*, 
              (SELECT COUNT(*) FROM referred_clients WHERE agency_id = a.id) as total_clients,
              (SELECT COUNT(*) FROM referred_clients WHERE agency_id = a.id AND status = 'enrolled') as enrolled_clients,
              (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE agency_id = a.id) as total_commissions,
              (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE agency_id = a.id AND payment_status = 'pending') as pending_commissions
       FROM agencies a WHERE a.id = $1`,
      [agencyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    // Check access
    if (req.user.role !== 'admin' && req.user.agency_id !== agencyId) {
      const accessCheck = await pool.query(
        `WITH RECURSIVE agency_tree AS (
          SELECT id FROM agencies WHERE id = $1
          UNION ALL
          SELECT a.id FROM agencies a
          INNER JOIN agency_tree at ON a.parent_agency_id = at.id
        )
        SELECT EXISTS (SELECT 1 FROM agency_tree WHERE id = $2) as has_access`,
        [req.user.agency_id, agencyId]
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

// Create new agency
router.post('/', authenticateToken, requireRole('admin', 'agency'), createAgencyValidation, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, email, phone, parent_agency_id, user_password } = req.body;

    // Validate parent agency
    let parentId = parent_agency_id;
    if (req.user.role === 'agency') {
      parentId = req.user.agency_id;
    }

    // Create agency
    const agencyResult = await client.query(
      'INSERT INTO agencies (name, email, phone, parent_agency_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, parentId]
    );

    const agency = agencyResult.rows[0];

    // Create user for the agency
    const password = user_password || 'Agency@123';
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(
      'INSERT INTO users (agency_id, role, email, password_hash) VALUES ($1, $2, $3, $4)',
      [agency.id, 'agency', email, passwordHash]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...agency,
      default_password: !user_password ? password : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update agency
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);
    const { name, email, phone } = req.body;

    const result = await pool.query(
      'UPDATE agencies SET name = $1, email = $2, phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, email, phone, agencyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agency not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete agency
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);

    await pool.query('DELETE FROM agencies WHERE id = $1', [agencyId]);

    res.json({ message: 'Agency deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
