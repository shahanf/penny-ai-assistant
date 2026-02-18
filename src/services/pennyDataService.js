/**
 * PennyDataService - Centralized data aggregation for Penny AI Assistant
 *
 * This service provides query methods for the AI assistant to answer admin questions.
 * Data loaded via Neon API (primary) or CSV fallback:
 * - Client Summary (companies): Company stats, adoption, transfers, revenue, admin emails
 * - Employee Summary (employees): Full employee records with transfer history, state, financials
 */

import {
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
} from './csvDataLoader'

// ============================================
// HELPER FUNCTIONS
// ============================================

function fuzzyMatch(str1, str2) {
  if (str1 == null || str2 == null) return false
  const s1 = String(str1).toLowerCase().trim()
  const s2 = String(str2).toLowerCase().trim()
  if (!s1 || !s2) return false
  // Exact match after normalize
  if (s1 === s2) return true
  // Substring match
  if (s1.includes(s2) || s2.includes(s1)) return true
  // Normalize punctuation (strip periods, commas, extra spaces) and retry
  const norm = s => s.replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim()
  const n1 = norm(s1), n2 = norm(s2)
  if (n1 === n2) return true
  if (n1.includes(n2) || n2.includes(n1)) return true
  // First-word / first-name match (e.g. "Sarah" matches "Sara Getachew")
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  // If the search term is a single word, check if it closely matches the first word of the other
  if (words2.length === 1 && words1.length > 1) {
    if (closeEnough(words1[0], words2[0])) return true
  }
  if (words1.length === 1 && words2.length > 1) {
    if (closeEnough(words2[0], words1[0])) return true
  }
  return false
}

