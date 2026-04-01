import { pool } from "./db";
import fs from "fs";
import path from "path";

/**
 * Runs pending SQL migration files from the migrations/ folder.
 * Applied migrations are tracked in a _migrations table so each file runs once.
 * NOTE: statements run outside of a transaction to support CREATE INDEX CONCURRENTLY.
 */
export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("[migrate] No migrations folder found, skipping");
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT name FROM _migrations WHERE name = $1",
      [file],
    );
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      console.log(`[migrate] Applied: ${file}`);
    } catch (err: any) {
      console.error(`[migrate] Error applying ${file}: ${err.message}`);
    }
  }

  console.log("[migrate] Migrations complete.");
}
