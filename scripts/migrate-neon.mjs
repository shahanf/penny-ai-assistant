#!/usr/bin/env node
/**
 * Migrate data from penny-v2 (old) to penny-v3 (new) Neon project.
 * Copies companies, employees, and sync_log tables.
 *
 * Usage: node scripts/migrate-neon.mjs
 */

import { neon } from '@neondatabase/serverless';

const OLD_URL = 'postgresql://neondb_owner:npg_vneZdsD9Pct7@ep-purple-lab-airsznak-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const NEW_URL = 'postgresql://neondb_owner:npg_1WG3RlCPwTFy@ep-super-water-akxgh2ki-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require';

const oldSql = neon(OLD_URL);
const newSql = neon(NEW_URL);

async function migrateCompanies() {
  console.log('Migrating companies...');
  const rows = await oldSql`SELECT * FROM companies ORDER BY id`;
  console.log(`  Fetched ${rows.length} companies from old DB`);

  let inserted = 0;
  for (const r of rows) {
    await newSql`
      INSERT INTO companies (
        partnership, company, launch_date, eligible, adopted, adoption_rate, active,
        active_per_adopted, transfers_in_period, total_transfer_amount, admin_email,
        csm_owner, delivery_manager, sector, credit_score, pending, enrolling,
        avg_30d_transfers, avg_30d_enrolled, avg_30d_streamers, total_30d_transfers,
        sum_trailing_30d_net_rev, sum_trailing_14d_net_rev, daily_active_app_users,
        weekly_active_app_users, monthly_active_app_users, active_savings_accounts,
        savings_balance_usd, shifts_created_in_period, updated_at, company_id,
        partner_state, disabled_date, installed, enrolled_excludes_active,
        active_per_eligible, disabled_users, trailing_30d_streamers, trailing_14d_streamers,
        trailing_7d_streamers, rolling_unique_monthly_streamers, avg_30d_eligible,
        streamers_on_last_day, transfers_on_last_day, net_fee_rev_on_last_day,
        avg_daily_transfer_amount_in_period, net_transfer_revenue_in_period,
        instant_transfers_in_period, nextday_transfers_in_period, instant_amount_in_period,
        nextday_amount_in_period, instant_gross_rev_in_period, nextday_gross_rev_in_period,
        new_joiners_in_period, new_joiners_enrolled_in_30d_in_period, terminated_in_period,
        salary_processed_amount_in_period, savings_opened_in_period, savings_closed_in_period,
        admin_count, date_live, crm_sector, crm_signed_on, integration_partners, product_type
      ) VALUES (
        ${r.partnership}, ${r.company}, ${r.launch_date}, ${r.eligible}, ${r.adopted},
        ${r.adoption_rate}, ${r.active}, ${r.active_per_adopted}, ${r.transfers_in_period},
        ${r.total_transfer_amount}, ${r.admin_email}, ${r.csm_owner}, ${r.delivery_manager},
        ${r.sector}, ${r.credit_score}, ${r.pending}, ${r.enrolling}, ${r.avg_30d_transfers},
        ${r.avg_30d_enrolled}, ${r.avg_30d_streamers}, ${r.total_30d_transfers},
        ${r.sum_trailing_30d_net_rev}, ${r.sum_trailing_14d_net_rev}, ${r.daily_active_app_users},
        ${r.weekly_active_app_users}, ${r.monthly_active_app_users}, ${r.active_savings_accounts},
        ${r.savings_balance_usd}, ${r.shifts_created_in_period}, ${r.updated_at}, ${r.company_id},
        ${r.partner_state}, ${r.disabled_date}, ${r.installed}, ${r.enrolled_excludes_active},
        ${r.active_per_eligible}, ${r.disabled_users}, ${r.trailing_30d_streamers},
        ${r.trailing_14d_streamers}, ${r.trailing_7d_streamers}, ${r.rolling_unique_monthly_streamers},
        ${r.avg_30d_eligible}, ${r.streamers_on_last_day}, ${r.transfers_on_last_day},
        ${r.net_fee_rev_on_last_day}, ${r.avg_daily_transfer_amount_in_period},
        ${r.net_transfer_revenue_in_period}, ${r.instant_transfers_in_period},
        ${r.nextday_transfers_in_period}, ${r.instant_amount_in_period}, ${r.nextday_amount_in_period},
        ${r.instant_gross_rev_in_period}, ${r.nextday_gross_rev_in_period}, ${r.new_joiners_in_period},
        ${r.new_joiners_enrolled_in_30d_in_period}, ${r.terminated_in_period},
        ${r.salary_processed_amount_in_period}, ${r.savings_opened_in_period},
        ${r.savings_closed_in_period}, ${r.admin_count}, ${r.date_live}, ${r.crm_sector},
        ${r.crm_signed_on}, ${r.integration_partners}, ${r.product_type}
      )
    `;
    inserted++;
    if (inserted % 50 === 0) console.log(`  Inserted ${inserted}/${rows.length}`);
  }
  console.log(`  Done: ${inserted} companies migrated`);
}

