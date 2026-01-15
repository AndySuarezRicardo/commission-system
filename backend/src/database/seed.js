const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // Clear existing data
    await client.query('TRUNCATE agencies, users, referred_clients, commissions RESTART IDENTITY CASCADE');

    // Create admin user
    const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456', 10);
    await client.query(
      `INSERT INTO users (role, email, password_hash, two_factor_enabled) 
       VALUES ('admin', $1, $2, false)`,
      [process.env.DEFAULT_ADMIN_EMAIL || 'admin@manageyourcom.com', adminPassword]
    );

    // Create sample agencies (multilevel structure)
    const agencies = [
      { name: 'Agencia Principal A', email: 'agencia_a@example.com', phone: '+1234567890', parent: null },
      { name: 'Agencia Hija A1', email: 'agencia_a1@example.com', phone: '+1234567891', parent: 1 },
      { name: 'Agencia Hija A2', email: 'agencia_a2@example.com', phone: '+1234567892', parent: 1 },
      { name: 'Agencia Nieta A1.1', email: 'agencia_a11@example.com', phone: '+1234567893', parent: 2 },
      { name: 'Agencia Principal B', email: 'agencia_b@example.com', phone: '+1234567894', parent: null },
    ];

    for (const agency of agencies) {
      await client.query(
        'INSERT INTO agencies (name, email, phone, parent_agency_id) VALUES ($1, $2, $3, $4)',
        [agency.name, agency.email, agency.phone, agency.parent]
      );
    }

    // Create users for agencies
    const agencyPassword = await bcrypt.hash('Agency@123', 10);
    for (let i = 1; i <= 5; i++) {
      await client.query(
        'INSERT INTO users (agency_id, role, email, password_hash) VALUES ($1, $2, $3, $4)',
        [i, 'agency', agencies[i-1].email, agencyPassword]
      );
    }

    // Create sample clients
    const clients = [
      { name: 'Juan Pérez', email: 'juan@example.com', phone: '+1111111111', status: 'enrolled', agency: 1 },
      { name: 'María García', email: 'maria@example.com', phone: '+1111111112', status: 'enrolled', agency: 2 },
      { name: 'Carlos López', email: 'carlos@example.com', phone: '+1111111113', status: 'pending', agency: 1 },
      { name: 'Ana Martínez', email: 'ana@example.com', phone: '+1111111114', status: 'enrolled', agency: 3 },
    ];

    for (const client of clients) {
      const result = await client.query(
        `INSERT INTO referred_clients (name, email, phone, status, agency_id, enrollment_date) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [client.name, client.email, client.phone, client.status, client.agency, 
         client.status === 'enrolled' ? new Date() : null]
      );

      // Create commissions for enrolled clients
      if (client.status === 'enrolled') {
        const currentMonth = new Date().toISOString().substring(0, 7);
        await client.query(
          `INSERT INTO commissions (amount, month, payment_status, client_id, agency_id) 
           VALUES ($1, $2, $3, $4, $5)`,
          [500.00, currentMonth, 'pending', result.rows[0].id, client.agency]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Default credentials:');
    console.log('   Admin: admin@manageyourcom.com / Admin@123456');
    console.log('   Agency: agencia_a@example.com / Agency@123');
    console.log('');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = seedDatabase;
