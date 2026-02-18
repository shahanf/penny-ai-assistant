import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Check if there's already a pending or running sync
    const existing = await sql`
      SELECT id, status, started_at
      FROM sync_log
      WHERE status IN ('requested', 'running')
      ORDER BY started_at DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      return res.status(200).json({
        id: existing[0].id,
        status: existing[0].status,
        message: `A sync is already ${existing[0].status}`,
      });
    }

    // Insert a new requested sync
    const result = await sql`
      INSERT INTO sync_log (started_at, status, triggered_by)
      VALUES (NOW(), 'requested', 'manual')
      RETURNING id, status
    `;

    return res.status(200).json({
      id: result[0].id,
      status: 'requested',
      message: 'Sync requested — waiting for runner to pick it up',
    });
  } catch (error) {
    console.error('Error requesting sync:', error);
    return res.status(500).json({ error: 'Failed to request sync' });
  }
}
