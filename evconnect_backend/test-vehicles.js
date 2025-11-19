// Test script to check vehicle profiles
const axios = require('axios');

async function testVehicles() {
  try {
    // First, login to get a token
    console.log('1. Attempting login...');
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      emailOrPhone: 'test@example.com', // Replace with actual test user
      password: 'Test@123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
    
    // Get vehicles
    console.log('\n2. Fetching vehicles...');
    const vehiclesResponse = await axios.get('http://localhost:4000/api/auth/vehicle-profiles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Vehicles response:', JSON.stringify(vehiclesResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testVehicles();
