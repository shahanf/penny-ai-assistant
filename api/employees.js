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

    // Support optional company filter for lighter queries
    const { company } = req.query;

    let rows;
    if (company) {
      rows = await sql`
        SELECT
          full_name,
          employee_code,
          company,
          current_state,
          paused,
          location,
          paytype,
          has_savings_acct,
          save_balance,
          outstanding_balance
        FROM employees
        WHERE LOWER(company) = LOWER(${company})
        ORDER BY full_name
      `;
    } else {
      rows = await sql`
        SELECT
          full_name,
          employee_code,
          company,
          current_state,
          paused,
          location,
          paytype,
          has_savings_acct,
          save_balance,
          outstanding_balance
        FROM employees
        ORDER BY company, full_name
      `;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
}
