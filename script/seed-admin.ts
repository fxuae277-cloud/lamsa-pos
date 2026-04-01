/**
 * Guaranteed production seed script.
 *
 * - Creates admin/ahmed if they don't exist.
 * - Updates their password hash if they do exist.
 * - Connects via DATABASE_URL — works against Railway's live Postgres.
 * - Safe to run multiple times (idempotent upsert).
 *
 * Usage:
 *   Local:   npm run seed:admin
 *   Railway: railway run npm run seed:admin
 */

import { guaranteedProductionSeed } from "../server/seed";
import { pool } from "../server/db";

try {
  await guaranteedProductionSeed();
} finally {
  await pool.end();
}
