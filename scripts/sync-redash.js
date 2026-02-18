#!/usr/bin/env node

/**
 * Redash → Neon Sync Script (Direct Postgres Connection)
 *
 * Uses pg driver with direct TCP connection for fast bulk upserts.
 * ~131K employees in ~2-5 minutes.
 *
 * Usage: node scripts/sync-redash.js
 */

import pg from 'pg';
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

// Use direct connection (replace -pooler with direct endpoint for pg driver)
const directUrl = DATABASE_URL.replace('-pooler.', '.');
const pool = new pg.Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

// ============================================
// HELPERS
// ============================================

function str(val) { return String(val ?? '').trim(); }
function num(val) { const n = parseFloat(val); return isNaN(n) ? 0 : n; }
function int(val) { const n = parseInt(val); return isNaN(n) ? 0 : n; }
function intOrNull(val) { if (val == null || val === '') return null; const n = parseInt(val); return isNaN(n) ? null : n; }
function numOrNull(val) { if (val == null || val === '') return null; const n = parseFloat(val); return isNaN(n) ? null : n; }
function bool(val) { return val === true || String(val || '').toLowerCase() === 'true'; }
function tsOrNull(val) { return val ? String(val) : null; }

// ============================================
// REDASH API
// ============================================

async function fetchRedashQuery(queryId, apiKey) {
  console.log(`Fetching Redash query ${queryId}...`);
  const triggerTime = Date.now();

  // Step 1: POST once to trigger a fresh execution (max_age=0 forces re-run)
  const baseUrl = `${REDASH_BASE_URL}/api/queries/${queryId}/results`;
  const postResp = await fetch(`${baseUrl}?api_key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_age: 0 }),
  });

  if (!postResp.ok) {
    throw new Error(`Redash refresh error (query ${queryId}): ${postResp.status} ${postResp.statusText}`);
  }

  const postData = await postResp.json();

  // If results came back immediately, use them
  if (postData?.query_result?.data?.rows?.length) {
    const rows = postData.query_result.data.rows;
    console.log(`  → ${rows.length} rows (immediate)`);
    return rows;
  }

  // A job was queued — poll with GET until it completes
  const jobId = postData?.job?.id;
  console.log(`  → Job ${jobId || 'unknown'} queued, polling...`);

  const maxWait = 300000; // 5 min
  const pollInterval = 6000; // 6 sec
  const start = Date.now();
  let pollCount = 0;

  // Log what time threshold we're using
  console.log(`  → Will accept results newer than ${new Date(triggerTime - 60000).toISOString()}`);

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));
    pollCount++;
    const elapsed = Math.round((Date.now() - start) / 1000);

    // Step 2: GET the results endpoint — returns latest cached result once job finishes
    const getResp = await fetch(
      `${baseUrl}.json?api_key=${apiKey}`
    );

    if (!getResp.ok) {
      console.log(`  poll #${pollCount}: HTTP ${getResp.status} (${elapsed}s)`);
      continue;
    }

    const getData = await getResp.json();
    const rows = getData?.query_result?.data?.rows;
    const retrievedAt = getData?.query_result?.retrieved_at;
    const rowCount = rows?.length || 0;

    if (retrievedAt) {
      const resultTime = new Date(retrievedAt).getTime();
      const isFresh = resultTime >= triggerTime - 60000;

      if (isFresh && rowCount > 0) {
        console.log(`  → ${rowCount} rows (fresh, retrieved ${retrievedAt}, ${elapsed}s, poll #${pollCount})`);
        return rows;
      } else if (isFresh && rowCount === 0) {
        // Fresh result but 0 rows — query ran but returned nothing
        throw new Error(`Redash query ${queryId} returned 0 rows (fresh result at ${retrievedAt})`);
      } else {
        // Stale result — job hasn't finished yet
        console.log(`  poll #${pollCount}: stale (${retrievedAt}, ${rowCount} rows), waiting... (${elapsed}s)`);
      }
    } else if (rowCount > 0) {
      // No timestamp — just accept
      console.log(`  → ${rowCount} rows (no timestamp, ${elapsed}s, poll #${pollCount})`);
      return rows;
    } else {
      // No results and no timestamp
      console.log(`  poll #${pollCount}: empty response (${elapsed}s)`);
    }
  }

  throw new Error(`Redash query ${queryId} timed out after ${maxWait / 1000}s`);
}

