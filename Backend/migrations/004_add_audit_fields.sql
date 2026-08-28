-- Migration: 004_add_audit_fields
-- Adds audit metadata and soft-delete flags to users and trips.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_by BIGINT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_by BIGINT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by BIGINT,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS created_by BIGINT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_by BIGINT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by BIGINT,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Existing records were created and last maintained by their current owner.
UPDATE users
SET created_by = id,
    updated_by = id,
    updated_at = created_at
WHERE created_by IS NULL;

UPDATE trips
SET created_by = user_id,
    updated_by = user_id,
    updated_at = created_at
WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS ix_users_is_deleted ON users(is_deleted);
CREATE INDEX IF NOT EXISTS ix_trips_is_deleted ON trips(is_deleted);
