-- Ownership of an already shared token cannot be inferred safely. Remove all
-- ambiguous registrations; the next successful login registers the device again.
DELETE FROM user_device_tokens
WHERE fcm_token IN (SELECT fcm_token FROM user_device_tokens GROUP BY fcm_token HAVING count(*) > 1);

CREATE UNIQUE INDEX uq_user_device_token_owner ON user_device_tokens (fcm_token);
