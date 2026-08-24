CREATE TABLE user_device_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES staff(id),
    fcm_token VARCHAR(512) NOT NULL,
    device_type VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uk_user_device_tokens UNIQUE (user_id, fcm_token)
);
