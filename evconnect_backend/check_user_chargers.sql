-- Check if kasun@gmail.com has any registered chargers
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COUNT(c.id) as charger_count,
    json_agg(json_build_object('id', c.id, 'name', c.name, 'status', c.status)) FILTER (WHERE c.id IS NOT NULL) as chargers
FROM users u
LEFT JOIN chargers c ON c."ownerId" = u.id
WHERE u.email = 'kasun@gmail.com'
GROUP BY u.id, u.email, u.role;
