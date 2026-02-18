/**
 * Data Loader Service
 *
 * PRODUCTION: Fetches data from Neon Postgres via Vercel serverless API
 * FALLBACK:   Loads CSV files from public/data/ (for local dev without API)
 *
 * DATA PRIVACY:
 * - All data is stored in MEMORY ONLY
 * - NO localStorage, sessionStorage, IndexedDB, or cookies
 * - NO data persists after page refresh or browser close
 */

// API endpoints (served by Vercel serverless functions)
const API_PATHS = {
  companies: '/api/companies',
  employees: '/api/employees',
  stats: '/api/stats',
}

// CSV fallback paths for local dev
const TEST_DATA_PATHS = {
  clientSummary: '/data/Test/Test Client Summary.csv',
  employeeSummary: '/data/Test/Test Employee Summary.csv',
  adminSummary: '/data/Test/Test Admin Summary.csv',
}

// Cache for loaded data
let dataCache = {
  clientSummary: null,
  employeeSummary: null,
  adminSummary: null,
  stats: null,
  lastLoaded: null,
  lastSyncAt: null, // tracks which sync this data came from
  source: null, // 'api' or 'csv'
}

// ============================================
// CSV PARSING (kept for fallback)
// ============================================

function getRecordVal(record, ...possibleKeys) {
  if (!record) return undefined
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-]+/g, '_').trim()
  for (const key of possibleKeys) {
    const n = norm(key)
    for (const recordKey of Object.keys(record)) {
      if (norm(recordKey) === n) return record[recordKey]
    }
  }
  return undefined
}

function parseCSV(csvString) {
  const lines = csvString.trim().split('\n')
  if (lines.length === 0) return []
  const headerLine = lines[0].replace(/^\uFEFF/, '')
  const headers = headerLine.split(',').map(h => h.trim())
  const records = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = parseCSVLine(line)
    if (values.length === headers.length) {
      const record = {}
      headers.forEach((header, idx) => {
        record[header] = values[idx]
      })
      records.push(record)
    }
  }
  return records
}

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

async function fetchCSV(path) {
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    const text = await response.text()
    if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) return null
    return parseCSV(text)
  } catch {
    return null
  }
}

// ============================================
// API FETCHING (primary data source)
// ============================================

async function fetchAPI(path) {
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return await response.json()
  } catch {
    return null
  }
}

// ============================================
// BOOTSTRAP (lightweight startup data)
// ============================================

let bootstrapCache = null

/**
 * Fetch lightweight bootstrap data — 50 random employee names, 50 company names,
 * all partnership names. ~5 KB vs 18+ MB for full employees.
 */
async function fetchBootstrap() {
  if (bootstrapCache) return bootstrapCache
  const data = await fetchAPI('/api/bootstrap')
  if (data && data.employeeNames) {
    bootstrapCache = data
    return data
  }
  return null
}

// ============================================
// MAIN LOADER
// ============================================

async function loadAllData(forceReload = false) {
  // Sync-aware cache: if we have data, check if a newer sync exists before re-fetching
  if (!forceReload && dataCache.lastLoaded) {
    try {
      const latestSync = await fetchAPI('/api/sync-latest')
      if (latestSync && latestSync.last_success_at && dataCache.lastSyncAt) {
        const serverSyncTime = new Date(latestSync.last_success_at).getTime()
        const clientSyncTime = new Date(dataCache.lastSyncAt).getTime()
        if (serverSyncTime <= clientSyncTime) {
          // No new sync since we last loaded — serve from cache
          return dataCache
        }
        console.log('New sync detected, refreshing data...')
      } else if (dataCache.lastSyncAt) {
        // sync-latest failed but we have data — use cache (don't break the app)
        return dataCache
      }
    } catch {
      // sync-latest endpoint unreachable — use cached data if available
      if (dataCache.lastLoaded) return dataCache
    }
  }

  console.log('Loading data...')

  // Fetch latest sync timestamp alongside data
  const [apiCompanies, apiEmployees, latestSync] = await Promise.all([
    fetchAPI(API_PATHS.companies),
    fetchAPI(API_PATHS.employees),
    fetchAPI('/api/sync-latest').catch(() => null),
  ])

  if (apiCompanies && apiEmployees) {
    console.log('Data loaded from Neon API')
    dataCache = {
      clientSummary: apiCompanies,
      employeeSummary: apiEmployees,
      adminSummary: [], // admin emails are on the companies table
      lastLoaded: Date.now(),
      lastSyncAt: latestSync?.last_success_at || new Date().toISOString(),
      source: 'api',
    }
    console.log('API data loaded:', {
      companies: dataCache.clientSummary.length,
      employees: dataCache.employeeSummary.length,
      syncAt: dataCache.lastSyncAt,
    })
    return dataCache
  }

  // Fallback to CSV files (local dev)
  console.log('API not available, falling back to CSV files...')
  const [clientSummary, employeeSummary, adminSummary] = await Promise.all([
    fetchCSV(TEST_DATA_PATHS.clientSummary),
    fetchCSV(TEST_DATA_PATHS.employeeSummary),
    fetchCSV(TEST_DATA_PATHS.adminSummary),
  ])

  dataCache = {
    clientSummary: clientSummary || [],
    employeeSummary: employeeSummary || [],
    adminSummary: adminSummary || [],
    lastLoaded: Date.now(),
    lastSyncAt: new Date().toISOString(),
    source: 'csv',
  }

  console.log('CSV data loaded:', {
    companies: dataCache.clientSummary.length,
    employees: dataCache.employeeSummary.length,
    adminRows: dataCache.adminSummary.length,
  })

  return dataCache
}

