const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'evrs_jwt_secret_key_2024_secure';
const token = jwt.sign({ sub: 'testuser', userId: '00000000-0000-0000-0000-000000000000', role: 'mechanic' }, secret);
const { execSync } = require('child_process');
try {
  const result = execSync(`curl -s -i http://localhost:3001/api/breakdown-requests/available -H "Authorization: Bearer ${token}"`).toString();
  console.log(result);
} catch (e) {
  console.error(e.stderr?.toString());
}
