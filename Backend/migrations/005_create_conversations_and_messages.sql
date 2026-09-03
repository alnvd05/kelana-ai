-- Migration: 005_create_conversations_and_messages
-- Persists authenticated, multi-turn conversations and their ordered messages.

CREATE TABLE IF NOT EXISTS conversations (
    id          BIGSERIAL     PRIMARY KEY,
    user_id     BIGINT        NOT NULL,
    title       VARCHAR(256)  NOT NULL DEFAULT 'New conversation',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by  BIGINT,
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by  BIGINT,
    deleted_at  TIMESTAMPTZ,
    deleted_by  BIGINT,
    is_deleted  BOOLEAN       NOT NULL DEFAULT false,
    CONSTRAINT fk_conversations_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS messages (
    id               BIGSERIAL    PRIMARY KEY,
    conversation_id  BIGINT       NOT NULL,
    role              VARCHAR(16)  NOT NULL,
    content           TEXT         NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT fk_messages_conversation_id
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,
    CONSTRAINT ck_messages_role CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX IF NOT EXISTS ix_conversations_user_id
    ON conversations(user_id);
CREATE INDEX IF NOT EXISTS ix_conversations_is_deleted
    ON conversations(is_deleted);
CREATE INDEX IF NOT EXISTS ix_conversations_user_updated
    ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id
    ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_created
    ON messages(conversation_id, created_at, id);