// ============================================
// TWO-PHASE LOADERS (for faster initial load)
// ============================================

/**
 * Phase 1: Load only companies (fast — 205 rows).
 * Sets dataCache.clientSummary but NOT lastLoaded (so loadAllData still loads employees).
 */
async function loadCompaniesOnly() {
  // Already fully loaded? Skip.
  if (dataCache.lastLoaded) return dataCache

  // Already have companies from a prior phase-1 call? Skip.
  if (dataCache.clientSummary && dataCache.clientSummary.length > 0) return dataCache

  console.log('Loading companies (phase 1)...')
  const apiCompanies = await fetchAPI(API_PATHS.companies)

  if (apiCompanies) {
    dataCache.clientSummary = apiCompanies
    dataCache.adminSummary = []
    dataCache.source = 'api'
    console.log('Companies loaded:', apiCompanies.length)
    return dataCache
  }

  // CSV fallback
  const csvCompanies = await fetchCSV(TEST_DATA_PATHS.clientSummary)
  const csvAdmin = await fetchCSV(TEST_DATA_PATHS.adminSummary)
  dataCache.clientSummary = csvCompanies || []
  dataCache.adminSummary = csvAdmin || []
  dataCache.source = 'csv'
  console.log('Companies loaded from CSV:', dataCache.clientSummary.length)
  return dataCache
}

/**
 * Phase 2: Load only employees (slow — 95K+ rows).
 * Requires companies to already be loaded (call loadCompaniesOnly first).
 * Sets dataCache.lastLoaded when done.
 */
async function loadEmployeesOnly() {
  // Already fully loaded? Skip.
  if (dataCache.lastLoaded) return dataCache

  console.log('Loading employees (phase 2)...')

  if (dataCache.source === 'api') {
    const apiEmployees = await fetchAPI(API_PATHS.employees)
    if (apiEmployees) {
      dataCache.employeeSummary = apiEmployees
      dataCache.lastLoaded = Date.now()
      console.log('Employees loaded:', apiEmployees.length)
      return dataCache
    }
  }

  // CSV fallback
  const csvEmployees = await fetchCSV(TEST_DATA_PATHS.employeeSummary)
  dataCache.employeeSummary = csvEmployees || []
  dataCache.lastLoaded = Date.now()
  console.log('Employees loaded from CSV:', dataCache.employeeSummary.length)
  return dataCache
}

// ============================================
// DATA ACCESSORS
// ============================================

/**
 * Get employee data. When loaded from API, data is already in the right shape.
 * When loaded from CSV, normalizes field names.
 */
