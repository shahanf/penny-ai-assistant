// check-sync-request.mjs
// Checks if there's a pending force-sync request in sync_log.
// Exits with code 0 and prints "yes" if found, "no" otherwise.
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Parse .env manually to avoid dotenv's noisy stdout logging
const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.DATABASE_URL.replace('-pooler.', '.');
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 });

try {
  const r = await pool.query("SELECT id FROM sync_log WHERE status = 'requested' LIMIT 1");
  console.log(r.rows.length > 0 ? 'yes' : 'no');
} catch (err) {
  console.error('check-sync-request error:', err.message);
  console.log('no');
} finally {
  await pool.end();
}
