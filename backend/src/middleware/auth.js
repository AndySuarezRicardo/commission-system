const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const result = await pool.query(
      'SELECT u.*, a.name as agency_name FROM users u LEFT JOIN agencies a ON u.agency_id = a.id WHERE u.id = $1 AND u.is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const checkAgencyAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }

    const agencyId = parseInt(req.params.agencyId || req.body.agency_id || req.query.agency_id);

    if (!agencyId) {
      return res.status(400).json({ error: 'Agency ID required' });
    }

    // Check if user owns this agency or it's a descendant
    const result = await pool.query(
      `WITH RECURSIVE agency_tree AS (
        SELECT id, parent_agency_id FROM agencies WHERE id = $1
        UNION ALL
        SELECT a.id, a.parent_agency_id FROM agencies a
        INNER JOIN agency_tree at ON a.parent_agency_id = at.id
      )
      SELECT EXISTS (SELECT 1 FROM agency_tree WHERE id = $2) as has_access`,
      [req.user.agency_id, agencyId]
    );

    if (!result.rows[0].has_access) {
      return res.status(403).json({ error: 'Access denied to this agency' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticateToken, requireRole, checkAgencyAccess };
