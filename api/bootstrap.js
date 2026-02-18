import { neon } from '@neondatabase/serverless';

/**
 * Lightweight bootstrap endpoint — returns just what the UI needs to render instantly:
 * - 50 random employee names
 * - 50 random company names
 * - All unique partnership names
 *
 * Payload: ~5 KB instead of 18+ MB from /api/employees
 */

// Sync-aware in-memory cache
let cache = null;
let cacheSyncTs = null;

async function getLatestSyncTs(sql) {
  const rows = await sql`SELECT started_at FROM sync_log WHERE status='success' ORDER BY started_at DESC LIMIT 1`;
  return rows[0]?.started_at || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Sync-aware cache: only re-query if a new sync happened
    const syncTs = await getLatestSyncTs(sql);
    if (cache && syncTs && cacheSyncTs === String(syncTs)) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
      return res.status(200).json(cache);
    }

    const [employeeNames, companyNames, partnerships] = await Promise.all([
      sql`SELECT full_name FROM employees WHERE full_name IS NOT NULL AND full_name != '' AND LOWER(full_name) != 'unknown' ORDER BY RANDOM() LIMIT 50`,
      sql`SELECT company FROM companies WHERE company IS NOT NULL AND company != '' ORDER BY RANDOM() LIMIT 50`,
      sql`SELECT DISTINCT partnership FROM companies WHERE partnership IS NOT NULL AND partnership != '' ORDER BY partnership`,
    ]);

    const result = {
      employeeNames: employeeNames.map(r => r.full_name),
      companyNames: companyNames.map(r => r.company),
      partnerships: partnerships.map(r => r.partnership),
    };

    cache = result;
    cacheSyncTs = String(syncTs);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in bootstrap:', error);
    return res.status(500).json({ error: 'Failed to bootstrap' });
  }
}
