import { neon } from '@neondatabase/serverless';

// Short aliases reduce JSON payload size.
// csvDataLoader.js expands these back to full names on the client.
const COMPANY_COLUMNS = `
  COALESCE(company_id, '') AS cid,
  COALESCE(partnership, '') AS pt,
  company AS co,
  COALESCE(launch_date, '') AS ld,
  COALESCE(csm_owner, '') AS csm,
  COALESCE(delivery_manager, '') AS dm,
  COALESCE(partner_state, '') AS ps,
  COALESCE(sector, '') AS se,
  COALESCE(disabled_date, '') AS dd,
  COALESCE(date_live, '') AS dl,
  COALESCE(credit_score, '') AS crs,
  COALESCE(crm_sector, '') AS crms,
  COALESCE(crm_signed_on, '') AS crso,
  COALESCE(integration_partners, '') AS ip,
  COALESCE(product_type, '') AS prt,
  COALESCE(eligible, 0) AS el,
  COALESCE(installed, 0) AS ins,
  COALESCE(pending, 0) AS pe,
  COALESCE(enrolling, 0) AS en,
  COALESCE(enrolled_excludes_active, 0) AS eea,
  COALESCE(adopted, 0) AS ad,
  COALESCE(adoption_rate, 0) AS ar,
  COALESCE(active, 0) AS ac,
  COALESCE(active_per_adopted, 0) AS apa,
  COALESCE(active_per_eligible, 0) AS ape,
  COALESCE(disabled_users, 0) AS du,
  COALESCE(trailing_30d_streamers, 0) AS s30,
  COALESCE(trailing_14d_streamers, 0) AS s14,
  COALESCE(trailing_7d_streamers, 0) AS s7,
  COALESCE(rolling_unique_monthly_streamers, 0) AS rums,
  COALESCE(avg_30d_eligible, 0) AS a3el,
  COALESCE(avg_30d_enrolled, 0) AS a3e,
  COALESCE(avg_30d_streamers, 0) AS a3s,
  COALESCE(avg_30d_transfers, 0) AS a3t,
  COALESCE(total_30d_transfers, 0) AS t3t,
  COALESCE(sum_trailing_30d_net_rev, 0) AS nr30,
  COALESCE(sum_trailing_14d_net_rev, 0) AS nr14,
  COALESCE(daily_active_app_users, 0) AS dau,
  COALESCE(weekly_active_app_users, 0) AS wau,
  COALESCE(monthly_active_app_users, 0) AS mau,
  COALESCE(active_savings_accounts, 0) AS asa,
  COALESCE(savings_balance_usd, 0) AS sbu,
  COALESCE(streamers_on_last_day, 0) AS sld,
  COALESCE(transfers_on_last_day, 0) AS tld,
  COALESCE(net_fee_rev_on_last_day, 0) AS nfr,
  COALESCE(transfers_in_period, 0) AS tip,
  COALESCE(total_transfer_amount, 0) AS tta,
  COALESCE(avg_daily_transfer_amount_in_period, 0) AS adta,
  COALESCE(net_transfer_revenue_in_period, 0) AS ntr,
  COALESCE(instant_transfers_in_period, 0) AS itp,
  COALESCE(nextday_transfers_in_period, 0) AS ntp,
  COALESCE(instant_amount_in_period, 0) AS iap,
  COALESCE(nextday_amount_in_period, 0) AS nap,
  COALESCE(instant_gross_rev_in_period, 0) AS igr,
  COALESCE(nextday_gross_rev_in_period, 0) AS ngr,
  COALESCE(new_joiners_in_period, 0) AS njp,
  COALESCE(new_joiners_enrolled_in_30d_in_period, 0) AS nje30,
  COALESCE(terminated_in_period, 0) AS termp,
  COALESCE(salary_processed_amount_in_period, 0) AS spa,
  COALESCE(savings_opened_in_period, 0) AS sop,
  COALESCE(savings_closed_in_period, 0) AS scp,
  COALESCE(shifts_created_in_period, 0) AS sip,
  COALESCE(admin_count, 0) AS adc,
  COALESCE(admin_email, '') AS ae
`;

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

    const cols = sql.unsafe(COMPANY_COLUMNS);
    const rows = await sql`SELECT ${cols} FROM companies ORDER BY company`;

    cache = rows;
    cacheSyncTs = String(syncTs);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ error: 'Failed to fetch companies' });
  }
}
