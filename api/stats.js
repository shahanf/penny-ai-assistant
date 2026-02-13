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

    // Run all aggregate queries in parallel
    const [companyStats, employeeStats, savingsStats, balanceStats] = await Promise.all([
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
          COUNT(*) FILTER (WHERE paused = false OR paused IS NULL) as active_employees
        FROM employees
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE has_savings_acct = true) as employees_with_savings,
          COUNT(*) FILTER (WHERE save_balance > 0) as employees_with_balance,
          COALESCE(SUM(CASE WHEN save_balance > 0 THEN save_balance ELSE 0 END), 0) as total_savings
        FROM employees
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE outstanding_balance > 0) as employees_with_balance,
          COALESCE(SUM(CASE WHEN outstanding_balance > 0 THEN outstanding_balance ELSE 0 END), 0) as total_outstanding
        FROM employees
      `,
    ]);

    const cs = companyStats[0];
    const es = employeeStats[0];
    const ss = savingsStats[0];
    const bs = balanceStats[0];

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
      employeesWithSavingsAccounts: Number(ss.employees_with_savings),
      employeesWithSavingsBalance: Number(ss.employees_with_balance),
      totalSavingsBalance: Number(ss.total_savings),
      avgSavingsBalance: Number(ss.employees_with_balance) > 0
        ? Number(ss.total_savings) / Number(ss.employees_with_balance)
        : 0,
      employeesWithOutstandingBalance: Number(bs.employees_with_balance),
      totalOutstandingBalance: Number(bs.total_outstanding),
      avgOutstandingBalance: Number(bs.employees_with_balance) > 0
        ? Number(bs.total_outstanding) / Number(bs.employees_with_balance)
        : 0,
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
