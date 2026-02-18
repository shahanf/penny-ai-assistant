#!/usr/bin/env node
/**
 * Neon Project Rotation Script
 *
 * One command to rotate to a fresh Neon free-tier project.
 * Run this every few days when approaching the 5 GB transfer cap.
 *
 * What it does (7 steps):
 *   1. Creates a new Neon project via API
 *   2. Creates companies, employees, sync_log tables
 *   3. Updates .env with new DATABASE_URL
 *   4. Updates ALL Vercel env var targets (production, preview, development)
 *   5. Updates api/neon-status.js with new project ID
 *   6. Runs Redash → Neon sync (requires VPN)
 *   7. Deploys to Vercel (forces cold start so serverless functions pick up new DB)
 *
 * Usage:
 *   node scripts/rotate-neon.mjs                  # auto-names penny-v4, penny-v5, etc.
 *   node scripts/rotate-neon.mjs --name my-db     # custom project name
 *   node scripts/rotate-neon.mjs --dry-run        # preview what would happen
 *   node scripts/rotate-neon.mjs --skip-sync      # skip Redash sync (no VPN)
 *   node scripts/rotate-neon.mjs --skip-deploy    # skip Vercel deploy
 *
 * Prerequisites:
 *   - .env must have NEON_API_KEY, VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID
 *   - VPN must be connected for Redash sync (unless --skip-sync)
 *
 * Lessons learned (Feb 2026):
 *   - Must update ALL Vercel env var targets, not just one
 *   - Must update api/neon-status.js hardcoded project ID
 *   - Must redeploy Vercel after rotation — serverless functions cache the old DB connection
 *   - Neon connection_uris from API need -pooler added for the pooler endpoint
 *   - Neon serverless driver needs the pooler endpoint, pg driver needs direct endpoint
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const ENV_PATH = join(ROOT, '.env');
const NEON_STATUS_PATH = join(ROOT, 'api', 'neon-status.js');

// ============================================
// CONFIG
// ============================================

const VERCEL_PROJECT_ID = 'prj_VxiNYWkNdppO8juTFZLGbQi5oRnk';
const VERCEL_TEAM_ID = 'team_ZfpjbjwPnzNrvvHYxF0KUwqk';
const NEON_REGION = 'aws-us-west-2';

// ============================================
// PARSE ARGS
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipSync = args.includes('--skip-sync');
const skipDeploy = args.includes('--skip-deploy');
const nameIdx = args.indexOf('--name');
let projectName = nameIdx >= 0 ? args[nameIdx + 1] : null;

// Auto-generate name: penny-v4, penny-v5, etc.
if (!projectName) {
  const envContent = readFileSync(ENV_PATH, 'utf-8');
  const match = envContent.match(/# Current Neon project: penny-v(\d+)/);
  const currentNum = match ? parseInt(match[1]) : 3;
  projectName = `penny-v${currentNum + 1}`;
}

console.log(`\n${'='.repeat(50)}`);
console.log(`  Neon Project Rotation`);
console.log(`  New project: ${projectName}`);
if (dryRun) console.log('  MODE: DRY RUN');
if (skipSync) console.log('  SKIP: Redash sync');
if (skipDeploy) console.log('  SKIP: Vercel deploy');
console.log(`${'='.repeat(50)}\n`);

// ============================================
// HELPERS
// ============================================

function readEnv() {
  const content = readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function run(cmd, opts = {}) {
  if (dryRun && !opts.force) {
    console.log(`  [dry-run] ${cmd.substring(0, 120)}${cmd.length > 120 ? '...' : ''}`);
    return '';
  }
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: opts.timeout || 60000, ...opts }).trim();
  } catch (err) {
    if (opts.ignoreError) return '';
    console.error(`  Command failed: ${cmd.substring(0, 100)}`);
    console.error(`  ${(err.stderr || err.message).substring(0, 200)}`);
    process.exit(1);
  }
}

function curlJson(method, url, token, body = null) {
  const bodyArg = body ? `-d '${JSON.stringify(body)}'` : '';
  const raw = run(
    `curl -s -X ${method} "${url}" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" ${bodyArg}`,
    { force: true }
  );
  try { return JSON.parse(raw); } catch { return raw; }
}

function step(num, label) {
  console.log(`\n[${num}/7] ${label}`);
}

// ============================================
// STEP 1: Create new Neon project
// ============================================

step(1, 'Creating new Neon project...');

let projectId, connectionUri;
const env = readEnv();
const neonApiKey = env.NEON_API_KEY;
const vercelToken = env.VERCEL_TOKEN;

if (!neonApiKey) { console.error('Missing NEON_API_KEY in .env'); process.exit(1); }
if (!vercelToken) { console.error('Missing VERCEL_TOKEN in .env'); process.exit(1); }

if (!dryRun) {
  const resp = curlJson('POST', 'https://console.neon.tech/api/v2/projects', neonApiKey, {
    project: { name: projectName, region_id: NEON_REGION }
  });

  if (!resp.project) {
    console.error('  Failed:', JSON.stringify(resp).substring(0, 300));
    process.exit(1);
  }

  projectId = resp.project.id;
  const connStr = resp.connection_uris?.[0]?.connection_uri;

  if (!connStr) {
    console.error('  No connection URI returned');
    process.exit(1);
  }

  // Convert direct endpoint to pooler endpoint:
  //   ep-xxx.region.aws.neon.tech → ep-xxx-pooler.region.aws.neon.tech
  connectionUri = connStr.replace(/@([^.]+)\./, '@$1-pooler.');

  // Ensure sslmode=require is present
  if (!connectionUri.includes('sslmode=')) {
    connectionUri += (connectionUri.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  console.log(`  Project ID:  ${projectId}`);
  console.log(`  Connection:  ${connectionUri.replace(/:[^@]+@/, ':***@')}`);
} else {
  projectId = 'dry-run-project-id';
  connectionUri = 'postgresql://user:pass@ep-example-pooler.region.aws.neon.tech/neondb?sslmode=require';
  console.log(`  [dry-run] Would create project "${projectName}" in ${NEON_REGION}`);
}

// ============================================
// STEP 2: Create tables
// ============================================

step(2, 'Creating tables...');

const CREATE_TABLES_SQL = `
-- Companies table (65 columns matching sync-redash.js COMPANY_COLS)
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  partnership text DEFAULT '',
  company text NOT NULL UNIQUE,
  launch_date text DEFAULT '',
  eligible integer DEFAULT 0,
  adopted integer DEFAULT 0,
  adoption_rate numeric DEFAULT 0,
  active integer DEFAULT 0,
  active_per_adopted numeric DEFAULT 0,
  transfers_in_period integer DEFAULT 0,
  total_transfer_amount numeric DEFAULT 0,
  admin_email text DEFAULT '',
  csm_owner text DEFAULT '',
  delivery_manager text DEFAULT '',
  sector text DEFAULT '',
  credit_score text DEFAULT '',
  pending integer DEFAULT 0,
  enrolling integer DEFAULT 0,
  avg_30d_transfers numeric DEFAULT 0,
  avg_30d_enrolled numeric DEFAULT 0,
  avg_30d_streamers numeric DEFAULT 0,
  total_30d_transfers numeric DEFAULT 0,
  sum_trailing_30d_net_rev numeric DEFAULT 0,
  sum_trailing_14d_net_rev numeric DEFAULT 0,
  daily_active_app_users integer DEFAULT 0,
  weekly_active_app_users integer DEFAULT 0,
  monthly_active_app_users integer DEFAULT 0,
  active_savings_accounts integer DEFAULT 0,
  savings_balance_usd numeric DEFAULT 0,
  shifts_created_in_period integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  company_id text DEFAULT '',
  partner_state text DEFAULT '',
  disabled_date text DEFAULT '',
  installed integer DEFAULT 0,
  enrolled_excludes_active integer DEFAULT 0,
  active_per_eligible numeric DEFAULT 0,
  disabled_users integer DEFAULT 0,
  trailing_30d_streamers integer DEFAULT 0,
  trailing_14d_streamers integer DEFAULT 0,
  trailing_7d_streamers integer DEFAULT 0,
  rolling_unique_monthly_streamers integer DEFAULT 0,
  avg_30d_eligible numeric DEFAULT 0,
  streamers_on_last_day integer DEFAULT 0,
  transfers_on_last_day integer DEFAULT 0,
  net_fee_rev_on_last_day numeric DEFAULT 0,
  avg_daily_transfer_amount_in_period numeric DEFAULT 0,
  net_transfer_revenue_in_period numeric DEFAULT 0,
  instant_transfers_in_period integer DEFAULT 0,
  nextday_transfers_in_period integer DEFAULT 0,
  instant_amount_in_period numeric DEFAULT 0,
  nextday_amount_in_period numeric DEFAULT 0,
  instant_gross_rev_in_period numeric DEFAULT 0,
  nextday_gross_rev_in_period numeric DEFAULT 0,
  new_joiners_in_period integer DEFAULT 0,
  new_joiners_enrolled_in_30d_in_period integer DEFAULT 0,
  terminated_in_period integer DEFAULT 0,
  salary_processed_amount_in_period numeric DEFAULT 0,
  savings_opened_in_period integer DEFAULT 0,
  savings_closed_in_period integer DEFAULT 0,
  admin_count integer DEFAULT 0,
  date_live text DEFAULT '',
  crm_sector text DEFAULT '',
  crm_signed_on text DEFAULT '',
  integration_partners text DEFAULT '',
  product_type text DEFAULT ''
);

-- Employees table (29 columns matching sync-redash.js EMPLOYEE_COLS)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  full_name text NOT NULL,
  employee_id text DEFAULT '',
  company text NOT NULL,
  current_state text DEFAULT '',
  salary_or_hourly text DEFAULT '',
  pay_group text DEFAULT '',
  employee_created_at text DEFAULT '',
  invited_at text,
  started_on text DEFAULT '',
  terminated_at timestamptz,
  paused boolean DEFAULT false,
  pause_reason text DEFAULT '',
  transfers_disabled boolean DEFAULT false,
  transfers_disabled_reason text DEFAULT '',
  lifetime_total_transfers integer DEFAULT 0,
  lifetime_volume_streamed_usd numeric DEFAULT 0,
  transfers_90d integer DEFAULT 0,
  volume_90d_usd numeric DEFAULT 0,
  last_stream_date text DEFAULT '',
  transfers_30d integer DEFAULT 0,
  volume_30d_usd numeric DEFAULT 0,
  transfers_14d integer DEFAULT 0,
  volume_14d_usd numeric DEFAULT 0,
  transfers_prev_14d integer DEFAULT 0,
  volume_prev_14d_usd numeric DEFAULT 0,
  save_balance numeric DEFAULT 0,
  outstanding_balance numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, company)
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company);
CREATE INDEX IF NOT EXISTS idx_employees_state ON employees(current_state);

-- Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text DEFAULT 'running',
  duration_s numeric,
  companies_fetched integer DEFAULT 0,
  companies_upserted integer DEFAULT 0,
  companies_errors integer DEFAULT 0,
  employees_fetched integer DEFAULT 0,
  employees_upserted integer DEFAULT 0,
  employees_errors integer DEFAULT 0,
  total_companies integer DEFAULT 0,
  total_employees integer DEFAULT 0,
  error_message text,
  triggered_by text DEFAULT 'auto'
);
`;

if (!dryRun) {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(connectionUri);
  await sql(CREATE_TABLES_SQL);
  console.log('  Tables created: companies, employees, sync_log');
} else {
  console.log('  [dry-run] Would create 3 tables');
}

// ============================================
// STEP 3: Update .env
// ============================================

step(3, 'Updating .env...');

if (!dryRun) {
  let envContent = readFileSync(ENV_PATH, 'utf-8');

  // Replace DATABASE_URL
  envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${connectionUri}`);

  // Add/update tracking comment
  if (envContent.includes('# Current Neon project:')) {
    envContent = envContent.replace(/# Current Neon project:.*/, `# Current Neon project: ${projectName} (${projectId})`);
  } else {
    // Insert before DATABASE_URL line
    envContent = envContent.replace(
      /^(# Neon Postgres\n)/m,
      `$1# Current Neon project: ${projectName} (${projectId})\n`
    );
  }

  writeFileSync(ENV_PATH, envContent);
  console.log(`  DATABASE_URL → ${connectionUri.replace(/:[^@]+@/, ':***@')}`);
} else {
  console.log('  [dry-run] Would update DATABASE_URL in .env');
}