// ============================================
// COMPANY SYNC — parameterized batch upsert
// ============================================
// Redash Company Columns (query 3349):
// PARTNERSHIP, NAME, LAUNCH_DATE, COMPANY_ID, CSM_OWNER, DELIVERY_MANAGER,
// PARTNER_STATE, SECTOR, DISABLED_DATE, DATE_LIVE, CREDIT_SCORE,
// CRM_SECTOR, CRM_SIGNED_ON, INTEGRATION_PARTNERS,
// _ELIGIBLE, INSTALLED, PENDING, ENROLLING, ENROLLED_EXCLUDES_ACTIVE,
// _ADOPTED, ADOPTION_RATE, _ACTIVE, ACTIVE_PER_ADOPTED, ACTIVE_PER_ELIGIBLE,
// DISABLED_USERS, TRAILING_30D_STREAMERS, TRAILING_14D_STREAMERS,
// TRAILING_7D_STREAMERS, ROLLING_UNIQUE_MONTHLY_STREAMERS,
// AVG_30D_ELIGIBLE, AVG_30D_ENROLLED, AVG_30D_STREAMERS, AVG_30D_TRANSFERS,
// TOTAL_30D_TRANSFERS, SUM_TRAILING_30D_NET_REV, SUM_TRAILING_14D_NET_REV,
// DAILY_ACTIVE_APP_USERS, WEEKLY_ACTIVE_APP_USERS, MONTHLY_ACTIVE_APP_USERS,
// ACTIVE_SAVINGS_ACCOUNTS, SAVINGS_BALANCE_USD,
// STREAMERS_ON_LAST_DAY, TRANSFERS_ON_LAST_DAY, NET_FEE_REV_ON_LAST_DAY,
// TRANSFERS_IN_PERIOD, TOTAL_TRANSFER_AMOUNT_IN_PERIOD,
// AVG_DAILY_TRANSFER_AMOUNT_IN_PERIOD, NET_TRANSFER_REVENUE_IN_PERIOD,
// INSTANT_TRANSFERS_IN_PERIOD, NEXTDAY_TRANSFERS_IN_PERIOD,
// INSTANT_AMOUNT_IN_PERIOD, NEXTDAY_AMOUNT_IN_PERIOD,
// INSTANT_GROSS_REV_IN_PERIOD, NEXTDAY_GROSS_REV_IN_PERIOD,
// NEW_JOINERS_IN_PERIOD, NEW_JOINERS_ENROLLED_IN_30D_IN_PERIOD,
// TERMINATED_IN_PERIOD, SALARY_PROCESSED_AMOUNT_IN_PERIOD,
// SAVINGS_OPENED_IN_PERIOD, SAVINGS_CLOSED_IN_PERIOD,
// SHIFTS_CREATED_IN_PERIOD, ADMIN_COUNT, ADMIN_EMAILS

const COMPANY_COLS = [
  'company_id', 'partnership', 'company', 'launch_date',
  'csm_owner', 'delivery_manager', 'partner_state', 'sector', 'disabled_date',
  'date_live', 'credit_score', 'crm_sector', 'crm_signed_on', 'integration_partners', 'product_type',
  'eligible', 'installed', 'pending', 'enrolling', 'enrolled_excludes_active',
  'adopted', 'adoption_rate', 'active', 'active_per_adopted', 'active_per_eligible',
  'disabled_users',
  'trailing_30d_streamers', 'trailing_14d_streamers', 'trailing_7d_streamers',
  'rolling_unique_monthly_streamers',
  'avg_30d_eligible', 'avg_30d_enrolled', 'avg_30d_streamers', 'avg_30d_transfers',
  'total_30d_transfers',
  'sum_trailing_30d_net_rev', 'sum_trailing_14d_net_rev',
  'daily_active_app_users', 'weekly_active_app_users', 'monthly_active_app_users',
  'active_savings_accounts', 'savings_balance_usd',
  'streamers_on_last_day', 'transfers_on_last_day', 'net_fee_rev_on_last_day',
  'transfers_in_period', 'total_transfer_amount',
  'avg_daily_transfer_amount_in_period',
  'net_transfer_revenue_in_period',
  'instant_transfers_in_period', 'nextday_transfers_in_period',
  'instant_amount_in_period', 'nextday_amount_in_period',
  'instant_gross_rev_in_period', 'nextday_gross_rev_in_period',
  'new_joiners_in_period', 'new_joiners_enrolled_in_30d_in_period', 'terminated_in_period',
  'salary_processed_amount_in_period',
  'savings_opened_in_period', 'savings_closed_in_period',
  'shifts_created_in_period',
  'admin_count', 'admin_email',
  'updated_at',
];
const COMPANY_COL_COUNT = COMPANY_COLS.length;