async function getEmployeeData() {
  const data = await loadAllData()
  const rows = data.employeeSummary || []

  // API data — short keys from API are expanded back to full names.
  if (data.source === 'api') {
    return rows
      .filter(row => (row.n || row.full_name) && String(row.n || row.full_name).trim() !== '')
      .map(row => ({
        // Core identity
        full_name: String(row.n || row.full_name || '').trim(),
        employee_id: String(row.eid || row.employee_id || '').trim(),
        company: String(row.co || row.company || '').trim(),
        current_state: String(row.cs || row.current_state || '').trim(),
        salary_or_hourly: String(row.soh || row.salary_or_hourly || '').trim(),
        pay_group: String(row.pg || row.pay_group || '').trim(),

        // Dates
        employee_created_at: String(row.eca || row.employee_created_at || '').trim(),
        invited_at: row.ia || row.invited_at || null,
        started_on: String(row.so || row.started_on || '').trim(),
        terminated_at: row.ta || row.terminated_at || null,

        // Status booleans
        paused: (row.p ?? row.paused) === true || (row.p ?? row.paused) === 'true',
        pause_reason: String(row.pr || row.pause_reason || '').trim(),
        transfers_disabled: (row.td ?? row.transfers_disabled) === true || (row.td ?? row.transfers_disabled) === 'true',
        transfers_disabled_reason: String(row.tdr || row.transfers_disabled_reason || '').trim(),

        // Lifetime transfer metrics
        lifetime_total_transfers: parseInt(row.ltt ?? row.lifetime_total_transfers) || 0,
        lifetime_volume_streamed_usd: parseFloat(row.lvs ?? row.lifetime_volume_streamed_usd) || 0,

        // Transfer metrics
        transfers_90d: parseInt(row.t90 ?? row.transfers_90d) || 0,
        volume_90d_usd: parseFloat(row.v90 ?? row.volume_90d_usd) || 0,
        last_stream_date: String(row.lsd || row.last_stream_date || '').trim(),
        transfers_30d: parseInt(row.t30 ?? row.transfers_30d) || 0,
        volume_30d_usd: parseFloat(row.v30 ?? row.volume_30d_usd) || 0,
        transfers_14d: parseInt(row.tc ?? row.transfers_14d) || 0,
        volume_14d_usd: parseFloat(row.ac ?? row.volume_14d_usd) || 0,
        transfers_prev_14d: parseInt(row.tl ?? row.transfers_prev_14d) || 0,
        volume_prev_14d_usd: parseFloat(row.al ?? row.volume_prev_14d_usd) || 0,

        // Financials
        save_balance: parseFloat(row.sb ?? row.save_balance) || 0,
        outstanding_balance: parseFloat(row.ob ?? row.outstanding_balance) || 0,

        // Derived fields (computed from available data)
        has_savings_acct: (parseFloat(row.sb ?? row.save_balance) || 0) > 0,
      }))
  }

  // CSV fallback: normalize field names
  return rows
    .filter(row => getRecordVal(row, 'FULL_NAME', 'full_name', 'Full_Name') != null && String(getRecordVal(row, 'FULL_NAME', 'full_name', 'Full_Name')).trim() !== '')
    .map(row => {
      const fullName = (getRecordVal(row, 'FULL_NAME', 'full_name', 'Full_Name') || '').trim()
      const company = (getRecordVal(row, 'COMPANY', 'company', 'Company') || '').trim()
      const currentState = (getRecordVal(row, 'CURRENT_STATE', 'current_state', 'Current_State') || '').trim()
      const pausedVal = getRecordVal(row, 'PAUSED', 'paused', 'Paused')
      const paused = String(pausedVal || '').toUpperCase() === 'TRUE'
      const saveBalanceStr = (getRecordVal(row, 'SAVE_BALANCE_USD', 'SAVE_BALANCE', 'save_balance') ?? '').toString().replace(/\uFEFF/g, '').trim()
      const save_balance = parseFloat(saveBalanceStr) || 0
      const principalStr = (getRecordVal(row, 'OUTSTANDING_PRINCIPAL_USD', 'OUTSTANDING_PRINCIPAL', 'outstanding_principal') ?? '').toString().replace(/\uFEFF/g, '').trim()
      const outstanding_balance = parseFloat(principalStr) || 0
      const employee_id = (getRecordVal(row, 'EMPLOYEE_ID', 'employee_id') ?? fullName).toString().trim()

      return {
        full_name: fullName,
        employee_id: employee_id || fullName,
        company,
        current_state: currentState,
        paused,
        outstanding_balance,
        save_balance,
        has_savings_acct: save_balance > 0,
        salary_or_hourly: (getRecordVal(row, 'SALARY_OR_HOURLY', 'salary_or_hourly') || '').trim(),
        pay_group: (getRecordVal(row, 'PAY_GROUP', 'pay_group') || '').trim(),
      }
    })
}

