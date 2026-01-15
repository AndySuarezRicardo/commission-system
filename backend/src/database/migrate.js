const pool = require('../config/database');

const migrations = [
  `CREATE TABLE IF NOT EXISTS agencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    start_date DATE DEFAULT CURRENT_DATE,
    parent_agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agency')),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS referred_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'enrolled', 'not_enrolled')),
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    enrollment_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    month VARCHAR(7) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    client_id INTEGER NOT NULL REFERENCES referred_clients(id) ON DELETE CASCADE,
    agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    paid_at TIMESTAMP,
    payment_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, month)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_agencies_parent ON agencies(parent_agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_agency ON referred_clients(agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_status ON referred_clients(status);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_email ON referred_clients(email);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_phone ON referred_clients(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_commissions_agency ON commissions(agency_id);`,
  `CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(payment_status);`,
  `CREATE INDEX IF NOT EXISTS idx_commissions_month ON commissions(month);`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    await client.query('BEGIN');

    for (let i = 0; i < migrations.length; i++) {
      console.log(`   Running migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }

    await client.query('COMMIT');
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = runMigrations;