function companyRowToParams(r) {
  return [
    str(r.COMPANY_ID), str(r.PARTNERSHIP), str(r.NAME), str(r.LAUNCH_DATE),
    str(r.CSM_OWNER), str(r.DELIVERY_MANAGER), str(r.PARTNER_STATE || ''),
    str(r.SECTOR), str(r.DISABLED_DATE || ''),
    str(r.DATE_LIVE || ''), str(r.CREDIT_SCORE || ''),
    str(r.CRM_SECTOR || ''), str(r.CRM_SIGNED_ON || ''), str(r.INTEGRATION_PARTNERS || ''),
    str(r.PRODUCT_TYPE || ''),
    int(r._ELIGIBLE || r.ELIGIBLE), intOrNull(r.INSTALLED),
    intOrNull(r.PENDING), intOrNull(r.ENROLLING), intOrNull(r.ENROLLED_EXCLUDES_ACTIVE),
    int(r._ADOPTED || r.ADOPTED), num(r.ADOPTION_RATE),
    int(r._ACTIVE || r.ACTIVE), num(r.ACTIVE_PER_ADOPTED), numOrNull(r.ACTIVE_PER_ELIGIBLE),
    intOrNull(r.DISABLED_USERS),
    intOrNull(r.TRAILING_30D_STREAMERS), intOrNull(r.TRAILING_14D_STREAMERS),
    intOrNull(r.TRAILING_7D_STREAMERS), intOrNull(r.ROLLING_UNIQUE_MONTHLY_STREAMERS),
    numOrNull(r.AVG_30D_ELIGIBLE), numOrNull(r.AVG_30D_ENROLLED),
    numOrNull(r.AVG_30D_STREAMERS), numOrNull(r.AVG_30D_TRANSFERS),
    numOrNull(r.TOTAL_30D_TRANSFERS),
    numOrNull(r.SUM_TRAILING_30D_NET_REV), numOrNull(r.SUM_TRAILING_14D_NET_REV),
    intOrNull(r.DAILY_ACTIVE_APP_USERS), intOrNull(r.WEEKLY_ACTIVE_APP_USERS),
    intOrNull(r.MONTHLY_ACTIVE_APP_USERS),
    intOrNull(r.ACTIVE_SAVINGS_ACCOUNTS), numOrNull(r.SAVINGS_BALANCE_USD),
    intOrNull(r.STREAMERS_ON_LAST_DAY), intOrNull(r.TRANSFERS_ON_LAST_DAY),
    numOrNull(r.NET_FEE_REV_ON_LAST_DAY),
    int(r.TRANSFERS_IN_PERIOD), num(r.TOTAL_TRANSFER_AMOUNT_IN_PERIOD),
    numOrNull(r.AVG_DAILY_TRANSFER_AMOUNT_IN_PERIOD),
    numOrNull(r.NET_TRANSFER_REVENUE_IN_PERIOD),
    intOrNull(r.INSTANT_TRANSFERS_IN_PERIOD), intOrNull(r.NEXTDAY_TRANSFERS_IN_PERIOD),
    numOrNull(r.INSTANT_AMOUNT_IN_PERIOD), numOrNull(r.NEXTDAY_AMOUNT_IN_PERIOD),
    numOrNull(r.INSTANT_GROSS_REV_IN_PERIOD), numOrNull(r.NEXTDAY_GROSS_REV_IN_PERIOD),
    intOrNull(r.NEW_JOINERS_IN_PERIOD), intOrNull(r.NEW_JOINERS_ENROLLED_IN_30D_IN_PERIOD),
    intOrNull(r.TERMINATED_IN_PERIOD),
    numOrNull(r.SALARY_PROCESSED_AMOUNT_IN_PERIOD),
    intOrNull(r.SAVINGS_OPENED_IN_PERIOD), intOrNull(r.SAVINGS_CLOSED_IN_PERIOD),
    intOrNull(r.SHIFTS_CREATED_IN_PERIOD),
    intOrNull(r.ADMIN_COUNT), str(r.ADMIN_EMAILS || r.ADMIN_EMAIL || ''),
    new Date(), // updated_at
  ];
}