async function getAdminSummaryData() {
  const data = await loadAllData()

  // When using API, admin emails come from the companies table (short keys)
  if (data.source === 'api') {
    return (data.clientSummary || [])
      .filter(row => (row.ae || row.admin_email) && String(row.ae || row.admin_email).trim() !== '')
      .map(row => ({
        company: String(row.co || row.company || '').trim(),
        admin_email: String(row.ae || row.admin_email || '').trim(),
      }))
  }

  // CSV fallback
  const rows = data.adminSummary || []
  return rows
    .filter(row => getRecordVal(row, 'COMPANY', 'company', 'Company') != null && String(getRecordVal(row, 'COMPANY', 'company', 'Company')).trim() !== '')
    .map(row => {
      const company = (getRecordVal(row, 'COMPANY', 'company', 'Company') || '').trim()
      const admin_email = (getRecordVal(row, 'ADMIN EMAIL', 'ADMIN_EMAIL', 'admin email', 'admin_email') || '').trim()
      return { company, admin_email }
    })
}

async function getClientSummaryData() {
  const data = await loadAllData()

  // API data — short keys from API are expanded back to full names.
  if (data.source === 'api') {
    return (data.clientSummary || []).map(row => ({
      // Core identity
      company_id: String(row.cid || row.company_id || '').trim(),
      partnership: String(row.pt || row.partnership || '').trim(),
      company: String(row.co || row.company || '').trim(),
      launch_date: String(row.ld || row.launch_date || '').trim(),
      csm_owner: String(row.csm || row.csm_owner || '').trim(),
      delivery_manager: String(row.dm || row.delivery_manager || '').trim(),
      partner_state: String(row.ps || row.partner_state || '').trim(),
      sector: String(row.se || row.sector || '').trim(),
      disabled_date: String(row.dd || row.disabled_date || '').trim(),
      date_live: String(row.dl || row.date_live || '').trim(),
      credit_score: String(row.crs || row.credit_score || '').trim(),
      crm_sector: String(row.crms || row.crm_sector || '').trim(),
      crm_signed_on: String(row.crso || row.crm_signed_on || '').trim(),
      integration_partners: String(row.ip || row.integration_partners || '').trim(),
      product_type: String(row.prt || row.product_type || '').trim(),

      // Adoption funnel
      eligible: parseInt(row.el ?? row.eligible) || 0,
      installed: parseInt(row.ins ?? row.installed) || 0,
      pending: parseInt(row.pe ?? row.pending) || 0,
      enrolling: parseInt(row.en ?? row.enrolling) || 0,
      enrolled_excludes_active: parseInt(row.eea ?? row.enrolled_excludes_active) || 0,
      adopted: parseInt(row.ad ?? row.adopted) || 0,
      adoption_rate: parseFloat(row.ar ?? row.adoption_rate) || 0,
      active: parseInt(row.ac ?? row.active) || 0,
      active_per_adopted: parseFloat(row.apa ?? row.active_per_adopted) || 0,
      active_per_eligible: parseFloat(row.ape ?? row.active_per_eligible) || 0,
      disabled_users: parseInt(row.du ?? row.disabled_users) || 0,

      // Streamer metrics
      trailing_30d_streamers: parseInt(row.s30 ?? row.trailing_30d_streamers) || 0,
      trailing_14d_streamers: parseInt(row.s14 ?? row.trailing_14d_streamers) || 0,
      trailing_7d_streamers: parseInt(row.s7 ?? row.trailing_7d_streamers) || 0,
      rolling_unique_monthly_streamers: parseInt(row.rums ?? row.rolling_unique_monthly_streamers) || 0,

      // 30-day averages
      avg_30d_eligible: parseFloat(row.a3el ?? row.avg_30d_eligible) || 0,
      avg_30d_enrolled: parseFloat(row.a3e ?? row.avg_30d_enrolled) || 0,
      avg_30d_streamers: parseFloat(row.a3s ?? row.avg_30d_streamers) || 0,
      avg_30d_transfers: parseFloat(row.a3t ?? row.avg_30d_transfers) || 0,
      total_30d_transfers: parseInt(row.t3t ?? row.total_30d_transfers) || 0,

      // Revenue
      sum_trailing_30d_net_rev: parseFloat(row.nr30 ?? row.sum_trailing_30d_net_rev) || 0,
      sum_trailing_14d_net_rev: parseFloat(row.nr14 ?? row.sum_trailing_14d_net_rev) || 0,

      // App usage
      daily_active_app_users: parseInt(row.dau ?? row.daily_active_app_users) || 0,
      weekly_active_app_users: parseInt(row.wau ?? row.weekly_active_app_users) || 0,
      monthly_active_app_users: parseInt(row.mau ?? row.monthly_active_app_users) || 0,

      // Savings
      active_savings_accounts: parseInt(row.asa ?? row.active_savings_accounts) || 0,
      savings_balance_usd: parseFloat(row.sbu ?? row.savings_balance_usd) || 0,

      // Last day metrics
      streamers_on_last_day: parseInt(row.sld ?? row.streamers_on_last_day) || 0,
      transfers_on_last_day: parseInt(row.tld ?? row.transfers_on_last_day) || 0,
      net_fee_rev_on_last_day: parseFloat(row.nfr ?? row.net_fee_rev_on_last_day) || 0,

      // Transfer metrics (period)
      transfers_in_period: parseInt(row.tip ?? row.transfers_in_period) || 0,
      total_transfer_amount: parseFloat(row.tta ?? row.total_transfer_amount) || 0,
      avg_daily_transfer_amount_in_period: parseFloat(row.adta ?? row.avg_daily_transfer_amount_in_period) || 0,
      net_transfer_revenue_in_period: parseFloat(row.ntr ?? row.net_transfer_revenue_in_period) || 0,

      // Instant vs nextday transfers
      instant_transfers_in_period: parseInt(row.itp ?? row.instant_transfers_in_period) || 0,
      nextday_transfers_in_period: parseInt(row.ntp ?? row.nextday_transfers_in_period) || 0,
      instant_amount_in_period: parseFloat(row.iap ?? row.instant_amount_in_period) || 0,
      nextday_amount_in_period: parseFloat(row.nap ?? row.nextday_amount_in_period) || 0,
      instant_gross_rev_in_period: parseFloat(row.igr ?? row.instant_gross_rev_in_period) || 0,
      nextday_gross_rev_in_period: parseFloat(row.ngr ?? row.nextday_gross_rev_in_period) || 0,

      // Joiners/terminations
      new_joiners_in_period: parseInt(row.njp ?? row.new_joiners_in_period) || 0,
      new_joiners_enrolled_in_30d_in_period: parseInt(row.nje30 ?? row.new_joiners_enrolled_in_30d_in_period) || 0,
      terminated_in_period: parseInt(row.termp ?? row.terminated_in_period) || 0,

      // Salary processing
      salary_processed_amount_in_period: parseFloat(row.spa ?? row.salary_processed_amount_in_period) || 0,

      // Savings opened/closed
      savings_opened_in_period: parseInt(row.sop ?? row.savings_opened_in_period) || 0,
      savings_closed_in_period: parseInt(row.scp ?? row.savings_closed_in_period) || 0,

      // Shifts
      shifts_created_in_period: parseInt(row.sip ?? row.shifts_created_in_period) || 0,

      // Admin
      admin_count: parseInt(row.adc ?? row.admin_count) || 0,
      admin_email: String(row.ae || row.admin_email || '').trim(),
    }))
  }

  // CSV fallback
  return (data.clientSummary || []).map(company => {
    const companyName = getRecordVal(company, 'COMPANY', 'Company', 'company') ?? ''
    return {
      partnership: getRecordVal(company, 'PARTNERSHIP', 'Partnership', 'partnership') ?? '',
      company: (companyName != null && companyName !== '' ? String(companyName).trim() : ''),
      launch_date: getRecordVal(company, 'LAUNCH_DATE', 'Launch_Date', 'launch date') ?? '',
      eligible: parseInt(getRecordVal(company, 'ELIGIBLE', 'Eligible', 'eligible')) || 0,
      adopted: parseInt(getRecordVal(company, 'ADOPTED', 'Adopted', 'adopted')) || 0,
      adoption_rate: parseFloat(getRecordVal(company, 'ADOPTION_RATE', 'Adoption_Rate', 'adoption rate')) || 0,
      active: parseInt(getRecordVal(company, 'ACTIVE', 'Active', 'active')) || 0,
      active_per_adopted: parseFloat(getRecordVal(company, 'ACTIVE_PER_ADOPTED', 'Active_Per_Adopted', 'active per adopted')) || 0,
      transfers_in_period: parseInt(getRecordVal(company, 'TRANSFERS_IN_PERIOD', 'Transfers_In_Period', 'transfers in period')) || 0,
      total_transfer_amount: parseFloat(getRecordVal(company, 'TOTAL_TRANSFER_AMOUNT_IN_PERIOD', 'Total_Transfer_Amount', 'total transfer amount')) || 0,
    }
  })
}

