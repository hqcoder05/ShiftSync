-- Direct conversations belong to one store and exactly two current employees.
-- Membership is revalidated by the service on every operation.
CREATE TABLE messaging_thread (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    participant_a UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    participant_b UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    latest_sequence BIGINT NOT NULL DEFAULT 0,
    a_read_sequence BIGINT NOT NULL DEFAULT 0,
    b_read_sequence BIGINT NOT NULL DEFAULT 0,
    last_message VARCHAR(4000),
    last_message_at TIMESTAMPTZ,
    CONSTRAINT uq_messaging_direct_pair UNIQUE (store_id, participant_a, participant_b),
    CONSTRAINT chk_messaging_distinct_pair CHECK (participant_a < participant_b),
    CONSTRAINT chk_messaging_sequences CHECK (a_read_sequence >= 0 AND b_read_sequence >= 0
        AND a_read_sequence <= latest_sequence AND b_read_sequence <= latest_sequence)
);
CREATE INDEX idx_messaging_participant_a ON messaging_thread(store_id, participant_a);
CREATE INDEX idx_messaging_participant_b ON messaging_thread(store_id, participant_b);

CREATE TABLE chat_message (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES messaging_thread(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    client_message_id UUID NOT NULL,
    message_sequence BIGINT NOT NULL CHECK (message_sequence > 0),
    content VARCHAR(4000) NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_chat_client_message UNIQUE (thread_id, sender_id, client_message_id),
    CONSTRAINT uq_chat_sequence UNIQUE (thread_id, message_sequence)
);
CREATE INDEX idx_chat_message_history ON chat_message(thread_id, message_sequence DESC);

CREATE TABLE store_announcement (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES staff(id),
    title VARCHAR(160) NOT NULL CHECK (length(trim(title)) > 0),
    content VARCHAR(10000) NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_store_announcement_history ON store_announcement(store_id, created_at DESC, id DESC);
