-- Migration 0007: Create settings table
-- The settings table is used by routes.ts and backup.ts for key/value config storage
-- but was never included in the Drizzle schema or earlier migrations.

CREATE TABLE IF NOT EXISTS settings (
  key         VARCHAR PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMP DEFAULT NOW()
);
