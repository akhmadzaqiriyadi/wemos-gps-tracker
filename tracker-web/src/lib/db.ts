import { neon } from "@neondatabase/serverless";

// Helper client Neon Serverless
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  return neon(databaseUrl);
}

// Inisialisasi tabel gps_logs secara otomatis jika belum ada
export async function initDb() {
  const sql = getDb();
  if (!sql) return false;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS gps_logs (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(64) NOT NULL DEFAULT 'WEMOS-D1-MINI-PRO-01',
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        speed REAL NOT NULL DEFAULT 0,
        altitude REAL NOT NULL DEFAULT 0,
        satellites INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS device_heartbeat (
        device_id VARCHAR(64) PRIMARY KEY,
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
        satellites INT NOT NULL DEFAULT 0,
        speed REAL NOT NULL DEFAULT 0,
        altitude REAL NOT NULL DEFAULT 0,
        latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
        longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
        raw_status TEXT NOT NULL DEFAULT ''
      );
    `;
    return true;
  } catch (err) {
    console.error("Gagal inisialisasi tabel Neon Postgres:", err);
    return false;
  }
}
