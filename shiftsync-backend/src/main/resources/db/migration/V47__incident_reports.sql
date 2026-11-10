CREATE TABLE incident_report (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    shift_id UUID REFERENCES shift(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES staff(id),
    reporter_name VARCHAR(255) NOT NULL,
    client_request_id UUID NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('EQUIPMENT','SAFETY','CUSTOMER','OTHER')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED')),
    description VARCHAR(2000) NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 2000),
    review_note VARCHAR(2000),
    reviewed_by UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_incident_client_request UNIQUE (store_id, reporter_id, client_request_id)
);
CREATE INDEX idx_incident_store_history ON incident_report(store_id, created_at DESC, id DESC);
CREATE INDEX idx_incident_reporter_history ON incident_report(store_id, reporter_id, created_at DESC, id DESC);
CREATE TABLE incident_photo (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('image/jpeg','image/png')),
    size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 2097152),
    data BYTEA NOT NULL,
    CONSTRAINT chk_incident_photo_size CHECK (octet_length(data) = size_bytes)
);
CREATE INDEX idx_incident_photo_report ON incident_photo(incident_id);