async function getOutstandingBalancesData() {
  const employees = await getEmployeeData()
  return employees
    .filter(e => e.outstanding_balance > 0)
    .map(e => ({
      full_name: e.full_name,
      employee_id: e.employee_id,
      outstanding_balance: e.outstanding_balance,
      company: e.company,
    }))
}

async function getSavingsAccountsData() {
  const employees = await getEmployeeData()
  return employees
    .filter(e => e.has_savings_acct || e.save_balance > 0)
    .map(e => ({
      full_name: e.full_name,
      employee_id: e.employee_id,
      save_balance: e.save_balance,
      has_savings_acct: e.has_savings_acct,
    }))
}

async function getAggregateStats() {
  const data = await loadAllData()

  // Try the dedicated stats API endpoint first (more efficient than client-side aggregation)
  if (data.source === 'api') {
    const stats = await fetchAPI(API_PATHS.stats)
    if (stats) return stats
  }

  // Fallback: compute stats client-side
  const [employees, companies] = await Promise.all([
    getEmployeeData(),
    getClientSummaryData(),
  ])

  const totalEmployees = employees.length
  const pausedEmployees = employees.filter(e => e.paused).length
  const activeEmployees = totalEmployees - pausedEmployees
  const employeesWithBalance = employees.filter(e => e.outstanding_balance > 0)
  const totalOutstandingBalance = employeesWithBalance.reduce((sum, e) => sum + e.outstanding_balance, 0)
  const employeesWithSavings = employees.filter(e => e.has_savings_acct)
  const employeesWithSavingsBalance = employees.filter(e => e.save_balance > 0)
  const totalSavingsBalance = employeesWithSavingsBalance.reduce((sum, e) => sum + e.save_balance, 0)
  const totalCompanies = companies.length
  const totalEligible = companies.reduce((sum, c) => sum + c.eligible, 0)
  const totalAdopted = companies.reduce((sum, c) => sum + c.adopted, 0)
  const totalActive = companies.reduce((sum, c) => sum + c.active, 0)
  const totalTransfers = companies.reduce((sum, c) => sum + c.transfers_in_period, 0)
  const totalTransferAmount = companies.reduce((sum, c) => sum + c.total_transfer_amount, 0)
  const overallAdoptionRate = totalEligible > 0 ? (totalAdopted / totalEligible) : 0

  return {
    totalEmployees,
    activeEmployees,
    pausedEmployees,
    employeesWithOutstandingBalance: employeesWithBalance.length,
    totalOutstandingBalance,
    avgOutstandingBalance: employeesWithBalance.length > 0 ? totalOutstandingBalance / employeesWithBalance.length : 0,
    employeesWithSavingsAccounts: employeesWithSavings.length,
    employeesWithSavingsBalance: employeesWithSavingsBalance.length,
    totalSavingsBalance,
    avgSavingsBalance: employeesWithSavingsBalance.length > 0 ? totalSavingsBalance / employeesWithSavingsBalance.length : 0,
    totalCompanies,
    totalEligible,
    totalAdopted,
    totalActive,
    overallAdoptionRate,
    totalTransfers,
    totalTransferAmount,
    avgTransferAmount: totalTransfers > 0 ? totalTransferAmount / totalTransfers : 0,
  }
}

function clearCache() {
  dataCache = {
    clientSummary: null,
    employeeSummary: null,
    adminSummary: null,
    stats: null,
    lastLoaded: null,
    source: null,
  }
}

export {
  loadAllData,
  loadCompaniesOnly,
  loadEmployeesOnly,
  fetchBootstrap,
  getEmployeeData,
  getClientSummaryData,
  getAdminSummaryData,
  getOutstandingBalancesData,
  getSavingsAccountsData,
  getAggregateStats,
  clearCache,
  parseCSV,
}

export default {
  loadAllData,
  loadCompaniesOnly,
  loadEmployeesOnly,
  fetchBootstrap,
  getEmployeeData,
  getClientSummaryData,
  getAdminSummaryData,
  getOutstandingBalancesData,
  getSavingsAccountsData,
  getAggregateStats,
  clearCache,
}
