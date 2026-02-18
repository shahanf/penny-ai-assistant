import { neon } from '@neondatabase/serverless';

/**
 * Lightweight endpoint: returns ONLY the latest successful sync timestamp.
 * Used by the client to decide if cached data is stale (sync-aware cache invalidation).
 * Payload: ~100 bytes. Cached 60s on Vercel edge.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT started_at AS last_success_at,
             COALESCE(total_employees, 0) AS total_employees,
             COALESCE(total_companies, 0) AS total_companies
      FROM sync_log
      WHERE status = 'success'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(rows[0] || { last_success_at: null, total_employees: 0, total_companies: 0 });
  } catch (error) {
    console.error('Error fetching latest sync:', error);
    return res.status(500).json({ error: 'Failed to fetch latest sync' });
  }
}
