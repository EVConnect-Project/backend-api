-- Check users table schema
\d users;

-- Check if there are any users with phone numbers
SELECT id, email, phone, "countryCode", name, role FROM users LIMIT 5;
