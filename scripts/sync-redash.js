#!/usr/bin/env node

/**
 * Redash → Neon Sync Script
 *
 * Pulls the 2 Redash reports (Client Summary + Employee Summary)
 * and upserts them into the Neon Postgres database.
 *
 * Redash column mapping:
 *   Client Summary: NAME→company, PRICING_MODEL→model, ADMIN_EMAILS→admin_email, etc.
 *   Employee Summary: EMPLOYEE_ID→employee_code, PAY_RATE_TYPE→paytype, etc.
 *
 * Usage: node scripts/sync-redash.js
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const {
  DATABASE_URL,
  REDASH_BASE_URL,
  REDASH_CLIENT_QUERY_ID,
  REDASH_CLIENT_QUERY_KEY,
  REDASH_EMPLOYEE_QUERY_ID,
  REDASH_EMPLOYEE_QUERY_KEY,
} = process.env;

const required = {
  DATABASE_URL, REDASH_BASE_URL,
  REDASH_CLIENT_QUERY_ID, REDASH_CLIENT_QUERY_KEY,
  REDASH_EMPLOYEE_QUERY_ID, REDASH_EMPLOYEE_QUERY_KEY,
};
for (const [key, val] of Object.entries(required)) {
  if (!val) { console.error(`Missing: ${key}`); process.exit(1); }
}

const sql = neon(DATABASE_URL);

// ============================================
// REDASH API
// ============================================

async function fetchRedashQuery(queryId, apiKey) {
  const url = `${REDASH_BASE_URL}/api/queries/${queryId}/results.json?api_key=${apiKey}`;
  console.log(`Fetching Redash query ${queryId}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Redash error (query ${queryId}): ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  const rows = data?.query_result?.data?.rows;
  if (!rows?.length) throw new Error(`No rows from query ${queryId}`);
  console.log(`  → ${rows.length} rows`);
  return rows;
}

// ============================================
// COMPANY SYNC (Redash Client Summary → companies table)
// ============================================

async function syncCompanies(rows) {
  console.log(`\nSyncing ${rows.length} companies...`);
  let ok = 0, errs = 0;

  for (const r of rows) {
    const company = String(r.NAME || '').trim();
    if (!company) continue;

    try {
      await sql`
        INSERT INTO companies (
          partnership, company, model, launch_date,
          eligible, adopted, adoption_rate,
          active, active_per_adopted,
          transfers_in_period, total_transfer_amount,
          admin_email, csm_owner, delivery_manager, sector, credit_score,
          in_hypercare, pricing_model,
          config_comms_series, config_max_transfer_pct,
          config_invite_on_creation, config_invite_on_demand,
          config_marketing_pref, config_transfers_disable,
          pending, enrolling,
          avg_30d_transfers, avg_30d_enrolled, avg_30d_streamers, total_30d_transfers,
          trailing_30d_avg_daily_gross_rev, sum_trailing_30d_net_rev, trailing_30d_avg_daily_net_rev,
          sum_trailing_14d_net_rev, trailing_14d_avg_daily_net_rev,
          daily_active_app_users, weekly_active_app_users, monthly_active_app_users,
          active_savings_accounts, savings_balance_usd, avg_balance_per_account,
          shifts_created_in_period,
          updated_at
        ) VALUES (
          ${String(r.PARTNERSHIP || '')},
          ${company},
          ${String(r.PRICING_MODEL || '')},
          ${String(r.LAUNCH_DATE || '')},
          ${parseInt(r.ELIGIBLE) || 0},
          ${parseInt(r.ADOPTED) || 0},
          ${parseFloat(r.ADOPTION_RATE) || 0},
          ${parseInt(r.ACTIVE) || 0},
          ${parseFloat(r.ACTIVE_PER_ADOPTED) || 0},
          ${parseInt(r.TRANSFERS_IN_PERIOD) || 0},
          ${parseFloat(r.TOTAL_TRANSFER_AMOUNT_IN_PERIOD) || 0},
          ${String(r.ADMIN_EMAILS || '')},
          ${String(r.CSM_OWNER || '')},
          ${String(r.DELIVERY_MANAGER || '')},
          ${String(r.SECTOR || '')},
          ${String(r.CREDIT_SCORE || '')},
          ${r.IN_HYPERCARE === true},
          ${String(r.PRICING_MODEL || '')},
          ${String(r.CONFIG_COMMS_SERIES || '')},
          ${r.CONFIG_MAX_TRANSFER_PCT != null ? parseFloat(r.CONFIG_MAX_TRANSFER_PCT) : null},
          ${r.CONFIG_INVITE_ON_CREATION != null ? r.CONFIG_INVITE_ON_CREATION === true : null},
          ${r.CONFIG_INVITE_ON_DEMAND != null ? r.CONFIG_INVITE_ON_DEMAND === true : null},
          ${String(r.CONFIG_MARKETING_PREF || '')},
          ${r.CONFIG_TRANSFERS_DISABLED === true},
          ${r.PENDING != null ? parseInt(r.PENDING) : null},
          ${r.ENROLLING != null ? parseInt(r.ENROLLING) : null},
          ${r.AVG_30D_TRANSFERS != null ? parseFloat(r.AVG_30D_TRANSFERS) : null},
          ${r.AVG_30D_ENROLLED != null ? parseFloat(r.AVG_30D_ENROLLED) : null},
          ${r.AVG_30D_STREAMERS != null ? parseFloat(r.AVG_30D_STREAMERS) : null},
          ${r.TOTAL_30D_TRANSFERS != null ? parseFloat(r.TOTAL_30D_TRANSFERS) : null},
          ${r.TRAILING_30D_AVG_DAILY_GROSS_REV != null ? parseFloat(r.TRAILING_30D_AVG_DAILY_GROSS_REV) : null},
          ${r.SUM_TRAILING_30D_NET_REV != null ? parseFloat(r.SUM_TRAILING_30D_NET_REV) : null},
          ${r.TRAILING_30D_AVG_DAILY_NET_REV != null ? parseFloat(r.TRAILING_30D_AVG_DAILY_NET_REV) : null},
          ${r.SUM_TRAILING_14D_NET_REV != null ? parseFloat(r.SUM_TRAILING_14D_NET_REV) : null},
          ${r.TRAILING_14D_AVG_DAILY_NET_REV != null ? parseFloat(r.TRAILING_14D_AVG_DAILY_NET_REV) : null},
          ${r.DAILY_ACTIVE_APP_USERS != null ? parseInt(r.DAILY_ACTIVE_APP_USERS) : null},
          ${r.WEEKLY_ACTIVE_APP_USERS != null ? parseInt(r.WEEKLY_ACTIVE_APP_USERS) : null},
          ${r.MONTHLY_ACTIVE_APP_USERS != null ? parseInt(r.MONTHLY_ACTIVE_APP_USERS) : null},
          ${r.ACTIVE_SAVINGS_ACCOUNTS != null ? parseInt(r.ACTIVE_SAVINGS_ACCOUNTS) : null},
          ${r.SAVINGS_BALANCE_USD != null ? parseFloat(r.SAVINGS_BALANCE_USD) : null},
          ${r.AVG_BALANCE_PER_ACCOUNT != null ? parseFloat(r.AVG_BALANCE_PER_ACCOUNT) : null},
          ${r.SHIFTS_CREATED_IN_PERIOD != null ? parseInt(r.SHIFTS_CREATED_IN_PERIOD) : null},
          NOW()
        )
        ON CONFLICT (company) DO UPDATE SET
          partnership = EXCLUDED.partnership,
          model = EXCLUDED.model,
          launch_date = EXCLUDED.launch_date,
          eligible = EXCLUDED.eligible,
          adopted = EXCLUDED.adopted,
          adoption_rate = EXCLUDED.adoption_rate,
          active = EXCLUDED.active,
          active_per_adopted = EXCLUDED.active_per_adopted,
          transfers_in_period = EXCLUDED.transfers_in_period,
          total_transfer_amount = EXCLUDED.total_transfer_amount,
          admin_email = EXCLUDED.admin_email,
          csm_owner = EXCLUDED.csm_owner,
          delivery_manager = EXCLUDED.delivery_manager,
          sector = EXCLUDED.sector,
          credit_score = EXCLUDED.credit_score,
          in_hypercare = EXCLUDED.in_hypercare,
          pricing_model = EXCLUDED.pricing_model,
          config_comms_series = EXCLUDED.config_comms_series,
          config_max_transfer_pct = EXCLUDED.config_max_transfer_pct,
          config_invite_on_creation = EXCLUDED.config_invite_on_creation,
          config_invite_on_demand = EXCLUDED.config_invite_on_demand,
          config_marketing_pref = EXCLUDED.config_marketing_pref,
          config_transfers_disable = EXCLUDED.config_transfers_disable,
          pending = EXCLUDED.pending,
          enrolling = EXCLUDED.enrolling,
          avg_30d_transfers = EXCLUDED.avg_30d_transfers,
          avg_30d_enrolled = EXCLUDED.avg_30d_enrolled,
          avg_30d_streamers = EXCLUDED.avg_30d_streamers,
          total_30d_transfers = EXCLUDED.total_30d_transfers,
          trailing_30d_avg_daily_gross_rev = EXCLUDED.trailing_30d_avg_daily_gross_rev,
          sum_trailing_30d_net_rev = EXCLUDED.sum_trailing_30d_net_rev,
          trailing_30d_avg_daily_net_rev = EXCLUDED.trailing_30d_avg_daily_net_rev,
          sum_trailing_14d_net_rev = EXCLUDED.sum_trailing_14d_net_rev,
          trailing_14d_avg_daily_net_rev = EXCLUDED.trailing_14d_avg_daily_net_rev,
          daily_active_app_users = EXCLUDED.daily_active_app_users,
          weekly_active_app_users = EXCLUDED.weekly_active_app_users,
          monthly_active_app_users = EXCLUDED.monthly_active_app_users,
          active_savings_accounts = EXCLUDED.active_savings_accounts,
          savings_balance_usd = EXCLUDED.savings_balance_usd,
          avg_balance_per_account = EXCLUDED.avg_balance_per_account,
          shifts_created_in_period = EXCLUDED.shifts_created_in_period,
          updated_at = NOW()
      `;
      ok++;
    } catch (err) {
      errs++;
      console.error(`  Error [${company}]:`, err.message);
    }
  }

  console.log(`  → ${ok} upserted, ${errs} errors`);
  return { upserted: ok, errors: errs };
}

// ============================================
// EMPLOYEE SYNC (Redash Employee Summary → employees table)
// ============================================

async function syncEmployees(rows) {
  console.log(`\nSyncing ${rows.length} employees...`);
  let ok = 0, errs = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fullName = String(r.FULL_NAME || '').trim();
    const company = String(r.COMPANY || '').trim();
    if (!fullName || !company) continue;

    const employeeCode = String(r.EMPLOYEE_ID || fullName).trim();

    try {
      await sql`
        INSERT INTO employees (
          full_name, employee_code, company,
          current_state, paused, location, paytype,
          has_savings_acct, save_balance, outstanding_balance,
          pay_group, work_email, pause_reason, is_on_loa,
          transfers_disabled, transfers_disabled_reason, transfers_disabled_timestamp,
          invited_at, employer_start_date, terminated_at,
          days_since_created, routing_number, account_number_masked, card_last_4,
          transfers_made_this_pay_cycle_14d, amount_transferred_this_pay_cycle_14d,
          transfers_made_last_pay_cycle_14d, amount_transferred_last_pay_cycle_14d,
          lifetime_total_transfers, lifetime_volume_streamed_usd,
          last_stream_date, days_since_last_stream, avg_stream_amount_usd,
          in_hypercare,
          updated_at
        ) VALUES (
          ${fullName},
          ${employeeCode},
          ${company},
          ${String(r.CURRENT_STATE || '')},
          ${String(r.PAUSED || '').toLowerCase() === 'true'},
          ${String(r.LOCATION || '')},
          ${String(r.PAY_RATE_TYPE || '')},
          ${r.HAS_SAVINGS_ACCT === true || String(r.HAS_SAVINGS_ACCT || '').toLowerCase() === 'true'},
          ${parseFloat(r.SAVE_BALANCE) || 0},
          ${parseFloat(r.OUTSTANDING_PRINCIPAL) || 0},
          ${String(r.PAY_GROUP || '')},
          ${String(r.WORK_EMAIL || '')},
          ${String(r.PAUSE_REASON || '')},
          ${r.IS_ON_LOA === true},
          ${r.TRANSFERS_DISABLED === true || String(r.TRANSFERS_DISABLED || '').toLowerCase() === 'true'},
          ${String(r.TRANSFERS_DISABLED_REASON || '')},
          ${r.TRANSFERS_DISABLED_TIMESTAMP || null},
          ${r.INVITED_AT || null},
          ${String(r.EMPLOYER_START_DATE || '')},
          ${r.TERMINATED_AT || null},
          ${r.DAYS_SINCE_CREATED != null ? parseInt(r.DAYS_SINCE_CREATED) : null},
          ${String(r.ROUTING_NUMBER || '')},
          ${String(r.ACCOUNT_NUMBER_MASKED || '')},
          ${String(r.CARD_LAST_4 || '')},
          ${r.TRANSFERS_MADE_THIS_PAY_CYCLE_14D != null ? parseInt(r.TRANSFERS_MADE_THIS_PAY_CYCLE_14D) : null},
          ${r.AMOUNT_TRANSFERRED_THIS_PAY_CYCLE_14D != null ? parseFloat(r.AMOUNT_TRANSFERRED_THIS_PAY_CYCLE_14D) : null},
          ${r.TRANSFERS_MADE_LAST_PAY_CYCLE_14D != null ? parseInt(r.TRANSFERS_MADE_LAST_PAY_CYCLE_14D) : null},
          ${r.AMOUNT_TRANSFERRED_LAST_PAY_CYCLE_14D != null ? parseFloat(r.AMOUNT_TRANSFERRED_LAST_PAY_CYCLE_14D) : null},
          ${r.LIFETIME_TOTAL_TRANSFERS != null ? parseInt(r.LIFETIME_TOTAL_TRANSFERS) : null},
          ${r.LIFETIME_VOLUME_STREAMED_USD != null ? parseFloat(r.LIFETIME_VOLUME_STREAMED_USD) : null},
          ${String(r.LAST_STREAM_DATE || '')},
          ${r.DAYS_SINCE_LAST_STREAM != null ? parseInt(r.DAYS_SINCE_LAST_STREAM) : null},
          ${r.AVG_STREAM_AMOUNT_USD != null ? parseFloat(r.AVG_STREAM_AMOUNT_USD) : null},
          ${r.IN_HYPERCARE === true},
          NOW()
        )
        ON CONFLICT (employee_code, company) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          current_state = EXCLUDED.current_state,
          paused = EXCLUDED.paused,
          location = EXCLUDED.location,
          paytype = EXCLUDED.paytype,
          has_savings_acct = EXCLUDED.has_savings_acct,
          save_balance = EXCLUDED.save_balance,
          outstanding_balance = EXCLUDED.outstanding_balance,
          pay_group = EXCLUDED.pay_group,
          work_email = EXCLUDED.work_email,
          pause_reason = EXCLUDED.pause_reason,
          is_on_loa = EXCLUDED.is_on_loa,
          transfers_disabled = EXCLUDED.transfers_disabled,
          transfers_disabled_reason = EXCLUDED.transfers_disabled_reason,
          transfers_disabled_timestamp = EXCLUDED.transfers_disabled_timestamp,
          invited_at = EXCLUDED.invited_at,
          employer_start_date = EXCLUDED.employer_start_date,
          terminated_at = EXCLUDED.terminated_at,
          days_since_created = EXCLUDED.days_since_created,
          routing_number = EXCLUDED.routing_number,
          account_number_masked = EXCLUDED.account_number_masked,
          card_last_4 = EXCLUDED.card_last_4,
          transfers_made_this_pay_cycle_14d = EXCLUDED.transfers_made_this_pay_cycle_14d,
          amount_transferred_this_pay_cycle_14d = EXCLUDED.amount_transferred_this_pay_cycle_14d,
          transfers_made_last_pay_cycle_14d = EXCLUDED.transfers_made_last_pay_cycle_14d,
          amount_transferred_last_pay_cycle_14d = EXCLUDED.amount_transferred_last_pay_cycle_14d,
          lifetime_total_transfers = EXCLUDED.lifetime_total_transfers,
          lifetime_volume_streamed_usd = EXCLUDED.lifetime_volume_streamed_usd,
          last_stream_date = EXCLUDED.last_stream_date,
          days_since_last_stream = EXCLUDED.days_since_last_stream,
          avg_stream_amount_usd = EXCLUDED.avg_stream_amount_usd,
          in_hypercare = EXCLUDED.in_hypercare,
          updated_at = NOW()
      `;
      ok++;
    } catch (err) {
      errs++;
      if (errs <= 10) {
        console.error(`  Error [${fullName} @ ${company}]:`, err.message);
      }
    }

    if ((i + 1) % 5000 === 0 || i + 1 === rows.length) {
      console.log(`  → Progress: ${i + 1}/${rows.length} (${ok} ok, ${errs} errors)`);
    }
  }

  console.log(`  → ${ok} upserted, ${errs} errors`);
  return { upserted: ok, errors: errs };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Redash → Neon Sync ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    const [clientRows, employeeRows] = await Promise.all([
      fetchRedashQuery(REDASH_CLIENT_QUERY_ID, REDASH_CLIENT_QUERY_KEY),
      fetchRedashQuery(REDASH_EMPLOYEE_QUERY_ID, REDASH_EMPLOYEE_QUERY_KEY),
    ]);

    const companyResult = await syncCompanies(clientRows);
    const employeeResult = await syncEmployees(employeeRows);

    console.log('\n=== Sync Complete ===');
    console.log(`Companies: ${companyResult.upserted} ok, ${companyResult.errors} errors`);
    console.log(`Employees: ${employeeResult.upserted} ok, ${employeeResult.errors} errors`);

    const [cc, ec] = await Promise.all([
      sql`SELECT COUNT(*) as cnt FROM companies`,
      sql`SELECT COUNT(*) as cnt FROM employees`,
    ]);
    console.log(`Neon totals: ${cc[0].cnt} companies, ${ec[0].cnt} employees`);
  } catch (err) {
    console.error('\nSync failed:', err.message);
    process.exit(1);
  }
}

main();