async function migrateSyncLog() {
  console.log('Migrating sync_log...');
  const rows = await oldSql`SELECT * FROM sync_log ORDER BY id`;
  console.log(`  Fetched ${rows.length} sync_log entries`);

  for (const r of rows) {
    await newSql`
      INSERT INTO sync_log (
        started_at, finished_at, status, duration_s, companies_fetched, companies_upserted,
        companies_errors, employees_fetched, employees_upserted, employees_errors,
        total_companies, total_employees, error_message, triggered_by
      ) VALUES (
        ${r.started_at}, ${r.finished_at}, ${r.status}, ${r.duration_s},
        ${r.companies_fetched}, ${r.companies_upserted}, ${r.companies_errors},
        ${r.employees_fetched}, ${r.employees_upserted}, ${r.employees_errors},
        ${r.total_companies}, ${r.total_employees}, ${r.error_message}, ${r.triggered_by}
      )
    `;
  }
  console.log(`  Done: ${rows.length} sync_log entries migrated`);
}

async function migrateEmployees() {
  console.log('Migrating employees (131K+ rows)...');

  // Get total count
  const countResult = await oldSql`SELECT COUNT(*) as cnt FROM employees`;
  const total = Number(countResult[0].cnt);
  console.log(`  Total employees in old DB: ${total}`);

  // Fetch and insert in batches of 2000 using OFFSET/LIMIT
  const BATCH_SIZE = 2000;
  let offset = 0;
  let totalInserted = 0;

  while (offset < total) {
    const rows = await oldSql`SELECT * FROM employees ORDER BY id LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
    if (rows.length === 0) break;

    // Build batch insert using individual inserts (neon serverless doesn't support multi-row in template)
    for (const r of rows) {
      await newSql`
        INSERT INTO employees (
          full_name, company, current_state, paused, save_balance, outstanding_balance,
          pay_group, pause_reason, transfers_disabled, transfers_disabled_reason,
          invited_at, terminated_at, transfers_14d, volume_14d_usd, transfers_prev_14d,
          volume_prev_14d_usd, lifetime_total_transfers, lifetime_volume_streamed_usd,
          last_stream_date, updated_at, employee_id, salary_or_hourly, employee_created_at,
          started_on, transfers_90d, volume_90d_usd, transfers_30d, volume_30d_usd
        ) VALUES (
          ${r.full_name}, ${r.company}, ${r.current_state}, ${r.paused}, ${r.save_balance},
          ${r.outstanding_balance}, ${r.pay_group}, ${r.pause_reason}, ${r.transfers_disabled},
          ${r.transfers_disabled_reason}, ${r.invited_at}, ${r.terminated_at}, ${r.transfers_14d},
          ${r.volume_14d_usd}, ${r.transfers_prev_14d}, ${r.volume_prev_14d_usd},
          ${r.lifetime_total_transfers}, ${r.lifetime_volume_streamed_usd}, ${r.last_stream_date},
          ${r.updated_at}, ${r.employee_id}, ${r.salary_or_hourly}, ${r.employee_created_at},
          ${r.started_on}, ${r.transfers_90d}, ${r.volume_90d_usd}, ${r.transfers_30d},
          ${r.volume_30d_usd}
        )
      `;
    }

    totalInserted += rows.length;
    offset += BATCH_SIZE;
    console.log(`  Inserted ${totalInserted}/${total} employees (${((totalInserted/total)*100).toFixed(1)}%)`);
  }
  console.log(`  Done: ${totalInserted} employees migrated`);
}

async function main() {
  console.log('=== Neon Migration: penny-v2 → penny-v3 ===\n');

  try {
    await migrateCompanies();
    console.log();
    await migrateSyncLog();
    console.log();
    await migrateEmployees();
    console.log('\n=== Migration complete! ===');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

main();
