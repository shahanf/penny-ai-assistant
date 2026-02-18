import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Auto-fix stale syncs: if running for >30 minutes with no finish, mark as error
    await sql`
      UPDATE sync_log
      SET status = 'error', finished_at = NOW(),
          error_message = 'Sync timed out (running over 30 minutes)'
      WHERE status = 'running'
        AND finished_at IS NULL
        AND started_at < NOW() - INTERVAL '30 minutes'
    `;

    const rows = await sql`
      SELECT
        id,
        started_at,
        COALESCE(finished_at::text, '') AS finished_at,
        COALESCE(status, 'unknown') AS status,
        COALESCE(duration_s, 0) AS duration_s,
        COALESCE(companies_fetched, 0) AS companies_fetched,
        COALESCE(companies_upserted, 0) AS companies_upserted,
        COALESCE(companies_errors, 0) AS companies_errors,
        COALESCE(employees_fetched, 0) AS employees_fetched,
        COALESCE(employees_upserted, 0) AS employees_upserted,
        COALESCE(employees_errors, 0) AS employees_errors,
        COALESCE(total_companies, 0) AS total_companies,
        COALESCE(total_employees, 0) AS total_employees,
        COALESCE(error_message, '') AS error_message,
        COALESCE(triggered_by, 'auto') AS triggered_by
      FROM sync_log
      ORDER BY started_at DESC
      LIMIT 20
    `;

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return res.status(500).json({ error: 'Failed to fetch sync status' });
  }
}
