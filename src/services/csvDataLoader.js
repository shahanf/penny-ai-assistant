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
// MAIN LOADER
// ============================================

async function loadAllData(forceReload = false) {
  if (!forceReload && dataCache.lastLoaded) {
    const cacheAge = Date.now() - dataCache.lastLoaded
    if (cacheAge < 5 * 60 * 1000) {
      return dataCache
    }
  }

  console.log('Loading data...')

  // Try API first (production on Vercel)
  const [apiCompanies, apiEmployees] = await Promise.all([
    fetchAPI(API_PATHS.companies),
    fetchAPI(API_PATHS.employees),
  ])

  if (apiCompanies && apiEmployees) {
    console.log('Data loaded from Neon API')
    dataCache = {
      clientSummary: apiCompanies,
      employeeSummary: apiEmployees,
      adminSummary: [], // admin emails are on the companies table
      lastLoaded: Date.now(),
      source: 'api',
    }
    console.log('API data loaded:', {
      companies: dataCache.clientSummary.length,
      employees: dataCache.employeeSummary.length,
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
// DATA ACCESSORS
// ============================================

/**
 * Get employee data. When loaded from API, data is already in the right shape.
 * When loaded from CSV, normalizes field names.
 */
async function getEmployeeData() {
  const data = await loadAllData()
  const rows = data.employeeSummary || []

  // API data is already normalized
  if (data.source === 'api') {
    return rows
      .filter(row => row.full_name && String(row.full_name).trim() !== '')
      .map(row => ({
        full_name: String(row.full_name || '').trim(),
        employee_code: String(row.employee_code || row.full_name || '').trim(),
        company: String(row.company || '').trim(),
        current_state: String(row.current_state || '').trim(),
        paused: row.paused === true || row.paused === 'true',
        location: String(row.location || '').trim(),
        paytype: String(row.paytype || '').trim(),
        outstanding_balance: parseFloat(row.outstanding_balance) || 0,
        save_balance: parseFloat(row.save_balance) || 0,
        has_savings_acct: row.has_savings_acct === true || row.has_savings_acct === 'true',
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
      const location = (getRecordVal(row, 'LOCATION', 'location', 'Location') || '').trim()
      const paytype = (getRecordVal(row, 'PAYTYPE', 'paytype', 'Paytype') || '').trim()
      const hasSavingsVal = getRecordVal(row, 'HAS_SAVINGS_ACCT', 'has_savings_acct', 'Has_Savings_Acct')
      const has_savings_acct = String(hasSavingsVal || '').toUpperCase() === 'TRUE'
      const saveBalanceStr = (getRecordVal(row, 'SAVE_BALANCE', 'save_balance', 'Save_Balance') ?? '').toString().replace(/\uFEFF/g, '').trim()
      const save_balance = parseFloat(saveBalanceStr) || 0
      const principalStr = (getRecordVal(row, 'OUTSTANDING_PRINCIPAL', 'outstanding_principal', 'Outstanding_Principal') ?? '').toString().replace(/\uFEFF/g, '').trim()
      const outstanding_balance = parseFloat(principalStr) || 0
      const employee_code = (getRecordVal(row, 'employee_code', 'EMPLOYEE_CODE', 'employee_id', 'EMPLOYEE_ID') ?? fullName).toString().trim()

      return {
        full_name: fullName,
        employee_code: employee_code || fullName,
        company,
        current_state: currentState,
        paused,
        location,
        paytype,
        outstanding_balance,
        save_balance,
        has_savings_acct,
      }
    })
}

async function getAdminSummaryData() {
  const data = await loadAllData()

  // When using API, admin emails come from the companies table
  if (data.source === 'api') {
    return (data.clientSummary || [])
      .filter(row => row.admin_email && String(row.admin_email).trim() !== '')
      .map(row => ({
        company: String(row.company || '').trim(),
        admin_email: String(row.admin_email || '').trim(),
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

  // API data is already normalized
  if (data.source === 'api') {
    return (data.clientSummary || []).map(row => ({
      partnership: String(row.partnership || '').trim(),
      company: String(row.company || '').trim(),
      model: String(row.model || '').trim(),
      launch_date: String(row.launch_date || '').trim(),
      eligible: parseInt(row.eligible) || 0,
      adopted: parseInt(row.adopted) || 0,
      adoption_rate: parseFloat(row.adoption_rate) || 0,
      active: parseInt(row.active) || 0,
      active_per_adopted: parseFloat(row.active_per_adopted) || 0,
      transfers_in_period: parseInt(row.transfers_in_period) || 0,
      total_transfer_amount: parseFloat(row.total_transfer_amount) || 0,
    }))
  }

  // CSV fallback
  return (data.clientSummary || []).map(company => {
    const companyName = getRecordVal(company, 'COMPANY', 'Company', 'company') ?? ''
    return {
      partnership: getRecordVal(company, 'PARTNERSHIP', 'Partnership', 'partnership') ?? '',
      company: (companyName != null && companyName !== '' ? String(companyName).trim() : ''),
      model: (getRecordVal(company, 'MODEL', 'model', 'Model') ?? '').trim(),
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
      employee_code: e.employee_code,
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
      employee_code: e.employee_code,
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
  getEmployeeData,
  getClientSummaryData,
  getAdminSummaryData,
  getOutstandingBalancesData,
  getSavingsAccountsData,
  getAggregateStats,
  clearCache,
}
