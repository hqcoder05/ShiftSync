CREATE TABLE incident_report (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    reporter_id UUID NOT NULL REFERENCES staff(id),
    client_request_id UUID NOT NULL,
    shift_id UUID REFERENCES shift(id),
    category VARCHAR(20) NOT NULL CHECK (category IN ('EQUIPMENT','SAFETY','CUSTOMER','OTHER')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH')),
    description VARCHAR(2000) NOT NULL CHECK (length(trim(description)) >= 10),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED')),
    review_note VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reporter_id, client_request_id)
);
CREATE INDEX idx_incident_store_created ON incident_report(store_id,created_at DESC,id DESC);
CREATE INDEX idx_incident_reporter_created ON incident_report(reporter_id,created_at DESC,id DESC);
CREATE TABLE incident_photo (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incident_report(id) ON DELETE CASCADE,
    content_type VARCHAR(40) NOT NULL,
    data BYTEA NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 2097152)
);
