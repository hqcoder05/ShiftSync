CREATE TABLE messaging_thread (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    participant_one UUID NOT NULL REFERENCES staff(id),
    participant_two UUID NOT NULL REFERENCES staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (participant_one < participant_two),
    UNIQUE (store_id, participant_one, participant_two)
);

CREATE TABLE messaging_message (
    id UUID PRIMARY KEY,
    sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
    thread_id UUID NOT NULL REFERENCES messaging_thread(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES staff(id),
    client_message_id UUID NOT NULL,
    content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (thread_id, sender_id, client_message_id)
);
CREATE INDEX idx_messaging_message_thread_sequence ON messaging_message(thread_id, sequence DESC);

CREATE TABLE messaging_read_cursor (
    thread_id UUID NOT NULL REFERENCES messaging_thread(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    last_sequence BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (thread_id, staff_id)
);

CREATE TABLE messaging_announcement (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES store(id),
    author_id UUID NOT NULL REFERENCES staff(id),
    title VARCHAR(160) NOT NULL CHECK (length(trim(title)) > 0),
    content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messaging_announcement_store_created ON messaging_announcement(store_id, created_at DESC, id DESC);
