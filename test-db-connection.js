// Quick database connection test
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'evconnect',
  user: 'akilanishan',
  // No password needed for local PostgreSQL
});

async function testDatabase() {
  try {
    await client.connect();
    console.log('✅ Database connected successfully');
    
    // Test 1: Check if charging_stations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'charging_stations'
      );
    `);
    console.log('charging_stations table exists:', tableCheck.rows[0].exists);
    
    // Test 2: Count charging stations
    if (tableCheck.rows[0].exists) {
      const countResult = await client.query('SELECT COUNT(*) FROM charging_stations;');
      console.log('Number of charging stations:', countResult.rows[0].count);
      
      // Test 3: Get sample data
      const sampleData = await client.query('SELECT id, station_name, verified FROM charging_stations LIMIT 3;');
      console.log('Sample stations:', JSON.stringify(sampleData.rows, null, 2));
      
      // Test 4: Count chargers with station_id
      const chargerCount = await client.query('SELECT COUNT(*) FROM chargers WHERE station_id IS NOT NULL;');
      console.log('Chargers linked to stations:', chargerCount.rows[0].count);
      
      // Test 5: Count chargers without station_id
      const individualCount = await client.query('SELECT COUNT(*) FROM chargers WHERE station_id IS NULL;');
      console.log('Individual chargers:', individualCount.rows[0].count);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

testDatabase();
