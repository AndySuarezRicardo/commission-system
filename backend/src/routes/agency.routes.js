const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createAgencyValidation } = require('../middleware/validation');

// Get agency tree (multinivel hierarchy)
router.get('/tree', authenticateToken, async (req, res, next) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees ALL agencies
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
      // Agency sees only THEIR tree (itself + children)
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

    // Check access: admin can see all, agencies can see their tree
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

// Create new agency (CRITICAL: permite que agencias creen subagencias)
router.post('/', authenticateToken, requireRole('admin', 'agency'), createAgencyValidation, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, email, phone, parent_agency_id } = req.body;

    // Determinar el parent_id correcto
    let parentId = parent_agency_id;

    if (req.user.role === 'agency') {
      // Las agencias SIEMPRE crean hijas debajo de ellas mismas
      parentId = req.user.agency_id;
      console.log(`Agencia ${req.user.agency_id} creando subagencia`);
    } else if (req.user.role === 'admin') {
      // Admin puede especificar el parent o crear raíz (null)
      parentId = parent_agency_id || null;
      console.log(`Admin creando agencia con parent ${parentId}`);
    }

    // Validar que el parent existe (si no es null)
    if (parentId !== null) {
      const parentCheck = await client.query(
        'SELECT id FROM agencies WHERE id = $1',
        [parentId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent agency not found' });
      }
    }

    // Crear la agencia
    const agencyResult = await client.query(
      'INSERT INTO agencies (name, email, phone, parent_agency_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, parentId]
    );

    const agency = agencyResult.rows[0];
    console.log(`Agencia creada: ID ${agency.id}, parent ${parentId}`);

    // Generar contraseña automática (8 caracteres aleatorios)
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    // Crear usuario para la agencia
    await client.query(
      'INSERT INTO users (agency_id, role, email, password_hash) VALUES ($1, $2, $3, $4)',
      [agency.id, 'agency', email, passwordHash]
    );

    await client.query('COMMIT');

    console.log(`Usuario creado para agencia ${agency.id} con password ${generatedPassword}`);

    res.status(201).json({
      ...agency,
      generated_password: generatedPassword,
      message: 'Agencia creada exitosamente. IMPORTANTE: Guarda esta contraseña, no se mostrará nuevamente.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating agency:', error);
    next(error);
  } finally {
    client.release();
  }
});

// Update agency (solo admin)
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

// Delete agency (solo admin)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const agencyId = parseInt(req.params.id);

    // Verificar si tiene subagencias
    const childrenCheck = await pool.query(
      'SELECT COUNT(*) as count FROM agencies WHERE parent_agency_id = $1',
      [agencyId]
    );

    if (parseInt(childrenCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar esta agencia porque tiene subagencias' 
      });
    }

    await pool.query('DELETE FROM agencies WHERE id = $1', [agencyId]);

    res.json({ message: 'Agency deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
