import { neon } from '@neondatabase/serverless';

// Short aliases reduce JSON payload by ~40% for 131K rows.
// csvDataLoader.js expands these back to full names on the client.
const EMPLOYEE_COLUMNS = `
  full_name AS n,
  company AS co,
  COALESCE(employee_id, '') AS eid,
  COALESCE(current_state, '') AS cs,
  COALESCE(salary_or_hourly, '') AS soh,
  COALESCE(pay_group, '') AS pg,
  COALESCE(employee_created_at, '') AS eca,
  COALESCE(invited_at::text, '') AS ia,
  COALESCE(started_on, '') AS so,
  COALESCE(terminated_at::text, '') AS ta,
  paused AS p,
  COALESCE(pause_reason, '') AS pr,
  COALESCE(transfers_disabled, false) AS td,
  COALESCE(transfers_disabled_reason, '') AS tdr,
  COALESCE(lifetime_total_transfers, 0) AS ltt,
  COALESCE(lifetime_volume_streamed_usd, 0) AS lvs,
  COALESCE(transfers_90d, 0) AS t90,
  COALESCE(volume_90d_usd, 0) AS v90,
  COALESCE(last_stream_date, '') AS lsd,
  COALESCE(transfers_30d, 0) AS t30,
  COALESCE(volume_30d_usd, 0) AS v30,
  COALESCE(transfers_14d, 0) AS tc,
  COALESCE(volume_14d_usd, 0) AS ac,
  COALESCE(transfers_prev_14d, 0) AS tl,
  COALESCE(volume_prev_14d_usd, 0) AS al,
  save_balance AS sb,
  outstanding_balance AS ob
`;

// Sync-aware in-memory cache — survives across warm Vercel function invocations.
// Only re-queries Neon when a new sync has happened (checks sync_log first).
let cache = null;
let cacheSyncTs = null;

async function getLatestSyncTs(sql) {
  const rows = await sql`SELECT started_at FROM sync_log WHERE status='success' ORDER BY started_at DESC LIMIT 1`;
  return rows[0]?.started_at || null;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Support optional company filter for lighter queries (no cache for filtered)
    const { company } = req.query;

    if (company) {
      const cols = sql.unsafe(EMPLOYEE_COLUMNS);
      const rows = await sql`
        SELECT ${cols} FROM employees
        WHERE LOWER(company) = LOWER(${company})
        ORDER BY full_name
      `;
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
      return res.status(200).json(rows);
    }

    // Full table request — use sync-aware cache
    const syncTs = await getLatestSyncTs(sql);
    if (cache && syncTs && cacheSyncTs === String(syncTs)) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
      return res.status(200).json(cache);
    }

    // Cache miss or new sync — query Neon
    const cols = sql.unsafe(EMPLOYEE_COLUMNS);
    const rows = await sql`
      SELECT ${cols} FROM employees
      ORDER BY company, full_name
    `;

    cache = rows;
    cacheSyncTs = String(syncTs);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
}
