import { neon } from '@neondatabase/serverless';

// Sync-aware in-memory cache
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

    // Sync-aware cache: only re-query if a new sync happened
    const syncTs = await getLatestSyncTs(sql);
    if (cache && syncTs && cacheSyncTs === String(syncTs)) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
      return res.status(200).json(cache);
    }

    // Run company + consolidated employee aggregate in parallel (2 queries instead of 4)
    const [companyStats, employeeStats] = await Promise.all([
      sql`
        SELECT
          COUNT(*) as total_companies,
          COALESCE(SUM(eligible), 0) as total_eligible,
          COALESCE(SUM(adopted), 0) as total_adopted,
          COALESCE(SUM(active), 0) as total_active,
          COALESCE(SUM(transfers_in_period), 0) as total_transfers,
          COALESCE(SUM(total_transfer_amount), 0) as total_transfer_amount
        FROM companies
      `,
      sql`
        SELECT
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE paused = true) as paused_employees,
          COUNT(*) FILTER (WHERE paused = false OR paused IS NULL) as active_employees,
          COUNT(*) FILTER (WHERE save_balance > 0) as employees_with_savings,
          COALESCE(SUM(CASE WHEN save_balance > 0 THEN save_balance ELSE 0 END), 0) as total_savings,
          COUNT(*) FILTER (WHERE outstanding_balance > 0) as employees_with_outstanding,
          COALESCE(SUM(CASE WHEN outstanding_balance > 0 THEN outstanding_balance ELSE 0 END), 0) as total_outstanding
        FROM employees
      `,
    ]);

    const cs = companyStats[0];
    const es = employeeStats[0];

    const totalEligible = Number(cs.total_eligible);
    const totalAdopted = Number(cs.total_adopted);

    const stats = {
      totalCompanies: Number(cs.total_companies),
      totalEligible,
      totalAdopted,
      totalActive: Number(cs.total_active),
      overallAdoptionRate: totalEligible > 0 ? totalAdopted / totalEligible : 0,
      totalTransfers: Number(cs.total_transfers),
      totalTransferAmount: Number(cs.total_transfer_amount),
      avgTransferAmount: Number(cs.total_transfers) > 0
        ? Number(cs.total_transfer_amount) / Number(cs.total_transfers)
        : 0,
      totalEmployees: Number(es.total_employees),
      activeEmployees: Number(es.active_employees),
      pausedEmployees: Number(es.paused_employees),
      employeesWithSavingsAccounts: Number(es.employees_with_savings),
      employeesWithSavingsBalance: Number(es.employees_with_savings),
      totalSavingsBalance: Number(es.total_savings),
      avgSavingsBalance: Number(es.employees_with_savings) > 0
        ? Number(es.total_savings) / Number(es.employees_with_savings)
        : 0,
      employeesWithOutstandingBalance: Number(es.employees_with_outstanding),
      totalOutstandingBalance: Number(es.total_outstanding),
      avgOutstandingBalance: Number(es.employees_with_outstanding) > 0
        ? Number(es.total_outstanding) / Number(es.employees_with_outstanding)
        : 0,
    };

    cache = stats;
    cacheSyncTs = String(syncTs);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
