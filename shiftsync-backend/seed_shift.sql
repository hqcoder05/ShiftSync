INSERT INTO store (id, name, address, phone, latitude, longitude, created_at, updated_at, version) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Store', 'Test Addr', '0000', 10.0, 10.0, NOW(), NOW(), 0) 
ON CONFLICT DO NOTHING;

INSERT INTO shift (id, store_id, title, description, start_time, end_time, min_staff, max_staff, status, created_at, updated_at, version)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Test Shift', 'Desc', NOW(), NOW() + INTERVAL '4 hours', 1, 5, 'PUBLISHED', NOW(), NOW(), 0);
