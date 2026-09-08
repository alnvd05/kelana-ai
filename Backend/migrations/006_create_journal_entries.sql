CREATE TABLE IF NOT EXISTS journal_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
    entry_type VARCHAR(16) NOT NULL,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    location VARCHAR(160),
    occurred_on DATE,
    photo_key VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT ck_journal_entries_type CHECK (entry_type IN ('moment', 'note'))
);

CREATE INDEX IF NOT EXISTS ix_journal_entries_user_id
    ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS ix_journal_entries_trip_id
    ON journal_entries(trip_id);
CREATE INDEX IF NOT EXISTS ix_journal_entries_entry_type
    ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS ix_journal_entries_is_deleted
    ON journal_entries(is_deleted);
