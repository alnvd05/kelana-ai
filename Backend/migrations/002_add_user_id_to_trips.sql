-- Migration: 002_add_user_id_to_trips
-- Adds ownership and timestamp columns to the existing trips table.
-- user_id remains nullable during the staged migration so existing trips are
-- preserved until they can be assigned to the intended registered account.

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

ALTER TABLE trips
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_trips_user_id'
          AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips
            ADD CONSTRAINT fk_trips_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ix_trips_user_id ON trips(user_id);
