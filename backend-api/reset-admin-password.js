const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function resetAdminPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'evconnect',
    user: 'akilanishan',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password
    const password = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed');

    // Update the admin user's password
    const result = await client.query(
      `UPDATE users SET password = $1 WHERE email = 'admin@evconnect.com'`,
      [hashedPassword]
    );

    console.log(`Updated ${result.rowCount} user(s)`);
    console.log('✅ Admin password reset successfully!');
    console.log('Email: admin@evconnect.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