// ============================================
// STEP 4: Update ALL Vercel env var targets
// ============================================

step(4, 'Updating Vercel DATABASE_URL (all targets)...');

if (!dryRun) {
  // Get all existing DATABASE_URL env var IDs
  const envVarsResp = curlJson(
    'GET',
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_TEAM_ID}`,
    vercelToken
  );

  const dbUrlVars = (envVarsResp.envs || []).filter(e => e.key === 'DATABASE_URL');

  if (dbUrlVars.length === 0) {
    // Create new env var for all targets
    curlJson(
      'POST',
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_TEAM_ID}`,
      vercelToken,
      { key: 'DATABASE_URL', value: connectionUri, type: 'encrypted', target: ['production', 'preview', 'development'] }
    );
    console.log('  Created DATABASE_URL for all targets');
  } else {
    // Update each existing target
    for (const envVar of dbUrlVars) {
      const targets = Array.isArray(envVar.target) ? envVar.target.join(', ') : envVar.target;
      curlJson(
        'PATCH',
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${envVar.id}?teamId=${VERCEL_TEAM_ID}`,
        vercelToken,
        { value: connectionUri }
      );
      console.log(`  Updated: ${targets}`);
    }
  }
} else {
  console.log('  [dry-run] Would update DATABASE_URL for production, preview, development');
}

// ============================================
// STEP 5: Update api/neon-status.js project ID
// ============================================

step(5, 'Updating api/neon-status.js...');

if (!dryRun) {
  let neonStatusContent = readFileSync(NEON_STATUS_PATH, 'utf-8');
  const oldMatch = neonStatusContent.match(/const NEON_PROJECT_ID = '([^']+)'/);
  const oldId = oldMatch ? oldMatch[1] : 'unknown';

  neonStatusContent = neonStatusContent.replace(
    /const NEON_PROJECT_ID = '[^']+'/,
    `const NEON_PROJECT_ID = '${projectId}'`
  );
  writeFileSync(NEON_STATUS_PATH, neonStatusContent);
  console.log(`  ${oldId} → ${projectId}`);
} else {
  console.log(`  [dry-run] Would update NEON_PROJECT_ID to ${projectId}`);
}

// ============================================
// STEP 6: Run Redash sync
// ============================================

step(6, skipSync ? 'Skipping Redash sync (--skip-sync)' : 'Running Redash → Neon sync...');

if (!skipSync && !dryRun) {
  try {
    execSync('node scripts/sync-redash.js', {
      cwd: ROOT, encoding: 'utf-8', timeout: 600000, stdio: 'inherit'
    });
  } catch (err) {
    console.error('\n  Sync failed! Are you on VPN?');
    console.error('  Run manually later: node scripts/sync-redash.js');
    // Don't exit — continue to deploy so at least the DB connection is updated
  }
} else if (!skipSync) {
  console.log('  [dry-run] Would run: node scripts/sync-redash.js');
}

// ============================================
// STEP 7: Deploy to Vercel
// ============================================

step(7, skipDeploy ? 'Skipping Vercel deploy (--skip-deploy)' : 'Deploying to Vercel...');

if (!skipDeploy && !dryRun) {
  console.log('  This forces a cold start so serverless functions use the new DATABASE_URL.');
  try {
    execSync(`npx vercel deploy --token ${vercelToken} --prod --yes`, {
      cwd: ROOT, encoding: 'utf-8', timeout: 120000, stdio: 'inherit'
    });
    console.log('  Deploy complete!');
  } catch (err) {
    console.error('\n  Deploy failed!');
    console.error(`  Run manually: npx vercel deploy --token <TOKEN> --prod`);
  }
} else if (!skipDeploy) {
  console.log('  [dry-run] Would run: npx vercel deploy --prod');
}

// ============================================
// DONE
// ============================================

console.log(`\n${'='.repeat(50)}`);
console.log('  Rotation complete!');
console.log(`${'='.repeat(50)}`);
console.log(`  New project:  ${projectName} (${projectId})`);
console.log(`  Region:       ${NEON_REGION}`);
console.log(`  Connection:   ${connectionUri.replace(/:[^@]+@/, ':***@')}`);
if (skipSync) console.log(`\n  REMINDER: Run sync when on VPN: node scripts/sync-redash.js`);
if (skipDeploy) console.log(`  REMINDER: Deploy to Vercel: npx vercel deploy --prod`);
console.log(`\n  Old Neon project can be deleted from https://console.neon.tech\n`);