/** Check if two short strings are close enough (1 char difference for names) */
function closeEnough(a, b) {
  if (a === b) return true
  // One starts with the other (e.g. "sara" / "sarah")
  if (a.startsWith(b) || b.startsWith(a)) return true
  // Levenshtein distance <= 1 for short names
  if (Math.abs(a.length - b.length) > 1) return false
  let diffs = 0
  const maxLen = Math.max(a.length, b.length)
  for (let i = 0, j = 0; i < a.length || j < b.length; i++, j++) {
    if (a[i] !== b[j]) {
      diffs++
      if (diffs > 1) return false
      // Handle insertion/deletion
      if (a.length > b.length) j--
      else if (b.length > a.length) i--
    }
  }
  return diffs <= 1
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ============================================
// PENNY DATA SERVICE CLASS
// ============================================

class PennyDataService {
  constructor() {
    this.employeesCache = null
    this.companiesCache = null
    this.statsCache = null
    this.initialized = false
    this.bootstrapData = null // lightweight startup names from /api/bootstrap
  }

  // Bootstrap: fetch lightweight startup data (~5 KB) for instant UI render
  async bootstrap() {
    if (this.bootstrapData) return this.bootstrapData
    try {
      const data = await fetchBootstrap()
      if (data) {
        this.bootstrapData = data
        console.log('PennyDataService bootstrapped:', data.employeeNames?.length, 'names,', data.companyNames?.length, 'companies')
        return data
      }
    } catch (err) {
      console.error('Bootstrap failed:', err)
    }
    return null
  }

  // Get random employee names from bootstrap data (no full load needed)
  getBootstrapEmployeeNames(count = 8) {
    const names = this.bootstrapData?.employeeNames || []
    if (names.length === 0) return []
    const shuffled = [...names].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  // Get random company names from bootstrap data
  getBootstrapCompanyNames(count = 8) {
    const names = this.bootstrapData?.companyNames || []
    if (names.length === 0) return []
    const shuffled = [...names].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  // Get random partnership names from bootstrap data
  getBootstrapPartnershipNames(count = 8) {
    const names = this.bootstrapData?.partnerships || []
    if (names.length === 0) return []
    const shuffled = [...names].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  // Initialize data - call this before using the service
  async initialize() {
    if (this.initialized) return

    try {
      await loadAllData()
      this.employeesCache = await getEmployeeData()
      this.companiesCache = await getClientSummaryData()
      this.statsCache = await getAggregateStats()
      this.initialized = true
      console.log('PennyDataService initialized with', this.employeesCache.length, 'employees')
    } catch (error) {
      console.error('Failed to initialize PennyDataService:', error)
    }
  }

  // Phase 1: Load companies only (fast — 205 rows)
  async initializeCompaniesOnly() {
    if (this.initialized) return
    try {
      await loadCompaniesOnly()
      this.companiesCache = await getClientSummaryData()
      this.companiesReady = true
      console.log('PennyDataService companies ready:', this.companiesCache.length, 'companies')
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
  }

  // Phase 2: Load employees (slow — 95K+ rows)
  async initializeEmployees() {
    if (this.initialized) return
    try {
      await loadEmployeesOnly()
      this.employeesCache = await getEmployeeData()
      this.statsCache = await getAggregateStats()
      this.initialized = true
      console.log('PennyDataService fully initialized with', this.employeesCache.length, 'employees')
    } catch (error) {
      console.error('Failed to load employees:', error)
    }
  }

  // Refresh data from CSV files
  async refresh() {
    clearCache()
    this.initialized = false
    this.companiesReady = false
    await this.initialize()
  }

  // Ensure data is loaded before queries
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  // ==========================================
  // EMPLOYEE QUERIES
  // ==========================================

  async getAllEmployees() {
    await this.ensureInitialized()
    return this.employeesCache || []
  }

  /**
   * Returns one random employee's full_name from Enrolled Employees (for example prompts).
   * Returns null if no employees are loaded.
   */
  async getRandomEmployeeName() {
    await this.ensureInitialized()
    const employees = this.employeesCache || []
    if (employees.length === 0) return null
    const emp = employees[Math.floor(Math.random() * employees.length)]
    return (emp && emp.full_name) ? emp.full_name.trim() : null
  }

  async getRandomEmployeeNames(count = 10) {
    await this.ensureInitialized()
    const employees = this.employeesCache || []
    if (employees.length === 0) return []
    const shuffled = [...employees].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
      .map(e => e.full_name?.trim()).filter(n => n && n.toLowerCase() !== 'unknown')
  }

  async getEmployeeByName(name) {
    await this.ensureInitialized()
    if (!this.employeesCache || !name) return null
    const n = name.trim().toLowerCase()
    if (!n) return null
    // Prefer exact full-name match (case-insensitive)
    const exact = this.employeesCache.find(
      emp => emp.full_name && emp.full_name.trim().toLowerCase() === n
    )
    if (exact) return exact
    // Then prefer match that starts with the query (e.g. "Greg" -> "Greg Peters")
    const startsWith = this.employeesCache.find(
      emp => emp.full_name && emp.full_name.trim().toLowerCase().startsWith(n)
    )
    if (startsWith) return startsWith
    // Fall back to any fuzzy (substring) match
    return this.employeesCache.find(emp => fuzzyMatch(emp.full_name, name))
  }

  // Get ALL employees matching a name (for duplicate detection)
  async getEmployeesByName(name) {
    await this.ensureInitialized()
    if (!this.employeesCache || !name) return []
    const n = name.trim().toLowerCase()
    if (!n) return []

    // First try exact matches
    const exactMatches = this.employeesCache.filter(
      emp => emp.full_name && emp.full_name.trim().toLowerCase() === n
    )
    if (exactMatches.length > 0) return exactMatches

    // Then try starts-with matches
    const startsWithMatches = this.employeesCache.filter(
      emp => emp.full_name && emp.full_name.trim().toLowerCase().startsWith(n)
    )
    if (startsWithMatches.length > 0) return startsWithMatches

    // Fall back to fuzzy matches
    return this.employeesCache.filter(emp => fuzzyMatch(emp.full_name, name))
  }

  async getEmployeeByCode(employeeCode) {
    await this.ensureInitialized()
    if (!this.employeesCache) return null
    return this.employeesCache.find(emp => emp.employee_id === employeeCode)
  }

  async isEmployeeEnrolled(name) {
    const employee = await this.getEmployeeByName(name)
    if (!employee) return { found: false }
    return {
      found: true,
      employee,
      isEnrolled: true, // If they're in the enrolled employees file, they're enrolled
      isPaused: employee.paused,
      status: employee.paused ? 'Paused' : 'Active',
    }
  }

  async getEmployeesByStatus(status) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    const statusLower = status.toLowerCase()
    if (statusLower === 'paused') {
      return this.employeesCache.filter(emp => emp.paused)
    } else if (statusLower === 'active') {
      return this.employeesCache.filter(emp => !emp.paused)
    }
    return this.employeesCache
  }

  async getEmployeesByLocation(location) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    return this.employeesCache.filter(emp => fuzzyMatch(emp.location, location))
  }

  async getEmployeesByPaytype(paytype) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    return this.employeesCache.filter(emp => fuzzyMatch(emp.salary_or_hourly, paytype))
  }

  async getEmployeesByCompany(companyName) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    return this.employeesCache.filter(emp => fuzzyMatch(emp.company, companyName))
  }

  /**
   * Get employees by current_state (e.g. 'PENDING', 'ENROLLING', 'ACTIVE', 'ENROLLED').
   * Optionally filter by company name as well.
   */
  async getEmployeesByState(state, companyName = null) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    const stateLower = state.toLowerCase()
    return this.employeesCache.filter(emp => {
      const empState = (emp.current_state || '').toLowerCase().trim()
      if (empState !== stateLower) return false
      if (companyName) return fuzzyMatch(emp.company, companyName)
      return true
    })
  }

  // Get stats for employees at a specific company
  async getCompanyEmployeeStats(companyName) {
    const employees = await this.getEmployeesByCompany(companyName)
    if (employees.length === 0) return null

    const active = employees.filter(e => !e.paused)
    const paused = employees.filter(e => e.paused)
    const withSavings = employees.filter(e => e.has_savings_acct)
    const withSavingsBalance = employees.filter(e => e.save_balance > 0)
    const withOutstandingBalance = employees.filter(e => e.outstanding_balance > 0)

    return {
      companyName,
      totalEmployees: employees.length,
      activeEmployees: active.length,
      pausedEmployees: paused.length,
      employeesWithSavingsAccounts: withSavings.length,
      employeesWithSavingsBalance: withSavingsBalance.length,
      totalSavingsBalance: withSavingsBalance.reduce((sum, e) => sum + e.save_balance, 0),
      employeesWithOutstandingBalance: withOutstandingBalance.length,
      totalOutstandingBalance: withOutstandingBalance.reduce((sum, e) => sum + e.outstanding_balance, 0),
      employees: employees, // Full list for detail queries
    }
  }

  async getEmployeeCount() {
    await this.ensureInitialized()
    if (!this.employeesCache) return { total: 0, active: 0, paused: 0 }

    return {
      total: this.employeesCache.length,
      active: this.employeesCache.filter(e => !e.paused).length,
      paused: this.employeesCache.filter(e => e.paused).length,
    }
  }

  // ==========================================
  // EMPLOYEE DETAIL QUERIES (Comprehensive)
  // ==========================================

  async getEmployeeFullDetails(nameOrCode) {
    await this.ensureInitialized()

    let employee = await this.getEmployeeByName(nameOrCode)
    if (!employee) {
      employee = await this.getEmployeeByCode(nameOrCode)
    }
    if (!employee) return null

    return {
      ...employee,
      status: employee.paused ? 'Paused' : (employee.current_state || 'Active'),
      hasOutstandingBalance: employee.outstanding_balance > 0,
      hasSavings: employee.has_savings_acct,
      hasTransfersDisabled: employee.transfers_disabled === true,
      isTerminated: !!(employee.terminated_at),
    }
  }

  // ==========================================
  // OUTSTANDING BALANCE QUERIES
  // ==========================================

  async getTotalOutstandingBalance() {
    // Use Outstanding Balances file directly so total is correct even if join with Enrolled fails
    const rows = await getOutstandingBalancesData()
    if (!rows || !rows.length) return 0
    return rows.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0)
  }

  async getEmployeesWithOutstandingBalance() {
    // Use Outstanding Balances file directly so list is correct even if join with Enrolled fails
    const rows = await getOutstandingBalancesData()
    if (!rows || !rows.length) return []

    return rows
      .filter(r => (r.outstanding_balance || 0) > 0)
      .map(r => ({
        full_name: r.full_name || 'Unknown',
        employee_id: r.employee_id || '',
        outstanding_balance: r.outstanding_balance,
        location: r.company || '',
      }))
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
  }

  async getEmployeeOutstandingBalance(name) {
    const employee = await this.getEmployeeByName(name)
    if (!employee) {
      return { found: false }
    }

    if (!employee.outstanding_balance || employee.outstanding_balance === 0) {
      return { found: true, employee, balance: 0, hasBalance: false }
    }

    return {
      found: true,
      employee,
      balance: employee.outstanding_balance,
      hasBalance: true,
    }
  }

  async getOutstandingBalanceStats() {
    // Use Outstanding Balances file so stats are correct even if join with Enrolled fails
    const rows = await getOutstandingBalancesData()
    if (!rows || !rows.length) {
      return { totalBalance: 0, employeesWithBalance: 0, avgBalance: 0 }
    }
    const withBalance = rows.filter(r => (r.outstanding_balance || 0) > 0)
    const totalBalance = withBalance.reduce((sum, r) => sum + r.outstanding_balance, 0)
    return {
      totalBalance,
      employeesWithBalance: withBalance.length,
      avgBalance: withBalance.length > 0 ? totalBalance / withBalance.length : 0,
    }
  }

  // ==========================================
  // SAVINGS QUERIES
  // ==========================================

  async getSavingsStats() {
    await this.ensureInitialized()
    if (!this.statsCache || !this.employeesCache) return null

    const totalEmployees = this.employeesCache.length
    const totalSaved = this.statsCache.totalSavingsBalance
    const employeesWithBalance = this.statsCache.employeesWithSavingsBalance

    return {
      totalAccounts: this.statsCache.employeesWithSavingsAccounts,
      totalSaved,
      avgPerEmployee: employeesWithBalance > 0 ? totalSaved / employeesWithBalance : 0,
      avgPerEmployeeAll: totalEmployees > 0 ? totalSaved / totalEmployees : 0,
      employeesWithBalance,
      totalEmployees,
    }
  }

  /** Per-company savings: total saved, count, average per employee (for that company) */
  async getCompanySavingsStats() {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    const byCompany = new Map()
    for (const emp of this.employeesCache) {
      const company = (emp.company || '').trim() || '(No company)'
      if (!byCompany.has(company)) {
        byCompany.set(company, { company, totalSaved: 0, employeesWithBalance: 0, employeeCount: 0 })
      }
      const row = byCompany.get(company)
      row.employeeCount += 1
      const bal = emp.save_balance || 0
      if (bal > 0) {
        row.totalSaved += bal
        row.employeesWithBalance += 1
      }
    }

    return [...byCompany.entries()]
      .filter(([company]) => company !== '(No company)')
      .map(([, row]) => ({
        ...row,
        avgPerEmployee: row.employeeCount > 0 ? row.totalSaved / row.employeeCount : 0,
        avgPerEmployeeWithBalance: row.employeesWithBalance > 0 ? row.totalSaved / row.employeesWithBalance : 0,
      }))
      .sort((a, b) => b.totalSaved - a.totalSaved)
  }

  async getEmployeesWithSavings() {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    return this.employeesCache.filter(emp => emp.has_savings_acct)
  }

  async getEmployeesWithSavingsBalance() {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    return this.employeesCache
      .filter(emp => emp.save_balance > 0)
      .sort((a, b) => b.save_balance - a.save_balance)
  }

  async getTopSavers(limit = 5) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    return this.employeesCache
      .filter(emp => emp.has_savings_acct && emp.save_balance > 0)
      .sort((a, b) => b.save_balance - a.save_balance)
      .slice(0, limit)
  }

  async getEmployeeSavingsDetails(nameOrCode) {
    const employee = await this.getEmployeeByName(nameOrCode) || await this.getEmployeeByCode(nameOrCode)
    if (!employee) return null

    return {
      full_name: employee.full_name,
      employee_id: employee.employee_id,
      has_savings_acct: employee.has_savings_acct,
      save_balance: employee.save_balance,
    }
  }

  async getTotalSavingsBalance() {
    await this.ensureInitialized()
    if (!this.employeesCache) return 0
    return this.employeesCache.reduce((sum, emp) => sum + (emp.save_balance || 0), 0)
  }

  async getSavingsParticipationRate() {
    await this.ensureInitialized()
    if (!this.employeesCache) return { withSavings: 0, total: 0, rate: 0 }

    const withSavings = this.employeesCache.filter(emp => emp.has_savings_acct).length
    const total = this.employeesCache.length
    return {
      withSavings,
      total,
      rate: total > 0 ? Math.round((withSavings / total) * 100) : 0,
    }
  }

  // ==========================================
  // COMPANY/CLIENT SUMMARY QUERIES
  // ==========================================

  async getAllCompanies() {
    await this.ensureInitialized()
    return this.companiesCache || []
  }

  /**
   * Returns one random company's name from Client Summary (for example prompts).
   * Returns null if no companies are loaded. Uses company name (COMPANY column).
   */
  async getRandomCompanyName() {
    await this.ensureInitialized()
    const companies = this.companiesCache || []
    if (companies.length === 0) return null
    const c = companies[Math.floor(Math.random() * companies.length)]
    const name = (c && c.company) ? String(c.company).trim() : null
    return name || null
  }

  /**
   * Returns one random partnership name from Client Summary (for example prompts).
   * Returns null if no partnerships are loaded. Uses PARTNERSHIP column.
   */
  async getRandomPartnershipName() {
    await this.ensureInitialized()
    const companies = this.companiesCache || []
    if (companies.length === 0) return null
    const set = new Set()
    companies.forEach(c => {
      const p = (c && c.partnership != null) ? String(c.partnership).trim() : ''
      if (p) set.add(p)
    })
    const list = Array.from(set)
    if (list.length === 0) return null
    return list[Math.floor(Math.random() * list.length)]
  }

  async getRandomCompanyNames(count = 10) {
    await this.ensureInitialized()
    const companies = this.companiesCache || []
    if (companies.length === 0) return []
    const shuffled = [...companies].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
      .map(c => c.company ? String(c.company).trim() : '').filter(Boolean)
  }

  async getRandomPartnershipNames(count = 10) {
    await this.ensureInitialized()
    const companies = this.companiesCache || []
    const set = new Set()
    companies.forEach(c => {
      const p = (c && c.partnership != null) ? String(c.partnership).trim() : ''
      if (p) set.add(p)
    })
    const list = Array.from(set).sort(() => Math.random() - 0.5)
    return list.slice(0, Math.min(count, list.length))
  }

  async getCompanyByName(name) {
    await this.ensureInitialized()
    if (!this.companiesCache) return null
    return this.companiesCache.find(c => fuzzyMatch(c.company, name))
  }

  /**
   * Get ALL companies matching a name (handles US + Canada variants like "Crate and Barrel" + "Crate and Barrel Canada").
   * Returns array of raw company objects.
   */
  async getAllCompaniesByName(name) {
    await this.ensureInitialized()
    if (!this.companiesCache || !name) return []
    return this.companiesCache.filter(c => fuzzyMatch(c.company, name))
  }

  async getCompanyStats(companyName) {
    const company = await this.getCompanyByName(companyName)
    if (!company) return null

    return {
      // Spread all raw fields from the data loader
      ...company,
      // Computed display fields
      adoption_rate_percent: `${((company.adoption_rate || 0) * 100).toFixed(1)}%`,
      active_percent: `${((company.active_per_adopted || 0) * 100).toFixed(1)}%`,
      transfers: company.transfers_in_period,
    }
  }

  /**
   * Get stats for ALL companies matching a name (handles US + Canada variants).
   * Returns array of company stats objects.
   */
  async getAllCompanyStats(companyName) {
    const companies = await this.getAllCompaniesByName(companyName)
    return companies.map(company => ({
      ...company,
      adoption_rate_percent: `${((company.adoption_rate || 0) * 100).toFixed(1)}%`,
      active_percent: `${((company.active_per_adopted || 0) * 100).toFixed(1)}%`,
      transfers: company.transfers_in_period,
    }))
  }

  /**
   * Get companies by partner_state (e.g. 'LIVE', 'PILOT', 'DISABLED').
   */
  async getCompaniesByPartnerState(state) {
    await this.ensureInitialized()
    if (!this.companiesCache || !state) return []
    const q = String(state).trim().toLowerCase()
    if (!q) return []
    return this.companiesCache.filter(c => {
      const s = (c.partner_state != null ? String(c.partner_state).trim() : '').toLowerCase()
      return s === q || s.includes(q)
    })
  }

  /**
   * Get admin email(s) for a company from Admin Summary. Multiple admins per company possible.
   * Returns array of { company, admin_email }. Uses fuzzy match on company name.
   */
  async getAdminsByCompany(companyName) {
    await this.ensureInitialized()
    const rows = await getAdminSummaryData()
    if (!rows || !companyName) return []
    const q = String(companyName).trim()
    if (!q) return []
    return rows.filter(row => fuzzyMatch(row.company, companyName))
  }

  /**
   * Search admin emails by name or partial email string.
   * Returns array of { company, admin_email } where admin_email contains the search term.
   */
  async searchAdminsByName(searchTerm) {
    await this.ensureInitialized()
    const rows = await getAdminSummaryData()
    if (!rows || !searchTerm) return []
    const q = String(searchTerm).trim().toLowerCase()
    if (!q || q.length < 2) return []
    return rows.filter(row => {
      const email = (row.admin_email || '').toLowerCase()
      return email.includes(q)
    })
  }

  /**
   * Get companies from Client Summary where PARTNERSHIP column matches the given name.
   * Uses exact (case-insensitive) or substring match on partnership.
   */
  async getCompaniesByPartnership(partnershipName) {
    await this.ensureInitialized()
    if (!this.companiesCache || !partnershipName) return []
    const q = String(partnershipName).trim()
    if (!q) return []
    const qLower = q.toLowerCase()
    return this.companiesCache.filter(c => {
      const p = (c.partnership != null ? String(c.partnership).trim() : '')
      if (!p) return false
      const pLower = p.toLowerCase()
      if (pLower === qLower) return true
      if (pLower.includes(qLower) || qLower.includes(pLower)) return true
      return fuzzyMatch(p, partnershipName)
    })
  }

  async getTopCompaniesByAdoption(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    return [...this.companiesCache]
      .sort((a, b) => b.adoption_rate - a.adoption_rate)
      .slice(0, limit)
  }

  /**
   * Companies from Client Summary with adoption rate >= minRatePercent,
   * sorted by adoption rate descending, top `limit` (default 20).
   * minRatePercent is 0-100 (e.g. 20 for 20%).
   */
  async getCompaniesAboveAdoptionRate(minRatePercent, limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    const minRate = minRatePercent / 100
    return [...this.companiesCache]
      .filter(c => c.adoption_rate >= minRate)
      .sort((a, b) => b.adoption_rate - a.adoption_rate)
      .slice(0, limit)
  }

  /**
   * Companies from Client Summary with adoption rate < maxRatePercent,
   * sorted by adoption rate descending (highest among "below" first), top `limit` (default 20).
   * maxRatePercent is 0-100 (e.g. 20 for 20%).
   */
  async getCompaniesBelowAdoptionRate(maxRatePercent, limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    const maxRate = maxRatePercent / 100
    return [...this.companiesCache]
      .filter(c => c.adoption_rate < maxRate)
      .sort((a, b) => b.adoption_rate - a.adoption_rate)
      .slice(0, limit)
  }

  async getTopCompaniesByTransfers(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    return [...this.companiesCache]
      .sort((a, b) => b.total_transfer_amount - a.total_transfer_amount)
      .slice(0, limit)
  }

  /**
   * Top companies by number of transfers (transfers_in_period from Client Summary).
   */
  async getTopCompaniesByTransferCount(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    return [...this.companiesCache]
      .sort((a, b) => (b.transfers_in_period ?? 0) - (a.transfers_in_period ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesByActiveUsers(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    return [...this.companiesCache]
      .sort((a, b) => b.active - a.active)
      .slice(0, limit)
  }

  async getTopCompaniesByOutstandingBalance(limit = 25) {
    // Get outstanding balances directly from the Outstanding Balances file
    // This file has COMPANY column in production
    const outstandingData = await getOutstandingBalancesData()
    
    if (!outstandingData || outstandingData.length === 0) return []

    // Aggregate outstanding balances by company
    const companyBalances = {}
    for (const record of outstandingData) {
      if (record.outstanding_balance > 0 && record.company) {
        const company = record.company.trim()
        if (!company) continue
        if (!companyBalances[company]) {
          companyBalances[company] = { company, totalBalance: 0, employeeCount: 0 }
        }
        companyBalances[company].totalBalance += record.outstanding_balance
        companyBalances[company].employeeCount += 1
      }
    }

    return Object.values(companyBalances)
      .sort((a, b) => b.totalBalance - a.totalBalance)
      .slice(0, limit)
  }

  /**
   * Top companies by number of paused employees (from Enrolled Employees, aggregated by company).
   */
  async getTopCompaniesByPausedEmployees(limit = 25) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    const byCompany = {}
    for (const emp of this.employeesCache) {
      if (!emp.company) continue
      const c = String(emp.company).trim()
      if (!c) continue
      if (!byCompany[c]) byCompany[c] = { company: c, paused: 0 }
      if (emp.paused) byCompany[c].paused += 1
    }
    // Enrich with partnership/sector from Client Summary
    const companies = this.companiesCache || []
    const companyMap = {}
    companies.forEach(co => { if (co.company) companyMap[co.company.trim().toLowerCase()] = co })
    const results = Object.values(byCompany).filter(x => x.paused > 0)
    results.forEach(r => {
      const match = companyMap[r.company.toLowerCase()]
      if (match) {
        r.partnership = match.partnership || ''
        r.sector = match.sector || ''
      }
    })
    return results
      .sort((a, b) => b.paused - a.paused)
      .slice(0, limit)
  }

  /**
   * Top companies by number of enrolled employees (from Enrolled Employees, aggregated by company).
   */
  async getTopCompaniesByEnrolledEmployees(limit = 25) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    const byCompany = {}
    for (const emp of this.employeesCache) {
      if (!emp.company) continue
      const c = String(emp.company).trim()
      if (!c) continue
      if (!byCompany[c]) byCompany[c] = { company: c, enrolled: 0 }
      byCompany[c].enrolled += 1
    }
    // Enrich with partnership/sector from Client Summary
    const companies = this.companiesCache || []
    const companyMap = {}
    companies.forEach(co => { if (co.company) companyMap[co.company.trim().toLowerCase()] = co })
    const results = Object.values(byCompany)
    results.forEach(r => {
      const match = companyMap[r.company.toLowerCase()]
      if (match) {
        r.partnership = match.partnership || ''
        r.sector = match.sector || ''
      }
    })
    return results
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, limit)
  }

  async getCompanySummaryStats() {
    await this.ensureInitialized()
    if (!this.statsCache) return null

    const companies = this.companiesCache || []
    const totalRevenue30d = companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0)
    const totalTransfers30d = companies.reduce((s, c) => s + (c.total_30d_transfers ?? 0), 0)

    return {
      totalCompanies: this.statsCache.totalCompanies,
      totalEligible: this.statsCache.totalEligible,
      totalAdopted: this.statsCache.totalAdopted,
      totalActive: this.statsCache.totalActive,
      overallAdoptionRate: this.statsCache.overallAdoptionRate,
      overallAdoptionRatePercent: `${(this.statsCache.overallAdoptionRate * 100).toFixed(1)}%`,
      totalTransfers: this.statsCache.totalTransfers,
      totalTransferAmount: this.statsCache.totalTransferAmount,
      totalRevenue30d,
      totalTransfers30d,
    }
  }

  // ==========================================
  // ADOPTION QUERIES
  // ==========================================

  async getAdoptionStats() {
    await this.ensureInitialized()
    if (!this.statsCache) return null

    return {
      totalCompanies: this.statsCache.totalCompanies,
      eligible: this.statsCache.totalEligible,
      enrolled: this.statsCache.totalAdopted,
      active: this.statsCache.totalActive,
      adoptionRate: `${(this.statsCache.overallAdoptionRate * 100).toFixed(1)}%`,
    }
  }

  async getAdoptionRate() {
    await this.ensureInitialized()
    if (!this.statsCache) return '0%'
    return `${(this.statsCache.overallAdoptionRate * 100).toFixed(1)}%`
  }

  // ==========================================
  // TRANSFER QUERIES (from Client Summary - all time since launch)
  // ==========================================

  async getTransferStats() {
    await this.ensureInitialized()
    if (!this.statsCache) return null

    return {
      totalTransfers: this.statsCache.totalTransfers,
      totalAmount: this.statsCache.totalTransferAmount,
      avgAmount: this.statsCache.avgTransferAmount,
    }
  }

  // ==========================================
  // AGGREGATE STATS
  // ==========================================

  async getAggregateStats() {
    await this.ensureInitialized()
    return this.statsCache
  }

  // ==========================================
  // NAVIGATION HELPERS
  // ==========================================

  getPageForTopic(topic) {
    const topicLower = topic.toLowerCase()
    if (topicLower.includes('employee') || topicLower.includes('staff') || topicLower.includes('team')) return '/employees'
    if (topicLower.includes('transfer') || topicLower.includes('ewa') || topicLower.includes('advance')) return '/transfers'
    if (topicLower.includes('saving') || topicLower.includes('save')) return '/savings'
    if (topicLower.includes('adoption') || topicLower.includes('usage') || topicLower.includes('enrollment')) return '/adoption-usage'
    if (topicLower.includes('impact') || topicLower.includes('satisfaction') || topicLower.includes('feedback')) return '/impact-stats'
    if (topicLower.includes('report') || topicLower.includes('download') || topicLower.includes('export')) return '/downloads'
    if (topicLower.includes('company') || topicLower.includes('client')) return '/clients'
    if (topicLower.includes('balance') || topicLower.includes('outstanding')) return '/balances'
    return '/'
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  formatCurrency(amount) {
    return formatCurrency(amount)
  }

  // Search across all employee fields
  async searchEmployees(query) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []

    const q = query.toLowerCase()
    return this.employeesCache.filter(emp =>
      (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(q)) ||
      (emp.company && emp.company.toLowerCase().includes(q)) ||
      (emp.salary_or_hourly && emp.salary_or_hourly.toLowerCase().includes(q))
    )
  }

  // Search across all companies
  async searchCompanies(query) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []

    const q = query.toLowerCase()
    return this.companiesCache.filter(company =>
      (company.company && company.company.toLowerCase().includes(q)) ||
      (company.partnership && company.partnership.toLowerCase().includes(q))
    )
  }

  // "Did you mean?" suggestions - search both employees and companies
  async getSuggestions(query) {
    await this.ensureInitialized()
    if (!query || typeof query !== 'string') return { employees: [], companies: [] }

    // Strip common query words to extract the likely entity name
    const stopWords = ['what', 'who', 'show', 'how', 'many', 'is', 'the', 'a', 'an', 'does', 'do',
      'tell', 'me', 'about', 'find', 'get', 'list', 'give', 'has', 'have', 'had', 'can', 'could',
      'where', 'when', 'which', 'that', 'this', 'for', 'with', 'from', 'at', 'of', 'in', 'on',
      'are', 'was', 'were', 'be', 'been', 'being', 'not', 'no', 'and', 'or', 'but', 'if',
      'their', 'there', 'they', 'them', 'his', 'her', 'its', 'my', 'your', 'our',
      'please', 'thanks', 'thank', 'you', 'help', 'need', 'want', 'look', 'looking', 'search']
    const cleaned = query.toLowerCase().split(/\s+/).filter(w => !stopWords.includes(w)).join(' ').trim()
    if (cleaned.length < 2) return { employees: [], companies: [] }

    // Search both datasets with the full cleaned string first
    let empResults = await this.searchEmployees(cleaned)
    let compResults = await this.searchCompanies(cleaned)

    // If no results with full string, try individual words (for "alamo drafthdfjhdjfg" → matches "alamo")
    if (empResults.length === 0 && compResults.length === 0) {
      const words = cleaned.split(/\s+/).filter(w => w.length >= 3)
      for (const word of words) {
        const wordEmps = await this.searchEmployees(word)
        const wordComps = await this.searchCompanies(word)
        empResults = [...empResults, ...wordEmps]
        compResults = [...compResults, ...wordComps]
      }
    }

    // Sort: prefix matches first, then substring
    const sortByRelevance = (items, nameKey, q) => {
      return items.sort((a, b) => {
        const aName = (a[nameKey] || '').toLowerCase()
        const bName = (b[nameKey] || '').toLowerCase()
        const aPrefix = aName.startsWith(q)
        const bPrefix = bName.startsWith(q)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
        return aName.localeCompare(bName)
      })
    }

    const q = cleaned.toLowerCase()
    // Filter out employees without a full_name (they show as blank buttons)
    const namedEmps = empResults.filter(emp => emp.full_name && emp.full_name.trim())
    const sortedEmps = sortByRelevance(namedEmps, 'full_name', q).slice(0, 3)
    const sortedComps = sortByRelevance(compResults, 'company', q).slice(0, 3)

    // Deduplicate employees by name
    const seenNames = new Set()
    const uniqueEmps = sortedEmps.filter(emp => {
      const name = (emp.full_name || '').toLowerCase()
      if (seenNames.has(name)) return false
      seenNames.add(name)
      return true
    })

    return {
      employees: uniqueEmps.map(e => ({ name: e.full_name, company: e.company })),
      companies: sortedComps.map(c => ({ name: c.company, partnership: c.partnership })),
    }
  }

  // ==========================================
  // TOP COMPANIES BY NEW COLUMNS (Issue 1)
  // ==========================================

  async getTopCompaniesByRevenue(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .filter(c => (c.sum_trailing_30d_net_rev ?? 0) > 0)
      .sort((a, b) => (b.sum_trailing_30d_net_rev ?? 0) - (a.sum_trailing_30d_net_rev ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesByDailyActiveUsers(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .sort((a, b) => (b.daily_active_app_users ?? 0) - (a.daily_active_app_users ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesByWeeklyActiveUsers(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .sort((a, b) => (b.weekly_active_app_users ?? 0) - (a.weekly_active_app_users ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesByMonthlyActiveUsers(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .sort((a, b) => (b.monthly_active_app_users ?? 0) - (a.monthly_active_app_users ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesBySavingsBalance(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .filter(c => (c.savings_balance_usd ?? 0) > 0)
      .sort((a, b) => (b.savings_balance_usd ?? 0) - (a.savings_balance_usd ?? 0))
      .slice(0, limit)
  }

  async getTopCompaniesByShifts(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .filter(c => (c.shifts_created_in_period ?? 0) > 0)
      .sort((a, b) => (b.shifts_created_in_period ?? 0) - (a.shifts_created_in_period ?? 0))
      .slice(0, limit)
  }

  // ==========================================
  // CSM / DELIVERY MANAGER QUERIES (Issue 3)
  // ==========================================

  async getCompaniesByCsmOwner(name) {
    await this.ensureInitialized()
    if (!this.companiesCache || !name) return []
    return this.companiesCache.filter(c => fuzzyMatch(c.csm_owner, name))
  }

  async getCompaniesByDeliveryManager(name) {
    await this.ensureInitialized()
    if (!this.companiesCache || !name) return []
    return this.companiesCache.filter(c => fuzzyMatch(c.delivery_manager, name))
  }

  async getCompaniesWithCreditScores() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return this.companiesCache
      .filter(c => c.credit_score && String(c.credit_score).trim())
      .sort((a, b) => {
        const sa = parseInt(String(a.credit_score)) || 0
        const sb = parseInt(String(b.credit_score)) || 0
        return sb - sa
      })
  }

  async getAllCsmOwners() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    const names = new Set()
    this.companiesCache.forEach(c => {
      const csm = (c.csm_owner || '').trim()
      if (csm) names.add(csm)
    })
    return [...names].sort()
  }

  async getAllDeliveryManagers() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    const names = new Set()
    this.companiesCache.forEach(c => {
      const dm = (c.delivery_manager || '').trim()
      if (dm) names.add(dm)
    })
    return [...names].sort()
  }

  // ==========================================
  // SECTOR GROUPING (Issue 4h)
  // ==========================================

  async getCompaniesBySector() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    const bySector = new Map()
    for (const c of this.companiesCache) {
      const sector = (c.sector || '').trim() || '(No sector)'
      if (!bySector.has(sector)) bySector.set(sector, [])
      bySector.get(sector).push(c)
    }
    return [...bySector.entries()]
      .map(([sector, companies]) => ({ sector, count: companies.length, companies }))
      .sort((a, b) => b.count - a.count)
  }

  // ==========================================
  // COMPANY STATE FILTERS
  // ==========================================

  async getDisabledCompanies() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return this.companiesCache.filter(c => (c.partner_state || '').toLowerCase() === 'disabled' || (c.disabled_date || ''))
  }

  async getCompaniesWithTransfersDisabled() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return this.companiesCache
      .filter(c => (c.disabled_users ?? 0) > 0)
      .sort((a, b) => (b.disabled_users ?? 0) - (a.disabled_users ?? 0))
  }

  async getEmployeesWithTransfersDisabled() {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    return this.employeesCache.filter(emp => emp.transfers_disabled === true)
  }

  async getCompaniesWithTerminations(limit = 25) {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    return [...this.companiesCache]
      .filter(c => (c.terminated_in_period ?? 0) > 0)
      .sort((a, b) => (b.terminated_in_period ?? 0) - (a.terminated_in_period ?? 0))
      .slice(0, limit)
  }

  // ==========================================
  // USER SEGMENTS
  // ==========================================

  /**
   * Power users: employees with transfers_90d >= threshold (default 20)
   */
  async getPowerUsers(minTransfers = 20, limit = 50) {
    await this.ensureInitialized()
    if (!this.employeesCache) return { total: 0, users: [] }
    const filtered = [...this.employeesCache]
      .filter(e => (e.transfers_90d ?? 0) >= minTransfers && !e.paused)
      .sort((a, b) => (b.transfers_90d ?? 0) - (a.transfers_90d ?? 0))
    return { total: filtered.length, users: filtered.slice(0, limit) }
  }

  async getDormantUsers(minDaysSinceStream = 30, limit = 50) {
    await this.ensureInitialized()
    if (!this.employeesCache) return { total: 0, users: [] }
    const now = Date.now()
    const filtered = [...this.employeesCache]
      .filter(e => {
        if (e.paused) return false
        if (!e.last_stream_date || e.last_stream_date === '') {
          return (e.transfers_90d ?? 0) === 0
        }
        const lastStream = new Date(e.last_stream_date)
        if (isNaN(lastStream.getTime())) return (e.transfers_90d ?? 0) === 0
        const daysSince = Math.floor((now - lastStream.getTime()) / 86400000)
        return daysSince >= minDaysSinceStream
      })
      .sort((a, b) => {
        const aDate = a.last_stream_date ? new Date(a.last_stream_date).getTime() : 0
        const bDate = b.last_stream_date ? new Date(b.last_stream_date).getTime() : 0
        return aDate - bDate
      })
    return { total: filtered.length, users: filtered.slice(0, limit) }
  }

  /**
   * High-frequency users: employees with transfers_14d >= threshold
   */
  async getHighFrequencyUsers(minTransfersPerCycle = 5, limit = 50) {
    await this.ensureInitialized()
    if (!this.employeesCache) return { total: 0, users: [] }
    const filtered = [...this.employeesCache]
      .filter(e => (e.transfers_14d ?? 0) >= minTransfersPerCycle)
      .sort((a, b) => (b.transfers_14d ?? 0) - (a.transfers_14d ?? 0))
    return { total: filtered.length, users: filtered.slice(0, limit) }
  }

  /**
   * First-time / new users: employees created within the last N days (via employee_created_at)
   */
  async getNewUsers(maxDaysSinceCreated = 7, limit = 50) {
    await this.ensureInitialized()
    if (!this.employeesCache) return { total: 0, users: [] }
    const now = Date.now()
    const filtered = [...this.employeesCache]
      .filter(e => {
        if (!e.employee_created_at) return false
        const created = new Date(e.employee_created_at)
        if (isNaN(created.getTime())) return false
        const daysSince = Math.floor((now - created.getTime()) / 86400000)
        return daysSince >= 0 && daysSince <= maxDaysSinceCreated
      })
      .sort((a, b) => {
        const aDate = new Date(a.employee_created_at).getTime() || 0
        const bDate = new Date(b.employee_created_at).getTime() || 0
        return bDate - aDate // newest first
      })
    return { total: filtered.length, users: filtered.slice(0, limit) }
  }

  // ==========================================
  // COMPANY COMPARISON
  // ==========================================

  /**
   * Compare two companies side by side. Returns { companyA, companyB } with all their stats.
   */
  async compareCompanies(nameA, nameB) {
    const a = await this.getCompanyStats(nameA)
    const b = await this.getCompanyStats(nameB)
    return { companyA: a, companyB: b }
  }

  /**
   * Get sector averages for key metrics. Returns { sector, avgAdoption, avgTransfers, avgRevenue, count, ... }
   */
  async getSectorAverages() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    const bySector = new Map()
    for (const c of this.companiesCache) {
      const sector = (c.sector || '').trim() || '(No sector)'
      if (!bySector.has(sector)) bySector.set(sector, [])
      bySector.get(sector).push(c)
    }
    return [...bySector.entries()].map(([sector, companies]) => {
      const count = companies.length
      const totalEligible = companies.reduce((s, c) => s + (c.eligible ?? 0), 0)
      const totalAdopted = companies.reduce((s, c) => s + (c.adopted ?? 0), 0)
      const avgAdoption = totalEligible > 0 ? totalAdopted / totalEligible : 0
      const avgTransfers = count > 0 ? companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0) / count : 0
      const avgRevenue = count > 0 ? companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0) / count : 0
      const totalRevenue = companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0)
      const totalTransfers = companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0)
      const totalActive = companies.reduce((s, c) => s + (c.active ?? 0), 0)
      return { sector, count, totalEligible, totalAdopted, avgAdoption, avgTransfers, avgRevenue, totalRevenue, totalTransfers, totalActive }
    }).sort((a, b) => b.avgAdoption - a.avgAdoption)
  }

  /**
   * Get partnership averages for key metrics. Returns [{ partnership, avgAdoption, avgTransfers, avgRevenue, count, ... }]
   */
  async getPartnershipAverages() {
    await this.ensureInitialized()
    if (!this.companiesCache) return []
    const byPartnership = new Map()
    for (const c of this.companiesCache) {
      const p = (c.partnership || '').trim() || '(No partnership)'
      if (!byPartnership.has(p)) byPartnership.set(p, [])
      byPartnership.get(p).push(c)
    }
    return [...byPartnership.entries()].map(([partnership, companies]) => {
      const count = companies.length
      const totalEligible = companies.reduce((s, c) => s + (c.eligible ?? 0), 0)
      const totalAdopted = companies.reduce((s, c) => s + (c.adopted ?? 0), 0)
      const avgAdoption = totalEligible > 0 ? totalAdopted / totalEligible : 0
      const avgTransfers = count > 0 ? companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0) / count : 0
      const avgRevenue = count > 0 ? companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0) / count : 0
      const totalRevenue = companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0)
      const totalTransfers = companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0)
      const totalActive = companies.reduce((s, c) => s + (c.active ?? 0), 0)
      return { partnership, count, totalEligible, totalAdopted, avgAdoption, avgTransfers, avgRevenue, totalRevenue, totalTransfers, totalActive }
    }).sort((a, b) => b.avgAdoption - a.avgAdoption)
  }

  /**
   * Get average stats for companies in a specific partnership
   */
  async getPartnershipStats(partnershipName) {
    await this.ensureInitialized()
    if (!this.companiesCache || !partnershipName) return null
    const q = String(partnershipName).trim().toLowerCase()
    const companies = this.companiesCache.filter(c => {
      const p = (c.partnership || '').trim().toLowerCase()
      return p === q || p.includes(q) || q.includes(p)
    })
    if (companies.length === 0) return null
    const count = companies.length
    const totalEligible = companies.reduce((s, c) => s + (c.eligible ?? 0), 0)
    const totalAdopted = companies.reduce((s, c) => s + (c.adopted ?? 0), 0)
    const avgAdoption = totalEligible > 0 ? totalAdopted / totalEligible : 0
    const avgTransfers = count > 0 ? companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0) / count : 0
    const avgRevenue = count > 0 ? companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0) / count : 0
    const totalRevenue = companies.reduce((s, c) => s + (c.sum_trailing_30d_net_rev ?? 0), 0)
    const totalTransfers = companies.reduce((s, c) => s + (c.transfers_in_period ?? 0), 0)
    const totalActive = companies.reduce((s, c) => s + (c.active ?? 0), 0)
    const totalDailyActive = companies.reduce((s, c) => s + (c.daily_active_app_users ?? 0), 0)
    const totalWeeklyActive = companies.reduce((s, c) => s + (c.weekly_active_app_users ?? 0), 0)
    const totalMonthlyActive = companies.reduce((s, c) => s + (c.monthly_active_app_users ?? 0), 0)
    const totalTransferAmount = companies.reduce((s, c) => s + (c.total_transfer_amount ?? 0), 0)
    const totalTransfers30d = companies.reduce((s, c) => s + (c.total_30d_transfers ?? 0), 0)
    return { partnership: partnershipName, count, totalEligible, totalAdopted, avgAdoption, avgTransfers, avgRevenue, totalRevenue, totalTransfers, totalTransferAmount, totalTransfers30d, totalActive, totalDailyActive, totalWeeklyActive, totalMonthlyActive, companies }
  }

  /**
   * Extract a company or partnership name from a natural-language query.
   * Strips common keywords and fuzzy-matches the remainder against known names.
   * Returns { type: 'company'|'partnership'|'org', name, stats }
   */
  async findEntityInQuery(query) {
    await this.ensureInitialized()
    const stripped = query
      .replace(/\b(what|what's|whats|how much|how many|show|get|tell me|total|is|are|was|were|the|for|at|in|of|about|last|trailing|30[- ]?day|30d|14[- ]?day|14d|all[- ]?time|alltime|revenue|mrr|net rev|gross rev|net revenue|gross revenue|transfers?|transfer amount|transfer volume|number of|count|taken|made)\b/gi, '')
      .replace(/[?.!,\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!stripped || stripped.length < 2) return { type: 'org' }

    // Try company match first (more specific) — also normalize company name (strip commas) to match stripped query
    const company = (this.companiesCache || []).find(c => {
      const normalizedName = (c.company || '').replace(/[,]+/g, '').trim()
      return fuzzyMatch(normalizedName, stripped) || fuzzyMatch(c.company, stripped)
    })
    if (company) return { type: 'company', name: company.company, stats: company }

    // Try partnership match
    const partnershipNames = [...new Set((this.companiesCache || []).map(c => (c.partnership || '').trim()).filter(Boolean))]
    const q = stripped.toLowerCase()
    const pMatch = partnershipNames.find(p => {
      const pl = p.toLowerCase()
      return pl === q || q.includes(pl) || pl.includes(q)
    })
    if (pMatch) return { type: 'partnership', name: pMatch }

    return { type: 'org' }
  }

  /**
   * Get the sector stats for a specific sector name
   */
  async getSectorStats(sectorName) {
    const all = await this.getSectorAverages()
    const q = String(sectorName).trim().toLowerCase()
    return all.find(s => s.sector.toLowerCase() === q || s.sector.toLowerCase().includes(q))
  }
}

// Export singleton instance
export const pennyDataService = new PennyDataService()
export default pennyDataService
