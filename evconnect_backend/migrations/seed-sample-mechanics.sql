-- Seed sample mechanics for testing
-- Make sure to update userId with actual user IDs from your database if needed

-- Sample mechanics with various services and locations
INSERT INTO mechanic (
  id,
  "userId",
  name,
  services,
  lat,
  lng,
  rating,
  phone,
  email,
  description,
  available,
  "pricePerHour",
  "createdAt",
  "updatedAt"
) VALUES 
-- Mechanic 1: Battery specialist in Colombo
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1), -- Uses first user, update as needed
  'EV Battery Experts',
  ARRAY['Battery Replacement', 'Battery Diagnosis', 'Charging System Repair'],
  6.9271, -- Colombo area
  79.8612,
  4.8,
  '+94771234567',
  'battery@evexperts.lk',
  'Specialized in EV battery diagnosis and replacement. 10+ years experience.',
  true,
  5000.00,
  NOW(),
  NOW()
),
-- Mechanic 2: Motor repair in Kandy
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'Quick EV Repairs',
  ARRAY['Motor Repair', 'Electrical System', 'General Maintenance'],
  7.2906, -- Kandy area
  80.6337,
  4.5,
  '+94772345678',
  'service@quickev.lk',
  'Fast and reliable EV motor repairs and general maintenance.',
  true,
  4500.00,
  NOW(),
  NOW()
),
-- Mechanic 3: Tire specialist in Galle
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'EV Tire Pro',
  ARRAY['Tire Replacement', 'Wheel Alignment', 'Brake System'],
  6.0535, -- Galle area
  80.2210,
  4.7,
  '+94773456789',
  'tires@evpro.lk',
  'Expert in EV tire services, wheel alignment, and brake systems.',
  true,
  3500.00,
  NOW(),
  NOW()
),
-- Mechanic 4: Full service in Negombo
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'Tesla Service Center',
  ARRAY['Battery Replacement', 'Motor Repair', 'Software Update', 'General Maintenance'],
  7.2008, -- Negombo area
  79.8736,
  4.9,
  '+94774567890',
  'service@teslasl.lk',
  'Authorized Tesla service center with full EV support.',
  true,
  6000.00,
  NOW(),
  NOW()
),
-- Mechanic 5: Mobile mechanic in Colombo
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'Mobile EV Doctor',
  ARRAY['Emergency Repair', 'Battery Diagnosis', 'Charging System Repair', 'Towing Service'],
  6.9271, -- Colombo area (mobile)
  79.8612,
  4.6,
  '+94775678901',
  'mobile@evdoctor.lk',
  'Mobile EV repair service. We come to you! Available 24/7 for emergencies.',
  true,
  5500.00,
  NOW(),
  NOW()
),
-- Mechanic 6: Charging system expert in Matara
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'Charge Masters',
  ARRAY['Charging System Repair', 'Electrical System', 'Software Update'],
  5.9549, -- Matara area
  80.5550,
  4.4,
  '+94776789012',
  'charge@masters.lk',
  'Specialized in EV charging systems and electrical diagnostics.',
  true,
  4000.00,
  NOW(),
  NOW()
),
-- Mechanic 7: Software specialist in Colombo
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'EV Tech Solutions',
  ARRAY['Software Update', 'System Diagnostics', 'General Maintenance'],
  6.9271,
  79.8612,
  4.7,
  '+94777890123',
  'tech@evsolutions.lk',
  'EV software updates, diagnostics, and technical support.',
  true,
  4800.00,
  NOW(),
  NOW()
),
-- Mechanic 8: Budget repair in Jaffna
(
  uuid_generate_v4(),
  (SELECT id FROM "user" LIMIT 1),
  'Budget EV Repairs',
  ARRAY['General Maintenance', 'Tire Replacement', 'Brake System'],
  9.6615, -- Jaffna area
  80.0255,
  4.2,
  '+94778901234',
  'budget@evrepairs.lk',
  'Affordable EV maintenance and repair services.',
  true,
  3000.00,
  NOW(),
  NOW()
);

-- Update the count
SELECT COUNT(*) as mechanic_count FROM mechanic;
