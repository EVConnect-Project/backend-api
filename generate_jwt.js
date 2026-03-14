const jwt = require('./node_modules/jsonwebtoken');

// JWT secret from backend-api/.env  
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

// Payload based on the JWT strategy expected format
const payload = {
  sub: '99999999-9999-9999-9999-999999999999', // Station Owner ID from /api/chargers response
  phoneNumber: '+94779999999',
  role: 'owner'
};

// Generate token with 24h expiration like in the auth service
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nYou can test with:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/chat/unread-count`);