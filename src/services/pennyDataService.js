/**
 * PennyDataService - Centralized data aggregation for Penny AI Assistant
 *
 * This service provides query methods for the AI assistant to answer admin questions.
 * Data is loaded from CSV files:
 * - Client Summary: Company stats (adoption, transfers, etc.)
 * - Employee Summary: One row per employee (COMPANY, FULL_NAME, CURRENT_STATE, PAUSED, LOCATION,
 *   PAYTYPE, HAS_SAVINGS_ACCT, SAVE_BALANCE, OUTSTANDING_PRINCIPAL). Outstanding/savings are derived from this.
 */

import {
  loadAllData,
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
  return s1.includes(s2) || s2.includes(s1)
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

  // Refresh data from CSV files
  async refresh() {
    clearCache()
    this.initialized = false
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
    return this.employeesCache.find(emp => emp.employee_code === employeeCode)
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
    return this.employeesCache.filter(emp => fuzzyMatch(emp.paytype, paytype))
  }

  async getEmployeesByCompany(companyName) {
    await this.ensureInitialized()
    if (!this.employeesCache) return []
    return this.employeesCache.filter(emp => fuzzyMatch(emp.company, companyName))
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
      status: employee.paused ? 'Paused' : 'Active',
      hasOutstandingBalance: employee.outstanding_balance > 0,
      hasSavings: employee.has_savings_acct,
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
        employee_code: r.employee_code || '',
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
      employee_code: employee.employee_code,
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

  async getCompanyByName(name) {
    await this.ensureInitialized()
    if (!this.companiesCache) return null
    return this.companiesCache.find(c => fuzzyMatch(c.company, name))
  }

  async getCompanyStats(companyName) {
    const company = await this.getCompanyByName(companyName)
    if (!company) return null

    return {
      company: company.company,
      partnership: company.partnership,
      model: company.model ?? '',
      launch_date: company.launch_date,
      eligible: company.eligible,
      adopted: company.adopted,
      adoption_rate: company.adoption_rate,
      adoption_rate_percent: `${(company.adoption_rate * 100).toFixed(1)}%`,
      active: company.active,
      active_per_adopted: company.active_per_adopted,
      active_percent: `${(company.active_per_adopted * 100).toFixed(1)}%`,
      transfers: company.transfers_in_period,
      total_transfer_amount: company.total_transfer_amount,
    }
  }

  /**
   * Get companies from Client Summary where MODEL column matches the given name (case-insensitive).
   */
  async getCompaniesByModel(modelName) {
    await this.ensureInitialized()
    if (!this.companiesCache || !modelName) return []
    const q = String(modelName).trim().toLowerCase()
    if (!q) return []
    return this.companiesCache.filter(c => {
      const m = (c.model != null ? String(c.model).trim() : '').toLowerCase()
      return m === q
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
    return Object.values(byCompany)
      .filter(x => x.paused > 0)
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
    return Object.values(byCompany)
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, limit)
  }

  async getCompanySummaryStats() {
    await this.ensureInitialized()
    if (!this.statsCache) return null

    return {
      totalCompanies: this.statsCache.totalCompanies,
      totalEligible: this.statsCache.totalEligible,
      totalAdopted: this.statsCache.totalAdopted,
      totalActive: this.statsCache.totalActive,
      overallAdoptionRate: this.statsCache.overallAdoptionRate,
      overallAdoptionRatePercent: `${(this.statsCache.overallAdoptionRate * 100).toFixed(1)}%`,
      totalTransfers: this.statsCache.totalTransfers,
      totalTransferAmount: this.statsCache.totalTransferAmount,
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
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
      (emp.location && emp.location.toLowerCase().includes(q)) ||
      (emp.paytype && emp.paytype.toLowerCase().includes(q))
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
}

// Export singleton instance
export const pennyDataService = new PennyDataService()
export default pennyDataService
