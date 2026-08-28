-- Migration: 003_finalize_trip_ownership
-- Assigns every legacy trip to an existing registered user, then enforces
-- mandatory ownership. The email is supplied through LEGACY_OWNER_EMAIL.

DO $$
DECLARE
    owner_id BIGINT;
BEGIN
    SELECT id
    INTO owner_id
    FROM users
    WHERE lower(email) = lower(%(legacy_owner_email)s)
    LIMIT 1;

    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'Legacy trip owner account was not found';
    END IF;

    UPDATE trips
    SET user_id = owner_id
    WHERE user_id IS NULL;

    IF EXISTS (SELECT 1 FROM trips WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Some trips still do not have an owner';
    END IF;
END
$$;

ALTER TABLE trips
    ALTER COLUMN user_id SET NOT NULL;
