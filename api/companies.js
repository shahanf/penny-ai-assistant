import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT
        partnership,
        company,
        model,
        launch_date,
        eligible,
        adopted,
        adoption_rate,
        active,
        active_per_adopted,
        transfers_in_period,
        total_transfer_amount,
        admin_email
      FROM companies
      ORDER BY company
    `;
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ error: 'Failed to fetch companies' });
  }
}