const COMPANY_UPDATE_COLS = COMPANY_COLS.filter(c => c !== 'company' && c !== 'updated_at');

function buildBatchUpsertSQL(tableName, cols, colCount, rowCount, conflictCol, updateCols) {
  // Build VALUES ($1, $2, ...), ($43, $44, ...) ...
  const valueParts = [];
  for (let r = 0; r < rowCount; r++) {
    const placeholders = [];
    for (let c = 0; c < colCount; c++) {
      placeholders.push(`$${r * colCount + c + 1}`);
    }
    valueParts.push(`(${placeholders.join(', ')})`);
  }

  const updateSet = updateCols
    .map(c => `${c} = EXCLUDED.${c}`)
    .join(', ');

  return `INSERT INTO ${tableName} (${cols.join(', ')})
VALUES ${valueParts.join(', ')}
ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}, updated_at = NOW()`;
}

async function syncCompanies(rows) {
  console.log(`\nSyncing ${rows.length} companies...`);
  const startTime = Date.now();
  const client = await pool.connect();

  try {
    const validRows = rows.filter(r => str(r.NAME));
    const BATCH = 205; // All companies fit in one batch
    let ok = 0, errs = 0;

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);
      const params = batch.flatMap(companyRowToParams);
      const sql = buildBatchUpsertSQL('companies', COMPANY_COLS, COMPANY_COL_COUNT, batch.length, 'company', COMPANY_UPDATE_COLS);

      try {
        await client.query(sql, params);
        ok += batch.length;
      } catch (err) {
        console.error(`  Company batch error:`, err.message.substring(0, 200));
        errs += batch.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  → ${ok} upserted, ${errs} errors [${elapsed}s]`);
    return { upserted: ok, errors: errs };
  } finally {
    client.release();
  }
}

// ============================================
// EMPLOYEE SYNC — parameterized batch upsert
// ============================================
// Redash Employee Columns (query 3351):
// COMPANY, EMPLOYEE_ID, FULL_NAME, CURRENT_STATE, SALARY_OR_HOURLY,
// PAY_GROUP, EMPLOYEE_CREATED_AT, INVITED_AT, STARTED_ON, TERMINATED_AT,
// PAUSED, PAUSED_REASON, TRANSFERS_DISABLED, TRANSFERS_DISABLED_REASON,
// LIFETIME_TOTAL_TRANSFERS, LIFETIME_VOLUME_STREAMED_USD,
// TRANSFERS_90D, VOLUME_90D_USD, LAST_STREAM_DATE,
// TRANSFERS_30D, VOLUME_30D_USD, TRANSFERS_14D, VOLUME_14D_USD,
// TRANSFERS_PREV_14D, VOLUME_PREV_14D_USD,
// SAVE_BALANCE_USD, OUTSTANDING_PRINCIPAL_USD

const EMPLOYEE_COLS = [
  'full_name', 'employee_id', 'company',
  'current_state', 'salary_or_hourly', 'pay_group',
  'employee_created_at', 'invited_at', 'started_on',
  'terminated_at',
  'paused', 'pause_reason',
  'transfers_disabled', 'transfers_disabled_reason',
  'lifetime_total_transfers', 'lifetime_volume_streamed_usd',
  'transfers_90d', 'volume_90d_usd',
  'last_stream_date',
  'transfers_30d', 'volume_30d_usd',
  'transfers_14d', 'volume_14d_usd',
  'transfers_prev_14d', 'volume_prev_14d_usd',
  'save_balance', 'outstanding_balance',
  'updated_at',
];
const EMPLOYEE_COL_COUNT = EMPLOYEE_COLS.length;

function employeeRowToParams(r) {
  const fullName = str(r.FULL_NAME) || 'Unknown';
  const empId = str(r.EMPLOYEE_ID) || fullName;
  const company = str(r.COMPANY) || 'Unknown';
  const isPaused = bool(r.PAUSED);

  return [
    fullName, empId, company,
    str(r.CURRENT_STATE || ''),
    str(r.SALARY_OR_HOURLY || ''), str(r.PAY_GROUP || ''),
    str(r.EMPLOYEE_CREATED_AT || ''), tsOrNull(r.INVITED_AT),
    str(r.STARTED_ON || ''),
    tsOrNull(r.TERMINATED_AT),
    isPaused, str(r.PAUSED_REASON || r.PAUSE_REASON || ''),
    bool(r.TRANSFERS_DISABLED), str(r.TRANSFERS_DISABLED_REASON || ''),
    intOrNull(r.LIFETIME_TOTAL_TRANSFERS), numOrNull(r.LIFETIME_VOLUME_STREAMED_USD),
    intOrNull(r.TRANSFERS_90D), numOrNull(r.VOLUME_90D_USD),
    str(r.LAST_STREAM_DATE || ''),
    intOrNull(r.TRANSFERS_30D), numOrNull(r.VOLUME_30D_USD),
    intOrNull(r.TRANSFERS_14D), numOrNull(r.VOLUME_14D_USD),
    intOrNull(r.TRANSFERS_PREV_14D), numOrNull(r.VOLUME_PREV_14D_USD),
    num(r.SAVE_BALANCE_USD ?? r.SAVE_BALANCE ?? 0),
    num(r.OUTSTANDING_PRINCIPAL_USD ?? r.OUTSTANDING_PRINCIPAL ?? 0),
    new Date(), // updated_at
  ];
}

const EMPLOYEE_UPDATE_COLS = EMPLOYEE_COLS.filter(c => c !== 'employee_id' && c !== 'company' && c !== 'updated_at');

async function syncEmployees(rows) {
  console.log(`\nSyncing ${rows.length} employees...`);
  const startTime = Date.now();
  const client = await pool.connect();

  // Filter out rows that have no usable identifier at all
  const validRows = rows.filter(r => str(r.EMPLOYEE_ID) || str(r.FULL_NAME));
  const skipped = rows.length - validRows.length;
  if (skipped > 0) console.log(`  → Skipped ${skipped} rows with no identifier`);

  // Postgres max 65535 params; 29 cols × 2200 rows = 63800 (under limit)
  const BATCH = 2200;
  let ok = 0, errs = 0;

  try {
    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);
      const params = batch.flatMap(employeeRowToParams);
      const sql = buildBatchUpsertSQL('employees', EMPLOYEE_COLS, EMPLOYEE_COL_COUNT, batch.length, 'employee_id, company', EMPLOYEE_UPDATE_COLS);

      try {
        await client.query(sql, params);
        ok += batch.length;
      } catch (err) {
        // Fallback: retry in smaller sub-batches of 500
        console.warn(`  ⚠ Batch [${i}-${i + batch.length}] failed: ${err.message.substring(0, 100)}`);
        console.warn(`    Retrying in sub-batches of 500...`);
        const SUB = 500;
        for (let j = 0; j < batch.length; j += SUB) {
          const sub = batch.slice(j, j + SUB);
          const subParams = sub.flatMap(employeeRowToParams);
          const subSql = buildBatchUpsertSQL('employees', EMPLOYEE_COLS, EMPLOYEE_COL_COUNT, sub.length, 'employee_id, company', EMPLOYEE_UPDATE_COLS);
          try {
            await client.query(subSql, subParams);
            ok += sub.length;
          } catch (subErr) {
            errs += sub.length;
            // Try to identify the bad row
            const names = sub.slice(0, 3).map(r => str(r.FULL_NAME) || 'unknown').join(', ');
            console.error(`  Error [${names}... @ ${str(sub[0]?.COMPANY)}]: ${subErr.message.substring(0, 120)}`);
          }
        }
      }

      // Progress every 10K rows or at the end
      if ((i + BATCH) % 10000 < BATCH || i + BATCH >= validRows.length) {
        const done = Math.min(i + BATCH, validRows.length);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = Math.round(done / (Date.now() - startTime) * 1000);
        console.log(`  → Progress: ${done}/${validRows.length} (${ok} ok, ${errs} errors) [${elapsed}s, ${rate} rows/s]`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  → ${ok} upserted, ${errs} errors [${totalTime}s total]`);
    return { upserted: ok, errors: errs };
  } finally {
    client.release();
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Redash → Neon Sync ===');
  console.log(`Time: ${new Date().toISOString()}\n`);
  const startTime = Date.now();
  const triggeredBy = process.env.SYNC_TRIGGER || process.argv[2] || 'auto';

  // Check for a pending 'requested' sync (from dashboard Force Sync button)
  let logId = null;
  try {
    const pending = await pool.query(
      `SELECT id FROM sync_log WHERE status = 'requested' ORDER BY started_at ASC LIMIT 1`
    );
    if (pending.rows.length > 0) {
      logId = pending.rows[0].id;
      await pool.query(
        `UPDATE sync_log SET status = 'running', started_at = NOW() WHERE id = $1`,
        [logId]
      );
      console.log(`Picked up requested sync (log ID: ${logId})`);
    } else {
      const insertResult = await pool.query(
        `INSERT INTO sync_log (started_at, status, triggered_by) VALUES (NOW(), 'running', $1) RETURNING id`,
        [triggeredBy]
      );
      logId = insertResult.rows[0].id;
    }
  } catch (logErr) {
    console.warn('Warning: Could not create sync_log entry:', logErr.message);
  }

  try {
    const [clientRows, employeeRows] = await Promise.all([
      fetchRedashQuery(REDASH_CLIENT_QUERY_ID, REDASH_CLIENT_QUERY_KEY),
      fetchRedashQuery(REDASH_EMPLOYEE_QUERY_ID, REDASH_EMPLOYEE_QUERY_KEY),
    ]);

    const companyResult = await syncCompanies(clientRows);
    const employeeResult = await syncEmployees(employeeRows);

    // Verify totals
    const countResult = await pool.query('SELECT (SELECT COUNT(*) FROM companies) as cc, (SELECT COUNT(*) FROM employees) as ec');
    const { cc, ec } = countResult.rows[0];

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=== Sync Complete ===');
    console.log(`Companies: ${companyResult.upserted} ok, ${companyResult.errors} errors`);
    console.log(`Employees: ${employeeResult.upserted} ok, ${employeeResult.errors} errors`);
    console.log(`Neon totals: ${cc} companies, ${ec} employees`);
    console.log(`Total time: ${totalTime}s`);

    // Log success
    if (logId) {
      try {
        await pool.query(
          `UPDATE sync_log SET finished_at = NOW(), status = 'success', duration_s = $1,
           companies_fetched = $2, companies_upserted = $3, companies_errors = $4,
           employees_fetched = $5, employees_upserted = $6, employees_errors = $7,
           total_companies = $8, total_employees = $9
           WHERE id = $10`,
          [totalTime, clientRows.length, companyResult.upserted, companyResult.errors,
           employeeRows.length, employeeResult.upserted, employeeResult.errors,
           parseInt(cc), parseInt(ec), logId]
        );
      } catch (e) { console.warn('Warning: Could not update sync_log:', e.message); }
    }
  } catch (err) {
    console.error('\nSync failed:', err.message);
    if (logId) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      try {
        await pool.query(
          `UPDATE sync_log SET finished_at = NOW(), status = 'error', duration_s = $1, error_message = $2 WHERE id = $3`,
          [totalTime, err.message.substring(0, 2000), logId]
        );
      } catch (e) { console.warn('Warning: Could not update sync_log error:', e.message); }
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
