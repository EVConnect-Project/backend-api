const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const client = new Client({
    connectionString: 'postgresql://akilanishan@localhost:5432/evconnect'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Check if admin exists
    const checkResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@evconnect.com']
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Admin user already exists!');
      console.log('Email: admin@evconnect.com');
      console.log('Password: admin123');
    } else {
      // Create admin user
      const result = await client.query(
        `INSERT INTO users (email, password, name, role, "isVerified", "isBanned", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, email, name, role`,
        ['admin@evconnect.com', hashedPassword, 'Admin User', 'admin', true, false]
      );

      console.log('✅ Admin user created successfully!');
      console.log('Email: admin@evconnect.com');
      console.log('Password: admin123');
      console.log('User ID:', result.rows[0].id);
      console.log('\n⚠️  Please change the password in production!');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
