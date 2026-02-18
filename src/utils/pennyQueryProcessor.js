/**
 * PennyQueryProcessor - Pattern matching for Penny AI Assistant queries
 *
 * Processes user queries and generates appropriate responses using the CSV data service.
 * Data sources:
 * - Client Summary: Company stats (adoption, transfers, etc.)
 * - Enrolled Employees: Employee list with employee_id, paused, location, paytype
 * - Outstanding Balances: employee_id + outstanding balance
 * - Save Accounts: employee_id + savings balance + has_savings_acct
 */

import pennyDataService from '../services/pennyDataService'

/**
 * Enrich a company stats/summary object with pausedCount from employee data.
 * Used by all company-stats-card paths to ensure the Paused pill always shows.
 */
async function enrichWithPausedCount(statsObj) {
  if (!statsObj?.company) return { pausedCount: 0 }
  const empStats = await pennyDataService.getCompanyEmployeeStats(statsObj.company)
  const pausedEmployees = (empStats?.employees || []).filter(e => e.paused === true)
  const pausedExpandList = pausedEmployees.length > 0 ? {
    type: 'table',
    title: `Paused employees at ${statsObj.company}`,
    data: {
      headers: ['Name', 'Company', 'Pause Reason', 'Status'],
      rows: pausedEmployees.map(e => [e.full_name || '—', e.company || '—', e.pause_reason || '—', 'Paused']),
      employeeNames: pausedEmployees.map(e => e.full_name),
      rawEmployees: pausedEmployees,
    },
  } : null
  return { pausedCount: pausedEmployees.length, ...(pausedExpandList && { pausedExpandList }) }
}

// Extract bold-wrapped names from response text so PennyMessage can make them clickable
// without needing a global lookup against 131K+ employees
function extractResponseNames(text) {
  if (!text) return { employees: [], companies: [] }
  const boldPattern = /\*\*(.*?)\*\*/g
  const names = new Set()
  let m
  while ((m = boldPattern.exec(text)) !== null) {
    const name = m[1].trim()
    // Skip empty, pure numbers, very short, or obviously non-name strings
    if (!name || name.length < 3 || /^\d[\d,.%$]*$/.test(name)) continue
    // Skip strings that are clearly labels/headings (contain colons, parens with numbers, etc.)
    if (/[():]/.test(name) && !/^[A-Z][a-z]/.test(name)) continue
    names.add(name)
  }
  return { employees: [...names], companies: [] }
}

// Conversation context - tracks the last mentioned employee/company for follow-up questions
let lastMentionedEmployee = null
let lastMentionedCompany = null
let lastPendingQuery = null // Stores original query when disambiguation is needed (e.g. "how many enrolled at Crate & Barrel?" before company selection)

// Reset conversation context (call when starting a new conversation)
export function resetConversationContext() {
  lastMentionedEmployee = null
  lastMentionedCompany = null
  lastPendingQuery = null
}

// Get the current conversation context
export function getConversationContext() {
  return { lastMentionedEmployee, lastMentionedCompany }
}

// Helper: build a "did you mean?" response with smart suggestions
async function buildNotFoundWithSuggestions(name, originalQuery) {
  const searchTerm = name || originalQuery
  const suggestions = await pennyDataService.getSuggestions(searchTerm)
  const hasMatches = suggestions.employees.length > 0 || suggestions.companies.length > 0

  if (hasMatches) {
    return {
      type: 'did-you-mean',
      text: `Sorry, I couldn't find what you're looking for. Did you mean one of these?`,
      richContent: {
        type: 'did-you-mean',
        data: {
          employees: suggestions.employees,
          companies: suggestions.companies,
          originalQuery: originalQuery,
        },
      },
    }
  }

  // No matches found - return generic not-found
  return {
    type: 'not-found',
    text: name
      ? `I couldn't find an employee or company named "${name}".`
      : "I'm not sure how to help with that.",
    suggestions: [
      'Show outstanding balances',
      'Show company stats',
      'Show savings stats',
      'List paused employees',
      'Show top companies by adoption',
    ],
  }
}

// Common synonyms and variations for better matching
const synonyms = {
  outstanding: ['outstanding', 'owed', 'owes', 'unpaid', 'due', 'debt', 'balance due', 'amount due', 'money owed'],
  balance: ['balance', 'amount', 'total', 'sum', 'money'],
  employees: ['employees', 'employee', 'staff', 'workers', 'team', 'people', 'person', 'member', 'members', 'users'],
  enrolled: ['enrolled', 'signed up', 'registered', 'active', 'participating', 'opted in', 'using', 'adopted'],
  transfers: ['transfers', 'transfer', 'transactions', 'withdrawals', 'advances', 'ewa', 'wage access', 'streamed'],
  savings: ['savings', 'saved', 'save', 'saving', 'save account', 'save accounts', 'emergency fund'],
  adoption: ['adoption', 'adoption rate', 'signup', 'sign-up', 'enrollment', 'participation', 'usage rate'],
  paused: ['paused', 'pause', 'blocked', 'suspended', 'inactive', 'disabled', 'on hold'],
  company: ['company', 'companies', 'client', 'clients', 'employer', 'employers', 'organization', 'organizations'],
  location: ['location', 'city', 'where', 'based', 'located', 'works', 'office', 'site'],
}

// Helper to check if query contains any of the synonym variations (word-boundary matching)
function matchesSynonyms(query, category) {
  const lowerQuery = query.toLowerCase()
  return synonyms[category]?.some(syn => {
    // Use word boundary regex to avoid substring false positives (e.g. "owes" matching inside "lowest")
    const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(lowerQuery)
  }) || false
}

// ============================================
// FUN FACT GENERATORS — 20 async functions that each return a random stat string (or null)
// ============================================
const funFactGenerators = [
  // 1. Partnership size comparison
  async () => {
    const partnerships = await pennyDataService.getPartnershipAverages()
    if (partnerships.length < 2) return null
    const sorted = [...partnerships].sort((a, b) => b.count - a.count)
    const top = sorted[0], second = sorted[1]
    const diff = top.count - second.count
    return `**${top.partnership}** has **${diff} more** companies live than ${second.partnership} (${top.count} vs ${second.count}).`
  },
  // 2. Top company by transfer count
  async () => {
    const top = await pennyDataService.getTopCompaniesByTransferCount(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** leads the pack with **${(c.transfers_in_period ?? 0).toLocaleString()} transfers** this period!`
  },
  // 3. Lowest-transfer company (still active)
  async () => {
    const all = await pennyDataService.getAllCompanies()
    const withTransfers = all.filter(c => (c.transfers_in_period ?? 0) > 0)
    if (!withTransfers.length) return null
    const sorted = [...withTransfers].sort((a, b) => (a.transfers_in_period ?? 0) - (b.transfers_in_period ?? 0))
    const c = sorted[0]
    return `**${c.company}** only had **${c.transfers_in_period} transfers** this period — room to grow!`
  },
  // 4. Most paused employees
  async () => {
    const top = await pennyDataService.getTopCompaniesByPausedEmployees(1)
    if (!top.length || !(top[0].paused > 0)) return null
    const c = top[0]
    return `**${c.company}** has the most paused employees: **${c.paused}** on hold right now.`
  },
  // 5. Sector adoption comparison (best vs worst)
  async () => {
    const sectors = await pennyDataService.getSectorAverages()
    if (sectors.length < 2) return null
    const sorted = [...sectors].sort((a, b) => b.avgAdoption - a.avgAdoption)
    const best = sorted[0], worst = sorted[sorted.length - 1]
    return `**${best.sector}** leads adoption at **${(best.avgAdoption * 100).toFixed(1)}%**, while **${worst.sector}** is at **${(worst.avgAdoption * 100).toFixed(1)}%**.`
  },
  // 6. Overall adoption rate
  async () => {
    const stats = await pennyDataService.getAdoptionStats()
    if (!stats) return null
    return `Across all **${stats.totalCompanies} companies**, the overall adoption rate is **${stats.adoptionRate}** — ${stats.enrolled?.toLocaleString()} enrolled out of ${stats.eligible?.toLocaleString()} eligible.`
  },
  // 7. Total transfer volume
  async () => {
    const stats = await pennyDataService.getTransferStats()
    if (!stats || !stats.totalTransfers) return null
    return `Employees have made a total of **${stats.totalTransfers?.toLocaleString()} transfers** worth **$${stats.totalAmount?.toLocaleString()}** — that's an average of **$${stats.avgAmount?.toFixed(2)}** per transfer.`
  },
  // 8. Top company by adoption
  async () => {
    const top = await pennyDataService.getTopCompaniesByAdoption(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** has the highest adoption rate at **${((c.adoption_rate ?? 0) * 100).toFixed(1)}%** — ${(c.adopted ?? 0).toLocaleString()} of ${(c.eligible ?? 0).toLocaleString()} eligible!`
  },
  // 9. Savings stats
  async () => {
    const stats = await pennyDataService.getSavingsStats()
    if (!stats || !stats.totalAccounts) return null
    return `**${stats.totalAccounts.toLocaleString()} employees** have opened savings accounts, saving a total of **$${stats.totalSaved?.toFixed(2)}** (avg **$${stats.avgPerEmployee?.toFixed(2)}** per saver).`
  },
  // 10. Power users count
  async () => {
    const result = await pennyDataService.getPowerUsers(20, 1)
    if (!result || !result.total) return null
    return `There are **${result.total.toLocaleString()} power users** with 20+ lifetime transfers — the EWA super-fans!`
  },
  // 11. Dormant users count
  async () => {
    const result = await pennyDataService.getDormantUsers(30, 1)
    if (!result || !result.total) return null
    return `**${result.total.toLocaleString()} enrolled employees** haven't streamed in over 30 days. Re-engagement opportunity!`
  },
  // 12. New users this week
  async () => {
    const result = await pennyDataService.getNewUsers(7, 1)
    if (!result) return null
    return result.total > 0
      ? `**${result.total} new employees** signed up in the last 7 days. Fresh faces!`
      : `No brand-new signups in the last 7 days — time for an enrollment push?`
  },
  // 13. Top company by revenue
  async () => {
    const top = await pennyDataService.getTopCompaniesByRevenue(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** is the top revenue driver with **$${(c.sum_trailing_30d_net_rev ?? 0).toLocaleString()}** in trailing 30-day net revenue.`
  },
  // 14. Outstanding balance stats
  async () => {
    const stats = await pennyDataService.getOutstandingBalanceStats()
    if (!stats || !stats.employeesWithBalance) return null
    return `**${stats.employeesWithBalance.toLocaleString()} employees** have outstanding balances totaling **$${stats.totalBalance.toFixed(2)}** (avg **$${stats.avgBalance.toFixed(2)}** each).`
  },
  // 15. Top company by active users
  async () => {
    const top = await pennyDataService.getTopCompaniesByActiveUsers(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** has the most active users: **${(c.active ?? 0).toLocaleString()}** employees actively using EWA.`
  },
  // 16. Partnership adoption comparison (best vs worst)
  async () => {
    const partnerships = await pennyDataService.getPartnershipAverages()
    if (partnerships.length < 2) return null
    const sorted = [...partnerships].sort((a, b) => b.avgAdoption - a.avgAdoption)
    const best = sorted[0], worst = sorted[sorted.length - 1]
    return `Partnership adoption varies: **${best.partnership}** averages **${(best.avgAdoption * 100).toFixed(1)}%** while **${worst.partnership}** averages **${(worst.avgAdoption * 100).toFixed(1)}%**.`
  },
  // 17. Employee count breakdown
  async () => {
    const counts = await pennyDataService.getEmployeeCount()
    if (!counts || !counts.total) return null
    const pauseRate = ((counts.paused / counts.total) * 100).toFixed(1)
    return `We have **${counts.total.toLocaleString()} enrolled employees** — **${counts.active.toLocaleString()} active** and **${counts.paused.toLocaleString()} paused** (${pauseRate}% pause rate).`
  },
  // 18. Top company by savings balance
  async () => {
    const top = await pennyDataService.getTopCompaniesBySavingsBalance(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}**'s employees are the biggest savers with **$${(c.savings_balance_usd ?? 0).toLocaleString()}** in total savings!`
  },
  // 19. High-frequency users
  async () => {
    const result = await pennyDataService.getHighFrequencyUsers(5, 1)
    if (!result || !result.total) return null
    return `**${result.total.toLocaleString()} employees** made 5+ transfers this pay cycle. High engagement!`
  },
  // 20. Number of live companies
  async () => {
    const stats = await pennyDataService.getCompanySummaryStats()
    if (!stats) return null
    return `We currently have **${stats.totalCompanies} companies** live with **${stats.totalActive?.toLocaleString()} active users** across them all.`
  },
  // 21. Lowest adoption company
  async () => {
    const low = await pennyDataService.getCompaniesBelowAdoptionRate(5, 1)
    if (!low.length) return null
    const c = low[0]
    return `**${c.company}** has just **${((c.adoption_rate ?? 0) * 100).toFixed(1)}%** adoption — only ${(c.adopted ?? 0).toLocaleString()} of ${(c.eligible ?? 0).toLocaleString()} eligible.`
  },
  // 22. Top company by outstanding balance
  async () => {
    const top = await pennyDataService.getTopCompaniesByOutstandingBalance(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** has the highest outstanding balance at **$${(c.outstanding_balance ?? 0).toLocaleString()}** across its employees.`
  },
  // 23. Number of sectors
  async () => {
    const sectors = await pennyDataService.getCompaniesBySector()
    if (!sectors || sectors.length < 2) return null
    const biggest = sectors.sort((a, b) => b.count - a.count)[0]
    return `We operate across **${sectors.length} sectors** — **${biggest.sector}** is the largest with **${biggest.count}** companies.`
  },
  // 24. Top company by enrolled employees
  async () => {
    const top = await pennyDataService.getTopCompaniesByEnrolledEmployees(1)
    if (!top.length) return null
    const c = top[0]
    return `**${c.company}** has the most enrolled employees — **${(c.adopted ?? 0).toLocaleString()}** and counting!`
  },
  // 25. Companies with high adoption
  async () => {
    const high = await pennyDataService.getCompaniesAboveAdoptionRate(50)
    if (!high) return null
    return `**${high.length} companies** have crossed the 50% adoption milestone. That's strong engagement!`
  },
  // 26. Random company spotlight
  async () => {
    const name = await pennyDataService.getRandomCompanyName()
    if (!name) return null
    const stats = await pennyDataService.getCompanyStats(name)
    if (!stats) return null
    return `Spotlight on **${stats.company}**: **${((stats.adoption_rate ?? 0) * 100).toFixed(1)}%** adoption, **${(stats.active ?? 0).toLocaleString()}** active users, **${(stats.transfers_in_period ?? 0).toLocaleString()}** transfers this period.`
  },
  // 27. Savings participation rate
  async () => {
    const rate = await pennyDataService.getSavingsParticipationRate()
    if (!rate || !rate.rate) return null
    return `**${rate.rate}** of enrolled employees have opened a savings account — that's **${rate.withSavings?.toLocaleString()}** out of **${rate.total?.toLocaleString()}**.`
  },
  // 28. Top company by 30d streamers
  async () => {
    const all = await pennyDataService.getAllCompanies()
    const withStreamers = all.filter(c => (c.trailing_30d_streamers ?? 0) > 0).sort((a, b) => (b.trailing_30d_streamers ?? 0) - (a.trailing_30d_streamers ?? 0))
    if (!withStreamers.length) return null
    const c = withStreamers[0]
    return `**${c.company}** had the most 30-day streamers: **${(c.trailing_30d_streamers ?? 0).toLocaleString()}** employees making transfers.`
  },
  // 29. Average adoption across all companies
  async () => {
    const all = await pennyDataService.getAllCompanies()
    if (!all.length) return null
    const avgAdoption = all.reduce((sum, c) => sum + (c.adoption_rate ?? 0), 0) / all.length
    return `The average adoption rate across all **${all.length} companies** is **${(avgAdoption * 100).toFixed(1)}%**.`
  },
  // 30. Total savings balance
  async () => {
    const stats = await pennyDataService.getSavingsStats()
    if (!stats || !stats.totalSaved) return null
    return `Employees have saved a combined **$${Number(stats.totalSaved).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across all savings accounts. Financial wellness in action!`
  },
]

// Pick a random fun fact — shuffles generators and tries each until one returns a result
async function getRandomFunFact() {
  const shuffled = [...funFactGenerators].sort(() => Math.random() - 0.5)
  for (const generator of shuffled) {
    try {
      const fact = await generator()
      if (fact) return fact
    } catch (err) {
      console.error('Fun fact generator error:', err)
    }
  }
  return null
}

// Extract company name from query - looks for "at [company]" or "from [company]" patterns
function extractCompanyName(query) {
  const patterns = [
    /(?:at|from|for|of)\s+(?:company\s+)?([a-zA-Z0-9\s]+?)(?:\s*\?|$|\s+(?:how|what|who|show|list|give|get))/i,
    /(?:at|from|for|of)\s+([a-zA-Z0-9\s]+)$/i,
    /([a-zA-Z0-9\s]+?)(?:'s)?\s+(?:employees?|users?|staff|savings?|balance|active)/i,
  ]

  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      // Skip common words
      const skipWords = ['the', 'all', 'total', 'our', 'my', 'this', 'how', 'many', 'much', 'open', 'active']
      if (!skipWords.includes(name.toLowerCase()) && name.length > 2) {
        return name
      }
    }
  }
  return null
}

// Clean name captured from query: strip "the employee", " at Location", "'s balance", etc.
function cleanEmployeeNameFromQuery(rawName) {
  if (!rawName || typeof rawName !== 'string') return rawName
  let name = rawName.trim()
  // Strip trailing punctuation
  name = name.replace(/[?.!,]+$/, '').trim()
  // Strip common prefixes
  const prefixes = [/^\s*the\s+employee\s+/i, /^\s*employee\s+/i, /^\s*user\s+/i, /^\s*person\s+/i]
  for (const p of prefixes) {
    name = name.replace(p, '').trim()
  }
  // Strip " at Location", " in Location", " from Location" (take only the part before)
  const atMatch = name.match(/^(.+?)\s+(?:at|in|from)\s+.+$/i)
  if (atMatch && atMatch[1]) {
    const before = atMatch[1].trim()
    // Only use it if the part before looks like a name (one or a few words)
    if (before.length > 0 && before.length < 50 && !/^(the|all|everyone|show|list|get)$/i.test(before)) {
      name = before
    }
  }
  // Strip possessive / trailing "'s ..." (e.g. "John's balance" -> "John")
  name = name.replace(/\'s\s+(?:balance|status|info|details|enrollment|savings?|outstanding|transfer).*$/i, '').trim()
  name = name.replace(/\'s\s*$/i, '').trim()
  return name.trim() || rawName.trim()
}

// Extract potential employee name from query
function extractEmployeeName(query) {
  const lowerQuery = query.toLowerCase()

  // Common patterns for names in queries
  const patterns = [
    // "Does John Andrew Lane have a savings account?" / "Has X have a save account" — capture full name
    /(?:does|has)\s+(.+?)\s+have\s+(?:an?\s+)?sav(?:ings?|e)(?:\s+account)?/i,
    /(?:for|about|of|check|look up|find|get|show|tell me about)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)'s?\s+(?:balance|status|enrollment|transfers|savings|location|info|details)/i,
    /(?:does|did|is|has|where does|what is|where is)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s+(?:owe|have|enrolled|work|paused)/i,
    /(?:how much|what|where).*(?:does|did|is)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s*\??$/i, // Just a name as a query
    /^([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s+(?:info|details|profile|data)/i,
  ]

  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      // Verify it looks like a name (not a common word)
      const commonWords = ['the', 'total', 'all', 'our', 'my', 'this', 'that', 'how', 'what', 'who', 'when', 'where', 'show', 'tell', 'me', 'get', 'check', 'outstanding', 'savings', 'balance', 'balances', 'savings stats', 'saving stats', 'save stats', 'stats', 'outstanding balances', 'outstanding balance']
      const nameLower = name.toLowerCase().replace(/\s+/g, ' ').trim()
      if (!commonWords.includes(nameLower) && name.length > 2 && !isSavingsStatsPhrase(name) && !isOutstandingBalancePhrase(name)) {
        return name
      }
    }
  }
  return null
}

// Pronouns that can refer to a previously mentioned employee
const employeePronouns = ['they', 'them', 'their', 'theirs', 'he', 'him', 'his', 'she', 'her', 'hers', 'this person', 'that person', 'this employee', 'that employee']

// Pronouns that can refer to a previously mentioned company
const companyPronouns = ['this company', 'that company', 'it', 'its']

// Check if query uses a pronoun referring to a previous employee or company
function resolvePronouns(query) {
  const lowerQuery = query.toLowerCase()

  // Company-context keywords: if the query is clearly about a company, resolve pronouns to company first
  const companyContextKeywords = /\b(launched|set\s+up|onboarded|admins?\s+at|adoption\s+at|stats?\s+for|employees?\s+at|transfers?\s+at|who\s+launched)\b/i
  const isCompanyContextQuery = companyContextKeywords.test(lowerQuery)

  // If query is clearly company-related, try company pronouns first
  if (isCompanyContextQuery && lastMentionedCompany) {
    const allPronouns = [...companyPronouns, 'them', 'they', 'their']
    for (const pronoun of allPronouns) {
      const pronounRegex = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pronounRegex.test(lowerQuery)) {
        const resolvedQuery = query.replace(pronounRegex, lastMentionedCompany)
        return { resolved: true, query: resolvedQuery, originalPronoun: pronoun, resolvedCompany: true }
      }
    }
  }

  // Employee pronouns take priority for non-company-context queries
  if (lastMentionedEmployee) {
    for (const pronoun of employeePronouns) {
      const pronounRegex = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pronounRegex.test(lowerQuery)) {
        const resolvedQuery = query.replace(pronounRegex, lastMentionedEmployee)
        return { resolved: true, query: resolvedQuery, originalPronoun: pronoun }
      }
    }
  }

  // Company pronouns as fallback (also resolve "them"/"they" to company if no employee context)
  if (lastMentionedCompany) {
    const allCompanyPronouns = [...companyPronouns]
    if (!lastMentionedEmployee) {
      allCompanyPronouns.push('them', 'they', 'their')
    }
    for (const pronoun of allCompanyPronouns) {
      const pronounRegex = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pronounRegex.test(lowerQuery)) {
        const resolvedQuery = query.replace(pronounRegex, lastMentionedCompany)
        return { resolved: true, query: resolvedQuery, originalPronoun: pronoun, resolvedCompany: true }
      }
    }
  }

  return { resolved: false, query: query }
}

// Update context when we successfully identify an employee in a response
async function updateEmployeeContext(name) {
  if (name) {
    const employee = await pennyDataService.getEmployeeByName(name)
    if (employee) {
      lastMentionedEmployee = employee.full_name
    } else {
      lastMentionedEmployee = name
    }
  }
}

// Update context when we successfully identify a company in a response
function updateCompanyContext(name) {
  if (name) {
    lastMentionedCompany = name
  }
}

// ============================================
// MAIN QUERY PROCESSOR
// ============================================

export async function processQuery(query) {
  // Ensure data service is initialized
  await pennyDataService.ensureInitialized()

  const result = await _processQueryInner(query)

  // Attach responseNames: extract bold-wrapped names from the response text
  // so PennyMessage can make them clickable without a global 131K employee lookup
  if (result && result.text) {
    result.responseNames = extractResponseNames(result.text)
  }
  return result
}

async function _processQueryInner(query) {
  // If user selected a company from disambiguation, replay the original query with the specific company name
  if (lastPendingQuery) {
    const trimmedQ = query.trim()
    const stats = await pennyDataService.getCompanyStats(trimmedQ)
    if (stats && stats.company.toLowerCase() === trimmedQ.toLowerCase()) {
      // User picked an exact company from the disambiguation list — replay original question with this company
      const originalQ = lastPendingQuery
      lastPendingQuery = null
      // Substitute the ambiguous company name in the original query with the specific one
      const replayQuery = originalQ.replace(/(?:at|for|from)\s+.+$/i, `at ${stats.company}`)
      // If the original query is just "tell me about X" or similar general query, use the company name directly
      if (replayQuery === originalQ && !/at\s+/i.test(originalQ)) {
        // Original query didn't have "at X" — it was something like "how many enrolled at Crate & Barrel"
        // Try to find and replace the company fragment
        const result = await _processQueryInner(replayQuery.replace(new RegExp(trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), stats.company))
        return result
      }
      return _processQueryInner(replayQuery)
    }
    lastPendingQuery = null
  }

  // Resolve pronouns if needed
  const pronounResult = resolvePronouns(query)
  const effectiveQuery = pronounResult.query
  const lowerQuery = effectiveQuery.toLowerCase()

  // Explicit handling for outstanding balance queries (avoid pattern ambiguity / wrong handler)
  // Route to company handler: "top companies with outstanding" OR "outstanding balance at/for/in [company]"
  const isCompanyOutstandingQuery =
    (lowerQuery.includes('compan') && (lowerQuery.includes('top') || lowerQuery.includes('best') || lowerQuery.includes('highest'))) ||
    (lowerQuery.includes('outstanding') && (lowerQuery.includes(' at ') || lowerQuery.includes(' for ') || lowerQuery.includes(' in '))) ||
    (lowerQuery.includes('balance') && (lowerQuery.includes(' at ') || lowerQuery.includes(' for ') || lowerQuery.includes(' in ')) && (lowerQuery.includes('owed') || lowerQuery.includes('owe')))
  const isOutstandingQuery =
    !isCompanyOutstandingQuery &&
    lowerQuery.includes('outstanding') &&
    (lowerQuery.includes('breakdown') ||
      lowerQuery.includes('by employee') ||
      lowerQuery.includes('list') ||
      lowerQuery.includes('view breakdown') ||
      lowerQuery.includes('all') && (lowerQuery.includes('balance') || lowerQuery.includes('balances')) ||
      /outstanding\s+balances?/.test(lowerQuery) ||
      /show\s+(?:all\s+)?outstanding/.test(lowerQuery))

  // Route company outstanding queries to handleCompanyQuery
  if (isCompanyOutstandingQuery) {
    const result = await handleCompanyQuery(effectiveQuery)
    if (result) return { type: 'response', ...result }
  }

  if (isOutstandingQuery) {
    const result = await handleOutstandingBalanceQuery(effectiveQuery)
    if (result) return { type: 'response', ...result }
  }

  // Try each handler in order
  for (const handler of queryHandlers) {
    for (const pattern of handler.patterns) {
      const match = effectiveQuery.match(pattern)
      if (match) {
        try {
          const result = await handler.handler(effectiveQuery, match)
          if (result) {
            return {
              type: 'response',
              ...result,
            }
          }
        } catch (error) {
          console.error('Error in query handler:', error?.message || error, 'Query:', effectiveQuery)
        }
      }
    }
  }

  // Check for synonym-based matching as fallback
  if (matchesSynonyms(lowerQuery, 'outstanding')) {
    return await handleOutstandingBalanceQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'savings')) {
    return await handleSavingsQuery(effectiveQuery)
  }

  // "daily/weekly/monthly active users at X" — route to company handler, not adoption
  if (/(?:daily|weekly|monthly)\s+active/i.test(lowerQuery)) {
    return await handleCompanyQuery(effectiveQuery)
  }

  // "top partnerships by adoption" / "partnerships by adoption" → company handler (not adoption)
  if (/partnerships?\s+by\s+adoption/i.test(lowerQuery)) {
    return await handleCompanyQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'adoption') || matchesSynonyms(lowerQuery, 'enrolled')) {
    return await handleAdoptionQuery(effectiveQuery)
  }

  // Revenue / MRR queries — org, partnership, or company level
  if (lowerQuery.includes('revenue') || lowerQuery.includes('mrr') ||
      lowerQuery.includes('net rev') || lowerQuery.includes('gross rev')) {
    return await handleRevenueQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'company')) {
    return await handleCompanyQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'transfers')) {
    return await handleTransferQuery(effectiveQuery)
  }

  // Default response - try to find "did you mean?" suggestions
  return await buildNotFoundWithSuggestions(null, query)
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

function isOutstandingBalancePhrase(text) {
  if (!text || typeof text !== 'string') return false
  const n = text.toLowerCase().replace(/\s+/g, ' ').trim()
  return n === 'outstanding' || n === 'balances' || n === 'balance' ||
    n === 'outstanding balances' || n === 'outstanding balance' ||
    (n.includes('outstanding') && n.includes('balance'))
}

/** Build 4–6 drill-down suggestions from an employees list (e.g. outstanding balance table). */
function buildDrillDownSuggestions(employees, maxEmployee = 2, maxCompany = 2) {
  const out = []
  if (!employees || !employees.length) {
    return ['Show company stats', 'List paused employees', 'Show savings stats', 'Show outstanding balances']
  }
  for (let i = 0; i < Math.min(maxEmployee, employees.length); i++) {
    const name = employees[i].full_name
    if (name) out.push(`Tell me about ${name}`)
  }
  const seen = new Set()
  for (const e of employees) {
    const company = (e.company || '').trim()
    if (company && company !== '—' && !seen.has(company) && out.length < maxEmployee + maxCompany) {
      seen.add(company)
      out.push(`Show outstanding balances at ${company}`)
    }
  }
  if (out.length < 6) out.push('Show company stats')
  if (out.length < 6) out.push('List paused employees')
  if (out.length < 6) out.push('Show savings stats')
  return out.slice(0, 6)
}

async function handleOutstandingBalanceQuery(query, overrideName = null) {
  let name = overrideName || extractEmployeeName(query)
  if (name && isOutstandingBalancePhrase(name)) name = null

  if (name) {
    const result = await pennyDataService.getEmployeeOutstandingBalance(name)
    if (result.found) {
      await updateEmployeeContext(result.employee.full_name)
      if (!result.hasBalance) {
        return {
          text: `**${result.employee.full_name}** has no outstanding balance.`,
          richContent: { type: 'employee-card', data: result.employee },
        }
      }
      return {
        text: `**${result.employee.full_name}** has an outstanding balance of **$${result.balance.toFixed(2)}**.`,
        richContent: {
          type: 'employee-card',
          data: { ...result.employee, outstanding_balance: result.balance },
        },
      }
    } else {
      return await buildNotFoundWithSuggestions(name, query)
    }
  }

  // General outstanding balance query
  const total = await pennyDataService.getTotalOutstandingBalance()
  const employees = await pennyDataService.getEmployeesWithOutstandingBalance()
  const lowerQuery = query.toLowerCase()
  const wantBreakdown = lowerQuery.includes('breakdown') || lowerQuery.includes('list') || lowerQuery.includes('who has') || lowerQuery.includes('who have') || lowerQuery.includes('by employee') || lowerQuery.includes('view breakdown')

  if (wantBreakdown) {
    if (employees.length > 0) {
      const headers = ['Name', 'Outstanding Balance', 'Company']
      const rows = employees.map(e => [
        e.full_name,
        `$${e.outstanding_balance.toFixed(2)}`,
        e.company || '—',
      ])
      const drillSuggestions = buildDrillDownSuggestions(employees, 2, 2)
      return {
        text: `There are **${employees.length} employees** with outstanding balances (**$${total.toFixed(2)}** total).`,
        richContent: {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              label: 'Outstanding Balance',
              value: `$${total.toFixed(2)}`,
              detail: `${employees.length} employees`,
            },
          },
          list: {
            type: 'table',
            data: { headers, rows },
            amountColumnIndex: 1,
            totalLabel: 'Total Outstanding Balance',
          },
        },
        suggestions: drillSuggestions,
      }
    }
    return {
      text: `**Outstanding balance breakdown**\n\nThere are no employees with outstanding balances right now. Total outstanding: **$${total.toFixed(2)}**.`,
      richContent: {
        type: 'data-card',
        data: {
          value: `$${total.toFixed(2)}`,
          label: 'Outstanding Balance',
          detail: '0 employees',
        },
      },
    }
  }

  // Default: show total and always offer full list in sidebar (same as breakdown when there are employees)
  if (employees.length > 0) {
    const headers = ['Name', 'Outstanding Balance', 'Company']
    const rows = employees.map(e => [
      e.full_name,
      `$${e.outstanding_balance.toFixed(2)}`,
      e.company || '—',
    ])
    const drillSuggestions = buildDrillDownSuggestions(employees, 2, 2)
    return {
      text: `The total outstanding balance is **$${total.toFixed(2)}** across **${employees.length} employees**.`,
      richContent: {
        type: 'summary-with-list',
        summary: {
          type: 'data-card',
          data: {
            label: 'Outstanding Balance',
            value: `$${total.toFixed(2)}`,
            detail: `${employees.length} employees`,
          },
        },
        list: {
          type: 'table',
          data: { headers, rows },
          amountColumnIndex: 1,
          totalLabel: 'Total Outstanding Balance',
        },
      },
      followUp: 'Open the full list to see everyone and filter by company.',
      actions: [],
      suggestions: drillSuggestions,
    }
  }

  return {
    text: `There are no employees with outstanding balances. Total: **$${total.toFixed(2)}**.`,
    richContent: {
      type: 'data-card',
      data: {
        value: `$${total.toFixed(2)}`,
        label: 'Outstanding Balance',
        detail: '0 employees',
      },
    },
  }
}

function isSavingsStatsPhrase(text) {
  if (!text || typeof text !== 'string') return false
  const n = text.toLowerCase().replace(/\s+/g, ' ').trim()
  return n === 'savings stats' || n === 'saving stats' || n === 'save stats' ||
    (n.includes('saving') && n.includes('stat'))
}

async function handleSavingsQuery(query, overrideName = null) {
  let name = overrideName || extractEmployeeName(query)
  if (name && isSavingsStatsPhrase(name)) name = null

  if (name) {
    const details = await pennyDataService.getEmployeeSavingsDetails(name)
    if (details) {
      await updateEmployeeContext(details.full_name)
      if (!details.has_savings_acct) {
        return {
          text: `**${details.full_name}** does not have a savings account.`,
        }
      }
      return {
        text: `**${details.full_name}** has a savings balance of **$${details.save_balance.toFixed(2)}**.`,
        richContent: {
          type: 'data-card',
          data: {
            value: `$${details.save_balance.toFixed(2)}`,
            label: 'Savings Balance',
          },
        },
      }
    } else {
      return await buildNotFoundWithSuggestions(name, query)
    }
  }

  // General savings query
  const stats = await pennyDataService.getSavingsStats()
  const companySavings = await pennyDataService.getCompanySavingsStats()
  const employeesWithBalance = await pennyDataService.getEmployeesWithSavingsBalance()

  // Get company-level enrolled (adopted) counts for save % per enrolled
  const allCompanies = await pennyDataService.getAllCompanies() || []
  const companyEnrolledMap = new Map()
  allCompanies.forEach(c => { if (c.company) companyEnrolledMap.set(c.company.toLowerCase(), c.adopted || 0) })

  const lowerQuery = query.toLowerCase()

  // Calculate savings penetration (% of savers per total enrolled)
  const totalEnrolled = allCompanies.reduce((sum, c) => sum + (c.adopted || 0), 0)
  const savePct = totalEnrolled > 0 ? ((stats.totalAccounts / totalEnrolled) * 100).toFixed(1) : '0'

  let body = `**Savings Program Stats:**\n\n`
  body += `• **Total saved:** $${stats.totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
  body += `• Save accounts: **${stats.totalAccounts.toLocaleString()}** (${savePct}% of enrolled)\n`
  body += `• Employees with a balance: **${stats.employeesWithBalance.toLocaleString()}**\n`
  body += `• **Average saved per saver:** $${stats.avgPerEmployee.toFixed(2)}\n`

  // Top companies by savings
  if (companySavings.length > 0) {
    body += `\n**Top Companies by Savings:**\n`
    const top = companySavings.slice(0, 10)
    top.forEach((c, i) => {
      const enrolled = companyEnrolledMap.get(c.company.toLowerCase()) || c.employeeCount
      const pct = enrolled > 0 ? ((c.employeesWithBalance / enrolled) * 100).toFixed(1) : '0'
      body += `${i + 1}. **${c.company}**: $${c.totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — ${c.employeesWithBalance} savers (${pct}% of enrolled)\n`
    })
  }

  // Full list for sidebar: Name, Savings Balance, Company
  const headers = ['Name', 'Savings Balance', 'Company']
  const rows = employeesWithBalance.map(e => [
    e.full_name,
    `$${(e.save_balance || 0).toFixed(2)}`,
    (e.company || '—').trim() || '—',
  ])

  // Company savings table for sidebar
  const companyHeaders = ['Company', 'Total Saved', 'Savers', 'Save %']
  const companyRows = companySavings.map(c => {
    const enrolled = companyEnrolledMap.get(c.company.toLowerCase()) || c.employeeCount
    const pct = enrolled > 0 ? ((c.employeesWithBalance / enrolled) * 100).toFixed(1) : '0'
    return [c.company, `$${c.totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, c.employeesWithBalance.toLocaleString(), `${pct}%`]
  })

  const suggestions = ['Show outstanding balances', 'Show company stats', 'List paused employees']
  if (companySavings.length > 0) {
    suggestions.push(`Savings at ${companySavings[0].company}`)
  }
  if (employeesWithBalance.length > 0) {
    suggestions.push(`Tell me about ${employeesWithBalance[0].full_name}`)
  }
  suggestions.push('Show top companies by adoption')

  return {
    text: body,
    richContent: employeesWithBalance.length > 0
      ? {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              value: `$${stats.totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              label: 'Total Savings',
              detail: `${stats.totalAccounts.toLocaleString()} save accounts (${savePct}% of enrolled) • ${stats.employeesWithBalance.toLocaleString()} with balance`,
            },
          },
          list: {
            type: 'table',
            title: 'Top Companies by Savings',
            data: { headers: companyHeaders, rows: companyRows, rawCompanies: companySavings.map(c => ({ ...c, save_pct: companyEnrolledMap.get(c.company.toLowerCase()) > 0 ? ((c.employeesWithBalance / companyEnrolledMap.get(c.company.toLowerCase())) * 100).toFixed(1) : '0' })) },
            amountColumnIndex: 1,
            totalLabel: 'Total Savings',
          },
        }
      : {
          type: 'data-card',
          data: {
            value: `$${stats.totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            label: 'Total Savings',
            detail: `${stats.totalAccounts.toLocaleString()} save accounts (${savePct}% of enrolled)`,
          },
        },
    suggestions: suggestions.slice(0, 6),
  }
}

async function handleAdoptionQuery(query) {
  const stats = await pennyDataService.getAdoptionStats()
  const companySummary = await pennyDataService.getCompanySummaryStats()
  const allCompanies = await pennyDataService.getAllCompanies()
  const lowerQuery = query.toLowerCase()
  const wantCompanyList = lowerQuery.includes('list') || lowerQuery.includes('view companies') || lowerQuery.includes('show companies') || lowerQuery.includes('companies by adoption')

  if (wantCompanyList && allCompanies.length > 0) {
    const sorted = [...allCompanies].sort((a, b) => b.adoption_rate - a.adoption_rate)
    const list = sorted.slice(0, 25).map((c, i) =>
      `${i + 1}. **${c.company}**: ${(c.adoption_rate * 100).toFixed(1)}% adoption (${(c.adopted ?? 0).toLocaleString()}/${(c.eligible ?? 0).toLocaleString()}) • $${(c.total_transfer_amount || 0).toLocaleString()} transferred`
    ).join('\n')
    const more = sorted.length > 25 ? `\n\n_...and ${sorted.length - 25} more companies. View the full list →_` : ''
    const expandList = {
      type: 'table',
      title: 'Companies by Adoption',
      data: {
        headers: ['Company', 'Adoption Rate', 'Adopted', 'Eligible', 'Total Transferred'],
        rows: sorted.map(c => [c.company || '—', `${(c.adoption_rate * 100).toFixed(1)}%`, (c.adopted ?? 0).toLocaleString(), (c.eligible ?? 0).toLocaleString(), `$${(c.total_transfer_amount || 0).toLocaleString()}`]),
      },
    }
    return {
      text: `**Companies by adoption** (${stats.totalCompanies} total):\n\n${list}${more}`,
      richContent: {
        type: 'data-card',
        data: {
          value: stats.adoptionRate,
          label: 'Adoption Rate',
          detail: `${stats.totalCompanies} companies`,
        },
        expandList,
      },
    }
  }

  return {
    text: `**Adoption & Enrollment Stats:**\n\n• Total companies: **${stats.totalCompanies}**\n• Eligible employees: **${stats.eligible?.toLocaleString()}**\n• Enrolled (adopted): **${stats.enrolled?.toLocaleString()}**\n• Active users: **${stats.active?.toLocaleString()}**\n• Overall adoption rate: **${stats.adoptionRate}**`,
    richContent: {
      type: 'data-card',
      data: {
        value: stats.adoptionRate,
        label: 'Adoption Rate',
        detail: `${stats.enrolled?.toLocaleString()} enrolled`,
      },
    },
    actions: [],
  }
}

async function handleCompanyQuery(query) {
  const lowerQuery = query.toLowerCase().trim()
  const trimmedQuery = query.trim()

  // 0. "How many companies are live?" - Client Summary total (not "how many X companies are live")
  if (/^how many\s+companies?\s+(?:are\s+)?live/i.test(lowerQuery.trim())) {
    const summary = await pennyDataService.getCompanySummaryStats()
    const allCompanies = await pennyDataService.getAllCompanies()
    const expandList = allCompanies.length > 0
      ? {
          type: 'table',
          title: 'Live companies',
          data: {
            headers: ['Company', 'Adoption'],
            rows: allCompanies.map(c => [
              c.company || '—',
              `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`,
            ]),
          },
        }
      : null
    return {
      text: `**${summary.totalCompanies}** companies are live (from Client Summary).`,
      richContent: {
        type: 'data-card',
        data: { value: summary.totalCompanies.toString(), label: 'Live companies', detail: 'Client Summary' },
        ...(expandList && { expandList }),
      },
    }
  }

  // 0. "How many [X] companies/clients are live?" e.g. "How many OSV companies are live?" / "How many DPE clients live?"
  const livePartnershipMatch = lowerQuery.match(/how many\s+(.+?)\s+(?:companies?|clients?)\s+(?:are\s+)?live/i)
  if (livePartnershipMatch) {
    const partnershipName = livePartnershipMatch[1].trim()
    if (partnershipName.length >= 2) {
      const companies = await pennyDataService.getCompaniesByPartnership(partnershipName)
      const expandList = companies.length > 0 ? {
        type: 'table',
        title: `Live ${partnershipName} companies`,
        data: {
          headers: ['Company', 'Partnership', 'Adoption'],
          rows: companies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
        },
      } : null
      return {
        text: `**${companies.length}** ${partnershipName} companies are live (from Client Summary).`,
        richContent: companies.length > 0 ? {
          type: 'data-card',
          data: {
            value: companies.length.toString(),
            label: `${partnershipName} live`,
            detail: `${companies.length} companies`,
          },
          ...(expandList && { expandList }),
        } : undefined,
      }
    }
  }

  // 0b. "[X] companies" or "list [X] companies" e.g. "OSV companies", "list OSV companies" - total number + View list + open sidebar
  const listPartnershipMatch = lowerQuery.match(/^list\s+(.+?)\s+companies\s*\.?$/i)
  const partnershipOnlyMatch = lowerQuery.match(/^(?!how many)(.+?)\s+companies\s*\.?$/i)
  const partnershipCompaniesMatch = listPartnershipMatch || (partnershipOnlyMatch && !lowerQuery.startsWith('list '))
  const rawPartnershipName = partnershipCompaniesMatch ? (listPartnershipMatch ? listPartnershipMatch[1] : partnershipOnlyMatch[1]).trim() : null
  if (rawPartnershipName) {
    const skipWords = ['show', 'get', 'list', 'what', 'which', 'all', 'total', 'top', 'best', 'the', 'compan', 'client']
    const nameLower = rawPartnershipName.toLowerCase()
    const isSkip = skipWords.some(w => nameLower === w || nameLower.startsWith(w + ' '))
    if (rawPartnershipName.length >= 2 && !isSkip) {
      const companies = await pennyDataService.getCompaniesByPartnership(rawPartnershipName)
      const displayName = rawPartnershipName.charAt(0).toUpperCase() + rawPartnershipName.slice(1).toLowerCase()
      const expandList = companies.length > 0 ? {
        type: 'table',
        title: `Live ${displayName} companies`,
        data: {
          headers: ['Company', 'Partnership', 'Adoption'],
          rows: companies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
        },
      } : null
      return {
        text: `**${companies.length}** ${displayName} companies are live (from Client Summary).`,
        richContent: companies.length > 0 ? {
          type: 'data-card',
          data: {
            value: companies.length.toString(),
            label: `${displayName} companies`,
            detail: `${companies.length} live`,
          },
          ...(expandList && { expandList }),
        } : undefined,
        suggestions: companies.length > 0 ? [`How many ${displayName} companies are live?`, `Top ${displayName} companies by adoption`, 'Show company stats'] : undefined,
      }
    }
  }

  // 0. "How many [model] companies are there?" - MODEL column (case-insensitive). No "live" = by model.
  const modelCountMatch = lowerQuery.match(/how many\s+(.+?)\s+companies?\s*(?:are there|do we have|exist)?[\s.?]*/i)
  if (modelCountMatch && !lowerQuery.includes('live')) {
    const modelName = modelCountMatch[1].trim()
    if (modelName.length >= 1) {
      const companies = await pennyDataService.getCompaniesByModel(modelName)
      const count = companies.length
      const list = count > 0 && count <= 25
        ? companies.map(c => `• **${c.company}**`).join('\n')
        : count > 25
          ? companies.slice(0, 25).map(c => `• **${c.company}**`).join('\n') + `\n\n_...and ${count - 25} more. View the full list →_`
          : ''
      const body = list ? `\n\n**Companies:**\n${list}` : ''
      const expandList = count > 0 ? {
        type: 'table',
        title: `${modelName} Companies`,
        data: {
          headers: ['Company', 'Adoption'],
          rows: companies.map(c => [c.company || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
        },
      } : null
      return {
        text: `**${count}** ${modelName} companies (from Client Summary, MODEL column).${body}`,
        richContent: count > 0 ? {
          type: 'data-card',
          data: { value: count.toString(), label: `${modelName} (model)`, detail: 'Client Summary' },
          ...(expandList && { expandList }),
        } : undefined,
      }
    }
  }

  // 0a. "How many clients in [X] partnership" - Client Summary, PARTNERSHIP column
  const partnershipMatch = lowerQuery.match(/(?:how many|number of)?\s*(?:clients?|companies?)\s+in\s+(.+?)\s+partnership/i) ||
    lowerQuery.match(/(?:in|under)\s+(.+?)\s+partnership/i)
  if (partnershipMatch && (lowerQuery.includes('partnership') && (lowerQuery.includes('client') || lowerQuery.includes('compan') || lowerQuery.includes('how many') || lowerQuery.includes('in ') || lowerQuery.includes('under ')))) {
    const partnershipName = partnershipMatch[1].trim()
    if (partnershipName.length >= 2) {
      const companies = await pennyDataService.getCompaniesByPartnership(partnershipName)
      const count = companies.length
      const list = count > 0 && count <= 25
        ? companies.map(c => `• **${c.company}**`).join('\n')
        : count > 25
          ? companies.slice(0, 25).map(c => `• **${c.company}**`).join('\n') + `\n\n_...and ${count - 25} more. View the full list →_`
          : ''
      const body = list ? `\n\n**Clients:**\n${list}` : ''
      const expandList = count > 0 ? {
        type: 'table',
        title: `Companies in ${partnershipName}`,
        data: {
          headers: ['Company', 'Partnership', 'Adoption'],
          rows: companies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
        },
      } : null
      return {
        text: `**${partnershipName}** partnership has **${count}** client${count !== 1 ? 's' : ''} (from Client Summary).${body}`,
        richContent: count > 0 ? {
          type: 'data-card',
          data: {
            value: count.toString(),
            label: 'Clients',
            detail: `${count} companies · ${partnershipName} partnership`,
          },
          ...(expandList && { expandList }),
        } : undefined,
      }
    }
  }

  // 0. "Which companies are above/below X% adoption (rate)" - Client Summary
  // Also handles "[partnership] companies with adoption below/above X%"
  const isAdoptionThresholdQuery = lowerQuery.includes('compan') || lowerQuery.includes('client') || lowerQuery.includes('which') || lowerQuery.includes('list') || lowerQuery.includes('show')
  const aboveMatch = lowerQuery.match(/(?:above|over)\s+(\d+(?:\.\d+)?)\s*%?\s*(?:percent)?\s*(?:rate\s+)?(?:of\s+)?adoption/i) ||
    lowerQuery.match(/adoption\s+(?:rate\s+)?(?:above|over)\s+(\d+(?:\.\d+)?)\s*%?/i)
  const belowMatch = lowerQuery.match(/(?:below|under)\s+(\d+(?:\.\d+)?)\s*%?\s*(?:percent)?\s*(?:rate\s+)?(?:of\s+)?adoption/i) ||
    lowerQuery.match(/adoption\s+(?:rate\s+)?(?:below|under)\s+(\d+(?:\.\d+)?)\s*%?/i)

  if (isAdoptionThresholdQuery && (aboveMatch || belowMatch)) {
    const percent = parseFloat((aboveMatch || belowMatch)[1])
    if (!Number.isNaN(percent)) {
      const isAbove = !!aboveMatch

      // Check for partnership filter — e.g. "OSV companies with adoption below 35%"
      const partnershipMatch = query.match(/(?:show\s+(?:me\s+)?(?:all\s+)?)?(\w[\w\s]*?)\s+companies?\s+(?:with\s+)?adoption/i)
      let partnershipFilter = null
      if (partnershipMatch) {
        const candidateName = partnershipMatch[1].replace(/^(?:all|the|show|me|list)\s+/i, '').trim()
        if (candidateName.length >= 2) {
          const pResult = await pennyDataService.getCompaniesByPartnership(candidateName)
          if (pResult.length > 0) {
            partnershipFilter = candidateName
          }
        }
      }

      let companies
      if (partnershipFilter) {
        // Filter by partnership first, then by adoption threshold
        const partnershipCompanies = await pennyDataService.getCompaniesByPartnership(partnershipFilter)
        const threshold = percent / 100
        companies = isAbove
          ? partnershipCompanies.filter(c => (c.adoption_rate ?? 0) >= threshold).sort((a, b) => (b.adoption_rate ?? 0) - (a.adoption_rate ?? 0))
          : partnershipCompanies.filter(c => (c.adoption_rate ?? 0) < threshold).sort((a, b) => (b.adoption_rate ?? 0) - (a.adoption_rate ?? 0))
      } else {
        companies = isAbove
          ? await pennyDataService.getCompaniesAboveAdoptionRate(percent, 200)
          : await pennyDataService.getCompaniesBelowAdoptionRate(percent, 200)
      }

      if (companies.length === 0) {
        const partLabel = partnershipFilter ? ` ${partnershipFilter}` : ''
        const msg = isAbove
          ? `**No${partLabel} companies with adoption rate at or above ${percent}%.**`
          : `**No${partLabel} companies with adoption rate below ${percent}%.**`
        return { text: msg }
      }
      const list = companies.slice(0, 25).map((c, i) =>
        `${i + 1}. **${c.company}**: ${((c.adoption_rate ?? 0) * 100).toFixed(1)}% (${(c.adopted ?? 0).toLocaleString()}/${(c.eligible ?? 0).toLocaleString()} adopted)`
      ).join('\n')
      const partLabel = partnershipFilter ? `${partnershipFilter} ` : ''
      const header = isAbove
        ? `**${companies.length} ${partLabel}companies with adoption ≥ ${percent}%:**`
        : `**${companies.length} ${partLabel}companies with adoption < ${percent}%:**`
      const expandList = {
        type: 'table',
        title: isAbove ? `${partLabel}Companies ≥ ${percent}% adoption` : `${partLabel}Companies < ${percent}% adoption`,
        data: {
          headers: ['Company', 'Partnership', 'Adoption Rate', 'Adopted', 'Eligible'],
          rows: companies.map(c => [
            c.company || '—',
            c.partnership || '—',
            `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`,
            (c.adopted ?? 0).toLocaleString(),
            (c.eligible ?? 0).toLocaleString(),
          ]),
        },
      }
      const totalAdopted = companies.reduce((s, c) => s + (c.adopted ?? 0), 0)
      const totalEligible = companies.reduce((s, c) => s + (c.eligible ?? 0), 0)
      const avgAdoption = totalEligible > 0 ? ((totalAdopted / totalEligible) * 100).toFixed(1) : '0.0'
      return {
        text: `${header}\n\n${list}${companies.length > 25 ? `\n\n_...and ${companies.length - 25} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: {
            value: companies.length.toString(),
            label: isAbove ? `≥ ${percent}% Adoption` : `< ${percent}% Adoption`,
            detail: `Avg: ${avgAdoption}%${partnershipFilter ? ` · ${partnershipFilter}` : ''}`,
          },
          expandList,
        },
        suggestions: [
          isAbove ? `Companies below ${percent}% adoption` : `Companies above ${percent}% adoption`,
          'Show top companies by adoption',
          'Show company stats',
        ],
      }
    }
  }

  // 0c. "Pricing model" / "product type" — general overview (not per-company)
  // Skip if query contains a company name (possessive, "at", "for", "of", etc.)
  if ((/pricing\s+model/i.test(lowerQuery) || /product\s+type/i.test(lowerQuery)) && !lowerQuery.includes(' at ') && !lowerQuery.includes(' for ') && !lowerQuery.includes(' of ') && !/'s\s/i.test(lowerQuery) && !lowerQuery.includes("'s")) {
    const allCompanies = await pennyDataService.getAllCompanies()
    const typeMap = {}
    const typeCompanies = {}
    allCompanies.forEach(c => {
      const pt = (c.product_type || '').trim() || 'Unknown'
      if (!typeMap[pt]) { typeMap[pt] = 0; typeCompanies[pt] = [] }
      typeMap[pt]++
      typeCompanies[pt].push(c.company || c.name || '—')
    })
    const entries = Object.entries(typeMap).sort((a, b) => b[1] - a[1])
    const list = entries.map(([type, count]) => `• **${type}**: ${count} companies`).join('\n')
    // Build expandable list with all companies grouped by product type — company names are clickable
    const expandRows = []
    entries.forEach(([type]) => {
      typeCompanies[type].sort((a, b) => a.localeCompare(b)).forEach(name => {
        expandRows.push([name, type])
      })
    })
    const expandList = {
      type: 'table',
      title: 'Companies by product type',
      data: {
        headers: ['Company', 'Product Type'],
        rows: expandRows,
      },
    }
    return {
      text: `**Companies by product type:**\n\n${list}`,
      richContent: {
        type: 'data-card',
        data: { value: entries.length.toString(), label: 'Product Types', detail: `${allCompanies.length} companies` },
        expandList,
      },
      suggestions: ['Show company stats', 'Top companies by adoption'],
    }
  }

  // 1. Check for top/most/lowest companies queries FIRST
  if (lowerQuery.includes('top') || lowerQuery.includes('best') || lowerQuery.includes('highest') || lowerQuery.includes('most') || lowerQuery.includes('lowest') || lowerQuery.includes('least')) {
    // "Top [partnership] companies by adoption" e.g. "top OSV companies by adoption" — filter by partnership then sort by adoption
    const topPartnershipAdoptionMatch = lowerQuery.match(/(?:top|best|highest)\s+(.+?)\s+companies?\s+by\s+adoption/i)
    if (topPartnershipAdoptionMatch && lowerQuery.includes('adoption')) {
      const partnershipName = topPartnershipAdoptionMatch[1].trim()
      if (partnershipName.length >= 2) {
        const byPartnership = await pennyDataService.getCompaniesByPartnership(partnershipName)
        if (byPartnership.length > 0) {
          const allSorted = [...byPartnership]
            .sort((a, b) => (b.adoption_rate ?? 0) - (a.adoption_rate ?? 0))
          const top15 = allSorted.slice(0, 15)
          const list = top15.map((c, i) =>
            `${i + 1}. **${c.company}**: ${((c.adoption_rate ?? 0) * 100).toFixed(1)}% (${(c.adopted ?? 0).toLocaleString()}/${(c.eligible ?? 0).toLocaleString()})`
          ).join('\n')
          const totalAdopted = allSorted.reduce((sum, c) => sum + (c.adopted ?? 0), 0)
          const totalEligible = allSorted.reduce((sum, c) => sum + (c.eligible ?? 0), 0)
          const avgAdoption = totalEligible > 0 ? ((totalAdopted / totalEligible) * 100).toFixed(1) : '0.0'
          const expandList = {
            type: 'table',
            title: `All ${partnershipName} companies by adoption`,
            data: {
              headers: ['Company', 'Partnership', 'Adoption', 'Sector'],
              rows: allSorted.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`, c.sector || '—']),
            },
          }
          return {
            text: `**Top ${partnershipName} companies by adoption:**\n\nAverage adoption: **${avgAdoption}%** (${totalAdopted.toLocaleString()} adopted / ${totalEligible.toLocaleString()} eligible).\n\n${list}`,
            richContent: {
              type: 'data-card',
              data: {
                value: `${avgAdoption}%`,
                label: `Avg ${partnershipName} adoption`,
                detail: `${allSorted.length} clients · ${totalAdopted.toLocaleString()} adopted`,
              },
              expandList,
            },
            suggestions: ['Show top companies by adoption', 'Show company stats', `How many ${partnershipName} companies are live?`],
          }
        }
      }
    }

    // "Which [partnership] company has the most/lowest [metric]" — partnership-filtered metric queries
    // Matches: "which OSV company has the most daily active users", "which OSV companies have the lowest adoption"
    const partnershipMetricMatch = lowerQuery.match(/(?:which|what)\s+(.+?)\s+(?:company|companies|clients?)\s+(?:has|have)\s+(?:the\s+)?(?:most|highest|lowest|least|best|worst)\s+(.+?)[\s.?]*$/i)
    if (partnershipMetricMatch) {
      const partnershipName = partnershipMetricMatch[1].trim()
      const metric = partnershipMetricMatch[2].trim()
      const isLowest = /lowest|least|worst/i.test(lowerQuery)
      const byPartnership = await pennyDataService.getCompaniesByPartnership(partnershipName)
      if (byPartnership.length > 0) {
        // Determine which metric to sort by
        let sortKey = null, metricLabel = '', formatValue = (v) => v.toLocaleString()
        if (/daily\s*active/i.test(metric)) { sortKey = 'daily_active_app_users'; metricLabel = 'Daily Active Users' }
        else if (/weekly\s*active/i.test(metric)) { sortKey = 'weekly_active_app_users'; metricLabel = 'Weekly Active Users' }
        else if (/monthly\s*active/i.test(metric)) { sortKey = 'monthly_active_app_users'; metricLabel = 'Monthly Active Users' }
        else if (/transfer/i.test(metric)) { sortKey = 'transfers_in_period'; metricLabel = 'Transfers' }
        else if (/active/i.test(metric)) { sortKey = 'active'; metricLabel = 'Active Users' }
        else if (/adoption/i.test(metric)) { sortKey = 'adoption_rate'; metricLabel = 'Adoption'; formatValue = (v) => `${((v ?? 0) * 100).toFixed(1)}%` }
        else if (/revenue|mrr/i.test(metric)) { sortKey = 'sum_trailing_30d_net_rev'; metricLabel = '30d Net Revenue'; formatValue = (v) => `$${(v ?? 0).toLocaleString()}` }

        if (sortKey) {
          // When looking for "lowest", filter out companies with 0 eligible (not yet launched / no data)
          const filtered = isLowest
            ? byPartnership.filter(c => (c.eligible ?? 0) > 0)
            : byPartnership
          const allSorted = [...filtered]
            .sort((a, b) => isLowest
              ? (a[sortKey] ?? 0) - (b[sortKey] ?? 0)
              : (b[sortKey] ?? 0) - (a[sortKey] ?? 0))
          const top15 = allSorted.slice(0, 15)
          const total = allSorted.reduce((sum, c) => sum + (c[sortKey] ?? 0), 0)
          const list = top15.map((c, i) =>
            `${i + 1}. **${c.company}**: ${formatValue(c[sortKey] ?? 0)}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `All ${partnershipName} companies by ${metricLabel.toLowerCase()}`,
            data: {
              headers: ['Company', 'Partnership', metricLabel, 'Sector'],
              rows: allSorted.map(c => [c.company || '—', c.partnership || '—', formatValue(c[sortKey] ?? 0), c.sector || '—']),
            },
          }
          const direction = isLowest ? 'Lowest' : 'Top'
          return {
            text: `**${direction} ${partnershipName} companies by ${metricLabel.toLowerCase()}:**\n\nTotal: **${sortKey === 'adoption_rate' ? `${((total / allSorted.length) * 100).toFixed(1)}% avg` : formatValue(total)}** across ${allSorted.length} clients.\n\n${list}`,
            richContent: {
              type: 'data-card',
              data: {
                value: sortKey === 'adoption_rate' ? `${((total / allSorted.length) * 100).toFixed(1)}%` : formatValue(total),
                label: `${sortKey === 'adoption_rate' ? 'Avg' : 'Total'} ${metricLabel.toLowerCase()}`,
                detail: `${allSorted.length} ${partnershipName} clients`,
              },
              expandList,
            },
            suggestions: [`Show top ${partnershipName} companies by adoption`, 'Show company stats'],
          }
        }
      }
    }

    // "Top partnerships by adoption" — group all companies by partnership and show avg adoption
    if (/(?:top|best|highest)\s+partnerships?\s+by\s+adoption/i.test(lowerQuery) || /partnerships?\s+by\s+adoption/i.test(lowerQuery)) {
      const allCompanies = await pennyDataService.getAllCompanies()
      const partnershipMap = {}
      allCompanies.forEach(c => {
        const p = c.partnership || 'Unknown'
        if (!partnershipMap[p]) partnershipMap[p] = { adopted: 0, eligible: 0, count: 0 }
        partnershipMap[p].adopted += (c.adopted ?? 0)
        partnershipMap[p].eligible += (c.eligible ?? 0)
        partnershipMap[p].count++
      })
      const partnerships = Object.entries(partnershipMap)
        .map(([name, data]) => ({
          name,
          adoption: data.eligible > 0 ? (data.adopted / data.eligible) : 0,
          adopted: data.adopted,
          eligible: data.eligible,
          count: data.count,
        }))
        .sort((a, b) => b.adoption - a.adoption)
      const list = partnerships.map((p, i) =>
        `${i + 1}. **${p.name}**: ${(p.adoption * 100).toFixed(1)}% (${p.adopted.toLocaleString()}/${p.eligible.toLocaleString()}) — ${p.count} companies`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'Partnerships by adoption rate',
        data: {
          headers: ['Partnership', 'Adoption Rate', 'Adopted', 'Eligible', 'Companies'],
          rows: partnerships.map(p => [p.name, `${(p.adoption * 100).toFixed(1)}%`, p.adopted.toLocaleString(), p.eligible.toLocaleString(), p.count.toString()]),
        },
      }
      return {
        text: `**Partnerships by adoption rate:**\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: partnerships.length.toString(),
            label: 'Partnerships',
            detail: `${allCompanies.length} total companies`,
          },
          expandList,
        },
        suggestions: ['Show top companies by adoption', 'Show company stats'],
      }
    }

    if (lowerQuery.includes('transfer')) {
      // Only "number of transfers" (not "transfer number") -> count; else -> amount (dollar) with view list
      const byNumber = /\b(?:number\s+of\s+transfers?|by\s+(?:number\s+(?:of\s+)?)?transfers?)\b/i.test(lowerQuery)
      const allCompanies = byNumber
        ? await pennyDataService.getTopCompaniesByTransferCount(9999)
        : await pennyDataService.getTopCompaniesByTransfers(9999)
      const topCompanies = allCompanies.slice(0, 15)

      if (byNumber) {
        const list = topCompanies.map((c, i) =>
          `${i + 1}. **${c.company}**: ${(c.transfers_in_period ?? 0).toLocaleString()} transfers`
        ).join('\n')
        const totalTransfers = allCompanies.reduce((sum, c) => sum + (c.transfers_in_period ?? 0), 0)
        const expandList = allCompanies.length > 0 ? {
          type: 'table',
          title: 'All companies by number of transfers',
          data: {
            headers: ['Company', 'Partnership', 'Number of Transfers', 'Sector'],
            rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.transfers_in_period ?? 0).toLocaleString(), c.sector || '—']),
          },
        } : null
        return {
          text: `**Top clients by number of transfers:**\n\nTotal: **${totalTransfers.toLocaleString()}** transfers across ${allCompanies.length} clients.\n\n${list}`,
          richContent: {
            type: 'data-card',
            data: {
              value: allCompanies.length ? totalTransfers.toLocaleString() : '—',
              label: 'Total transfers',
              detail: `${allCompanies.length} clients`,
            },
            ...(expandList && { expandList }),
          },
          suggestions: ['Show top companies by transfer amount', 'Show top companies by adoption', 'Show company stats'],
        }
      }

      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${c.total_transfer_amount.toLocaleString()}`
      ).join('\n')
      const totalTransferAmount = allCompanies.reduce((sum, c) => sum + (c.total_transfer_amount ?? 0), 0)
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by transfer amount',
        data: {
          headers: ['Company', 'Partnership', 'Transfer Amount', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', `$${c.total_transfer_amount.toLocaleString()}`, c.sector || '—']),
        },
        amountColumnIndex: 2,
        totalLabel: 'Total transfer amount',
      } : null
      return {
        text: `**Top clients by transfer amount:**\n\nTotal: **$${totalTransferAmount.toLocaleString()}** across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? `$${totalTransferAmount.toLocaleString()}` : '—',
            label: 'Total transfer amount',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Show top companies by number of transfers', 'Show top companies by adoption', 'Show company stats'],
      }
    } else if (lowerQuery.includes('revenue') || lowerQuery.includes('mrr') || lowerQuery.includes('net rev') || lowerQuery.includes('gross rev')) {
      const allCompanies = await pennyDataService.getTopCompaniesByRevenue(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalRevenue = allCompanies.reduce((sum, c) => sum + (c.sum_trailing_30d_net_rev ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${(c.sum_trailing_30d_net_rev ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ).join('\n')
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by 30d net revenue',
        data: {
          headers: ['Company', 'Partnership', '30d Net Revenue', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', `$${(c.sum_trailing_30d_net_rev ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, c.sector || '—']),
        },
        amountColumnIndex: 2,
        totalLabel: 'Total 30d net revenue',
      } : null
      return {
        text: `**Top companies by 30-day net revenue:**\n\nTotal: **$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—',
            label: 'Total 30d net revenue',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Show top companies by adoption', 'Show top companies by transfers', 'Show company stats'],
      }
    } else if (/(?:daily|weekly|monthly)\s+active\s+users?\s+(?:at|for|of)\s+/i.test(lowerQuery)) {
      // "weekly active users at Crate and Barrel" — company-specific active users
      const companyMatch = lowerQuery.match(/(?:daily|weekly|monthly)\s+active\s+users?\s+(?:at|for|of)\s+(.+?)[\s.?]*$/i)
      const metricType = /daily/i.test(lowerQuery) ? 'daily' : /weekly/i.test(lowerQuery) ? 'weekly' : 'monthly'
      const metricKey = metricType === 'daily' ? 'daily_active_app_users' : metricType === 'weekly' ? 'weekly_active_app_users' : 'monthly_active_app_users'
      const metricLabel = `${metricType.charAt(0).toUpperCase() + metricType.slice(1)} Active Users`
      if (companyMatch) {
        const companyName = companyMatch[1].trim()
        const stats = await pennyDataService.getCompanyStats(companyName)
        if (stats) {
          const value = stats[metricKey] ?? 0
          // Also get employee list for this company
          const employees = await pennyDataService.getEmployeesByCompany(stats.company)
          const activeEmps = employees.filter(e => !e.paused)
          const expandList = activeEmps.length > 0 ? {
            type: 'table',
            title: `${metricLabel} at ${stats.company}`,
            data: {
              headers: ['Employee', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
              rows: activeEmps.map(e => [e.full_name || '—', e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']),
              employeeNames: activeEmps.map(e => e.full_name),
              rawEmployees: activeEmps,
            },
          } : null
          return {
            text: `**${stats.company}** has **${value.toLocaleString()}** ${metricLabel.toLowerCase()}.${activeEmps.length > 0 ? `\n\n${activeEmps.length} active employees at this company.` : ''}`,
            richContent: {
              type: 'data-card',
              data: {
                value: value.toLocaleString(),
                label: metricLabel,
                detail: stats.company,
              },
              ...(expandList && { expandList }),
            },
            suggestions: [`Tell me about ${stats.company}`, `Show ${stats.company} employees`, 'Show company stats'],
          }
        } else {
          return await buildNotFoundWithSuggestions(companyName, query)
        }
      }
    } else if (lowerQuery.includes('daily active')) {
      const allCompanies = await pennyDataService.getTopCompaniesByDailyActiveUsers(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalDaily = allCompanies.reduce((sum, c) => sum + (c.daily_active_app_users ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.daily_active_app_users ?? 0).toLocaleString()} daily active`
      ).join('\n')
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by daily active app users',
        data: {
          headers: ['Company', 'Partnership', 'Daily Active Users', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.daily_active_app_users ?? 0).toLocaleString(), c.sector || '—']),
        },
      } : null
      return {
        text: `**Top Companies by Daily Active App Users:**\n\nTotal: **${totalDaily.toLocaleString()}** daily active users across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalDaily.toLocaleString() : '—',
            label: 'Total daily active users',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Top companies by weekly active users', 'Top companies by monthly active users', 'Show company stats'],
      }
    } else if (lowerQuery.includes('weekly active')) {
      const allCompanies = await pennyDataService.getTopCompaniesByWeeklyActiveUsers(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalWeekly = allCompanies.reduce((sum, c) => sum + (c.weekly_active_app_users ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.weekly_active_app_users ?? 0).toLocaleString()} weekly active`
      ).join('\n')
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by weekly active app users',
        data: {
          headers: ['Company', 'Partnership', 'Weekly Active Users', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.weekly_active_app_users ?? 0).toLocaleString(), c.sector || '—']),
        },
      } : null
      return {
        text: `**Top Companies by Weekly Active App Users:**\n\nTotal: **${totalWeekly.toLocaleString()}** weekly active users across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalWeekly.toLocaleString() : '—',
            label: 'Total weekly active users',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Top companies by daily active users', 'Top companies by monthly active users', 'Show company stats'],
      }
    } else if (lowerQuery.includes('monthly active')) {
      const allCompanies = await pennyDataService.getTopCompaniesByMonthlyActiveUsers(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalMonthly = allCompanies.reduce((sum, c) => sum + (c.monthly_active_app_users ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.monthly_active_app_users ?? 0).toLocaleString()} monthly active`
      ).join('\n')
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by monthly active app users',
        data: {
          headers: ['Company', 'Partnership', 'Monthly Active Users', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.monthly_active_app_users ?? 0).toLocaleString(), c.sector || '—']),
        },
      } : null
      return {
        text: `**Top Companies by Monthly Active App Users:**\n\nTotal: **${totalMonthly.toLocaleString()}** monthly active users across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalMonthly.toLocaleString() : '—',
            label: 'Total monthly active users',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Top companies by daily active users', 'Top companies by weekly active users', 'Show company stats'],
      }
    } else if (lowerQuery.includes('active')) {
      const allCompanies = await pennyDataService.getTopCompaniesByActiveUsers(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalActive = allCompanies.reduce((sum, c) => sum + (c.active ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.active.toLocaleString()} active users (${c.adopted.toLocaleString()} adopted)`
      ).join('\n')
      const expandList = allCompanies.length > 0 ? {
        type: 'table',
        title: 'All companies by active users',
        data: {
          headers: ['Company', 'Partnership', 'Active Users', 'Adopted', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.active ?? 0).toLocaleString(), (c.adopted ?? 0).toLocaleString(), c.sector || '—']),
        },
      } : null
      return {
        text: `**Top Companies by Active Users:**\n\nTotal: **${totalActive.toLocaleString()}** active users across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalActive.toLocaleString() : '—',
            label: 'Total active users',
            detail: `${allCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
      }
    } else if (lowerQuery.includes('outstanding') || (lowerQuery.includes('balance') && !lowerQuery.includes('savings') && !lowerQuery.includes('save'))) {
      const allCompanies = await pennyDataService.getTopCompaniesByOutstandingBalance(9999)
      if (allCompanies.length === 0) {
        return {
          text: `**No companies with outstanding balances found.**`,
        }
      }
      const topCompanies = allCompanies.slice(0, 15)
      const totalOutstanding = allCompanies.reduce((sum, c) => sum + (c.totalBalance ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${c.totalBalance.toFixed(2)} (${c.employeeCount} employee${c.employeeCount !== 1 ? 's' : ''})`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by outstanding balance',
        data: {
          headers: ['Company', 'Outstanding Balance', 'Employees'],
          rows: allCompanies.map(c => [c.company || '—', `$${c.totalBalance.toFixed(2)}`, c.employeeCount.toString()]),
        },
        amountColumnIndex: 1,
        totalLabel: 'Total outstanding',
      }
      return {
        text: `**Top Companies by Outstanding Balance:**\n\nTotal: **$${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? `$${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—',
            label: 'Total outstanding balance',
            detail: `${allCompanies.length} clients`,
          },
          expandList,
        },
      }
    } else if (lowerQuery.includes('savings') || lowerQuery.includes('save balance')) {
      const allCompanies = await pennyDataService.getTopCompaniesBySavingsBalance(9999)
      if (allCompanies.length === 0) {
        return { text: `**No companies with savings balances found.**` }
      }
      const topCompanies = allCompanies.slice(0, 15)
      const totalSavings = allCompanies.reduce((sum, c) => sum + (c.savings_balance_usd ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${(c.savings_balance_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by savings balance',
        data: {
          headers: ['Company', 'Partnership', 'Savings Balance', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', `$${(c.savings_balance_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, c.sector || '—']),
        },
        amountColumnIndex: 2,
        totalLabel: 'Total savings balance',
      }
      return {
        text: `**Top companies by savings balance:**\n\nTotal: **$${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? `$${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—',
            label: 'Total savings balance',
            detail: `${allCompanies.length} clients`,
          },
          expandList,
        },
        suggestions: ['Show top companies by adoption', 'Show top companies by transfers', 'Show company stats'],
      }
    } else if (lowerQuery.includes('paused')) {
      const allCompanies = await pennyDataService.getTopCompaniesByPausedEmployees(9999)
      if (allCompanies.length === 0) {
        return { text: `**No companies with paused employees.**` }
      }
      const topCompanies = allCompanies.slice(0, 15)
      const totalPaused = allCompanies.reduce((sum, c) => sum + (c.paused ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.paused} paused employee${c.paused !== 1 ? 's' : ''}`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by paused employees',
        data: {
          headers: ['Company', 'Partnership', 'Paused'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.paused ?? 0).toString()]),
        },
      }
      return {
        text: `**Top Companies by Paused Employees:**\n\nTotal: **${totalPaused.toLocaleString()}** paused employees across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalPaused.toLocaleString() : '—',
            label: 'Total paused employees',
            detail: `${allCompanies.length} clients`,
          },
          expandList,
        },
      }
    } else if (lowerQuery.includes('enrolled')) {
      const allCompanies = await pennyDataService.getTopCompaniesByEnrolledEmployees(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalEnrolled = allCompanies.reduce((sum, c) => sum + (c.enrolled ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.enrolled} enrolled`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by enrolled employees',
        data: {
          headers: ['Company', 'Partnership', 'Enrolled'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.enrolled ?? 0).toLocaleString()]),
        },
      }
      return {
        text: `**Top Companies by Enrolled Employees:**\n\nTotal: **${totalEnrolled.toLocaleString()}** enrolled employees across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalEnrolled.toLocaleString() : '—',
            label: 'Total enrolled employees',
            detail: `${allCompanies.length} clients`,
          },
          expandList,
        },
      }
    } else if (lowerQuery.includes('shift')) {
      const allCompanies = await pennyDataService.getTopCompaniesByShifts(9999)
      if (allCompanies.length === 0) {
        return { text: `**No companies with shifts data found.**` }
      }
      const topCompanies = allCompanies.slice(0, 15)
      const totalShifts = allCompanies.reduce((sum, c) => sum + (c.shifts_created_in_period ?? 0), 0)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.shifts_created_in_period ?? 0).toLocaleString()} shifts`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by shifts created',
        data: {
          headers: ['Company', 'Partnership', 'Shifts Created', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', (c.shifts_created_in_period ?? 0).toLocaleString(), c.sector || '—']),
        },
      }
      return {
        text: `**Top companies by shifts created:**\n\nTotal: **${totalShifts.toLocaleString()}** shifts across ${allCompanies.length} clients.\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: allCompanies.length ? totalShifts.toLocaleString() : '—',
            label: 'Total shifts created',
            detail: `${allCompanies.length} clients`,
          },
          expandList,
        },
        suggestions: ['Show top companies by adoption', 'Show top companies by transfers', 'Show company stats'],
      }
    } else {
      const allCompanies = await pennyDataService.getTopCompaniesByAdoption(9999)
      const topCompanies = allCompanies.slice(0, 15)
      const totalAdopted = allCompanies.reduce((sum, c) => sum + (c.adopted ?? 0), 0)
      const totalEligible = allCompanies.reduce((sum, c) => sum + (c.eligible ?? 0), 0)
      const avgAdoption = totalEligible > 0 ? ((totalAdopted / totalEligible) * 100).toFixed(1) : '0.0'
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.adoption_rate * 100).toFixed(1)}% (${(c.adopted ?? 0).toLocaleString()}/${(c.eligible ?? 0).toLocaleString()})`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: 'All companies by adoption rate',
        data: {
          headers: ['Company', 'Partnership', 'Adoption Rate', 'Adopted', 'Eligible', 'Sector'],
          rows: allCompanies.map(c => [c.company || '—', c.partnership || '—', `${(c.adoption_rate * 100).toFixed(1)}%`, (c.adopted ?? 0).toLocaleString(), (c.eligible ?? 0).toLocaleString(), c.sector || '—']),
        },
      }
      return {
        text: `**Top Companies by Adoption Rate:**\n\nAverage adoption: **${avgAdoption}%** (${totalAdopted.toLocaleString()} adopted / ${totalEligible.toLocaleString()} eligible).\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: `${avgAdoption}%`,
            label: 'Avg adoption rate',
            detail: `${totalAdopted.toLocaleString()} / ${totalEligible.toLocaleString()}`,
          },
          expandList,
        },
      }
    }
  }

  // 2. Check if this is a general company query (not asking about a specific company)
  const isGeneralQuery = /(?:show|get|list|what are|total)\s+(?:all\s+)?(?:compan|client)/i.test(query) ||
    /(?:compan|client)\s+(?:stats|statistics|summary|info)/i.test(query) ||
    /(?:how many|total)\s+(?:compan|client)/i.test(query) ||
    /^(?:show|get)\s+company\s+stats?$/i.test(query)

  if (isGeneralQuery) {
    const summary = await pennyDataService.getCompanySummaryStats()
    return {
      text: `**Company Summary:**\n\n• Total live companies: **${summary.totalCompanies}**\n• Total eligible employees: **${summary.totalEligible.toLocaleString()}**\n• Total adopted: **${summary.totalAdopted.toLocaleString()}**\n• Overall adoption rate: **${summary.overallAdoptionRatePercent}**\n• Total transfers (all-time): **${summary.totalTransfers.toLocaleString()}**\n• Total transfer amount: **$${summary.totalTransferAmount.toLocaleString()}**`,
      richContent: {
        type: 'data-card',
        data: {
          value: summary.totalCompanies.toString(),
          label: 'Live Companies',
          detail: summary.overallAdoptionRatePercent + ' adoption',
        },
      },
      suggestions: [
        'Show top companies by adoption',
        'Show top companies with outstanding balances',
        'Show top companies by active users',
        'Show top companies by transfers',
      ],
    }
  }

  // 3. Try to find a specific company in the query
  let stats = null

  // For "transfers at [company]" / "how many transfers at [company]", extract company from "at X" / "for X"
  if (lowerQuery.includes('transfer') && (lowerQuery.includes(' at ') || lowerQuery.includes(' for ') || lowerQuery.includes(' in '))) {
    const companyFromTransfer = extractCompanyName(query)
    if (companyFromTransfer) {
      stats = await pennyDataService.getCompanyStats(companyFromTransfer)
    }
  }

  // For "outstanding balance at [company]" / "what is the outstanding balance at X", extract company from "at X" / "for X"
  if (!stats && (lowerQuery.includes('outstanding') || lowerQuery.includes('owe')) && (lowerQuery.includes(' at ') || lowerQuery.includes(' for ') || lowerQuery.includes(' in '))) {
    const companyFromBalance = extractCompanyName(query)
    if (companyFromBalance) {
      stats = await pennyDataService.getCompanyStats(companyFromBalance)
    }
  }

  // Try extracting a name from the query (employee name might match a company)
  if (!stats) {
    const nameFromQuery = extractEmployeeName(query)
    if (nameFromQuery) {
      stats = await pennyDataService.getCompanyStats(nameFromQuery)
    }
  }

  // Try the whole query as a company name
  if (!stats) {
    stats = await pennyDataService.getCompanyStats(trimmedQuery)
  }

  // Search for any known company name in the query (longest match first)
  if (!stats) {
    const normPunct = s => s.replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim()
    const normQuery = normPunct(lowerQuery)
    const allCompanies = await pennyDataService.getAllCompanies()
    const byLength = [...allCompanies].filter(c => (c.company || '').trim()).sort((a, b) => (b.company || '').length - (a.company || '').length)
    for (const c of byLength) {
      const cName = (c.company || '').trim().toLowerCase()
      if (!cName || cName.length < 3) continue
      // Query must contain the company name (not the other way around)
      const normName = normPunct(cName)
      if (lowerQuery.includes(cName) || normQuery.includes(normName)) {
        stats = await pennyDataService.getCompanyStats(c.company)
        if (stats) break
      }
    }
  }

  // 4. If we found a specific company, return that company's stats
  if (stats) {
    updateCompanyContext(stats.company)

    // Check for multiple matching companies (e.g. "Kenco Group" → "Kenco Group, Inc." + "Kenco Group Canada")
    // Use the search term that originally found the company (try trimmedQuery, then extractEmployeeName)
    const multiSearchTerm = extractEmployeeName(trimmedQuery) || trimmedQuery
    const allMatchingCompaniesInner = await pennyDataService.getAllCompanyStats(multiSearchTerm)
    const exactNameMatchInner = allMatchingCompaniesInner.some(c => (c.company || '').toLowerCase().trim() === multiSearchTerm.toLowerCase().trim())
    if (allMatchingCompaniesInner.length > 1 && !exactNameMatchInner) {
      const fmtPct = (v) => `${((v ?? 0) * 100).toFixed(1)}%`
      const fmtCur = (v) => `$${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const fmtNum = (v) => (v ?? 0).toLocaleString()

      let text = `**Found ${allMatchingCompaniesInner.length} companies matching "${multiSearchTerm}":**\n\n`
      allMatchingCompaniesInner.forEach((c, i) => {
        text += `**${i + 1}. ${c.company}**\n`
        text += `   • Adoption: **${fmtPct(c.adoption_rate)}** (${fmtNum(c.adopted)}/${fmtNum(c.eligible)})\n`
        text += `   • Active users: **${fmtNum(c.active)}**\n`
        text += `   • Transfers: **${fmtNum(c.transfers_in_period)}** (${fmtCur(c.total_transfer_amount)})\n`
        if (c.partnership) text += `   • Partnership: ${c.partnership}\n`
        text += '\n'
      })

      const headers = ['Company', 'Adoption', 'Eligible', 'Enrolled', 'Active', 'Transfers', '30d Revenue']
      const rows = allMatchingCompaniesInner.map(c => [
        c.company || '—',
        fmtPct(c.adoption_rate),
        fmtNum(c.eligible),
        fmtNum(c.adopted),
        fmtNum(c.active),
        fmtNum(c.transfers_in_period),
        fmtCur(c.sum_trailing_30d_net_rev),
      ])

      // Remember the original query so we can replay it once the user picks a company
      lastPendingQuery = query

      return {
        text,
        richContent: {
          type: 'data-card',
          data: {
            value: allMatchingCompaniesInner.length.toString(),
            label: `Companies matching "${multiSearchTerm}"`,
            detail: allMatchingCompaniesInner.map(c => c.company).join(', '),
          },
          expandList: {
            type: 'table',
            title: `Companies matching "${multiSearchTerm}"`,
            data: { headers, rows },
          },
        },
        suggestions: allMatchingCompaniesInner.map(c => c.company),
      }
    }

    // "Is [company] live?" -> short yes answer
    if (/is\s+.+\s+(?:company\s+)?live/i.test(lowerQuery)) {
      return {
        text: `**Yes**, ${stats.company} is live (in Client Summary).`,
        richContent: { type: 'data-card', data: { value: stats.company, label: 'Live', detail: 'Client Summary' } },
      }
    }
    // "What model is [company] using?" / "Which model does [company] use?" / "What model does X use?" / "What is [company]'s product type?"
    if (/what\s+model\s+(?:is|does)\s+.+\s+(?:using|use)/i.test(lowerQuery) || /which\s+model\s+(?:does\s+)?.+\s+use/i.test(lowerQuery) || /(?:model|ewa\s+technology|product\s+type|dpe)\s+(?:for|at)\s+.+/i.test(lowerQuery) || /what\s+(?:model|product)\s+(?:type\s+)?(?:does|is)/i.test(lowerQuery) || /what\s+is\s+.+(?:'s|s')\s+product\s*type/i.test(lowerQuery)) {
      const modelValue = stats.product_type || null
      return {
        text: modelValue
          ? `**${stats.company}** uses the **${modelValue}** model.`
          : `No model/product type data is available for **${stats.company}**.`,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`],
      }
    }
    // "What is the outstanding balance at [company]?" -> company's total outstanding only
    if (lowerQuery.includes('outstanding') || lowerQuery.includes('owe')) {
      const employeeStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
      if (employeeStats && employeeStats.employees && employeeStats.employees.length > 0) {
        const employeesWithBalance = employeeStats.employees.filter(e => e.outstanding_balance > 0)
        const topBalances = employeesWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance).slice(0, 5)
        const balanceList = topBalances.length > 0
          ? '\n\n**Top Balances:**\n' + topBalances.map((e, i) => `${i + 1}. ${e.full_name}: $${e.outstanding_balance.toFixed(2)}`).join('\n')
          : ''
        const expandList = {
          type: 'table',
          title: `Outstanding at ${stats.company}`,
          data: {
            headers: ['Name', 'Outstanding Balance', 'Company'],
            rows: employeesWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance).map(e => [e.full_name, `$${e.outstanding_balance.toFixed(2)}`, e.company || '—']),
            employeeNames: employeesWithBalance.map(e => e.full_name),
          },
          amountColumnIndex: 1,
          totalLabel: 'Total outstanding',
        }
        return {
          text: `**Outstanding Balances at ${stats.company}:**\n\n• Employees with balance: **${employeeStats.employeesWithOutstandingBalance}**\n• Total outstanding: **$${employeeStats.totalOutstandingBalance.toFixed(2)}**${balanceList}`,
          richContent: {
            type: 'data-card',
            data: {
              value: `$${employeeStats.totalOutstandingBalance.toFixed(2)}`,
              label: `Outstanding at ${stats.company}`,
              detail: `${employeeStats.employeesWithOutstandingBalance} employees`,
            },
            expandList,
          },
        }
      }
      return {
        text: `**Outstanding at ${stats.company}:** No employees with outstanding balances. Total: **$0.00**.`,
        richContent: { type: 'data-card', data: { value: '$0.00', label: `Outstanding at ${stats.company}` } },
      }
    }
    // "Savings / save balance at [company]?" -> company's save accounts with View list
    if (lowerQuery.includes('sav') || lowerQuery.includes('save')) {
      const employeeStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
      if (employeeStats && employeeStats.employees && employeeStats.employees.length > 0) {
        const employeesWithSaveAccount = employeeStats.employees
          .filter(e => e.has_savings_acct || e.save_balance > 0)
          .sort((a, b) => b.save_balance - a.save_balance)
        const topSavers = employeesWithSaveAccount.slice(0, 5)
        const topSaversList = topSavers.length > 0
          ? '\n\n**Top Savers:**\n' + topSavers.map((e, i) => `${i + 1}. ${e.full_name}: $${e.save_balance.toFixed(2)}`).join('\n')
          : ''
        const expandList = employeesWithSaveAccount.length > 0 ? {
          type: 'table',
          title: `Savings at ${stats.company}`,
          data: {
            headers: ['Name', 'Save Balance', 'Company'],
            rows: employeesWithSaveAccount.map(e => [e.full_name, `$${e.save_balance.toFixed(2)}`, e.company || '—']),
            employeeNames: employeesWithSaveAccount.map(e => e.full_name),
          },
          amountColumnIndex: 1,
          totalLabel: 'Total saved',
        } : null
        return {
          text: `**Savings at ${stats.company}:**\n\n• Open save accounts: **${employeeStats.employeesWithSavingsAccounts}**\n• Accounts with balance: **${employeeStats.employeesWithSavingsBalance}**\n• Total saved: **$${employeeStats.totalSavingsBalance.toFixed(2)}**${topSaversList}`,
          richContent: {
            type: 'data-card',
            data: {
              value: employeeStats.employeesWithSavingsAccounts.toString(),
              label: `Save Accounts at ${stats.company}`,
              detail: `${employeeStats.employeesWithSavingsAccounts} accounts · $${employeeStats.totalSavingsBalance.toFixed(2)} total`,
            },
            ...(expandList && { expandList }),
          },
        }
      }
      return {
        text: `**Savings at ${stats.company}:** No save account data. Total: **$0.00**.`,
        richContent: { type: 'data-card', data: { value: '0', label: `Save Accounts at ${stats.company}` } },
      }
    }

    // --- Issue 4 per-company sub-handlers ---

    // 4e. "When did [company] launch?" / "go live" / launch date
    if (lowerQuery.includes('launch') || lowerQuery.includes('go live') || lowerQuery.includes('when did')) {
      const launchDateRaw = stats.launch_date && String(stats.launch_date).trim() ? String(stats.launch_date).trim() : null
      const launchDate = launchDateRaw ? (() => {
        const dt = new Date(launchDateRaw)
        return Number.isNaN(dt.getTime()) ? launchDateRaw : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      })() : null
      const dm = (stats.delivery_manager || '').trim()
      const csm = (stats.csm_owner || '').trim()
      let text = `**${stats.company}**`
      if (launchDate) {
        text += ` launched on **${launchDate}**`
      } else {
        text += ` has no launch date recorded`
      }
      if (dm) text += ` • Delivery Manager: **${dm}**`
      if (csm) text += ` • CSM: **${csm}**`
      text += '.'
      return {
        text,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [
          dm ? `Who does ${dm} manage?` : null,
          csm ? `CSM ${csm}` : null,
          `Tell me about ${stats.company}`,
        ].filter(Boolean),
      }
    }

    // 4a. Transfer limit / max transfer % — config fields removed
    if (lowerQuery.includes('transfer limit') || lowerQuery.includes('max transfer') || lowerQuery.includes('transfer %') || lowerQuery.includes('transfer pct')) {
      return {
        text: `Transfer limit configuration data is no longer available for **${stats.company}**.`,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
      }
    }

    // 4b. Weekly/monthly/daily active app users at [company]
    if ((lowerQuery.includes('daily active') || lowerQuery.includes('weekly active') || lowerQuery.includes('monthly active')) && !lowerQuery.includes('top')) {
      let metric, label
      if (lowerQuery.includes('daily')) {
        metric = stats.daily_active_app_users
        label = 'Daily Active App Users'
      } else if (lowerQuery.includes('weekly')) {
        metric = stats.weekly_active_app_users
        label = 'Weekly Active App Users'
      } else {
        metric = stats.monthly_active_app_users
        label = 'Monthly Active App Users'
      }
      // Get active employees list for sidebar
      const empStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
      const activeEmps = empStats ? (empStats.employees || []).filter(e => !e.paused) : []
      const expandList = activeEmps.length > 0 ? {
        type: 'table',
        title: `${label} at ${stats.company}`,
        data: {
          headers: ['Employee', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
          rows: activeEmps.map(e => [e.full_name || '—', e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']),
          employeeNames: activeEmps.map(e => e.full_name),
          rawEmployees: activeEmps,
        },
      } : null
      return {
        text: `**${stats.company}** has **${(metric ?? 0).toLocaleString()}** ${label.toLowerCase()}.`,
        richContent: {
          type: 'data-card',
          data: { value: (metric ?? 0).toLocaleString(), label, detail: stats.company },
          ...(expandList && { expandList }),
        },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`, `Transfers at ${stats.company}`],
      }
    }

    // 4c. Average transfers / streamers at [company]
    if (lowerQuery.includes('average transfer') || lowerQuery.includes('avg transfer')) {
      const val = stats.avg_30d_transfers
      const totalCount = stats.transfers_in_period ?? 0
      const totalVolume = stats.total_transfer_amount ?? 0
      return {
        text: `**${stats.company}** averages **${(val ?? 0).toLocaleString()}** transfers per 30 days.\n\n• Total transfers: **${Number(totalCount).toLocaleString()}**\n• Total transfer value: **$${Number(totalVolume).toLocaleString()}**`,
        richContent: {
          type: 'data-card',
          data: { value: (val ?? 0).toLocaleString(), label: 'Avg 30d Transfers', detail: `$${Number(totalVolume).toLocaleString()} total volume` },
        },
      }
    }
    if (lowerQuery.includes('average streamer') || lowerQuery.includes('avg streamer')) {
      const val = stats.avg_30d_streamers
      return {
        text: `**${stats.company}** averages **${(val ?? 0).toLocaleString()}** streamers per 30 days.`,
        richContent: {
          type: 'data-card',
          data: { value: (val ?? 0).toLocaleString(), label: 'Avg 30d Streamers', detail: stats.company },
        },
      }
    }

    // 4d. Shifts at [company]
    if (lowerQuery.includes('shift')) {
      const val = stats.shifts_created_in_period
      return {
        text: `**${stats.company}** has **${(val ?? 0).toLocaleString()}** shifts created in the current period.`,
        richContent: {
          type: 'data-card',
          data: { value: (val ?? 0).toLocaleString(), label: 'Shifts Created', detail: stats.company },
        },
      }
    }

    // 4f. Pending/enrolling employees at [company]
    if (lowerQuery.includes('pending')) {
      const val = stats.pending
      const pendingEmployees = await pennyDataService.getEmployeesByState('PENDING', stats.company)
      const expandList = pendingEmployees.length > 0 ? {
        type: 'table',
        title: `Pending employees at ${stats.company}`,
        data: {
          headers: ['Name', 'Status', 'Company'],
          rows: pendingEmployees.map(e => [e.full_name || '—', e.current_state || 'PENDING', e.company || '—']),
          employeeNames: pendingEmployees.map(e => e.full_name),
        },
      } : null
      return {
        text: `**${stats.company}** has **${val ?? 0}** pending employees (from Client Summary).${pendingEmployees.length > 0 ? `\n\n${pendingEmployees.length} pending employee records found in the Employee Summary.` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: (val ?? 0).toString(), label: 'Pending Employees', detail: stats.company },
          ...(expandList && { expandList }),
        },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`, `Enrolled employees at ${stats.company}`],
      }
    }
    if (lowerQuery.includes('enrolling')) {
      const val = stats.enrolling
      const enrollingEmployees = await pennyDataService.getEmployeesByState('ENROLLING', stats.company)
      const expandList = enrollingEmployees.length > 0 ? {
        type: 'table',
        title: `Enrolling employees at ${stats.company}`,
        data: {
          headers: ['Name', 'Status', 'Company'],
          rows: enrollingEmployees.map(e => [e.full_name || '—', e.current_state || 'ENROLLING', e.company || '—']),
          employeeNames: enrollingEmployees.map(e => e.full_name),
        },
      } : null
      return {
        text: `**${stats.company}** has **${val ?? 0}** enrolling employees (from Client Summary).${enrollingEmployees.length > 0 ? `\n\n${enrollingEmployees.length} enrolling employee records found in the Employee Summary.` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: (val ?? 0).toString(), label: 'Enrolling Employees', detail: stats.company },
          ...(expandList && { expandList }),
        },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`, `Pending employees at ${stats.company}`],
      }
    }

    // 4g. Pricing model / product type
    if (lowerQuery.includes('pricing model') || lowerQuery.includes('pricing') || lowerQuery.includes('product type')) {
      const pt = (stats.product_type || '').trim()
      return {
        text: pt
          ? `**${stats.company}** has product type: **${pt}**.`
          : `No product type recorded for **${stats.company}**.`,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
      }
    }

    // 4h. Credit score for [company]
    if (lowerQuery.includes('credit score') || lowerQuery.includes('credit rating')) {
      const cs = (stats.credit_score || '').trim()
      return {
        text: cs
          ? `**${stats.company}**'s credit score is **${cs}**.`
          : `Sorry, no credit score on file for **${stats.company}**.`,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`],
      }
    }

    // 4b fallback: CSM/DM for this company - "who is the CSM for [company]?"
    if (lowerQuery.includes('csm') || lowerQuery.includes('delivery manager') || lowerQuery.includes(' dm ') || lowerQuery.includes('who manages')) {
      const csm = (stats.csm_owner || '').trim()
      const dm = (stats.delivery_manager || '').trim()
      let text = `**${stats.company}**:`
      if (csm) text += ` CSM: **${csm}**`
      if (dm) text += `${csm ? ' •' : ''} DM: **${dm}**`
      if (!csm && !dm) text += ' No CSM or DM assigned.'
      return {
        text,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [
          csm ? `CSM ${csm}` : null,
          dm ? `Who does ${dm} manage?` : null,
          `Tell me about ${stats.company}`,
        ].filter(Boolean),
      }
    }

    // --- End Issue 4 per-company sub-handlers ---

    const companyName = stats.company
    const admins = await pennyDataService.getAdminsByCompany(companyName)
    const employeeStats = await pennyDataService.getCompanyEmployeeStats(companyName)
    const outstandingBalanceTotal = employeeStats ? employeeStats.totalOutstandingBalance : 0
    const employeesWithBalance = employeeStats ? (employeeStats.employees || []).filter(e => (e.outstanding_balance || 0) > 0) : []
    const outstandingBalanceExpandList = {
      type: 'table',
      title: `Outstanding at ${companyName}`,
      data: {
        headers: ['Name', 'Outstanding Balance', 'Company'],
        rows: employeesWithBalance.sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0)).map(e => [e.full_name, `$${(e.outstanding_balance || 0).toFixed(2)}`, e.company || '—']),
        employeeNames: employeesWithBalance.map(e => e.full_name),
        rawEmployees: employeesWithBalance,
      },
      amountColumnIndex: 1,
      totalLabel: 'Total outstanding',
    }
    const activeEmployees = employeeStats ? (employeeStats.employees || []).filter(e => !e.paused) : []
    const activeUsersExpandList = {
      type: 'table',
      title: `Active Users at ${companyName}`,
      data: {
        headers: ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
        rows: activeEmployees.map(e => [e.full_name, e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']),
        employeeNames: activeEmployees.map(e => e.full_name),
        rawEmployees: activeEmployees,
      },
    }
    const partnershipName = (stats.partnership != null && String(stats.partnership).trim()) ? String(stats.partnership).trim() : null
    let partnershipExpandList = null
    if (partnershipName) {
      const companiesInPartnership = await pennyDataService.getCompaniesByPartnership(partnershipName)
      if (companiesInPartnership.length > 0) {
        partnershipExpandList = {
          type: 'table',
          title: `Companies in ${partnershipName}`,
          data: {
            headers: ['Company', 'Partnership'],
            rows: companiesInPartnership.map(c => [c.company || '—', c.partnership || '—']),
            rawCompanies: companiesInPartnership,
          },
        }
      }
    }
    const adoptedEmployees = employeeStats?.employees || []
    const adoptedExpandList = adoptedEmployees.length > 0 ? {
      type: 'table',
      title: `Adopted at ${companyName}`,
      data: {
        headers: ['Name', 'Status', 'Transfers (90d)', 'Company'],
        rows: adoptedEmployees.map(e => [e.full_name, e.current_state || '—', (e.transfers_90d || 0).toLocaleString(), e.company || '—']),
        employeeNames: adoptedEmployees.map(e => e.full_name),
        rawEmployees: adoptedEmployees,
      },
    } : null
    const eligibleExpandList = adoptedEmployees.length > 0 ? {
      type: 'table',
      title: `Employees at ${companyName}`,
      data: {
        headers: ['Name', 'Status', 'Pay Type', 'Company'],
        rows: adoptedEmployees.map(e => [e.full_name, e.current_state || '—', e.salary_or_hourly || '—', e.company || '—']),
        employeeNames: adoptedEmployees.map(e => e.full_name),
        rawEmployees: adoptedEmployees,
      },
    } : null
    // Transfers expand list — employees at this company sorted by transfers
    const transferEmployees = (employeeStats?.employees || []).filter(e => (e.transfers_90d || 0) > 0 || (e.lifetime_total_transfers || 0) > 0).sort((a, b) => (b.transfers_90d || 0) - (a.transfers_90d || 0))
    const transfersExpandList = transferEmployees.length > 0 ? {
      type: 'table',
      title: `Employees with transfers at ${companyName}`,
      data: {
        headers: ['Employee', 'Transfers (90d)', 'Volume (90d)', 'Company'],
        rows: transferEmployees.map(e => [e.full_name || '—', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']),
        employeeNames: transferEmployees.map(e => e.full_name),
        rawEmployees: transferEmployees,
      },
      amountColumnIndex: 2,
      totalLabel: 'Total volume (90d)',
    } : null
    // Savings expand list — employees with savings accounts
    const savingsEmployees = (employeeStats?.employees || []).filter(e => e.has_savings_acct || (e.save_balance || 0) > 0).sort((a, b) => (b.save_balance || 0) - (a.save_balance || 0))
    let savingsExpandList = savingsEmployees.length > 0 ? {
      type: 'table',
      title: `Savings accounts at ${companyName}`,
      data: {
        headers: ['Employee', 'Save Balance', 'Company'],
        rows: savingsEmployees.map(e => [e.full_name || '—', `$${(e.save_balance || 0).toFixed(2)}`, e.company || '—']),
        employeeNames: savingsEmployees.map(e => e.full_name),
        rawEmployees: savingsEmployees,
      },
      amountColumnIndex: 1,
      totalLabel: 'Total saved',
    } : null
    // Fallback: if Redash shows active_savings_accounts > 0 but no employee-level data matches, show all employees
    if (!savingsExpandList && stats.active_savings_accounts > 0) {
      const allEmps = employeeStats?.employees || []
      if (allEmps.length > 0) {
        savingsExpandList = {
          type: 'table',
          title: `Employees at ${companyName} (${stats.active_savings_accounts} savings accounts per aggregate data)`,
          data: {
            headers: ['Employee', 'Save Balance', 'Company'],
            rows: allEmps.map(e => [e.full_name || '—', `$${(e.save_balance || 0).toFixed(2)}`, e.company || '—']),
            employeeNames: allEmps.map(e => e.full_name),
            rawEmployees: allEmps,
          },
          amountColumnIndex: 1,
          totalLabel: 'Total saved',
        }
      }
    }
    // CSM expand list
    const csmName = (stats.csm_owner || '').trim()
    let csmExpandList = null
    if (csmName) {
      const csmCompanies = await pennyDataService.getCompaniesByCsmOwner(csmName)
      if (csmCompanies.length > 0) {
        csmExpandList = { type: 'table', title: `Accounts managed by ${csmName} (CSM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: csmCompanies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]), rawCompanies: csmCompanies } }
      }
    }
    // DM expand list
    const dmName = (stats.delivery_manager || '').trim()
    let dmExpandList = null
    if (dmName) {
      const dmCompanies = await pennyDataService.getCompaniesByDeliveryManager(dmName)
      if (dmCompanies.length > 0) {
        dmExpandList = { type: 'table', title: `Accounts launched by ${dmName} (DM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: dmCompanies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]), rawCompanies: dmCompanies } }
      }
    }
    // Pending expand list — employees with current_state matching 'pending' at this company
    const pendingEmployees = (employeeStats?.employees || []).filter(e => (e.current_state || '').toLowerCase() === 'pending')
    let pendingExpandList = pendingEmployees.length > 0 ? {
      type: 'table',
      title: `Pending employees at ${companyName}`,
      data: {
        headers: ['Name', 'Status', 'Pay Type', 'Company'],
        rows: pendingEmployees.map(e => [e.full_name || '—', 'Pending', e.salary_or_hourly || '—', e.company || '—']),
        employeeNames: pendingEmployees.map(e => e.full_name),
        rawEmployees: pendingEmployees,
      },
    } : null
    // Fallback: if Redash shows pending > 0 but no employee-level data matches, show all employees
    if (!pendingExpandList && stats.pending > 0) {
      const allEmps = employeeStats?.employees || []
      if (allEmps.length > 0) {
        pendingExpandList = {
          type: 'table',
          title: `Employees at ${companyName} (${stats.pending} pending per aggregate data)`,
          data: {
            headers: ['Name', 'Status', 'Pay Type', 'Company'],
            rows: allEmps.map(e => [e.full_name || '—', e.current_state || '—', e.salary_or_hourly || '—', e.company || '—']),
            employeeNames: allEmps.map(e => e.full_name),
            rawEmployees: allEmps,
          },
        }
      }
    }
    // Enrolling expand list — employees with current_state matching 'enrolling' at this company
    const enrollingEmployees = (employeeStats?.employees || []).filter(e => (e.current_state || '').toLowerCase() === 'enrolling')
    const enrollingExpandList = enrollingEmployees.length > 0 ? {
      type: 'table',
      title: `Enrolling employees at ${companyName}`,
      data: {
        headers: ['Name', 'Status', 'Pay Type', 'Company'],
        rows: enrollingEmployees.map(e => [e.full_name || '—', 'Enrolling', e.salary_or_hourly || '—', e.company || '—']),
        employeeNames: enrollingEmployees.map(e => e.full_name),
        rawEmployees: enrollingEmployees,
      },
    } : null
    // Paused expand list — employees with paused === true at this company
    const pausedEmployees = (employeeStats?.employees || []).filter(e => e.paused === true)
    const pausedExpandList = pausedEmployees.length > 0 ? {
      type: 'table',
      title: `Paused employees at ${companyName}`,
      data: {
        headers: ['Name', 'Company', 'Pause Reason', 'Status'],
        rows: pausedEmployees.map(e => [e.full_name || '—', e.company || '—', e.pause_reason || '—', 'Paused']),
        employeeNames: pausedEmployees.map(e => e.full_name),
        rawEmployees: pausedEmployees,
      },
    } : null
    const pausedCount = pausedEmployees.length
    // Credit score expand list — ALL companies with credit scores (global list)
    let creditScoreExpandList = null
    if (stats.credit_score) {
      const csCompanies = await pennyDataService.getCompaniesWithCreditScores()
      if (csCompanies.length > 0) {
        creditScoreExpandList = {
          type: 'table',
          title: 'All companies with credit scores',
          data: {
            headers: ['Company', 'Credit Score', 'Partnership', 'Adoption'],
            rows: csCompanies.map(c => [c.company || '—', String(c.credit_score), c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
            rawCompanies: csCompanies,
          },
        }
      }
    }
    return {
      text: `Here's an overview of **${stats.company}** — adoption is at **${stats.adoption_rate_percent}** with **${stats.adopted}** enrolled out of **${stats.eligible}** eligible employees.`,
      richContent: {
        type: 'company-stats-card',
        data: {
          ...stats,
          admins,
          outstandingBalanceTotal,
          outstandingBalanceExpandList,
          activeUsersExpandList,
          ...(partnershipExpandList && { partnershipExpandList }),
          ...(adoptedExpandList && { adoptedExpandList }),
          ...(eligibleExpandList && { eligibleExpandList }),
          ...(csmExpandList && { csmExpandList }),
          ...(dmExpandList && { dmExpandList }),
          ...(transfersExpandList && { transfersExpandList }),
          ...(savingsExpandList && { savingsExpandList }),
          ...(pendingExpandList && { pendingExpandList }),
          ...(enrollingExpandList && { enrollingExpandList }),
          ...(pausedExpandList && { pausedExpandList }),
          pausedCount,
          ...(creditScoreExpandList && { creditScoreExpandList }),
        },
      },
      suggestions: [
        `Outstanding at ${companyName}`,
        `Savings at ${companyName}`,
        `Transfers at ${companyName}`,
        `Weekly active users at ${companyName}`,
        `Employees at ${companyName}`,
      ],
    }
  }

  // 5a. Partnership fallback — try the whole query as a partnership name (Issue 2)
  const partnershipFallback = await pennyDataService.getCompaniesByPartnership(trimmedQuery)
  if (partnershipFallback.length > 0) {
    const displayName = trimmedQuery.charAt(0).toUpperCase() + trimmedQuery.slice(1)
    const expandList = {
      type: 'table',
      title: `${displayName} companies`,
      data: {
        headers: ['Company', 'Partnership', 'Adoption'],
        rows: partnershipFallback.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
      },
    }
    return {
      text: `**${partnershipFallback.length}** ${displayName} companies are live.`,
      richContent: {
        type: 'data-card',
        data: { value: partnershipFallback.length.toString(), label: `${displayName} companies`, detail: `${partnershipFallback.length} live` },
        expandList,
      },
      suggestions: [`How many ${displayName} companies are live?`, `Top ${displayName} companies by adoption`, 'Show company stats'],
    }
  }

  // 5b. Fallback: return general company stats
  const summary = await pennyDataService.getCompanySummaryStats()
  return {
    text: `**Company Summary:**\n\n• Total live companies: **${summary.totalCompanies}**\n• Total eligible employees: **${summary.totalEligible.toLocaleString()}**\n• Total adopted: **${summary.totalAdopted.toLocaleString()}**\n• Overall adoption rate: **${summary.overallAdoptionRatePercent}**\n• Total transfers (all-time): **${summary.totalTransfers.toLocaleString()}**\n• Total transfer amount: **$${summary.totalTransferAmount.toLocaleString()}**`,
    richContent: {
      type: 'data-card',
      data: {
        value: summary.totalCompanies.toString(),
        label: 'Live Companies',
        detail: summary.overallAdoptionRatePercent + ' adoption',
      },
    },
    suggestions: [
      'Show top companies by adoption',
      'Show top companies with outstanding balances',
      'Show top companies by active users',
      'Show top companies by transfers',
    ],
  }
}

// ============================================
// REVENUE / MRR HANDLER — org, partnership, company
// ============================================

async function handleRevenueQuery(query) {
  const lowerQuery = query.toLowerCase()
  const entity = await pennyDataService.findEntityInQuery(query)
  const isMrr = lowerQuery.includes('mrr')
  const label = isMrr ? 'MRR' : 'Revenue (Last 30 Days)'

  // Company-level — show answer + full company card
  if (entity.type === 'company') {
    const stats = entity.stats
    const rev = stats.sum_trailing_30d_net_rev ?? 0
    const grossRev = stats.trailing_30d_avg_daily_gross_rev ?? null
    const netRevDaily = stats.trailing_30d_avg_daily_net_rev ?? null
    let text = `**${stats.company}** trailing 30-day net revenue is **$${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`
    if (grossRev != null) text += ` Daily gross revenue avg: **$${Number(grossRev).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`
    if (netRevDaily != null) text += ` Daily net revenue avg: **$${Number(netRevDaily).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.`
    const fullStats = await pennyDataService.getCompanyStats(stats.company)
    return {
      text,
      richContent: { type: 'company-stats-card', data: { ...(fullStats || stats), ...(await enrichWithPausedCount(fullStats || stats)) } },
      suggestions: [`Transfers at ${stats.company}`, `Tell me about ${stats.company}`, `Outstanding at ${stats.company}`],
    }
  }

  // Partnership-level
  if (entity.type === 'partnership') {
    const pStats = await pennyDataService.getPartnershipStats(entity.name)
    if (pStats) {
      const rev = pStats.totalRevenue ?? 0
      return {
        text: `**${pStats.partnership}** partnership ${label}: **$${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across **${pStats.count}** companies.`,
        richContent: {
          type: 'data-card',
          data: { value: `$${rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, label: `${label} (${pStats.partnership})`, detail: `${pStats.count} companies` },
        },
      }
    }
  }

  // Org-level
  const summary = await pennyDataService.getCompanySummaryStats()
  const totalRev = summary.totalRevenue30d ?? 0
  return {
    text: `**Total ${label}:** **$${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across **${summary.totalCompanies}** companies.`,
    richContent: {
      type: 'data-card',
      data: { value: `$${totalRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, label: `Total ${label}`, detail: `${summary.totalCompanies} companies` },
    },
  }
}

// ============================================
// TRANSFER HANDLER — org, partnership, company (with volume + count)
// ============================================

async function handleTransferQuery(query) {
  const lowerQuery = query.toLowerCase()
  const entity = await pennyDataService.findEntityInQuery(query)
  const is30d = lowerQuery.includes('30 day') || lowerQuery.includes('30d') || lowerQuery.includes('last month') || lowerQuery.includes('last 30') || lowerQuery.includes('trailing')
  const isTotal = lowerQuery.includes('total') || lowerQuery.includes('all time') || lowerQuery.includes('all-time') || lowerQuery.includes('overall') || lowerQuery.includes('lifetime')
  const isAverage = lowerQuery.includes('average') || lowerQuery.includes('avg')
  const hasPeriodSpecified = is30d || isTotal || isAverage

  // If user didn't specify a time period, ask for clarification
  if (!hasPeriodSpecified) {
    const entityName = entity.type === 'company' ? entity.stats?.company : entity.type === 'partnership' ? entity.name : null
    const prefix = entityName ? `for **${entityName}**` : ''
    return {
      text: `Which transfer period would you like to see ${prefix}?`,
      suggestions: [
        entityName ? `Total transfers at ${entityName}` : 'Total transfers',
        entityName ? `30 day transfers at ${entityName}` : '30 day transfers',
        entityName ? `Average transfers at ${entityName}` : 'Average transfers',
      ],
    }
  }

  // Company-level
  if (entity.type === 'company') {
    const stats = entity.stats
    const count = stats.transfers_in_period ?? 0
    const volume = stats.total_transfer_amount ?? 0
    const count30d = stats.total_30d_transfers ?? 0
    if (is30d) {
      return {
        text: `**${stats.company}** had **${Number(count30d).toLocaleString()}** transfers in the last 30 days.`,
        richContent: {
          type: 'data-card',
          data: { value: Number(count30d).toLocaleString(), label: 'Transfers (Last 30 Days)', detail: stats.company },
        },
      }
    }
    if (isAverage) {
      const adopted = stats.adopted ?? 0
      const avgPerUser = adopted > 0 ? (count / adopted).toFixed(1) : '0'
      const avgVolPerUser = adopted > 0 ? (volume / adopted).toFixed(2) : '0'
      return {
        text: `**${stats.company}** Average Transfer Stats:\n\n• Avg transfers per enrolled user: **${avgPerUser}**\n• Avg volume per enrolled user: **$${Number(avgVolPerUser).toLocaleString()}**\n• Total transfers: **${count.toLocaleString()}** across **${adopted.toLocaleString()}** enrolled users`,
        richContent: {
          type: 'data-card',
          data: { value: avgPerUser, label: 'Avg Transfers per User', detail: `$${Number(avgVolPerUser).toLocaleString()} avg volume · ${stats.company}` },
        },
      }
    }
    return {
      text: `**${stats.company}** Transfer Stats:\n\n• Total transfers: **${count.toLocaleString()}**\n• Total volume: **$${Number(volume).toLocaleString()}**`,
      richContent: {
        type: 'data-card',
        data: { value: count.toLocaleString(), label: 'Total Transfers', detail: `$${Number(volume).toLocaleString()} volume` },
      },
    }
  }

  // Partnership-level
  if (entity.type === 'partnership') {
    const pStats = await pennyDataService.getPartnershipStats(entity.name)
    if (pStats) {
      const count = pStats.totalTransfers ?? 0
      const volume = pStats.totalTransferAmount ?? 0
      const count30d = pStats.totalTransfers30d ?? 0
      if (is30d) {
        return {
          text: `**${pStats.partnership}** partnership had **${count30d.toLocaleString()}** transfers in the last 30 days across **${pStats.count}** companies.`,
          richContent: {
            type: 'data-card',
            data: { value: count30d.toLocaleString(), label: 'Transfers Last 30 Days', detail: `${pStats.partnership} (${pStats.count} companies)` },
          },
        }
      }
      if (isAverage) {
        const avgPerCompany = pStats.count > 0 ? (count / pStats.count).toFixed(0) : '0'
        const avgVolPerCompany = pStats.count > 0 ? (volume / pStats.count).toFixed(0) : '0'
        return {
          text: `**${pStats.partnership}** Partnership Average Transfers:\n\n• Avg transfers per company: **${Number(avgPerCompany).toLocaleString()}**\n• Avg volume per company: **$${Number(avgVolPerCompany).toLocaleString()}**\n• Across **${pStats.count}** companies`,
          richContent: {
            type: 'data-card',
            data: { value: Number(avgPerCompany).toLocaleString(), label: 'Avg Transfers per Company', detail: `$${Number(avgVolPerCompany).toLocaleString()} avg vol · ${pStats.partnership}` },
          },
        }
      }
      return {
        text: `**${pStats.partnership}** Partnership Transfer Stats:\n\n• Total transfers: **${count.toLocaleString()}**\n• Total volume: **$${volume.toLocaleString()}**\n• Across **${pStats.count}** companies`,
        richContent: {
          type: 'data-card',
          data: { value: count.toLocaleString(), label: 'Total Transfers', detail: `$${volume.toLocaleString()} volume · ${pStats.count} companies` },
        },
      }
    }
  }

  // Org-level — include top transferring companies
  const summary = await pennyDataService.getCompanySummaryStats()
  const topTransferCompanies = await pennyDataService.getTopCompaniesByTransfers(50)
  const transferExpandList = topTransferCompanies.length > 0 ? {
    type: 'table',
    title: 'Top Companies by Transfers',
    data: {
      headers: ['Company', 'Transfers (30d)', 'Total Transfers', 'Partnership'],
      rows: topTransferCompanies.map(c => [c.company || '—', (c.total_30d_transfers || 0).toLocaleString(), (c.transfers_in_period || 0).toLocaleString(), c.partnership || '—']),
      rawCompanies: topTransferCompanies,
    },
  } : null
  if (is30d) {
    const count30d = summary.totalTransfers30d ?? 0
    return {
      text: `**Total Transfers (Last 30 Days):** **${count30d.toLocaleString()}** across **${summary.totalCompanies}** companies.`,
      richContent: {
        type: 'data-card',
        data: { value: count30d.toLocaleString(), label: 'Transfers (Last 30 Days)', detail: `${summary.totalCompanies} companies` },
        ...(transferExpandList && { expandList: transferExpandList }),
      },
      suggestions: ['Show top companies by adoption', 'Show partnership averages', 'Show company stats'],
    }
  }

  if (isAverage) {
    const totalCount = summary.totalTransfers ?? 0
    const totalVolume = summary.totalTransferAmount ?? 0
    const numCompanies = summary.totalCompanies ?? 1
    const avgPerCompany = Math.round(totalCount / numCompanies)
    const avgVolPerCompany = Math.round(totalVolume / numCompanies)
    const avgPerUser = summary.totalAdopted > 0 ? (totalCount / summary.totalAdopted).toFixed(1) : '0'
    return {
      text: `**Average Transfer Statistics:**\n\n• Avg transfers per company: **${avgPerCompany.toLocaleString()}**\n• Avg volume per company: **$${avgVolPerCompany.toLocaleString()}**\n• Avg transfers per enrolled user: **${avgPerUser}**\n• Across **${numCompanies}** companies and **${(summary.totalAdopted ?? 0).toLocaleString()}** enrolled users`,
      richContent: {
        type: 'data-card',
        data: { value: avgPerCompany.toLocaleString(), label: 'Avg Transfers per Company', detail: `$${avgVolPerCompany.toLocaleString()} avg vol · ${numCompanies} companies` },
        ...(transferExpandList && { expandList: transferExpandList }),
      },
      suggestions: ['Total transfers', '30 day transfers', 'Show top companies by transfers'],
    }
  }

  const totalCount = summary.totalTransfers ?? 0
  const totalVolume = summary.totalTransferAmount ?? 0
  return {
    text: `**Transfer Statistics (All-time):**\n\n• Total transfers: **${totalCount.toLocaleString()}**\n• Total volume: **$${totalVolume.toLocaleString()}**`,
    richContent: {
      type: 'data-card',
      data: { value: totalCount.toLocaleString(), label: 'Total Transfers (All-time)', detail: `$${totalVolume.toLocaleString()} volume` },
      ...(transferExpandList && { expandList: transferExpandList }),
    },
    suggestions: ['Show top companies by adoption', 'Show partnership averages', 'Show company stats'],
  }
}

// ============================================
// CSM / DELIVERY MANAGER HANDLER (Issue 3)
// ============================================

async function handleCsmDmQuery(query) {
  const lowerQuery = query.toLowerCase()

  // Extract person name from patterns like "CSM [name]", "who does [name] manage", "[name]'s accounts", "managed by [name]", "delivery manager [name]"
  let personName = null

  const patterns = [
    /(?:csm|csm owner)\s+(.+?)(?:\s*\?|$)/i,
    /(?:delivery\s*manager|dm)\s+(.+?)(?:\s*\?|$)/i,
    /who\s+does\s+(.+?)\s+manage/i,
    /(.+?)(?:'s)\s+accounts?/i,
    /accounts?\s+(?:managed|run|handled|owned)\s+by\s+(.+?)(?:\s*\?|$)/i,
    /managed\s+by\s+(.+?)(?:\s*\?|$)/i,
  ]

  for (const pat of patterns) {
    const m = query.match(pat)
    if (m) {
      // Some patterns have the name in group 1, "managed by" has it in group 1 too since we rewrote the regex
      personName = (m[1] || '').trim().replace(/[?.!]+$/, '').trim()
      break
    }
  }

  if (!personName || personName.length < 2) return null

  // Skip common words
  const skipWords = ['the', 'all', 'our', 'my', 'this', 'a', 'an', 'each', 'every']
  if (skipWords.includes(personName.toLowerCase())) return null

  // Search both CSM and DM
  const csmCompanies = await pennyDataService.getCompaniesByCsmOwner(personName)
  const dmCompanies = await pennyDataService.getCompaniesByDeliveryManager(personName)

  // Deduplicate (company might appear in both)
  const allMap = new Map()
  csmCompanies.forEach(c => allMap.set(c.company, { ...c, role: 'CSM' }))
  dmCompanies.forEach(c => {
    if (allMap.has(c.company)) {
      allMap.get(c.company).role = 'CSM & DM'
    } else {
      allMap.set(c.company, { ...c, role: 'DM' })
    }
  })
  const allCompanies = [...allMap.values()]

  if (allCompanies.length === 0) {
    // Check if the name is actually a known CSM or DM
    const allCsms = await pennyDataService.getAllCsmOwners()
    const allDms = await pennyDataService.getAllDeliveryManagers()
    const suggestions = []
    if (allCsms.length > 0) suggestions.push(`CSM ${allCsms[0]}`)
    if (allDms.length > 0) suggestions.push(`Delivery Manager ${allDms[0]}`)
    suggestions.push('Show company stats')
    return await buildNotFoundWithSuggestions(personName, query)
  }

  const headers = ['Company', 'Partnership', 'Role', 'Adoption']
  const rows = allCompanies.map(c => [
    c.company || '—',
    c.partnership || '—',
    c.role,
    `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`,
  ])
  const expandList = {
    type: 'table',
    title: `Accounts managed by ${personName}`,
    data: { headers, rows },
  }

  const roleLabel = csmCompanies.length > 0 && dmCompanies.length > 0
    ? 'CSM & DM'
    : csmCompanies.length > 0 ? 'CSM' : 'DM'

  return {
    text: `**${personName}** manages **${allCompanies.length}** account${allCompanies.length !== 1 ? 's' : ''} (as ${roleLabel}).`,
    richContent: {
      type: 'data-card',
      data: {
        value: allCompanies.length.toString(),
        label: `Accounts (${roleLabel})`,
        detail: personName,
      },
      expandList,
    },
    suggestions: allCompanies.slice(0, 3).map(c => `Tell me about ${c.company}`).concat(['Show company stats']),
  }
}

// ============================================
// QUERY HANDLERS
// ============================================

const queryHandlers = [
  // ============================================
  // GREETING QUERIES (with fun fact)
  // ============================================
  {
    patterns: [
      /^(?:hi|hello|hey|howdy|good\s*(?:morning|afternoon|evening))[\s!.]*$/i,
      /^(?:hi|hello|hey)\s+(?:penny|there)[\s!.]*$/i,
    ],
    handler: async () => {
      const funFact = await getRandomFunFact()

      let text = "Hello! I'm Penny, your EWA assistant. I can help you with:\n\n• **Employee information** - balances, savings, enrollment status\n• **Company stats** - adoption rates, transfer volumes\n• **Outstanding balances** - who owes what\n• **Savings accounts** - balances and participation\n\nWhat would you like to know?"

      if (funFact) {
        text += `\n\n---\n\n💡 **Fun fact:** ${funFact}`
      }

      return {
        text,
        type: 'greeting',
        suggestions: [
          'Tell me a fun fact',
          'Show outstanding balances',
          'Show company stats',
          'Show savings stats',
          'Top companies by adoption',
        ],
      }
    },
  },

  // ============================================
  // FUN FACT QUERIES
  // ============================================
  {
    patterns: [
      /(?:tell me a |give me a |share a )?fun\s*fact/i,
      /(?:tell me a |give me a |share a )?fun\s*stat/i,
      /(?:tell me a |give me a |share a )?cool\s*(?:stat|fact)/i,
      /(?:tell me |share |give me )(?:a |an )?(?:interesting|random)\s*(?:stat|fact|statistic)/i,
      /surprise\s*me/i,
      /(?:another|one more|next)\s*(?:fun\s*)?(?:fact|stat)/i,
      /did\s*you\s*know/i,
      /random\s*(?:fact|stat|insight)/i,
    ],
    handler: async () => {
      const funFact = await getRandomFunFact()

      if (!funFact) {
        return {
          text: "I couldn't pull a fun fact right now — data might still be loading. Try again in a moment!",
          type: 'fun-fact',
          suggestions: ['Show company stats', 'Show outstanding balances', 'Show savings stats'],
        }
      }

      const intros = [
        '💡 Here\'s a fun fact:',
        '💡 Did you know?',
        '💡 Here\'s something interesting:',
        '💡 Check this out:',
        '💡 Fun stat for you:',
      ]
      const intro = intros[Math.floor(Math.random() * intros.length)]

      return {
        text: `**${intro}** ${funFact}`,
        type: 'fun-fact',
        suggestions: [
          'Another fun fact',
          'Show company stats',
          'Top companies by adoption',
          'Show savings stats',
          'Show outstanding balances',
        ],
      }
    },
  },

  // ============================================
  // THANK YOU QUERIES (Issue 6)
  // ============================================
  {
    patterns: [
      /^(?:thanks?(?:\s+you)?|thx|ty|thank\s+you(?:\s+penny)?|appreciate\s+it)[\s!.]*$/i,
    ],
    handler: async () => {
      const messages = [
        "You're welcome! Happy to help anytime 💜",
        "Anytime! I'm here whenever you need me 💜",
        "Glad I could help! Don't hesitate to ask again 💜",
        "You're welcome! That's what I'm here for 💜",
      ]
      const text = messages[Math.floor(Math.random() * messages.length)]
      return {
        text,
        richContent: { type: 'thank-you' },
      }
    },
  },

  // ============================================
  // COMPANY-SPECIFIC QUERIES (must come before general queries)
  // ============================================
  {
    patterns: [
      // "what is adoption at [company]" or "adoption at [company]"
      /(?:what(?:'s| is)|show|get)?\s*(?:the\s+)?adoption\s+(?:rate\s+)?(?:at|for|of|in)\s+(.+)/i,
      /adoption\s+(?:rate\s+)?(?:at|for|of|in)\s+(.+)/i,
      // "stats at [company]" or "stats for [company]"
      /(?:stats?|statistics?|info|details?)\s+(?:at|for|of|in)\s+(.+)/i,
      // "give me the name of an enrolled user from [company]"
      /(?:give|show|list|get|name).*(?:enrolled|active)?\s*(?:user|employee|person|member).*(?:from|at|of)\s+(.+)/i,
      // "how many are enrolled at [company]" or "how many enrolled at [company]"
      /(?:how many|number of|total)\s+(?:are\s+)?enrolled\s+(?:at|from|of|in)\s+(.+)/i,
      // "how many active users at [company]"
      /how many (?:active|enrolled)?\s*(?:users?|employees?|people|members?)\s+(?:at|from|of|in)\s+(.+)/i,
      // "how many weekly/daily/monthly active users at [company]"
      /(?:how many\s+)?(?:daily|weekly|monthly)\s+active\s+(?:users?|app\s+users?)\s+(?:at|for|of|in)\s+(.+)/i,
      // "average transfers/streamers at [company]"
      /(?:average|avg)\s+(?:transfers?|streamers?)\s+(?:at|for|of|in)\s+(.+)/i,
      // "shifts at [company]" / "do we have shifts for [company]"
      /(?:shifts?|do we have shifts)\s+(?:at|for|of|in)\s+(.+)/i,
      // "transfer limit at [company]" / "max transfer at [company]"
      /(?:transfer\s+limit|max\s+transfer|transfer\s+%|transfer\s+pct)\s+(?:at|for|of|in)\s+(.+)/i,
      // "pending/enrolling employees at [company]"
      /(?:pending|enrolling)\s+(?:employees?\s+)?(?:at|for|of|in)\s+(.+)/i,
      // "how many pending employees at [company]"
      /how many\s+(?:pending|enrolling)\s+(?:employees?\s+)?(?:at|for|of|in)\s+(.+)/i,
      // "when did [company] launch" / "launch date for [company]"
      /when\s+did\s+(.+?)\s+(?:launch|go\s+live)/i,
      /(?:launch\s+date|go\s+live\s+date)\s+(?:at|for|of)\s+(.+)/i,
      // "pricing model at [company]" / "pricing for [company]" / "product type at [company]"
      /(?:pricing\s+model|pricing|product\s+type)\s+(?:at|for|of)\s+(.+)/i,
      // "who is the CSM for [company]" / "CSM at [company]" / "delivery manager for [company]"
      /(?:who\s+is\s+the\s+)?(?:csm|delivery\s*manager|dm)\s+(?:at|for|of)\s+(.+)/i,
      // "admin email for [company]" / "who are the admins at [company]" / "list admins at [company]"
      /(?:admin\s+emails?|admins?)\s+(?:at|for|of|in)\s+(.+)/i,
      /(?:who\s+(?:are|is)\s+the\s+)?admin(?:s|istrator)?(?:\s+email)?s?\s+(?:at|for|of|in)\s+(.+)/i,
      /(?:list|show|get)\s+admins?\s+(?:at|for|of|in)\s+(.+)/i,
      // "how many open save accounts at [company]"
      /how many (?:open\s+)?(?:save|savings)\s*(?:accounts?)?\s+(?:at|from|of|in)\s+(.+)/i,
      // "[company] savings" or "savings at [company]"
      /(?:savings?|save accounts?)\s+(?:at|from|of|in)\s+(.+)/i,
      // "employees at [company]"
      /(?:employees?|users?|staff|people)\s+(?:at|from|of|in)\s+(.+)/i,
      // "outstanding balance at [company]" or "show outstanding balances at [company]"
      /(?:outstanding|balance|owed)\s+(?:at|from|of|in)\s+(.+)/i,
      /(?:show\s+)?(?:outstanding\s+)?balances?\s+(?:at|from|of|in)\s+(.+)/i,
    ],
    handler: async (query, matches) => {
      const companyName = matches[1]?.trim()
      if (!companyName || companyName.length < 2) return null

      // Bail out for comparison/benchmark queries — let the dedicated handler handle these
      const lq = query.toLowerCase()
      if (/(?:below|above|under|over)\s+(?:avg|average)\s+(?:adoption|transfer|revenue)/i.test(query)) return null
      if (/compare\s+.+\s+(?:vs\.?|versus|against|to)\s+/i.test(query)) return null
      if (/how\s+does\s+.+\s+compare/i.test(query)) return null
      // Bail out for filtered employee list queries — let dedicated handlers catch paused/active/hourly/salary
      if (/\b(?:paused|blocked|inactive)\b/i.test(lq) && /\b(?:employees?|users?|people|staff)\b/i.test(lq)) return null
      if (/\b(?:hourly|salary|salaried)\b/i.test(lq) && /\b(?:employees?|users?|people|staff|how many)\b/i.test(lq)) return null
      if (/\bactive\b/i.test(lq) && /\b(?:list|show|who)\b/i.test(lq) && /\b(?:employees?|users?|people|staff)\b/i.test(lq) && !lq.includes('daily active') && !lq.includes('weekly active') && !lq.includes('monthly active')) return null
      if (/\btransfer\s+stats?\b/i.test(lq)) return null

      // Clean up company name - remove trailing punctuation
      const cleanCompanyName = companyName.replace(/[?.!,]+$/, '').trim()

      // Check for ALL matching companies (handles US + Canada variants like "Crate and Barrel" + "Crate and Barrel Canada")
      const allMatchingCompanies = await pennyDataService.getAllCompanyStats(cleanCompanyName)

      // Use Client Summary (COMPANY column) as source of truth for company stats
      const summary = allMatchingCompanies.length > 0 ? allMatchingCompanies[0] : null
      if (!summary) {
        // Check if this is a partnership name before returning not-found
        const lowerQ = query.toLowerCase()
        const partnershipStats = await pennyDataService.getPartnershipStats(cleanCompanyName)
        if (partnershipStats) {
          // Handle daily/weekly/monthly active at partnership level
          if ((lowerQ.includes('daily active') || lowerQ.includes('weekly active') || lowerQ.includes('monthly active'))) {
            let metric, label
            if (lowerQ.includes('daily')) {
              metric = partnershipStats.totalDailyActive
              label = 'Daily Active App Users'
            } else if (lowerQ.includes('weekly')) {
              metric = partnershipStats.totalWeeklyActive
              label = 'Weekly Active App Users'
            } else {
              metric = partnershipStats.totalMonthlyActive
              label = 'Monthly Active App Users'
            }
            return {
              text: `**${partnershipStats.partnership}** partnership has **${(metric ?? 0).toLocaleString()}** ${label.toLowerCase()} across **${partnershipStats.count}** companies.`,
              richContent: {
                type: 'data-card',
                data: { value: (metric ?? 0).toLocaleString(), label: `${label} (${partnershipStats.partnership})`, detail: `${partnershipStats.count} companies` },
              },
            }
          }
          // Generic active at partnership level
          if (lowerQ.includes('active') && (lowerQ.includes('user') || lowerQ.includes('employee') || lowerQ.includes('how many'))) {
            return {
              text: `**${partnershipStats.partnership}** partnership has **${(partnershipStats.totalActive ?? 0).toLocaleString()}** active users across **${partnershipStats.count}** companies.`,
              richContent: {
                type: 'data-card',
                data: { value: (partnershipStats.totalActive ?? 0).toLocaleString(), label: `Active Users (${partnershipStats.partnership})`, detail: `${partnershipStats.count} companies` },
              },
            }
          }
        }
        return await buildNotFoundWithSuggestions(cleanCompanyName, query)
      }

      const lowerQuery = query.toLowerCase()
      const displayName = summary.company || cleanCompanyName
      updateCompanyContext(displayName)

      // If multiple companies match (e.g. "Crate and Barrel" + "Crate and Barrel Canada"), show all
      // Skip multi-view if the search term is an exact match for one company name (e.g. "Crate and Barrel Canada")
      const exactNameMatch = allMatchingCompanies.some(c => (c.company || '').toLowerCase().trim() === cleanCompanyName.toLowerCase().trim())
      if (allMatchingCompanies.length > 1 && !exactNameMatch) {
        const fmtPct = (v) => `${((v ?? 0) * 100).toFixed(1)}%`
        const fmtCur = (v) => `$${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const fmtNum = (v) => (v ?? 0).toLocaleString()

        let text = `**Found ${allMatchingCompanies.length} companies matching "${cleanCompanyName}":**\n\n`
        allMatchingCompanies.forEach((c, i) => {
          text += `**${i + 1}. ${c.company}**\n`
          text += `   • Adoption: **${fmtPct(c.adoption_rate)}** (${fmtNum(c.adopted)}/${fmtNum(c.eligible)})\n`
          text += `   • Active users: **${fmtNum(c.active)}**\n`
          text += `   • Transfers: **${fmtNum(c.transfers_in_period)}** (${fmtCur(c.total_transfer_amount)})\n`
          if (c.partnership) text += `   • Partnership: ${c.partnership}\n`
          text += '\n'
        })

        const headers = ['Company', 'Adoption', 'Eligible', 'Enrolled', 'Active', 'Transfers', '30d Revenue']
        const rows = allMatchingCompanies.map(c => [
          c.company || '—',
          fmtPct(c.adoption_rate),
          fmtNum(c.eligible),
          fmtNum(c.adopted),
          fmtNum(c.active),
          fmtNum(c.transfers_in_period),
          fmtCur(c.sum_trailing_30d_net_rev),
        ])

        return {
          text,
          richContent: {
            type: 'data-card',
            data: {
              value: allMatchingCompanies.length.toString(),
              label: `Companies matching "${cleanCompanyName}"`,
              detail: allMatchingCompanies.map(c => c.company).join(', '),
            },
            expandList: {
              type: 'table',
              title: `Companies matching "${cleanCompanyName}"`,
              data: { headers, rows },
            },
          },
          suggestions: allMatchingCompanies.map(c => `Tell me about ${c.company}`),
        }
      }

      // --- Per-company sub-handlers (must come BEFORE generic "active" handler) ---

      // Daily/weekly/monthly active app users at [company]
      if ((lowerQuery.includes('daily active') || lowerQuery.includes('weekly active') || lowerQuery.includes('monthly active')) && !lowerQuery.includes('top')) {
        let metric, label
        if (lowerQuery.includes('daily')) {
          metric = summary.daily_active_app_users
          label = 'Daily Active App Users'
        } else if (lowerQuery.includes('weekly')) {
          metric = summary.weekly_active_app_users
          label = 'Weekly Active App Users'
        } else {
          metric = summary.monthly_active_app_users
          label = 'Monthly Active App Users'
        }
        // Fetch active employees for the expandList
        const empStatsC = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        const activeEmpsC = empStatsC?.employees?.filter(e => !e.paused) ?? []
        const expandListC = activeEmpsC.length > 0 ? {
          type: 'table',
          title: `${label} at ${displayName}`,
          data: {
            headers: ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
            rows: activeEmpsC.map(e => [e.full_name, e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), fmtCur(e.volume_90d_usd), e.company || '—']),
            employeeNames: activeEmpsC.map(e => e.full_name),
            rawEmployees: activeEmpsC,
          },
        } : null
        return {
          text: `**${displayName}** has **${(metric ?? 0).toLocaleString()}** ${label.toLowerCase()}.`,
          richContent: {
            type: 'data-card',
            data: { value: (metric ?? 0).toLocaleString(), label, detail: displayName },
            ...(expandListC && { expandList: expandListC }),
          },
        }
      }

      // Launch date / go live date
      if (lowerQuery.includes('launch') || lowerQuery.includes('go live') || lowerQuery.includes('when did')) {
        const launchDateRaw = summary.launch_date && String(summary.launch_date).trim() ? String(summary.launch_date).trim() : null
        const launchDate = launchDateRaw ? (() => {
          const dt = new Date(launchDateRaw)
          return Number.isNaN(dt.getTime()) ? launchDateRaw : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        })() : null
        const dm = (summary.delivery_manager || '').trim()
        const csm = (summary.csm_owner || '').trim()
        let text = `**${displayName}**`
        if (launchDate) {
          text += ` launched on **${launchDate}**`
        } else {
          text += ` has no launch date recorded`
        }
        if (dm) text += ` • Delivery Manager: **${dm}**`
        if (csm) text += ` • CSM: **${csm}**`
        text += '.'
        return {
          text,
          richContent: { type: 'company-stats-card', data: { ...summary, ...(await enrichWithPausedCount(summary)) } },
          suggestions: [
            dm ? `Who does ${dm} manage?` : null,
            csm ? `CSM ${csm}` : null,
            `Tell me about ${displayName}`,
          ].filter(Boolean),
        }
      }

      // Transfer limit / max transfer % — config fields removed
      if (lowerQuery.includes('transfer limit') || lowerQuery.includes('max transfer') || lowerQuery.includes('transfer %') || lowerQuery.includes('transfer pct')) {
        return {
          text: `Transfer limit configuration data is no longer available for **${displayName}**.`,
          richContent: { type: 'company-stats-card', data: { ...summary, ...(await enrichWithPausedCount(summary)) } },
        }
      }

      // Average transfers at [company]
      if (lowerQuery.includes('average transfer') || lowerQuery.includes('avg transfer')) {
        const val = summary.avg_30d_transfers
        const totalCount = summary.transfers_in_period ?? 0
        const totalVolume = summary.total_transfer_amount ?? 0
        return {
          text: `**${displayName}** averages **${(val ?? 0).toLocaleString()}** transfers per 30 days.\n\n• Total transfers: **${Number(totalCount).toLocaleString()}**\n• Total transfer value: **$${Number(totalVolume).toLocaleString()}**`,
          richContent: {
            type: 'data-card',
            data: { value: (val ?? 0).toLocaleString(), label: 'Avg 30d Transfers', detail: `$${Number(totalVolume).toLocaleString()} total volume` },
          },
        }
      }

      // Average streamers at [company]
      if (lowerQuery.includes('average streamer') || lowerQuery.includes('avg streamer')) {
        const val = summary.avg_30d_streamers
        return {
          text: `**${displayName}** averages **${(val ?? 0).toLocaleString()}** streamers per 30 days.`,
          richContent: {
            type: 'data-card',
            data: { value: (val ?? 0).toLocaleString(), label: 'Avg 30d Streamers', detail: displayName },
          },
        }
      }

      // Shifts at [company]
      if (lowerQuery.includes('shift')) {
        const val = summary.shifts_created_in_period
        return {
          text: `**${displayName}** has **${(val ?? 0).toLocaleString()}** shifts created in the current period.`,
          richContent: {
            type: 'data-card',
            data: { value: (val ?? 0).toLocaleString(), label: 'Shifts Created', detail: displayName },
          },
        }
      }

      // Pending employees at [company]
      if (lowerQuery.includes('pending')) {
        const val = summary.pending
        const pendingEmployees = await pennyDataService.getEmployeesByState('PENDING', displayName)
        const expandList = pendingEmployees.length > 0 ? {
          type: 'table',
          title: `Pending employees at ${displayName}`,
          data: {
            headers: ['Name', 'Status', 'Company'],
            rows: pendingEmployees.map(e => [e.full_name || '—', e.current_state || 'PENDING', e.company || '—']),
            employeeNames: pendingEmployees.map(e => e.full_name),
          },
        } : null
        return {
          text: `**${displayName}** has **${val ?? 0}** pending employees (from Client Summary).${pendingEmployees.length > 0 ? `\n\n${pendingEmployees.length} pending employee records found in the Employee Summary.` : ''}`,
          richContent: {
            type: 'data-card',
            data: { value: (val ?? 0).toString(), label: 'Pending Employees', detail: displayName },
            ...(expandList && { expandList }),
          },
          suggestions: [`Tell me about ${displayName}`, `Employees at ${displayName}`, `Enrolled employees at ${displayName}`],
        }
      }

      // Enrolling employees at [company]
      if (lowerQuery.includes('enrolling')) {
        const val = summary.enrolling
        const enrollingEmployees = await pennyDataService.getEmployeesByState('ENROLLING', displayName)
        const expandList = enrollingEmployees.length > 0 ? {
          type: 'table',
          title: `Enrolling employees at ${displayName}`,
          data: {
            headers: ['Name', 'Status', 'Company'],
            rows: enrollingEmployees.map(e => [e.full_name || '—', e.current_state || 'ENROLLING', e.company || '—']),
            employeeNames: enrollingEmployees.map(e => e.full_name),
          },
        } : null
        return {
          text: `**${displayName}** has **${val ?? 0}** enrolling employees (from Client Summary).${enrollingEmployees.length > 0 ? `\n\n${enrollingEmployees.length} enrolling employee records found in the Employee Summary.` : ''}`,
          richContent: {
            type: 'data-card',
            data: { value: (val ?? 0).toString(), label: 'Enrolling Employees', detail: displayName },
            ...(expandList && { expandList }),
          },
          suggestions: [`Tell me about ${displayName}`, `Employees at ${displayName}`, `Pending employees at ${displayName}`],
        }
      }

      // Pricing model / product type
      if (lowerQuery.includes('pricing model') || lowerQuery.includes('pricing') || lowerQuery.includes('product type')) {
        const pt = (summary.product_type || '').trim()
        return {
          text: pt
            ? `**${displayName}** has product type: **${pt}**.`
            : `No product type recorded for **${displayName}**.`,
          richContent: { type: 'company-stats-card', data: { ...summary, ...(await enrichWithPausedCount(summary)) } },
        }
      }

      // CSM / Delivery Manager for [company]
      if (lowerQuery.includes('csm') || lowerQuery.includes('delivery manager') || lowerQuery.includes(' dm ') || lowerQuery.includes('who manages')) {
        const csm = (summary.csm_owner || '').trim()
        const dm = (summary.delivery_manager || '').trim()
        let text = `**${displayName}**:`
        if (csm) text += ` CSM: **${csm}**`
        if (dm) text += `${csm ? ' •' : ''} DM: **${dm}**`
        if (!csm && !dm) text += ' No CSM or DM assigned.'
        return {
          text,
          richContent: { type: 'company-stats-card', data: { ...summary, ...(await enrichWithPausedCount(summary)) } },
          suggestions: [
            csm ? `CSM ${csm}` : null,
            dm ? `Who does ${dm} manage?` : null,
            `Tell me about ${displayName}`,
          ].filter(Boolean),
        }
      }

      // --- End per-company sub-handlers ---

      // "How many active users at [company]" -> use Client Summary ACTIVE + list from employee data
      if (lowerQuery.includes('active') && (lowerQuery.includes('user') || lowerQuery.includes('employee') || lowerQuery.includes('how many'))) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        const activeEmployees = employeeStats?.employees?.filter(e => !e.paused) ?? []
        const expandList = activeEmployees.length > 0 ? {
          type: 'table',
          title: `Active Users at ${displayName}`,
          data: {
            headers: ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
            rows: activeEmployees.map(e => [e.full_name, e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), fmtCur(e.volume_90d_usd), e.company || '—']),
            employeeNames: activeEmployees.map(e => e.full_name),
            rawEmployees: activeEmployees,
          },
        } : null
        return {
          text: `**${displayName}** has **${summary.active} active users** (${summary.adopted} adopted / ${summary.eligible} eligible).`,
          richContent: {
            type: 'data-card',
            data: {
              value: summary.active.toString(),
              label: `Active Users at ${displayName}`,
              detail: `${summary.active} users · ${summary.adopted} adopted`,
            },
            ...(expandList && { expandList }),
          },
        }
      }

      // "How many enrolled at [company]" -> use Client Summary ADOPTED + list for sidebar
      if (lowerQuery.includes('enrolled') && (lowerQuery.includes('how many') || lowerQuery.includes('user') || lowerQuery.includes('employee'))) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        const expandList = employeeStats?.employees?.length ? {
          type: 'table',
          title: `Enrolled Employees at ${displayName}`,
          data: {
            headers: ['Name', 'Company'],
            rows: employeeStats.employees.map(e => [e.full_name, e.company || '—']),
            employeeNames: employeeStats.employees.map(e => e.full_name),
          },
        } : null
        return {
          text: `**${displayName}** has **${summary.adopted} enrolled** (from Client Summary; ${summary.eligible} eligible).`,
          richContent: {
            type: 'data-card',
            data: {
              value: summary.adopted.toString(),
              label: `Enrolled at ${displayName}`,
              detail: `${summary.eligible} eligible`,
            },
            ...(expandList && { expandList }),
          },
        }
      }

      // Admin email(s) for [company] / Who are the admin(s) / List admin emails for [company]
      if (lowerQuery.includes('admin')) {
        // Use the resolved company name from Client Summary for best matching
        const admins = await pennyDataService.getAdminsByCompany(summary.company || cleanCompanyName)
        if (admins.length === 0) {
          return {
            text: `No admins listed in A3 for **${displayName}**.`,
            richContent: {
              type: 'data-card',
              data: { value: '0', label: `Admins at ${displayName}`, detail: 'No Admins listed in A3' },
            },
          }
        }
        const emailList = admins.map(a => a.admin_email).join(', ')
        const expandList = admins.length > 0 ? {
          type: 'table',
          title: `Admins at ${displayName}`,
          data: {
            headers: ['Company', 'Admin Email'],
            rows: admins.map(a => [a.company || '—', a.admin_email]),
          },
        } : null
        if (admins.length === 1) {
          return {
            text: `**${displayName}** admin email: **${admins[0].admin_email}**`,
            richContent: {
              type: 'data-card',
              data: {
                value: admins[0].admin_email,
                label: `Admin at ${displayName}`,
                detail: 'A3',
              },
            },
          }
        }
        const listText = admins.map(a => `• ${a.admin_email}`).join('\n')
        return {
          text: `**${displayName}** has **${admins.length}** admin(s):\n\n${listText}`,
          richContent: {
            type: 'data-card',
            data: {
              value: admins.length.toString(),
              label: `Admins at ${displayName}`,
              detail: `${admins.length} email(s)`,
            },
            ...(expandList && { expandList }),
          },
        }
      }

      // "What is adoption at [company]" or "[company] adoption" -> use Client Summary ADOPTION_RATE
      if (lowerQuery.includes('adoption')) {
        return {
          text: `**${displayName}** adoption rate: **${summary.adoption_rate_percent}** (${summary.adopted} adopted out of ${summary.eligible} eligible).`,
          richContent: {
            type: 'data-card',
            data: {
              value: summary.adoption_rate_percent,
              label: `${displayName} Adoption`,
              detail: `${summary.adopted}/${summary.eligible} employees`,
            },
          },
        }
      }

      // "How many employees at [company]?" -> total enrolled at company
      if ((lowerQuery.includes('how many') || lowerQuery.includes('number of')) && (lowerQuery.includes('employee') || lowerQuery.includes('user') || lowerQuery.includes('people'))) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        const total = employeeStats?.totalEmployees ?? summary.adopted
        const expandList = employeeStats?.employees?.length ? {
          type: 'table',
          title: `Employees at ${displayName}`,
          data: {
            headers: ['Name', 'Company'],
            rows: employeeStats.employees.map(e => [e.full_name, e.company || '—']),
            employeeNames: employeeStats.employees.map(e => e.full_name),
          },
        } : null
        return {
          text: `**${displayName}** has **${total}** enrolled employees (from Employee Summary; Client Summary shows ${summary.adopted} adopted, ${summary.active} active).`,
          richContent: {
            type: 'data-card',
            data: {
              value: total.toString(),
              label: `Employees at ${displayName}`,
              detail: `${summary.active} active`,
            },
            ...(expandList && { expandList }),
          },
        }
      }

      // "Employees at [company]" / "Employees of [company]" (no "list"/"how many") -> full list with sidebar
      if ((lowerQuery.includes('employee') || lowerQuery.includes('staff') || lowerQuery.includes('people') || lowerQuery.includes('user')) && !lowerQuery.includes('how many') && !lowerQuery.includes('number of')) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        if (employeeStats?.employees?.length) {
          const list = employeeStats.employees.slice(0, 25).map(e =>
            `• **${e.full_name}**${e.paused ? ' (Paused)' : ' (Active)'}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Employees at ${displayName}`,
            data: {
              headers: ['Name', 'Company'],
              rows: employeeStats.employees.map(e => [e.full_name, e.company || '—']),
              employeeNames: employeeStats.employees.map(e => e.full_name),
            },
          }
          return {
            text: `**${employeeStats.totalEmployees} employees at ${displayName}:**\n\n${list}${employeeStats.totalEmployees > 25 ? `\n\n_...and ${employeeStats.totalEmployees - 25} more. View the full list →_` : ''}`,
            richContent: {
              type: 'data-card',
              data: { value: employeeStats.totalEmployees.toString(), label: `Employees at ${displayName}` },
              expandList,
            },
          }
        }
      }

      // List of employee names -> need enrolled employees filtered by company
      if (lowerQuery.includes('name') || lowerQuery.includes('give me') || lowerQuery.includes('list')) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        if (employeeStats && employeeStats.employees && employeeStats.employees.length > 0) {
          const employees = employeeStats.employees.slice(0, 25)
          const list = employees.map(e =>
            `• **${e.full_name}**${e.paused ? ' (Paused)' : ' (Active)'}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Enrolled Employees at ${displayName}`,
            data: {
              headers: ['Name', 'Company'],
              rows: employeeStats.employees.map(e => [e.full_name, e.company || '—']),
              employeeNames: employeeStats.employees.map(e => e.full_name),
            },
          }
          return {
            text: `**Enrolled employees at ${displayName}** (${employeeStats.totalEmployees} total; Client Summary has ${summary.adopted} adopted):\n\n${list}${employeeStats.totalEmployees > 25 ? `\n\n_...and ${employeeStats.totalEmployees - 25} more. View the full list →_` : ''}`,
            richContent: {
              type: 'data-card',
              data: {
                value: employeeStats.totalEmployees.toString(),
                label: `Employees at ${displayName}`,
              },
              expandList,
            },
          }
        }
        return {
          text: `**${displayName}** (from Client Summary: **${summary.adopted}** adopted, **${summary.active}** active). No enrolled-employee list available for this company.`,
          richContent: {
            type: 'data-card',
            data: {
              value: summary.adopted.toString(),
              label: `Adopted at ${displayName}`,
              detail: `${summary.active} active`,
            },
          },
        }
      }

      // Savings at company -> use employee-level data (not in Client Summary)
      if (lowerQuery.includes('sav') || lowerQuery.includes('save')) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        if (employeeStats && employeeStats.employees && employeeStats.employees.length > 0) {
          const employeesWithSaveAccount = employeeStats.employees
            .filter(e => e.has_savings_acct || e.save_balance > 0)
            .sort((a, b) => b.save_balance - a.save_balance)
          const topSavers = employeesWithSaveAccount.slice(0, 5)
          let topSaversList = topSavers.length > 0
            ? '\n\n**Top Savers:**\n' + topSavers.map((e, i) => `${i + 1}. ${e.full_name}: $${e.save_balance.toFixed(2)}`).join('\n')
            : ''
          const expandList = employeesWithSaveAccount.length > 0 ? {
            type: 'table',
            title: `Savings at ${displayName}`,
            data: {
              headers: ['Name', 'Save Balance', 'Company'],
              rows: employeesWithSaveAccount.map(e => [e.full_name, `$${e.save_balance.toFixed(2)}`, e.company || '—']),
              employeeNames: employeesWithSaveAccount.map(e => e.full_name),
            },
            amountColumnIndex: 1,
            totalLabel: 'Total saved',
          } : null
          return {
            text: `**Savings at ${displayName}:**\n\n• Open save accounts: **${employeeStats.employeesWithSavingsAccounts}**\n• Accounts with balance: **${employeeStats.employeesWithSavingsBalance}**\n• Total saved: **$${employeeStats.totalSavingsBalance.toFixed(2)}**${topSaversList}`,
            richContent: {
              type: 'data-card',
              data: {
                value: employeeStats.employeesWithSavingsAccounts.toString(),
                label: `Save Accounts at ${displayName}`,
                detail: `${employeeStats.employeesWithSavingsAccounts} accounts · $${employeeStats.totalSavingsBalance.toFixed(2)} total`,
              },
              ...(expandList && { expandList }),
            },
          }
        }
        return {
          text: `**Savings at ${displayName}:** No enrolled employee data available. Client Summary shows **${summary.adopted}** adopted, **${summary.active}** active.`,
          richContent: { type: 'data-card', data: { value: '0', label: `Save Accounts at ${displayName}` } },
        }
      }

      // Outstanding balance at company -> use employee-level data
      if (lowerQuery.includes('outstanding') || lowerQuery.includes('owe')) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        if (employeeStats && employeeStats.employees && employeeStats.employees.length > 0) {
          const employeesWithBalance = employeeStats.employees.filter(e => e.outstanding_balance > 0)
          const topBalances = employeesWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance).slice(0, 5)
          const balanceList = topBalances.length > 0
            ? '\n\n**Top Balances:**\n' + topBalances.map((e, i) => `${i + 1}. ${e.full_name}: $${e.outstanding_balance.toFixed(2)}`).join('\n')
            : ''
          const expandList = {
            type: 'table',
            title: `Outstanding at ${displayName}`,
            data: {
              headers: ['Name', 'Outstanding Balance', 'Company'],
              rows: employeesWithBalance.sort((a, b) => b.outstanding_balance - a.outstanding_balance).map(e => [e.full_name, `$${e.outstanding_balance.toFixed(2)}`, e.company || '—']),
              employeeNames: employeesWithBalance.map(e => e.full_name),
            },
            amountColumnIndex: 1,
            totalLabel: 'Total outstanding',
          }
          return {
            text: `**Outstanding Balances at ${displayName}:**\n\n• Employees with balance: **${employeeStats.employeesWithOutstandingBalance}**\n• Total outstanding: **$${employeeStats.totalOutstandingBalance.toFixed(2)}**${balanceList}`,
            richContent: {
              type: 'data-card',
              data: {
                value: `$${employeeStats.totalOutstandingBalance.toFixed(2)}`,
                label: `Outstanding at ${displayName}`,
                detail: `${employeeStats.employeesWithOutstandingBalance} employees`,
              },
              expandList,
            },
          }
        }
        return {
          text: `**Outstanding at ${displayName}:** No enrolled employee balance data. Client Summary: **${summary.adopted}** adopted, **${summary.active}** active.`,
          richContent: { type: 'data-card', data: { value: '$0', label: `Outstanding at ${displayName}` } },
        }
      }

      // Default: company stats from Client Summary + admin line from A3
      const admins = await pennyDataService.getAdminsByCompany(cleanCompanyName)
      const employeeStatsSummary = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
      const outstandingBalanceTotalSummary = employeeStatsSummary ? employeeStatsSummary.totalOutstandingBalance : 0
      const employeesWithBalanceSummary = employeeStatsSummary ? (employeeStatsSummary.employees || []).filter(e => (e.outstanding_balance || 0) > 0) : []
      const outstandingBalanceExpandListSummary = {
        type: 'table',
        title: `Outstanding at ${displayName}`,
        data: {
          headers: ['Name', 'Outstanding Balance', 'Company'],
          rows: employeesWithBalanceSummary.sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0)).map(e => [e.full_name, `$${(e.outstanding_balance || 0).toFixed(2)}`, e.company || '—']),
          employeeNames: employeesWithBalanceSummary.map(e => e.full_name),
          rawEmployees: employeesWithBalanceSummary,
        },
        amountColumnIndex: 1,
        totalLabel: 'Total outstanding',
      }
      const activeEmployeesSummary = employeeStatsSummary ? (employeeStatsSummary.employees || []).filter(e => !e.paused) : []
      const activeUsersExpandListSummary = {
        type: 'table',
        title: `Active Users at ${displayName}`,
        data: {
          headers: ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'],
          rows: activeEmployeesSummary.map(e => [e.full_name, e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']),
          employeeNames: activeEmployeesSummary.map(e => e.full_name),
          rawEmployees: activeEmployeesSummary,
        },
      }
      const adoptedEmployeesSummary = employeeStatsSummary?.employees || []
      const adoptedExpandListSummary = adoptedEmployeesSummary.length > 0 ? {
        type: 'table',
        title: `Adopted at ${displayName}`,
        data: {
          headers: ['Name', 'Status', 'Transfers (90d)', 'Company'],
          rows: adoptedEmployeesSummary.map(e => [e.full_name, e.current_state || '—', (e.transfers_90d || 0).toLocaleString(), e.company || '—']),
          employeeNames: adoptedEmployeesSummary.map(e => e.full_name),
          rawEmployees: adoptedEmployeesSummary,
        },
      } : null
      // Paused employees expand list
      const pausedEmployeesSummary = (employeeStatsSummary?.employees || []).filter(e => e.paused === true)
      const pausedExpandListSummary = pausedEmployeesSummary.length > 0 ? {
        type: 'table',
        title: `Paused employees at ${displayName}`,
        data: {
          headers: ['Name', 'Company', 'Pause Reason', 'Status'],
          rows: pausedEmployeesSummary.map(e => [e.full_name || '—', e.company || '—', e.pause_reason || '—', 'Paused']),
          employeeNames: pausedEmployeesSummary.map(e => e.full_name),
          rawEmployees: pausedEmployeesSummary,
        },
      } : null
      const pausedCountSummary = pausedEmployeesSummary.length
      const eligibleExpandListSummary = adoptedEmployeesSummary.length > 0 ? {
        type: 'table',
        title: `Employees at ${displayName}`,
        data: {
          headers: ['Name', 'Status', 'Pay Type', 'Company'],
          rows: adoptedEmployeesSummary.map(e => [e.full_name, e.current_state || '—', e.salary_or_hourly || '—', e.company || '—']),
          employeeNames: adoptedEmployeesSummary.map(e => e.full_name),
          rawEmployees: adoptedEmployeesSummary,
        },
      } : null
      const partnershipNameSummary = (summary.partnership != null && String(summary.partnership).trim()) ? String(summary.partnership).trim() : null
      let partnershipExpandListSummary = null
      if (partnershipNameSummary) {
        const companiesInPartnershipSummary = await pennyDataService.getCompaniesByPartnership(partnershipNameSummary)
        if (companiesInPartnershipSummary.length > 0) {
          partnershipExpandListSummary = {
            type: 'table',
            title: `Companies in ${partnershipNameSummary}`,
            data: {
              headers: ['Company', 'Partnership'],
              rows: companiesInPartnershipSummary.map(c => [c.company || '—', c.partnership || '—']),
            },
          }
        }
      }
      // CSM expand list
      const csmNameSummary = (summary.csm_owner || '').trim()
      let csmExpandListSummary = null
      if (csmNameSummary) {
        const csmComps = await pennyDataService.getCompaniesByCsmOwner(csmNameSummary)
        if (csmComps.length > 0) {
          csmExpandListSummary = { type: 'table', title: `Accounts managed by ${csmNameSummary} (CSM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: csmComps.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]) } }
        }
      }
      // DM expand list
      const dmNameSummary = (summary.delivery_manager || '').trim()
      let dmExpandListSummary = null
      if (dmNameSummary) {
        const dmComps = await pennyDataService.getCompaniesByDeliveryManager(dmNameSummary)
        if (dmComps.length > 0) {
          dmExpandListSummary = { type: 'table', title: `Accounts launched by ${dmNameSummary} (DM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: dmComps.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]) } }
        }
      }
      return {
        text: `Here's an overview of **${displayName}** — adoption is at **${summary.adoption_rate_percent}** with **${summary.adopted}** enrolled out of **${summary.eligible}** eligible employees.`,
        richContent: {
          type: 'company-stats-card',
          data: {
            ...summary,
            company: displayName,
            admins,
            outstandingBalanceTotal: outstandingBalanceTotalSummary,
            outstandingBalanceExpandList: outstandingBalanceExpandListSummary,
            activeUsersExpandList: activeUsersExpandListSummary,
            ...(partnershipExpandListSummary && { partnershipExpandList: partnershipExpandListSummary }),
            ...(adoptedExpandListSummary && { adoptedExpandList: adoptedExpandListSummary }),
            ...(eligibleExpandListSummary && { eligibleExpandList: eligibleExpandListSummary }),
            ...(csmExpandListSummary && { csmExpandList: csmExpandListSummary }),
            ...(dmExpandListSummary && { dmExpandList: dmExpandListSummary }),
            ...(pausedExpandListSummary && { pausedExpandList: pausedExpandListSummary }),
            pausedCount: pausedCountSummary,
          },
        },
        suggestions: [
          `Active users at ${displayName}`,
          `Savings at ${displayName}`,
          `Outstanding balance at ${displayName}`,
          `Admin email for ${displayName}`,
          `Employees of ${displayName}`,
          `Enrolled Employees of ${displayName}`,
        ],
      }
    },
  },

  // ============================================
  // CSM / DELIVERY MANAGER QUERIES (must run before employee info handlers)
  // ============================================
  {
    patterns: [
      /who\s+does\s+.+\s+manage/i,
      /(?:csm|csm\s+owner)\s+.+/i,
      /(?:delivery\s*manager|dm)\s+[A-Z]/i,
      /.+(?:'s)\s+accounts?/i,
      /accounts?\s+(?:managed|run|handled|owned)\s+by\s+.+/i,
      /managed\s+by\s+.+/i,
      /who\s+(?:launched|set\s+up|onboarded)\s+.+/i,
    ],
    handler: async (query) => {
      // "who launched [company]" / "who set up [company]" / "who onboarded [company]"
      const launchMatch = query.match(/who\s+(?:launched|set\s+up|onboarded)\s+(.+?)(?:\s*\?|$)/i)
      if (launchMatch) {
        const companyName = launchMatch[1].trim().replace(/[?.!]+$/, '').trim()
        if (companyName.length >= 2) {
          const stats = await pennyDataService.getCompanyStats(companyName)
          if (stats) {
            updateCompanyContext(stats.company)
            const dm = (stats.delivery_manager || '').trim()
            const csm = (stats.csm_owner || '').trim()
            const launchDate = stats.launch_date && String(stats.launch_date).trim() ? (() => {
              const dt = new Date(stats.launch_date)
              return Number.isNaN(dt.getTime()) ? stats.launch_date : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            })() : null
            let text = `**${stats.company}** was`
            if (dm) text += ` launched by **${dm}** (Delivery Manager)`
            if (csm) text += `${dm ? ' and' : ''} managed by **${csm}** (CSM)`
            if (!dm && !csm) text += ` launched (no DM/CSM recorded)`
            if (launchDate) text += ` on **${launchDate}**`
            text += '.'

            // Build full card data (same as "tell me about" handler)
            const admins = await pennyDataService.getAdminsByCompany(stats.company)
            const employeeStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
            const outstandingBalanceTotal = employeeStats ? employeeStats.totalOutstandingBalance : 0
            const employeesWithBalance = employeeStats ? (employeeStats.employees || []).filter(e => (e.outstanding_balance || 0) > 0) : []
            const outstandingBalanceExpandList = {
              type: 'table', title: `Outstanding at ${stats.company}`,
              data: { headers: ['Name', 'Outstanding Balance', 'Company'], rows: employeesWithBalance.sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0)).map(e => [e.full_name, `$${(e.outstanding_balance || 0).toFixed(2)}`, e.company || '—']), employeeNames: employeesWithBalance.map(e => e.full_name), rawEmployees: employeesWithBalance },
              amountColumnIndex: 1, totalLabel: 'Total outstanding',
            }
            const activeEmployees = employeeStats ? (employeeStats.employees || []).filter(e => !e.paused) : []
            const activeUsersExpandList = { type: 'table', title: `Active Users at ${stats.company}`, data: { headers: ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company'], rows: activeEmployees.map(e => [e.full_name, e.current_state || 'Active', (e.transfers_90d || 0).toLocaleString(), `$${(e.volume_90d_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, e.company || '—']), employeeNames: activeEmployees.map(e => e.full_name), rawEmployees: activeEmployees } }
            const adoptedEmployees = employeeStats?.employees || []
            const adoptedExpandList = adoptedEmployees.length > 0 ? { type: 'table', title: `Adopted at ${stats.company}`, data: { headers: ['Name', 'Status', 'Transfers (90d)', 'Company'], rows: adoptedEmployees.map(e => [e.full_name, e.current_state || '—', (e.transfers_90d || 0).toLocaleString(), e.company || '—']), employeeNames: adoptedEmployees.map(e => e.full_name), rawEmployees: adoptedEmployees } } : null
            const eligibleExpandList = adoptedEmployees.length > 0 ? { type: 'table', title: `Employees at ${stats.company}`, data: { headers: ['Name', 'Status', 'Pay Type', 'Company'], rows: adoptedEmployees.map(e => [e.full_name, e.current_state || '—', e.salary_or_hourly || '—', e.company || '—']), employeeNames: adoptedEmployees.map(e => e.full_name), rawEmployees: adoptedEmployees } } : null
            const partnershipName = (stats.partnership != null && String(stats.partnership).trim()) ? String(stats.partnership).trim() : null
            let partnershipExpandList = null
            if (partnershipName) {
              const companiesInPartnership = await pennyDataService.getCompaniesByPartnership(partnershipName)
              if (companiesInPartnership.length > 0) {
                partnershipExpandList = { type: 'table', title: `Companies in ${partnershipName}`, data: { headers: ['Company', 'Partnership'], rows: companiesInPartnership.map(c => [c.company || '—', c.partnership || '—']) } }
              }
            }
            // CSM expand list
            let csmExpandList = null
            if (csm) {
              const csmCompanies = await pennyDataService.getCompaniesByCsmOwner(csm)
              if (csmCompanies.length > 0) {
                csmExpandList = { type: 'table', title: `Accounts managed by ${csm} (CSM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: csmCompanies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]) } }
              }
            }
            // DM expand list
            let dmExpandList = null
            if (dm) {
              const dmCompanies = await pennyDataService.getCompaniesByDeliveryManager(dm)
              if (dmCompanies.length > 0) {
                dmExpandList = { type: 'table', title: `Accounts launched by ${dm} (DM)`, data: { headers: ['Company', 'Partnership', 'Adoption'], rows: dmCompanies.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]) } }
              }
            }

            return {
              text,
              richContent: {
                type: 'company-stats-card',
                data: {
                  ...stats,
                  admins,
                  outstandingBalanceTotal,
                  outstandingBalanceExpandList,
                  activeUsersExpandList,
                  ...(partnershipExpandList && { partnershipExpandList }),
                  ...(adoptedExpandList && { adoptedExpandList }),
                  ...(eligibleExpandList && { eligibleExpandList }),
                  ...(csmExpandList && { csmExpandList }),
                  ...(dmExpandList && { dmExpandList }),
                  ...(await enrichWithPausedCount(stats)),
                },
              },
              suggestions: [
                dm ? `Who does ${dm} manage?` : null,
                csm ? `Accounts managed by ${csm}` : null,
                `Tell me about ${stats.company}`,
              ].filter(Boolean),
            }
          }
        }
      }
      return await handleCsmDmQuery(query)
    },
  },

  // ============================================
  // SAVINGS QUERIES (must run before EMPLOYEE INFO so "savings stats" isn't treated as a name)
  // ============================================
  {
    patterns: [
      /(?:show|get|what are|tell me about).*sav(?:ings?|e)/i,
      /sav(?:ings?|e).*(?:stats|statistics|balance|account)/i,
      /(?:how much|total).*saved/i,
      /(?:who|which|list).*(?:has|have).*sav(?:ings?|e)/i,
      /top savers/i,
      /(?:show\s+)?savings?\s+stats/i,
      /total\s+saved(?:\s+per\s+employee)?/i,
      /total\s+saved\s+per\s+company/i,
      /average\s+saved\s+per\s+employee(?:\s+per\s+company)?/i,
      /(?:avg|average)\s+(?:saved\s+)?per\s+employee/i,
      /sav(?:ings?|e)\s+(?:stats|summary|overview)/i,
    ],
    handler: async (query) => {
      return await handleSavingsQuery(query)
    },
  },

  // ============================================
  // OUTSTANDING BALANCE QUERIES
  // ============================================
  {
    patterns: [
      /(?:show|list|get)\s+(?:all\s+)?outstanding\s+balances?/i,
      /(?:what(?:'s| is)|how much is|show me|tell me about|get|check)?\s*(?:the\s+)?(?:total\s+)?outstanding\s+balances?/i,
      /outstanding\s+balances?/i,
      /how much.*(?:outstanding|owed|unpaid|due)/i,
      /(?:who|which employees?).*(?:owe|owes|has|have).*(?:balance|money|debt)/i,
      /(?:employees?|people|staff).*(?:with|who have).*(?:outstanding|unpaid)/i,
      /(?:list|show|get).*(?:all\s+)?outstanding/i,
      /(?:breakdown|list).*(?:outstanding|balance)/i,
      /(?:outstanding|balance).*(?:breakdown|list)/i,
    ],
    handler: async (query) => {
      return await handleOutstandingBalanceQuery(query)
    },
  },

  // ============================================
  // SPECIFIC EMPLOYEE OUTSTANDING BALANCE
  // ============================================
  {
    patterns: [
      /how much (?:does|did) (.+?) owe/i,
      /(?:what(?:'s| is))? (.+?)(?:'s)? (?:outstanding )?balance/i,
      /does (.+?) have (?:an? )?(?:outstanding )?balance/i,
    ],
    handler: async (query, matches) => {
      const q = query.toLowerCase()
      if (q.includes('breakdown') || q.includes('list') || (q.includes('by employee') && q.includes('outstanding'))) return null
      const rawName = matches[1]?.trim() || extractEmployeeName(query)
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'this', 'outstanding', 'current', 'show']
      if (skipWords.includes(name.toLowerCase())) return null

      return await handleOutstandingBalanceQuery(query, name)
    },
  },

  // ============================================
  // PARTNERSHIP / CLIENT CHECK ("Is X a Harri Pay client?")
  // ============================================
  {
    patterns: [
      /is\s+(.+?)\s+(?:a|an)\s+(.+?)\s+(?:client|company|partner|customer)\s*\??/i,
      /is\s+(.+?)\s+(?:on|in|part of|under)\s+(.+?)\s*\??/i,
      /(?:does|do)\s+(.+?)\s+(?:use|have|belong to)\s+(.+?)\s*\??/i,
      /(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(?:partnership|partner|model|pricing\s*model|product\s*type)\s*\??/i,
      /(?:which|what)\s+(?:partnership|partner)\s+(?:is|does)\s+(.+?)(?:\s+(?:under|in|part of|belong to))?\s*\??/i,
    ],
    handler: async (query, matches) => {
      const lowerQuery = query.toLowerCase()

      // Bail out if the query is about employee attributes (savings, balance, enrolled, etc.)
      if (/\b(?:savings?|save|balance|outstanding|enrolled|paused|active|status|email|paytype|pay\s*group|start\s*date|transfers?)\b/i.test(lowerQuery)) return null

      // "what is X's partnership" / "which partnership is X" / "what is X's product type" patterns (group 1 only, no group 2)
      if (/(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(?:partnership|partner|model|pricing\s*model|product\s*type)/i.test(query) ||
          /(?:which|what)\s+(?:partnership|partner)\s+(?:is|does)\s+(.+)/i.test(query)) {
        const m = query.match(/(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(?:partnership|partner|model|pricing\s*model|product\s*type)/i) ||
                  query.match(/(?:which|what)\s+(?:partnership|partner)\s+(?:is|does)\s+(.+?)(?:\s+(?:under|in|part of|belong to))?\s*\??/i)
        if (m) {
          const companyName = m[1].trim().replace(/[?.!,]+$/, '').trim()
          const stats = await pennyDataService.getCompanyStats(companyName)
          if (stats) {
            updateCompanyContext(stats.company)
            const partnership = (stats.partnership || '').trim() || 'Not specified'
            const pt = (stats.product_type || '').trim()
            let text = `**${stats.company}** is a **${partnership}** company.`
            if (pt) text += ` Product type: **${pt}**.`
            return {
              text,
              richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
              suggestions: [`Tell me about ${stats.company}`, `Active users at ${stats.company}`],
            }
          }
        }
      }

      // "Is X a Y client?" patterns
      const rawCompany = (matches[1] || '').trim().replace(/[?.!,]+$/, '').trim()
      const rawPartnership = (matches[2] || '').trim().replace(/[?.!,]+$/, '').trim()
      if (!rawCompany || rawCompany.length < 2) return null

      const stats = await pennyDataService.getCompanyStats(rawCompany)
      if (!stats) {
        return await buildNotFoundWithSuggestions(rawCompany, query)
      }

      updateCompanyContext(stats.company)
      const actualPartnership = (stats.partnership || '').trim()
      if (rawPartnership) {
        const checkLower = rawPartnership.toLowerCase()
        const partnerLower = actualPartnership.toLowerCase()
        const isMatch = partnerLower.includes(checkLower) || checkLower.includes(partnerLower)

        if (isMatch) {
          return {
            text: `**Yes**, **${stats.company}** is a **${actualPartnership}** company.`,
            richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
            suggestions: [`Tell me about ${stats.company}`, `Active users at ${stats.company}`, `Transfers at ${stats.company}`],
          }
        } else {
          return {
            text: `**No**, **${stats.company}** is not a ${rawPartnership} client. ${stats.company} is a **${actualPartnership || 'unknown partnership'}** company.`,
            richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
            suggestions: [`Tell me about ${stats.company}`, `Active users at ${stats.company}`, `Transfers at ${stats.company}`],
          }
        }
      }

      // Fallback: just show the partnership
      return {
        text: `**${stats.company}** is a **${actualPartnership || 'unknown partnership'}** company.`,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [`Tell me about ${stats.company}`, `Active users at ${stats.company}`],
      }
    },
  },

  // ============================================
  // EMPLOYEE ATTRIBUTE QUERIES (email, paytype, paygroup, start date, employer, transfers)
  // ============================================
  {
    patterns: [
      // "What is X's email/paytype/paygroup/start date?"
      /(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(email|work\s*email|pay\s*type|pay\s*group|start\s*date|employer\s*start\s*date)\s*\??/i,
      // "Show X's email" / "Get X's paytype"
      /(?:show|get|find)\s+(.+?)(?:'s)?\s+(email|work\s*email|pay\s*type|pay\s*group|start\s*date)\s*\??/i,
      // "X's email" / "X's paytype" / "X's start date" / "X's company" / "X's employer"
      /^(.+?)(?:'s)\s+(email|work\s*email|pay\s*type|pay\s*group|start\s*date|company|employer)\s*\??$/i,
      // Shorthand: "X email" / "X paytype" / "X start date" / "X employer" (no possessive)
      /^(.+?)\s+(email|work\s*email|pay\s*type|pay\s*group|start\s*date|employer)\s*\??$/i,
      // Reversed: "email X" / "start date X" / "paytype X" / "employer X"
      /^(email|work\s*email|pay\s*type|pay\s*group|start\s*date|employer)\s+(.+?)\s*\??$/i,
      // "Who does X work for?"
      /who\s+does\s+(.+?)\s+work\s+for\s*\??/i,
      // "Where does X work?"
      /where\s+does\s+(.+?)\s+work\s*\??/i,
      // "When did X start?" / "When did X enroll?" / "When did X join?"
      /when\s+did\s+(.+?)\s+(?:start|begin|enroll|join|get\s+hired)\s*\??/i,
      // "Is X salary or hourly?" / "Is X salaried?" / "Is X hourly?"
      /is\s+(.+?)\s+(?:salary|hourly|salaried|salary\s+or\s+hourly)\s*\??/i,
      // "Is X paused?" / "Is X terminated?" / "Is X active?" / "Is X enrolled?"
      /is\s+(.+?)\s+(?:paused|terminated|active|enrolled|disabled)\s*\??/i,
      // "How much did/has X transferred/streamed?"
      /how\s+much\s+(?:has|did|does)\s+(.+?)\s+(?:transfer(?:red)?|stream(?:ed)?)\s*\??/i,
      // "What is X's save/savings balance?" / "X's outstanding balance"
      /(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(save\s*balance|savings?\s*balance|outstanding\s*balance)\s*\??/i,
      // "How many transfers has X taken/made?"
      /how\s+many\s+transfers?\s+(?:has|did|does)\s+(.+?)\s+(?:taken|made|have|do|done)\s*\??/i,
      // "transfers has X taken/made?" (without "how many")
      /transfers?\s+(?:has|did|does)\s+(.+?)\s+(?:taken|made|have|do|done)\s*\??/i,
      // "X's transfers" / "Show transfers for X"
      /(.+?)(?:'s)?\s+transfers?\s*\??$/i,
      /(?:show|get)\s+transfers?\s+(?:for|of)\s+(.+?)\s*\??/i,
    ],
    handler: async (query, matches) => {
      const lowerQuery = query.toLowerCase()

      // Skip aggregate transfer/stat phrases — let the transfer handler deal with them
      if (/^(?:average|avg|total|30\s+day|90\s+day|overall|all[- ]?time)\s+transfers?\s*\??$/i.test(query.trim())) return null
      // Skip if this looks like a company transfer query (has "at" or "from" suggesting company context)
      if (/transfers?\s+(?:at|from|for|of|in)\s+/i.test(query) && !matches[0].match(/(.+?)(?:'s)?\s+transfers/i)) return null
      // Skip aggregate phrases
      if (lowerQuery.includes('total') && lowerQuery.includes('transfer') && !extractEmployeeName(query)) return null

      // Figure out which capture group has the name
      let rawName = null
      let field = null

      // Reversed patterns: "start date X" / "email X" / "paytype X" / "employer X"
      const reversedMatch = query.match(/^(email|work\s*email|pay\s*type|pay\s*group|start\s*date|employer)\s+(.+?)\s*\??$/i)
      if (reversedMatch) {
        field = reversedMatch[1].toLowerCase().replace(/\s+/g, '')
        rawName = reversedMatch[2]
        if (field === 'employer') field = 'company'
      }
      // "who does X work for?" / "where does X work?"
      else if (/who\s+does\s+(.+?)\s+work\s+for/i.test(query)) {
        const m = query.match(/who\s+does\s+(.+?)\s+work\s+for/i)
        rawName = m?.[1]
        field = 'company'
      } else if (/where\s+does\s+(.+?)\s+work/i.test(query)) {
        const m = query.match(/where\s+does\s+(.+?)\s+work/i)
        rawName = m?.[1]
        field = 'company'
      // "When did X start/enroll/join?"
      } else if (/when\s+did\s+(.+?)\s+(?:start|begin|enroll|join|get\s+hired)/i.test(query)) {
        const m = query.match(/when\s+did\s+(.+?)\s+(?:start|begin|enroll|join|get\s+hired)/i)
        rawName = m?.[1]
        field = 'startdate'
      // "Is X salary or hourly?" / "Is X salaried?" / "Is X hourly?"
      } else if (/is\s+(.+?)\s+(?:salary|hourly|salaried|salary\s+or\s+hourly)/i.test(query)) {
        const m = query.match(/is\s+(.+?)\s+(?:salary|hourly|salaried|salary\s+or\s+hourly)/i)
        rawName = m?.[1]
        field = 'paytype'
      // "Is X paused/terminated/active/enrolled/disabled?"
      } else if (/is\s+(.+?)\s+(?:paused|terminated|active|enrolled|disabled)/i.test(query)) {
        const m = query.match(/is\s+(.+?)\s+(?:paused|terminated|active|enrolled|disabled)/i)
        rawName = m?.[1]
        field = 'status'
      // "How much has X transferred/streamed?"
      } else if (/how\s+much\s+(?:has|did|does)\s+(.+?)\s+(?:transfer|stream)/i.test(query)) {
        const m = query.match(/how\s+much\s+(?:has|did|does)\s+(.+?)\s+(?:transfer|stream)/i)
        rawName = m?.[1]
        field = 'transfers'
      // "What is X's save/savings/outstanding balance?"
      } else if (/(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(?:save|savings?|outstanding)\s*balance/i.test(query)) {
        const m = query.match(/(?:what(?:'s| is))\s+(.+?)(?:'s)?\s+(?:save|savings?|outstanding)\s*balance/i)
        rawName = m?.[1]
        field = lowerQuery.includes('outstanding') ? 'outstandingbalance' : 'savebalance'
      } else if (/(?:how\s+many\s+)?transfers?\s+(?:has|did|does)\s+(.+?)\s+(?:taken|made|have|do|done)/i.test(query)) {
        const m = query.match(/(?:how\s+many\s+)?transfers?\s+(?:has|did|does)\s+(.+?)\s+(?:taken|made|have|do|done)/i)
        rawName = m?.[1]
        field = 'transfers'
      } else if (/(.+?)(?:'s)?\s+transfers?\s*\??$/i.test(query)) {
        const m = query.match(/(.+?)(?:'s)?\s+transfers?\s*\??$/i)
        rawName = m?.[1]
        field = 'transfers'
      } else if (/(?:show|get)\s+transfers?\s+(?:for|of)\s+(.+)/i.test(query)) {
        const m = query.match(/(?:show|get)\s+transfers?\s+(?:for|of)\s+(.+)/i)
        rawName = m?.[1]
        field = 'transfers'
      } else {
        rawName = matches[1]
        field = (matches[2] || '').toLowerCase().replace(/\s+/g, '')
        if (field === 'employer') field = 'company'
      }

      rawName = cleanEmployeeNameFromQuery(rawName)
      if (!rawName || rawName.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'this', 'outstanding', 'savings', 'show', 'many', 'been', 'average', 'avg', '30', '90']
      if (skipWords.includes(rawName.toLowerCase())) return null

      // If it's a company name and we're looking at transfers, let the transfer handler handle it
      const companyCheck = await pennyDataService.getCompanyByName(rawName)
      if (companyCheck && field === 'transfers') return null

      const employee = await pennyDataService.getEmployeeFullDetails(rawName)
      if (!employee) {
        return await buildNotFoundWithSuggestions(rawName, query)
      }

      await updateEmployeeContext(employee.full_name)
      const eName = employee.full_name

      // Field-specific responses
      if (field === 'email' || field === 'workemail') {
        return {
          text: `Work email is not available in the current data set for **${eName}**.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Tell me about ${employee.company}` : null].filter(Boolean),
        }
      }

      if (field === 'paytype') {
        const salaryOrHourly = employee.salary_or_hourly || null
        return {
          text: salaryOrHourly
            ? `**${eName}** is **${salaryOrHourly}**.`
            : `**${eName}** doesn't have salary/hourly info on file.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, `What is ${eName}'s pay group?`],
        }
      }

      if (field === 'paygroup') {
        const payGroup = employee.pay_group || null
        return {
          text: payGroup
            ? `**${eName}**'s pay group is **${payGroup}**.`
            : `**${eName}** doesn't have a pay group on file.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, `What is ${eName}'s pay type?`],
        }
      }

      if (field === 'startdate' || field === 'employerstartdate') {
        const startDate = employee.started_on || null
        const formatted = startDate ? (() => {
          const dt = new Date(startDate)
          return Number.isNaN(dt.getTime()) ? String(startDate) : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        })() : null
        return {
          text: formatted
            ? `**${eName}**'s start date is **${formatted}**.`
            : `**${eName}** doesn't have a start date on file.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Tell me about ${employee.company}` : null].filter(Boolean),
        }
      }

      if (field === 'company') {
        const company = employee.company || null
        return {
          text: company
            ? `**${eName}** works for **${company}**.`
            : `**${eName}** doesn't have a company on file.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: company ? [`Tell me about ${company}`, `Employees of ${company}`, `Active users at ${company}`] : [`Tell me about ${eName}`],
        }
      }

      if (field === 'status') {
        const isTerminated = !!(employee.terminated_at)
        const isPaused = employee.paused === true
        const currentState = employee.current_state || ''
        const transfersOff = employee.transfers_disabled === true
        let statusLabel = isTerminated ? 'Terminated' : isPaused ? 'Paused' : (currentState || 'Active')
        let text = `**${eName}** is currently **${statusLabel}**.`
        if (isPaused && employee.pause_reason) text += ` Pause reason: ${employee.pause_reason}.`
        if (isTerminated && employee.terminated_at) {
          const dt = new Date(employee.terminated_at)
          const fmtTerm = Number.isNaN(dt.getTime()) ? String(employee.terminated_at) : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          text += ` Terminated on ${fmtTerm}.`
        }
        if (transfersOff) text += ` Transfers are **disabled**${employee.transfers_disabled_reason ? ` (${employee.transfers_disabled_reason})` : ''}.`
        return {
          text,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Tell me about ${employee.company}` : null, `When did ${eName} start?`].filter(Boolean),
        }
      }

      if (field === 'savebalance') {
        const fmtCur = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const saveBal = Number(employee.save_balance) || 0
        const hasSavings = employee.has_savings_acct === true || saveBal > 0
        return {
          text: hasSavings
            ? `**${eName}**'s savings balance is **${fmtCur(saveBal)}**.`
            : `**${eName}** does not have a savings account on file.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Savings at ${employee.company}` : null].filter(Boolean),
        }
      }

      if (field === 'outstandingbalance') {
        const fmtCur = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        const outBal = Number(employee.outstanding_balance) || 0
        return {
          text: outBal > 0
            ? `**${eName}**'s outstanding balance is **${fmtCur(outBal)}**.`
            : `**${eName}** has **no outstanding balance**.`,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Outstanding at ${employee.company}` : null].filter(Boolean),
        }
      }

      if (field === 'transfers') {
        const xfers90d = employee.transfers_90d != null ? Number(employee.transfers_90d) : 0
        const vol90d = employee.volume_90d_usd != null ? Number(employee.volume_90d_usd) : 0
        const avgStream = (xfers90d > 0) ? (vol90d / xfers90d) : 0
        const xfers30d = employee.transfers_30d != null ? Number(employee.transfers_30d) : 0
        const vol30d = employee.volume_30d_usd != null ? Number(employee.volume_30d_usd) : 0

        const fmtCur = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        let text = `**${eName}** has made **${xfers90d.toLocaleString()} transfers in the last 90 days** totaling **${fmtCur(vol90d)}**.`
        if (xfers30d > 0) {
          text += `\n\nLast 30 days: **${xfers30d}** transfers (${fmtCur(vol30d)}).`
        }
        if (avgStream > 0) {
          text += `\nAverage transfer: **${fmtCur(avgStream)}**.`
        }

        return {
          text,
          richContent: { type: 'employee-card', data: employee },
          suggestions: [`Tell me about ${eName}`, employee.company ? `Transfers at ${employee.company}` : null, `What is ${eName}'s outstanding balance?`].filter(Boolean),
        }
      }

      // Fallback: show full employee card (card contains all details, keep text minimal)
      return {
        text: `Here's **${eName}**'s card:`,
        richContent: { type: 'employee-card', data: employee },
        suggestions: [
          `When did ${eName} start?`,
          `Is ${eName} salary or hourly?`,
          `${eName}'s transfers`,
          employee.company ? `Tell me about ${employee.company}` : null,
        ].filter(Boolean),
      }
    },
  },

  // ============================================
  // EMPLOYEE CODE LOOKUP (unique resolution from disambiguation)
  // ============================================
  {
    patterns: [
      /^employee\s+code\s+(.+?)\s*$/i,
      /^emp\s+code\s+(.+?)\s*$/i,
      /^code\s+(.+?)\s*$/i,
    ],
    handler: async (query, matches) => {
      const code = (matches[1] || '').trim()
      if (!code || code.length < 2) return null
      const employee = await pennyDataService.getEmployeeByCode(code)
      if (!employee) {
        return { text: `I couldn't find an employee with code "${code}".`, suggestions: ['Show all employees'] }
      }
      await updateEmployeeContext(employee.full_name)
      const eName = employee.full_name
      return {
        text: `Here's the card for **${eName}**.`,
        richContent: {
          type: 'employee-info-card',
          data: { ...employee },
        },
        suggestions: [
          employee.company ? `Tell me about ${employee.company}` : null,
          `${eName} transfers`,
          `${eName} balance`,
        ].filter(Boolean),
      }
    },
  },

  // EMPLOYEE INFO QUERIES
  // ============================================
  {
    patterns: [
      /(?:tell me about|info (?:on|about|for)|look up|find|search for|check on|get info on)\s+(.+)/i,
      /(?:who is|what about)\s+(.+)/i,
      /^about\s+(.+?)\s*\.?$/i,
      /^([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s*\??$/i,
    ],
    handler: async (query, matches) => {
      // Skip if query starts with "admin" — let the admin search handler below handle it
      if (/^admin\s+/i.test(query.trim())) return null

      const rawName = (matches[1]?.trim() || extractEmployeeName(query))
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'outstanding', 'savings', 'everyone', 'employees', 'savings stats', 'saving stats', 'save stats', 'sector', 'sector insights', 'sector comparison', 'sector breakdown', 'sector averages', 'sector benchmarks', 'sector rankings', 'partnership comparison', 'partnership averages', 'total transfers', '30 day transfers', 'average transfers', 'transfer stats', 'transfer statistics']
      const nameNorm = name.toLowerCase().replace(/\s+/g, ' ').trim()
      if (skipWords.includes(nameNorm)) return null
      // Don't treat "savings stats"-style phrases as employee names (e.g. "savings  stats", "saving stat")
      if (/saving/.test(nameNorm) && /stat/.test(nameNorm)) return null
      // Don't treat sector/partnership queries as employee names
      if (/^sector\b/i.test(nameNorm) || /^partnership\s+(comparison|averages?|breakdown)/i.test(nameNorm)) return null

      // If this is a company name, don't treat as employee — let company handler respond
      const company = await pennyDataService.getCompanyByName(name)
      if (company) return null

      // If this is a partnership name (e.g. "OSV"), route to company handler (Issue 2)
      const partnershipMatches = await pennyDataService.getCompaniesByPartnership(name)
      if (partnershipMatches.length > 0) return await handleCompanyQuery(query)

      // Check for duplicates - get ALL matching employees
      const allMatches = await pennyDataService.getEmployeesByName(name)

      if (allMatches.length === 0) {
        return await buildNotFoundWithSuggestions(name, query)
      }

      // If multiple employees with same name, show all of them
      if (allMatches.length > 1) {
        const shown = allMatches.slice(0, 25)
        let details = `**Found ${allMatches.length} employees named "${name}":**\n\n`
        shown.forEach((emp, i) => {
          details += `${i + 1}. **${emp.full_name}**`
          if (emp.company) details += ` — ${emp.company}`
          details += `\n`
          details += `   • Status: ${emp.paused ? 'Paused' : 'Active'}\n`
          if (emp.employee_id) details += `   • Employee ID: ${emp.employee_id}\n`
          if (emp.outstanding_balance > 0) details += `   • Outstanding: $${emp.outstanding_balance.toFixed(2)}\n`
          if (emp.save_balance > 0) details += `   • Savings: $${emp.save_balance.toFixed(2)}\n`
          details += '\n'
        })
        if (allMatches.length > 25) details += `\n_...and ${allMatches.length - 25} more. View the full list →_\n`
        details += `_Click a name or use employee code for exact lookup._`
        // Build suggestions using employee IDs for unique resolution
        const suggestions = shown.slice(0, 5).map(emp =>
          emp.employee_id ? `Employee code ${emp.employee_id}` : `Tell me about ${emp.full_name} at ${emp.company || 'unknown'}`
        )
        const expandList = {
          type: 'table',
          title: `Employees named "${name}"`,
          data: {
            headers: ['Name', 'Company', 'Status', 'Employee Code'],
            rows: allMatches.map(emp => [emp.full_name, emp.company || '—', emp.paused ? 'Paused' : 'Active', emp.employee_id || '—']),
            employeeNames: allMatches.map(emp => emp.full_name),
            rawEmployees: allMatches,
          },
        }
        return {
          text: details,
          suggestions,
          richContent: {
            type: 'data-card',
            data: {
              value: allMatches.length.toString(),
              label: 'Duplicate Names Found',
              detail: `${allMatches.length} employees named "${name}"`
            },
            expandList,
          },
        }
      }

      // Single match - show full details
      const employee = await pennyDataService.getEmployeeFullDetails(name)
      if (!employee) {
        return await buildNotFoundWithSuggestions(name, query)
      }

      await updateEmployeeContext(employee.full_name)

      // Show card only — no redundant detail text (card has everything)
      const eName = employee.full_name
      return {
        text: `Here's **${eName}**'s card:`,
        richContent: { type: 'employee-card', data: employee },
        suggestions: [
          `When did ${eName} start?`,
          `Is ${eName} salary or hourly?`,
          `${eName}'s transfers`,
          employee.company ? `Tell me about ${employee.company}` : null,
        ].filter(Boolean),
      }
    },
  },

  // ============================================
  // ADMIN SEARCH BY NAME — "admin NAME" searches admin emails containing NAME
  // ============================================
  {
    patterns: [
      /^admin\s+(.+)/i,
    ],
    handler: async (query, matches) => {
      const searchTerm = matches[1]?.trim().replace(/[?.!]+$/, '').trim()
      if (!searchTerm || searchTerm.length < 2) return null

      // Skip if this looks like "admin at [company]" or "admin email for [company]" (handled elsewhere)
      if (/\b(?:at|for|of|in|email)\b/i.test(searchTerm)) return null

      const results = await pennyDataService.searchAdminsByName(searchTerm)
      if (results.length === 0) {
        return {
          text: `No admin emails found matching "**${searchTerm}**".`,
          suggestions: ['Show company stats', 'List all companies'],
        }
      }
      const list = results.map(a => `• **${a.admin_email}** — ${a.company || 'Unknown company'}`).join('\n')
      const expandList = results.length > 3 ? {
        type: 'table',
        title: `Admins matching "${searchTerm}"`,
        data: {
          headers: ['Admin Email', 'Company'],
          rows: results.map(a => [a.admin_email, a.company || '—']),
        },
      } : null
      return {
        text: `Found **${results.length}** admin(s) matching "**${searchTerm}**":\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: results.length.toString(),
            label: `Admins matching "${searchTerm}"`,
            detail: `${results.length} result(s)`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: results.slice(0, 2).map(a => `Tell me about ${a.company}`).filter(Boolean),
      }
    },
  },

  // ============================================
  // ENROLLMENT STATUS QUERIES
  // ============================================
  {
    patterns: [
      /is (.+?) (?:enrolled|signed up|active|paused)/i,
      /(?:check|what(?:'s| is)) (.+?)(?:'s)? (?:enrollment )?status/i,
      /(.+?)(?:'s)? status/i,
    ],
    handler: async (query, matches) => {
      const rawName = matches[1]?.trim() || extractEmployeeName(query)
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'everyone', 'all', 'our', 'my', 'current', 'overall']
      if (skipWords.includes(name.toLowerCase())) return null

      // If this is a company name, don't treat as employee
      const company = await pennyDataService.getCompanyByName(name)
      if (company) return null

      // If this is a partnership name, let company handler respond (Issue 2)
      const partnershipMatches2 = await pennyDataService.getCompaniesByPartnership(name)
      if (partnershipMatches2.length > 0) return null

      // Check for duplicates
      const allMatches = await pennyDataService.getEmployeesByName(name)

      if (allMatches.length === 0) {
        return await buildNotFoundWithSuggestions(name, query)
      }

      // Helper: derive display status, emoji, and description from employee data
      // States: Eligible (not in data), Enrolled, Enrolling, Pending, Active (enrolled + active 30d), Paused, Disabled (not in data)
      function getEnrollmentDisplay(emp) {
        const rawState = (emp.current_state || '').trim().toUpperCase()
        if (emp.paused) {
          return { status: 'Paused', emoji: '⏸️', msg: 'is currently **Paused** — enrolled but unable to take transfers' }
        }
        switch (rawState) {
          case 'ACTIVE':
            return { status: 'Active', emoji: '✅', msg: 'is **Active** — enrolled and actively using the EWA program' }
          case 'ENROLLED':
            return { status: 'Enrolled', emoji: '✅', msg: 'is **Enrolled** in the EWA program' }
          case 'ENROLLING':
            return { status: 'Enrolling', emoji: '🔄', msg: 'is **Enrolling** — in the process of becoming enrolled' }
          case 'PENDING':
            return { status: 'Pending', emoji: '⏳', msg: 'is **Pending** — attempted to enroll but is stuck' }
          default:
            return { status: rawState || 'Enrolled', emoji: '✅', msg: `is **${rawState || 'Enrolled'}** in the EWA program` }
        }
      }

      // If multiple employees with same name, show all statuses
      if (allMatches.length > 1) {
        const shown = allMatches.slice(0, 25)
        let details = `**Found ${allMatches.length} employees named "${name}":**\n\n`
        shown.forEach((emp, i) => {
          const { status, emoji } = getEnrollmentDisplay(emp)
          details += `${emoji} ${i + 1}. **${emp.full_name}** - ${status}\n`
          if (emp.company) details += `   Company: ${emp.company}\n`
          if (emp.employee_id) details += `   ID: ${emp.employee_id}\n`
          details += '\n'
        })
        if (allMatches.length > 25) details += `\n_...and ${allMatches.length - 25} more. View the full list →_`
        const expandList = {
          type: 'table',
          title: `Enrollment status for "${name}"`,
          data: {
            headers: ['Name', 'Company', 'Status', 'Employee ID'],
            rows: allMatches.map(emp => {
              const { status } = getEnrollmentDisplay(emp)
              return [emp.full_name, emp.company || '—', status, emp.employee_id || '—']
            }),
            employeeNames: allMatches.map(emp => emp.full_name),
          },
        }
        return {
          text: details,
          richContent: {
            type: 'data-card',
            data: { value: allMatches.length.toString(), label: 'Duplicate Names Found', detail: `${allMatches.length} employees named "${name}"` },
            expandList,
          },
        }
      }

      const result = await pennyDataService.isEmployeeEnrolled(name)

      if (!result.found) {
        return await buildNotFoundWithSuggestions(name, query)
      }

      await updateEmployeeContext(result.employee.full_name)

      const { emoji: statusEmoji, msg: statusMsg } = getEnrollmentDisplay(result.employee)

      return {
        text: `${statusEmoji} **${result.employee.full_name}** ${statusMsg}.`,
        richContent: { type: 'employee-card', data: result.employee },
      }
    },
  },

  // ============================================
  // ACTIVE EMPLOYEES AT COMPANY
  // ============================================
  {
    patterns: [
      /(?:list|show|who are)\s+(?:the\s+)?active\s+(?:employees?|users?|people)\s+(?:at|for|from)\s+(.+)/i,
      /active\s+(?:employees?|users?)\s+(?:at|for|from)\s+(.+)/i,
    ],
    handler: async (query, matches) => {
      const companyName = (matches[1] || '').replace(/[?.!]+$/, '').trim()
      if (!companyName) return null
      const stats = await pennyDataService.getCompanyStats(companyName)
      if (!stats) return null

      const empStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
      const activeEmps = (empStats?.employees || []).filter(e => !e.paused)

      if (activeEmps.length === 0) {
        return { text: `There are no active employees at **${stats.company}**.` }
      }

      const headers = ['Name', 'Status', 'Transfers (90d)', 'Volume (90d)', 'Company']
      const rows = activeEmps.map(e => [
        e.full_name || '—', e.current_state || 'Active',
        (e.transfers_90d ?? 0).toLocaleString(),
        e.volume_90d_usd != null ? `$${Number(e.volume_90d_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        e.company || '—',
      ])

      return {
        text: `There are **${activeEmps.length} active employee${activeEmps.length === 1 ? '' : 's'}** at **${stats.company}**.`,
        richContent: {
          type: 'summary-with-list',
          summary: { type: 'data-card', data: { label: `Active Employees at ${stats.company}`, value: activeEmps.length.toString() } },
          list: { type: 'table', title: `Active Employees at ${stats.company}`, data: { headers, rows, employeeNames: activeEmps.map(e => e.full_name), rawEmployees: activeEmps } },
        },
        suggestions: [`Tell me about ${stats.company}`, `Paused employees at ${stats.company}`, `Employees at ${stats.company}`],
      }
    },
  },

  // ============================================
  // HOURLY / SALARY EMPLOYEE BREAKDOWN QUERIES
  // ============================================
  {
    patterns: [
      /(?:how many|number of|count of|total)\s+(?:hourly|salary|salaried)\s+(?:employees?|users?|workers?)(?:\s+(?:at|for|from)\s+(.+))?/i,
      /(?:list|show)\s+(?:hourly|salary|salaried)\s+(?:employees?|users?|workers?)(?:\s+(?:at|for|from)\s+(.+))?/i,
      /(?:hourly|salary|salaried)\s+(?:employees?|users?|workers?)\s+(?:at|for|from)\s+(.+)/i,
      /(?:hourly|salary)\s+(?:breakdown|split|distribution)(?:\s+(?:at|for|from)\s+(.+))?/i,
    ],
    handler: async (query, matches) => {
      const payTypeMatch = query.match(/\b(hourly|salary|salaried)\b/i)
      const requestedType = payTypeMatch ? payTypeMatch[1].toLowerCase().replace('salaried', 'salary') : null
      const companyName = (matches[1] || '').replace(/[?.!]+$/, '').trim() || null
      let companyAtMatch = null
      if (!companyName) {
        companyAtMatch = query.match(/(?:at|for|from)\s+(.+?)(?:\s*[?.!]*\s*)$/i)
      }
      const targetCompany = companyName || (companyAtMatch && companyAtMatch[1]?.replace(/[?.!]+$/, '').trim()) || null

      let employees = []
      let displayCompany = null
      if (targetCompany) {
        const stats = await pennyDataService.getCompanyStats(targetCompany)
        if (stats) {
          displayCompany = stats.company
          const empStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
          employees = empStats?.employees || []
        }
      }
      if (!displayCompany && targetCompany) return null // fall through if company not found

      if (!targetCompany) {
        // Global query — get all employees
        await pennyDataService.ensureInitialized()
        employees = pennyDataService.employeesCache || []
      }

      const hourly = employees.filter(e => (e.salary_or_hourly || '').toLowerCase() === 'hourly')
      const salary = employees.filter(e => (e.salary_or_hourly || '').toLowerCase() === 'salary')
      const unknown = employees.filter(e => !e.salary_or_hourly || !['hourly', 'salary'].includes((e.salary_or_hourly || '').toLowerCase()))

      // If requesting a specific type, show that list (pre-filtered to the OPPOSITE type first for smaller dataset)
      if (requestedType === 'hourly' || requestedType === 'salary') {
        const filtered = requestedType === 'hourly' ? hourly : salary
        const label = requestedType.charAt(0).toUpperCase() + requestedType.slice(1)
        const companyLabel = displayCompany ? ` at **${displayCompany}**` : ''

        if (filtered.length === 0) {
          return { text: `There are no ${requestedType} employees${companyLabel}.` }
        }

        // Show ALL employees with Pay Type column, pre-filtered to the requested type
        const allWithPayType = [...salary, ...hourly, ...unknown]
        const headers = ['Name', 'Company', 'Pay Type', 'Status', 'Transfers (90d)', 'Volume (90d)']
        const rows = allWithPayType.map(e => [
          e.full_name || '—', e.company || '—', e.salary_or_hourly || '—',
          e.current_state || (e.paused ? 'Paused' : 'Active'),
          (e.transfers_90d ?? 0).toLocaleString(), e.volume_90d_usd != null ? `$${Number(e.volume_90d_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
        ])

        // Pie chart data for hourly vs salary breakdown
        const total = hourly.length + salary.length + unknown.length
        const hourlyPct = total > 0 ? ((hourly.length / total) * 100).toFixed(1) : '0'
        const salaryPct = total > 0 ? ((salary.length / total) * 100).toFixed(1) : '0'

        return {
          text: `There are **${filtered.length} ${requestedType} employee${filtered.length === 1 ? '' : 's'}**${companyLabel}.\n\nBreakdown: **${hourly.length}** hourly (${hourlyPct}%), **${salary.length}** salary (${salaryPct}%)${unknown.length > 0 ? `, **${unknown.length}** unspecified` : ''}.`,
          richContent: {
            type: 'summary-with-list',
            summary: {
              type: 'pay-type-breakdown',
              data: {
                label: `Pay Type Breakdown${displayCompany ? ` at ${displayCompany}` : ''}`,
                hourly: hourly.length,
                salary: salary.length,
                unknown: unknown.length,
                total,
                hourlyPct,
                salaryPct,
              },
            },
            list: {
              type: 'table',
              title: `${label} Employees${displayCompany ? ` at ${displayCompany}` : ''}`,
              data: { headers, rows, employeeNames: allWithPayType.map(e => e.full_name), rawEmployees: allWithPayType },
              defaultPayTypeFilter: requestedType.charAt(0).toUpperCase() + requestedType.slice(1),
            },
          },
          suggestions: displayCompany ? [`Tell me about ${displayCompany}`, `List ${requestedType === 'hourly' ? 'salary' : 'hourly'} employees at ${displayCompany}`, `Employees at ${displayCompany}`] : [],
        }
      }

      return null // fall through for ambiguous queries
    },
  },

  // ============================================
  // PAUSED EMPLOYEES BY REASON (from employee card click)
  // ============================================
  {
    patterns: [
      /show\s+paused\s+(?:employees?|users?)\s+with\s+reason\s+(.+?)(?:\s+at\s+(.+))?$/i,
    ],
    handler: async (query, matches) => {
      const reason = (matches[1] || '').trim()
      const companyName = (matches[2] || '').trim() || null
      if (!reason) return null

      let allPaused = await pennyDataService.getEmployeesByStatus('paused')
      let displayCompany = null

      if (companyName) {
        const stats = await pennyDataService.getCompanyStats(companyName)
        if (stats) {
          displayCompany = stats.company
          allPaused = allPaused.filter(e => (e.company || '').toLowerCase() === stats.company.toLowerCase())
        }
      }

      const byReason = allPaused.filter(e => (e.pause_reason || '').toLowerCase() === reason.toLowerCase())
      const companyLabel = displayCompany ? ` at **${displayCompany}**` : ''

      if (byReason.length === 0) {
        return { text: `No paused employees found with reason "${reason}"${companyLabel}.` }
      }

      const headers = ['Name', 'Company', 'Pause Reason', 'Status']
      const rows = byReason.map(e => [e.full_name || '—', e.company || '—', e.pause_reason || '—', 'Paused'])

      return {
        text: `Found **${byReason.length} paused employee${byReason.length === 1 ? '' : 's'}** with reason "**${reason}**"${companyLabel}.`,
        richContent: {
          type: 'summary-with-list',
          summary: { type: 'data-card', data: { label: `Paused: ${reason}`, value: byReason.length.toString() } },
          list: {
            type: 'table',
            title: `Paused employees — ${reason}${displayCompany ? ` at ${displayCompany}` : ''}`,
            data: { headers, rows, employeeNames: byReason.map(e => e.full_name), rawEmployees: byReason },
          },
        },
        suggestions: [`List all paused employees${displayCompany ? ` at ${displayCompany}` : ''}`, ...(displayCompany ? [`Tell me about ${displayCompany}`] : [])],
      }
    },
  },

  // ============================================
  // TRANSFER STATS FOR COMPANY
  // ============================================
  {
    patterns: [
      /(?:show|get|what are)\s+(?:the\s+)?transfer\s+stats?\s+(?:for|at)\s+(.+)/i,
      /transfer\s+(?:stats|statistics|summary|data)\s+(?:for|at)\s+(.+)/i,
    ],
    handler: async (query, matches) => {
      const companyName = (matches[1] || '').trim()
      if (!companyName) return null
      const stats = await pennyDataService.getCompanyStats(companyName)
      if (!stats) return null

      const fmtNum = (v) => (v ?? 0).toLocaleString()
      const fmtCur = (v) => `$${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      const text = `**Transfer Stats for ${stats.company}:**\n\n` +
        `• Total transfers: **${fmtNum(stats.transfers_in_period)}**\n` +
        `• Total transfer amount: **${fmtCur(stats.total_transfer_amount)}**\n` +
        `• 30-day transfers: **${fmtNum(stats.total_30d_transfers)}**\n` +
        `• Avg daily transfer amount: **${fmtCur(stats.avg_daily_transfer_amount_in_period)}**\n` +
        (stats.instant_transfers_in_period != null ? `• Instant transfers: **${fmtNum(stats.instant_transfers_in_period)}** (${fmtCur(stats.instant_amount_in_period)})\n` : '') +
        (stats.nextday_transfers_in_period != null ? `• Next-day transfers: **${fmtNum(stats.nextday_transfers_in_period)}** (${fmtCur(stats.nextday_amount_in_period)})\n` : '') +
        `• Trailing 30d streamers: **${fmtNum(stats.trailing_30d_streamers)}**\n` +
        `• Trailing 14d streamers: **${fmtNum(stats.trailing_14d_streamers)}**\n` +
        `• Trailing 7d streamers: **${fmtNum(stats.trailing_7d_streamers)}**`

      return {
        text,
        richContent: { type: 'company-stats-card', data: { ...stats, ...(await enrichWithPausedCount(stats)) } },
        suggestions: [`Tell me about ${stats.company}`, `Employees at ${stats.company}`, `Top companies by transfers`],
      }
    },
  },

  // ============================================
  // PAUSED EMPLOYEES QUERIES
  // ============================================
  {
    patterns: [
      /(?:who|which|list|show).*(?:paused|blocked|inactive).*(?:at|for|from)\s+(.+)/i,
      /paused\s+(?:employees?|users?)\s+(?:at|for|from)\s+(.+)/i,
      /(?:who|which|list|show).*(?:paused|blocked|inactive)/i,
      /paused employees/i,
      /employees.*paused/i,
    ],
    handler: async (query, matches) => {
      // Extract company name from query if present
      let companyName = matches?.[1]?.trim() || null
      if (!companyName) {
        const companyAtMatch = query.match(/(?:at|for|from)\s+(.+?)(?:\s*\??\s*)$/i)
        if (companyAtMatch) companyName = companyAtMatch[1].trim()
      }

      let pausedEmployees
      let displayCompany = null
      if (companyName) {
        const stats = await pennyDataService.getCompanyStats(companyName)
        if (stats) {
          displayCompany = stats.company
          const empStats = await pennyDataService.getCompanyEmployeeStats(stats.company)
          pausedEmployees = (empStats?.employees || []).filter(e => e.paused === true)
        } else {
          // Try fuzzy matching all employees
          const allPaused = await pennyDataService.getEmployeesByStatus('paused')
          pausedEmployees = allPaused.filter(e => (e.company || '').toLowerCase().includes(companyName.toLowerCase()))
          if (pausedEmployees.length > 0) displayCompany = pausedEmployees[0].company
        }
      } else {
        pausedEmployees = await pennyDataService.getEmployeesByStatus('paused')
      }

      if (!pausedEmployees || pausedEmployees.length === 0) {
        return {
          text: displayCompany
            ? `There are no paused employees at **${displayCompany}**.`
            : 'There are no paused employees currently.',
        }
      }

      const headers = ['Name', 'Company', 'Pause Reason', 'Status']
      const rows = pausedEmployees.map(e => [e.full_name, e.company || '—', e.pause_reason || '—', 'Paused'])
      const drillSuggestions = buildDrillDownSuggestions(pausedEmployees, 2, 2)
      const label = displayCompany ? `Paused Employees at ${displayCompany}` : 'Paused Employees'

      return {
        text: displayCompany
          ? `There are **${pausedEmployees.length} paused employee${pausedEmployees.length === 1 ? '' : 's'}** at **${displayCompany}**.`
          : `There are **${pausedEmployees.length} paused employees**.`,
        richContent: {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              label,
              value: pausedEmployees.length.toString(),
            },
          },
          list: {
            type: 'table',
            data: {
              headers,
              rows,
              employeeNames: pausedEmployees.map(e => e.full_name),
              rawEmployees: pausedEmployees,
            },
          },
        },
        suggestions: drillSuggestions,
      }
    },
  },

  // ============================================
  // PENDING EMPLOYEES (global)
  // ============================================
  {
    patterns: [
      /(?:who|which|list|show).*pending/i,
      /pending employees/i,
      /employees.*pending/i,
    ],
    handler: async (query) => {
      // Check if query specifies a company — if so, let per-company handler take it
      const companyMatch = query.match(/pending\s+(?:employees?\s+)?(?:at|for|of|in)\s+(.+)/i)
        || query.match(/(?:at|for|of|in)\s+(.+?)\s*(?:pending|$)/i)
      if (companyMatch) return null // fall through to company-specific handler

      const pendingEmployees = await pennyDataService.getEmployeesByState('pending')

      if (pendingEmployees.length === 0) {
        return {
          text: 'There are no pending employees currently.',
        }
      }

      const headers = ['Name', 'Company']
      const rows = pendingEmployees.map(e => [e.full_name || '—', e.company || '—'])
      const drillSuggestions = buildDrillDownSuggestions(pendingEmployees, 2, 2)

      return {
        text: `There are **${pendingEmployees.length} pending employees**.`,
        richContent: {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              label: 'Pending Employees',
              value: pendingEmployees.length.toString(),
            },
          },
          list: {
            type: 'table',
            data: { headers, rows, employeeNames: pendingEmployees.map(e => e.full_name) },
          },
        },
        suggestions: drillSuggestions,
      }
    },
  },

  // ============================================
  // EMPLOYEES WITH TRANSFERS DISABLED (global)
  // ============================================
  {
    patterns: [
      /(?:who|which|list|show).*employees?.*transfers?\s+disabled/i,
      /employees?\s+(?:with\s+)?transfers?\s+disabled/i,
      /transfers?\s+disabled\s+employees/i,
    ],
    handler: async () => {
      const tdEmployees = await pennyDataService.getEmployeesWithTransfersDisabled()

      if (tdEmployees.length === 0) {
        return {
          text: 'There are no employees with transfers disabled currently.',
        }
      }

      const headers = ['Name', 'Company', 'Reason']
      const rows = tdEmployees.map(e => [e.full_name || '—', e.company || '—', e.transfers_disabled_reason || '—'])
      const drillSuggestions = buildDrillDownSuggestions(tdEmployees, 2, 2)

      return {
        text: `There are **${tdEmployees.length} employees with transfers disabled**.`,
        richContent: {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              label: 'Transfers Disabled',
              value: tdEmployees.length.toString(),
            },
          },
          list: {
            type: 'table',
            data: { headers, rows, employeeNames: tdEmployees.map(e => e.full_name) },
          },
        },
        suggestions: drillSuggestions,
      }
    },
  },

  // ============================================
  // SPECIFIC EMPLOYEE SAVINGS
  // ============================================
  {
    patterns: [
      /(?:what(?:'s| is))? (.+?)(?:'s)? sav(?:ings?|e)/i,
      /(?:does|has) (.+?) (?:have )?(?:a )?sav(?:ings?|e)/i,
      /sav(?:ings?|e) (?:for|of) (.+)/i,
    ],
    handler: async (query, matches) => {
      const rawName = matches[1]?.trim() || extractEmployeeName(query)
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'current', 'savings stats', 'saving stats', 'save stats', 'stats']
      if (skipWords.includes(name.toLowerCase())) return null

      return await handleSavingsQuery(query, name)
    },
  },

  // ============================================
  // WHERE DOES [NAME] WORK (employee location/company)
  // ============================================
  {
    patterns: [
      /where does (.+?)\s+work/i,
      /where\s+(.+?)\s+(?:works|based|located)/i,
      /(.+?)(?:'s)\s+(?:work|office|location|company)/i,
    ],
    handler: async (query, matches) => {
      const rawName = (matches[1] || '').trim().replace(/\s*(\?|\.|!)$/, '')
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null
      const skip = ['the', 'everyone', 'all', 'company', 'companies']
      if (skip.includes(name.toLowerCase())) return null
      const company = await pennyDataService.getCompanyByName(name)
      if (company) return null
      const allMatches = await pennyDataService.getEmployeesByName(name)
      if (allMatches.length === 0) {
        return await buildNotFoundWithSuggestions(name, query)
      }
      if (allMatches.length > 1) {
        const shown = allMatches.slice(0, 25)
        const lines = shown.map((e, i) => {
          const loc = e.company || '—'
          return `${i + 1}. **${e.full_name}**: ${loc}`
        }).join('\n')
        const truncMsg = allMatches.length > 25 ? `\n\n_...and ${allMatches.length - 25} more. View the full list →_` : ''
        const expandList = {
          type: 'table',
          title: `Employees named "${name}"`,
          data: {
            headers: ['Name', 'Company'],
            rows: allMatches.map(e => [e.full_name, e.company || '—']),
            employeeNames: allMatches.map(e => e.full_name),
          },
        }
        return {
          text: `**Found ${allMatches.length} employees named "${name}":**\n\n${lines}${truncMsg}`,
          richContent: {
            type: 'data-card',
            data: { value: allMatches.length.toString(), label: 'Duplicate Names Found', detail: `${allMatches.length} employees named "${name}"` },
            expandList,
          },
        }
      }
      const emp = allMatches[0]
      const place = emp.company || '—'
      return {
        text: `**${emp.full_name}** works at ${place}.`,
        richContent: { type: 'employee-card', data: emp },
      }
    },
  },

  // ============================================
  // USER SEGMENTS
  // ============================================
  {
    patterns: [
      /(?:power\s+users?|top\s+users?|most\s+active\s+users?|heavy\s+users?|frequent\s+users?)\s*(?:list)?/i,
      /(?:show|list|get)\s+(?:the\s+)?power\s+users/i,
      /users?\s+with\s+(?:most|highest)\s+(?:lifetime\s+)?transfers/i,
    ],
    handler: async () => {
      const { total, users } = await pennyDataService.getPowerUsers(20, 50)
      if (total === 0) {
        return { text: '**No power users found** (employees with 20+ transfers in 90 days).' }
      }
      const list = users.slice(0, 25).map((e, i) =>
        `${i + 1}. **${e.full_name}** (${e.company || '—'}): ${(e.transfers_90d ?? 0).toLocaleString()} transfers (90d)`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: `Power Users (20+ transfers in 90d) — Top ${users.length} of ${total.toLocaleString()}`,
        data: {
          headers: ['Name', 'Company', 'Transfers (90d)', 'Transfers (30d)'],
          rows: users.map(e => [e.full_name, e.company || '—', (e.transfers_90d ?? 0).toLocaleString(), (e.transfers_30d ?? 0).toString()]),
          employeeNames: users.map(e => e.full_name),
        },
      }
      return {
        text: `**Power Users** (20+ transfers in 90 days): **${total.toLocaleString()}** found.\n\n${list}${total > 25 ? `\n\n_...and ${(total - 25).toLocaleString()} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: total.toLocaleString(), label: 'Power Users', detail: '20+ transfers (90d)' },
          expandList,
        },
        suggestions: ['Show dormant users', 'Show high-frequency users', 'Show new users this week'],
      }
    },
  },
  {
    patterns: [
      /(?:dormant|inactive|sleeping)\s+(?:users?|employees?)/i,
      /(?:show|list|get)\s+(?:the\s+)?(?:dormant|inactive)\s+(?:users?|employees?)/i,
      /(?:enrolled\s+but\s+inactive|users?\s+not\s+(?:using|active|streaming))/i,
    ],
    handler: async () => {
      const { total, users } = await pennyDataService.getDormantUsers(30, 50)
      if (total === 0) {
        return { text: '**No dormant users found** (enrolled employees inactive for 30+ days).' }
      }
      const list = users.slice(0, 25).map((e, i) =>
        `${i + 1}. **${e.full_name}** (${e.company || '—'}): ${(() => { if (!e.last_stream_date) return '—'; const d = Math.floor((Date.now() - new Date(e.last_stream_date).getTime()) / 86400000); return isNaN(d) ? '—' : d; })()} days since last stream`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: `Dormant Users (30+ days inactive) — Top ${users.length} of ${total.toLocaleString()}`,
        data: {
          headers: ['Name', 'Company', 'Days Since Last Stream', 'Transfers (90d)'],
          rows: users.map(e => [e.full_name, e.company || '—', (() => { if (!e.last_stream_date) return '—'; const d = Math.floor((Date.now() - new Date(e.last_stream_date).getTime()) / 86400000); return isNaN(d) ? '—' : d.toString(); })(), (e.transfers_90d ?? 0).toString()]),
          employeeNames: users.map(e => e.full_name),
        },
      }
      return {
        text: `**Dormant Users** (enrolled but 30+ days inactive): **${total.toLocaleString()}** found.\n\n${list}${total > 25 ? `\n\n_...and ${(total - 25).toLocaleString()} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: total.toLocaleString(), label: 'Dormant Users', detail: '30+ days inactive' },
          expandList,
        },
        suggestions: ['Show power users', 'Show paused employees', 'Show new users this week'],
      }
    },
  },
  {
    patterns: [
      /(?:users?|employees?)\s+with\s+(?:more\s+than\s+|>|over\s+)?(\d+)\+?\s+transfers?\s+(?:a\s+|per\s+|this\s+)?(?:month|pay\s*cycle|period|cycle)/i,
      /(?:high[\s-]?frequency|frequent)\s+(?:users?|employees?|transferr?ers?)/i,
      /(?:show|list|get)\s+(?:the\s+)?(?:high[\s-]?frequency|frequent)\s+(?:users?|employees?)/i,
      /who\s+(?:transfers?|streams?)\s+(?:the\s+)?most/i,
    ],
    handler: async (query) => {
      const thresholdMatch = query.match(/(\d+)\+?\s+transfers?/)
      const threshold = thresholdMatch ? parseInt(thresholdMatch[1]) : 5
      const { total, users } = await pennyDataService.getHighFrequencyUsers(threshold, 50)
      if (total === 0) {
        return { text: `**No employees found** with ${threshold}+ transfers this pay cycle.` }
      }
      const list = users.slice(0, 25).map((e, i) =>
        `${i + 1}. **${e.full_name}** (${e.company || '—'}): ${(e.transfers_14d ?? 0).toLocaleString()} transfers this cycle`
      ).join('\n')
      const expandList = {
        type: 'table',
        title: `High-Frequency Users (${threshold}+ transfers/cycle) — Top ${users.length} of ${total.toLocaleString()}`,
        data: {
          headers: ['Name', 'Company', 'Transfers This Cycle', 'Transfers (90d)'],
          rows: users.map(e => [e.full_name, e.company || '—', (e.transfers_14d ?? 0).toLocaleString(), (e.transfers_90d ?? 0).toLocaleString()]),
          employeeNames: users.map(e => e.full_name),
        },
      }
      return {
        text: `**High-Frequency Users** (${threshold}+ transfers this cycle): **${total.toLocaleString()}** found.\n\n${list}${total > 25 ? `\n\n_...and ${(total - 25).toLocaleString()} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: total.toLocaleString(), label: `${threshold}+ Transfers/Cycle`, detail: 'Current pay cycle' },
          expandList,
        },
        suggestions: ['Show power users', 'Show dormant users', 'Show new users this week'],
      }
    },
  },
  {
    patterns: [
      /(?:new|first[\s-]?time|recent(?:ly)?(?:\s+enrolled)?)\s+(?:users?|employees?|enrollments?)\s*(?:this\s+week|last\s+\d+\s+days?|recently?)?/i,
      /(?:show|list|get)\s+(?:the\s+)?(?:new|first[\s-]?time|recent)\s+(?:users?|employees?)/i,
      /who\s+(?:just\s+)?(?:enrolled|joined|signed\s+up)\s*(?:this\s+week|recently)?/i,
    ],
    handler: async (query) => {
      const daysMatch = query.match(/last\s+(\d+)\s+days?/i)
      const maxDays = daysMatch ? parseInt(daysMatch[1]) : 7
      const { total, users } = await pennyDataService.getNewUsers(maxDays, 50)
      if (total === 0) {
        return { text: `**No new users** enrolled in the last ${maxDays} days.` }
      }
      const list = users.slice(0, 25).map((e, i) => {
        const daysAgo = e.employee_created_at ? Math.floor((Date.now() - new Date(e.employee_created_at).getTime()) / 86400000) : '—'
        return `${i + 1}. **${e.full_name}** (${e.company || '—'}): enrolled ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
      }).join('\n')
      const expandList = {
        type: 'table',
        title: `New Users (last ${maxDays} days) — Top ${users.length} of ${total.toLocaleString()}`,
        data: {
          headers: ['Name', 'Company', 'Created At'],
          rows: users.map(e => [e.full_name, e.company || '—', e.employee_created_at ? new Date(e.employee_created_at).toLocaleDateString() : '—']),
          employeeNames: users.map(e => e.full_name),
        },
      }
      return {
        text: `**New Users** (enrolled in last ${maxDays} days): **${total.toLocaleString()}** found.\n\n${list}${total > 25 ? `\n\n_...and ${(total - 25).toLocaleString()} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: total.toLocaleString(), label: 'New Users', detail: `Last ${maxDays} days` },
          expandList,
        },
        suggestions: ['Show power users', 'Show dormant users', 'Show high-frequency users'],
      }
    },
  },

  // ============================================
  // COMPANY COMPARISON
  // ============================================
  {
    patterns: [
      /compare\s+(.+?)\s+(?:vs\.?|versus|against|and|&|to)\s+(.+)/i,
      /(.+?)\s+vs\.?\s+(.+?)(?:\s+comparison)?$/i,
    ],
    handler: async (query, matches) => {
      const nameA = (matches[1] || '').replace(/[?.!,]+$/, '').trim()
      const nameB = (matches[2] || '').replace(/[?.!,]+$/, '').trim()
      if (!nameA || !nameB || nameA.length < 2 || nameB.length < 2) return null

      // Check if this is a partnership comparison (e.g. "OSV vs Harri Pay")
      const partnershipA = await pennyDataService.getPartnershipStats(nameA)
      const partnershipB = await pennyDataService.getPartnershipStats(nameB)

      if (partnershipA && partnershipB) {
        // Partnership-to-partnership comparison
        const fmt = (v, d = 0) => v != null ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'
        const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
        const fmtCur = (v) => v != null ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

        const headers = ['Metric', nameA, nameB]
        const rows = [
          ['Companies', fmt(partnershipA.count), fmt(partnershipB.count)],
          ['Total Eligible', fmt(partnershipA.totalEligible), fmt(partnershipB.totalEligible)],
          ['Total Adopted', fmt(partnershipA.totalAdopted), fmt(partnershipB.totalAdopted)],
          ['Avg Adoption Rate', fmtPct(partnershipA.avgAdoption), fmtPct(partnershipB.avgAdoption)],
          ['Avg Transfers/Company', fmt(partnershipA.avgTransfers, 1), fmt(partnershipB.avgTransfers, 1)],
          ['Total Transfers', fmt(partnershipA.totalTransfers), fmt(partnershipB.totalTransfers)],
          ['Avg 30d Net Rev/Company', fmtCur(partnershipA.avgRevenue), fmtCur(partnershipB.avgRevenue)],
          ['Total 30d Net Revenue', fmtCur(partnershipA.totalRevenue), fmtCur(partnershipB.totalRevenue)],
          ['Total Active Users', fmt(partnershipA.totalActive), fmt(partnershipB.totalActive)],
        ]
        const text = `**${nameA} vs ${nameB} (Partnership Comparison):**\n\n` +
          `• Companies: **${partnershipA.count}** vs **${partnershipB.count}**\n` +
          `• Avg Adoption: **${fmtPct(partnershipA.avgAdoption)}** vs **${fmtPct(partnershipB.avgAdoption)}**\n` +
          `• Avg MRR: **${fmtCur(partnershipA.avgRevenue)}** vs **${fmtCur(partnershipB.avgRevenue)}**\n` +
          `• Avg Transfers: **${fmt(partnershipA.avgTransfers, 1)}** vs **${fmt(partnershipB.avgTransfers, 1)}**\n` +
          `• Total Revenue: **${fmtCur(partnershipA.totalRevenue)}** vs **${fmtCur(partnershipB.totalRevenue)}**`
        return {
          text,
          richContent: {
            type: 'data-card',
            data: { value: `${nameA} vs ${nameB}`, label: 'Partnership Comparison', detail: `${partnershipA.count + partnershipB.count} companies total` },
            expandList: { type: 'table', title: `${nameA} vs ${nameB}`, data: { headers, rows } },
          },
          suggestions: [`${nameA} companies`, `${nameB} companies`, 'Show partnership averages'],
        }
      }

      // Company-to-company comparison
      const { companyA, companyB } = await pennyDataService.compareCompanies(nameA, nameB)
      if (!companyA && !companyB) return null
      if (!companyA) return { text: `I couldn't find **"${nameA}"** in the Client Summary. "${nameB}" was found.`, suggestions: ['Show all companies'] }
      if (!companyB) return { text: `I couldn't find **"${nameB}"** in the Client Summary. "${nameA}" was found.`, suggestions: ['Show all companies'] }

      const fmt = (v, d = 0) => v != null ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'
      const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
      const fmtCur = (v) => v != null ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
      const a = companyA
      const b = companyB
      const headers = ['Metric', a.company, b.company]
      const rows = [
        ['Partnership', a.partnership || '—', b.partnership || '—'],
        ['Sector', a.sector || '—', b.sector || '—'],
        ['Eligible', fmt(a.eligible), fmt(b.eligible)],
        ['Adopted', fmt(a.adopted), fmt(b.adopted)],
        ['Adoption Rate', a.adoption_rate_percent, b.adoption_rate_percent],
        ['Active', fmt(a.active), fmt(b.active)],
        ['Transfers', fmt(a.transfers), fmt(b.transfers)],
        ['Transfer Amount', fmtCur(a.total_transfer_amount), fmtCur(b.total_transfer_amount)],
        ['30d Net Revenue', fmtCur(a.sum_trailing_30d_net_rev), fmtCur(b.sum_trailing_30d_net_rev)],
        ['Daily Active Users', fmt(a.daily_active_app_users), fmt(b.daily_active_app_users)],
        ['Weekly Active Users', fmt(a.weekly_active_app_users), fmt(b.weekly_active_app_users)],
        ['Savings Balance', fmtCur(a.savings_balance_usd), fmtCur(b.savings_balance_usd)],
      ]
      const text = `**${a.company} vs ${b.company}:**\n\n` +
        `• Adoption: **${a.adoption_rate_percent}** vs **${b.adoption_rate_percent}**\n` +
        `• Active: **${fmt(a.active)}** vs **${fmt(b.active)}**\n` +
        `• Transfers: **${fmt(a.transfers)}** vs **${fmt(b.transfers)}**\n` +
        `• 30d Net Revenue: **${fmtCur(a.sum_trailing_30d_net_rev)}** vs **${fmtCur(b.sum_trailing_30d_net_rev)}**\n` +
        `• Eligible: **${fmt(a.eligible)}** vs **${fmt(b.eligible)}**`
      return {
        text,
        richContent: {
          type: 'data-card',
          data: { value: `${a.company} vs ${b.company}`, label: 'Company Comparison', detail: `${a.adoption_rate_percent} vs ${b.adoption_rate_percent}` },
          expandList: { type: 'table', title: `${a.company} vs ${b.company}`, data: { headers, rows } },
        },
        suggestions: [`Tell me about ${a.company}`, `Tell me about ${b.company}`, 'Show top companies by adoption'],
      }
    },
  },

  // ============================================
  // COMPANY VS SECTOR/PARTNERSHIP AVERAGE
  // ============================================
  {
    patterns: [
      /how\s+does\s+(.+?)\s+compare\s+to\s+(?:the\s+)?(?:sector|industry)\s+(?:avg|average)/i,
      /(.+?)\s+(?:vs\.?|versus|against|compared?\s+to)\s+(?:the\s+)?sector\s+(?:avg|average)/i,
      /is\s+(.+?)\s+(?:below|above|under|over)\s+(?:avg|average)\s+(?:adoption|transfers?|revenue)/i,
      /is\s+(.+?)\s+(?:below|above)\s+(?:avg|average)\s+adoption\s+(?:for\s+(?:its|their)\s+partnership)/i,
      /rank\s+(.+?)\s+against\s+(?:similar|same|its|peer)\s+(?:size\s+)?(?:peers?|companies)/i,
    ],
    handler: async (query, matches) => {
      const companyName = (matches[1] || '').replace(/[?.!,]+$/, '').trim()
      if (!companyName || companyName.length < 2) return null

      const stats = await pennyDataService.getCompanyStats(companyName)
      if (!stats) return { text: `I couldn't find "${companyName}" in the Client Summary.`, suggestions: ['Show all companies'] }

      const fmt = (v, d = 0) => v != null ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'
      const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
      const fmtCur = (v) => v != null ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

      const sectorName = (stats.sector || '').trim()
      const partnershipName = (stats.partnership || '').trim()

      let sectorStats = null
      if (sectorName) {
        sectorStats = await pennyDataService.getSectorStats(sectorName)
      }
      let partnershipStats = null
      if (partnershipName) {
        partnershipStats = await pennyDataService.getPartnershipStats(partnershipName)
      }

      const headers = ['Metric', stats.company, sectorStats ? `${sectorStats.sector} Avg` : '—', partnershipStats ? `${partnershipName} Avg` : '—']
      const adoptionRate = stats.adoption_rate ?? 0
      const rows = [
        ['Adoption Rate', fmtPct(adoptionRate), sectorStats ? fmtPct(sectorStats.avgAdoption) : '—', partnershipStats ? fmtPct(partnershipStats.avgAdoption) : '—'],
        ['Transfers', fmt(stats.transfers), sectorStats ? fmt(sectorStats.avgTransfers, 1) : '—', partnershipStats ? fmt(partnershipStats.avgTransfers, 1) : '—'],
        ['30d Net Revenue', fmtCur(stats.sum_trailing_30d_net_rev), sectorStats ? fmtCur(sectorStats.avgRevenue) : '—', partnershipStats ? fmtCur(partnershipStats.avgRevenue) : '—'],
        ['Active', fmt(stats.active), sectorStats ? fmt(sectorStats.totalActive / sectorStats.count, 0) : '—', partnershipStats ? fmt(partnershipStats.totalActive / partnershipStats.count, 0) : '—'],
        ['Eligible', fmt(stats.eligible), sectorStats ? fmt(sectorStats.totalEligible / sectorStats.count, 0) : '—', partnershipStats ? fmt(partnershipStats.totalEligible / partnershipStats.count, 0) : '—'],
      ]

      let benchmarkText = `**${stats.company} Benchmark Analysis:**\n\n`
      if (sectorStats) {
        const sectorDiff = adoptionRate - sectorStats.avgAdoption
        benchmarkText += `**Sector** (${sectorStats.sector}, ${sectorStats.count} companies):\n`
        benchmarkText += `• Adoption: **${fmtPct(adoptionRate)}** vs sector avg **${fmtPct(sectorStats.avgAdoption)}** (${sectorDiff >= 0 ? '↑' : '↓'} ${Math.abs(sectorDiff * 100).toFixed(1)}pp)\n`
        benchmarkText += `• Revenue: **${fmtCur(stats.sum_trailing_30d_net_rev)}** vs sector avg **${fmtCur(sectorStats.avgRevenue)}**\n\n`
      }
      if (partnershipStats) {
        const pDiff = adoptionRate - partnershipStats.avgAdoption
        benchmarkText += `**Partnership** (${partnershipName}, ${partnershipStats.count} companies):\n`
        benchmarkText += `• Adoption: **${fmtPct(adoptionRate)}** vs partnership avg **${fmtPct(partnershipStats.avgAdoption)}** (${pDiff >= 0 ? '↑' : '↓'} ${Math.abs(pDiff * 100).toFixed(1)}pp)\n`
        benchmarkText += `• Revenue: **${fmtCur(stats.sum_trailing_30d_net_rev)}** vs partnership avg **${fmtCur(partnershipStats.avgRevenue)}**`
      }

      return {
        text: benchmarkText,
        richContent: {
          type: 'data-card',
          data: { value: stats.adoption_rate_percent, label: `${stats.company} Adoption`, detail: `Sector: ${sectorName || '—'} · Partnership: ${partnershipName || '—'}` },
          expandList: { type: 'table', title: `${stats.company} Benchmark`, data: { headers, rows } },
        },
        suggestions: [`Tell me about ${stats.company}`, 'Sector insights', 'Show partnership averages'],
      }
    },
  },

  // ============================================
  // SECTOR INSIGHTS
  // ============================================
  {
    patterns: [
      /which\s+sector\s+(?:has\s+)?(?:the\s+)?(?:highest|best|top)\s+(?:adoption|enrollment)/i,
      /(?:best|top|highest)\s+(?:performing\s+)?sector(?:s)?\s+(?:by|for)\s+(?:adoption|enrollment|revenue|transfers?)/i,
      /sector\s+insights?/i,
      /sector\s+(?:comparison|averages?|benchmarks?|rankings?)/i,
      /(?:avg|average)\s+(?:transfers?|adoption|revenue|mrr)\s+(?:(?:for|by|across)\s+)?(?:sector|industry)/i,
      /(?:avg|average)\s+(?:transfers?|adoption|revenue|mrr)\s+(?:for\s+)?(\w+)\s+vs\.?\s+(\w+)/i,
    ],
    handler: async (query) => {
      const sectorAverages = await pennyDataService.getSectorAverages()
      if (sectorAverages.length === 0) {
        return { text: 'No sector data available.' }
      }

      const fmtPct = (v) => `${(v * 100).toFixed(1)}%`
      const fmtCur = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const lowerQuery = query.toLowerCase()

      // Determine sort metric
      let sortField = 'avgAdoption'
      let sortLabel = 'adoption'
      if (lowerQuery.includes('revenue') || lowerQuery.includes('mrr')) {
        sortField = 'avgRevenue'
        sortLabel = 'avg 30d net revenue'
        sectorAverages.sort((a, b) => b.avgRevenue - a.avgRevenue)
      } else if (lowerQuery.includes('transfer')) {
        sortField = 'avgTransfers'
        sortLabel = 'avg transfers'
        sectorAverages.sort((a, b) => b.avgTransfers - a.avgTransfers)
      }

      const list = sectorAverages.map((s, i) => {
        const counts = `${s.totalAdopted.toLocaleString()} adopted / ${s.totalEligible.toLocaleString()} eligible / ${s.totalActive.toLocaleString()} active`
        if (sortField === 'avgRevenue') {
          return `${i + 1}. **${s.sector}** (${s.count} companies): avg revenue **${fmtCur(s.avgRevenue)}**, adoption **${fmtPct(s.avgAdoption)}** — ${counts}`
        }
        if (sortField === 'avgTransfers') {
          return `${i + 1}. **${s.sector}** (${s.count} companies): avg transfers **${s.avgTransfers.toFixed(1)}**, adoption **${fmtPct(s.avgAdoption)}** — ${counts}`
        }
        return `${i + 1}. **${s.sector}** (${s.count} companies): **${fmtPct(s.avgAdoption)}** adoption — ${counts}`
      }).join('\n')

      const headers = ['Sector', 'Companies', 'Eligible', 'Adopted', 'Active', 'Avg Adoption', 'Avg Transfers', 'Avg 30d Revenue', 'Total Revenue']
      const rows = sectorAverages.map(s => [
        s.sector,
        s.count.toString(),
        s.totalEligible.toLocaleString(),
        s.totalAdopted.toLocaleString(),
        s.totalActive.toLocaleString(),
        fmtPct(s.avgAdoption),
        s.avgTransfers.toFixed(1),
        fmtCur(s.avgRevenue),
        fmtCur(s.totalRevenue),
      ])
      const topSector = sectorAverages[0]
      return {
        text: `**Sector Insights** (ranked by ${sortLabel}):\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: { value: topSector.sector, label: `Top Sector by ${sortLabel}`, detail: `${sectorAverages.length} sectors` },
          expandList: { type: 'table', title: 'Sector Insights', data: { headers, rows } },
        },
        suggestions: ['Companies by sector', 'Show partnership averages', 'Show top companies by adoption'],
      }
    },
  },

  // ============================================
  // PARTNERSHIP COMPARISON / AVERAGES
  // ============================================
  {
    patterns: [
      /(?:avg|average)\s+(?:mrr|revenue|30d\s+(?:net\s+)?rev(?:enue)?)\s+(?:for\s+|by\s+)?(?:partnership|(?:each|all)\s+partnership)/i,
      /(?:avg|average)\s+(?:number\s+of\s+)?(?:transfers?|enrollment|adoption|mrr|revenue)\s+(?:for\s+)?(.+?)\s+(?:vs\.?|versus|against|and|&|compared?\s+to)\s+(.+)/i,
      /(?:show|list|get)\s+partnership\s+(?:avg|averages?|benchmarks?|comparison|stats)/i,
      /partnership\s+(?:avg|averages?|benchmarks?|comparison|stats)/i,
      /(?:avg|average)\s+(?:enrollment\s+rate|adoption\s+rate|adoption)\s+(?:for\s+|by\s+)?(.+?)\s+(?:vs\.?|versus|against|and|&)\s+(.+?)(?:\s+(?:vs\.?|versus|and|&)\s+(.+))?$/i,
    ],
    handler: async (query, matches) => {
      const lowerQuery = query.toLowerCase()
      const allPartnershipAverages = await pennyDataService.getPartnershipAverages()

      if (allPartnershipAverages.length === 0) {
        return { text: 'No partnership data available.' }
      }

      // Check if specific partnerships are mentioned for comparison
      const partnershipNames = []
      // Try to extract from matches (groups 1, 2, 3)
      if (matches && matches[1]) partnershipNames.push(matches[1].replace(/[?.!,]+$/, '').trim())
      if (matches && matches[2]) partnershipNames.push(matches[2].replace(/[?.!,]+$/, '').trim())
      if (matches && matches[3]) partnershipNames.push(matches[3].replace(/[?.!,]+$/, '').trim())
      // Also try "etc" catch-all for multi-partnership queries
      const etcMatch = query.match(/(?:vs\.?|versus|and|&|,)\s+(?:etc\.?|others?)/i)

      const fmtPct = (v) => `${(v * 100).toFixed(1)}%`
      const fmtCur = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

      // If specific partnerships named, filter and compare
      if (partnershipNames.length >= 2 && !etcMatch) {
        const matched = []
        for (const name of partnershipNames) {
          if (!name || name.length < 2) continue
          const pStats = await pennyDataService.getPartnershipStats(name)
          if (pStats) matched.push(pStats)
        }
        if (matched.length >= 2) {
          const headers = ['Metric', ...matched.map(m => m.partnership)]
          const rows = [
            ['Companies', ...matched.map(m => m.count.toString())],
            ['Avg Adoption Rate', ...matched.map(m => fmtPct(m.avgAdoption))],
            ['Avg Transfers/Company', ...matched.map(m => m.avgTransfers.toFixed(1))],
            ['Total Transfers', ...matched.map(m => m.totalTransfers.toLocaleString())],
            ['Avg 30d Revenue/Company', ...matched.map(m => fmtCur(m.avgRevenue))],
            ['Total 30d Revenue', ...matched.map(m => fmtCur(m.totalRevenue))],
            ['Total Eligible', ...matched.map(m => m.totalEligible.toLocaleString())],
            ['Total Adopted', ...matched.map(m => m.totalAdopted.toLocaleString())],
            ['Total Active', ...matched.map(m => m.totalActive.toLocaleString())],
          ]
          const compLabel = matched.map(m => m.partnership).join(' vs ')
          let text = `**${compLabel} Comparison:**\n\n`
          text += matched.map(m =>
            `**${m.partnership}** (${m.count} companies):\n` +
            `• Avg Adoption: **${fmtPct(m.avgAdoption)}**\n` +
            `• Avg MRR: **${fmtCur(m.avgRevenue)}**\n` +
            `• Avg Transfers: **${m.avgTransfers.toFixed(1)}**\n` +
            `• Total Revenue: **${fmtCur(m.totalRevenue)}**`
          ).join('\n\n')
          return {
            text,
            richContent: {
              type: 'data-card',
              data: { value: compLabel, label: 'Partnership Comparison', detail: `${matched.reduce((s, m) => s + m.count, 0)} companies total` },
              expandList: { type: 'table', title: compLabel, data: { headers, rows } },
            },
            suggestions: matched.map(m => `${m.partnership} companies`).concat(['Show sector insights']),
          }
        }
      }

      // Default: show all partnership averages
      let sortField = 'avgAdoption'
      let sortLabel = 'adoption'
      if (lowerQuery.includes('revenue') || lowerQuery.includes('mrr')) {
        sortField = 'avgRevenue'
        sortLabel = 'avg MRR'
        allPartnershipAverages.sort((a, b) => b.avgRevenue - a.avgRevenue)
      } else if (lowerQuery.includes('transfer')) {
        sortField = 'avgTransfers'
        sortLabel = 'avg transfers'
        allPartnershipAverages.sort((a, b) => b.avgTransfers - a.avgTransfers)
      }

      const list = allPartnershipAverages.map((p, i) => {
        if (sortField === 'avgRevenue') {
          return `${i + 1}. **${p.partnership}** (${p.count} cos): avg MRR **${fmtCur(p.avgRevenue)}**, adoption **${fmtPct(p.avgAdoption)}**`
        }
        if (sortField === 'avgTransfers') {
          return `${i + 1}. **${p.partnership}** (${p.count} cos): avg transfers **${p.avgTransfers.toFixed(1)}**, adoption **${fmtPct(p.avgAdoption)}**`
        }
        return `${i + 1}. **${p.partnership}** (${p.count} cos): **${fmtPct(p.avgAdoption)}** adoption, avg MRR **${fmtCur(p.avgRevenue)}**`
      }).join('\n')

      const headers = ['Partnership', 'Companies', 'Avg Adoption', 'Avg Transfers', 'Avg MRR', 'Total Revenue']
      const rows = allPartnershipAverages.map(p => [
        p.partnership,
        p.count.toString(),
        fmtPct(p.avgAdoption),
        p.avgTransfers.toFixed(1),
        fmtCur(p.avgRevenue),
        fmtCur(p.totalRevenue),
      ])
      const top = allPartnershipAverages[0]
      return {
        text: `**Partnership Averages** (ranked by ${sortLabel}):\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: { value: top.partnership, label: `Top Partnership by ${sortLabel}`, detail: `${allPartnershipAverages.length} partnerships` },
          expandList: { type: 'table', title: 'Partnership Averages', data: { headers, rows } },
        },
        suggestions: ['Show sector insights', 'Show top companies by adoption', 'Show company stats'],
      }
    },
  },

  // ============================================
  // SECTOR GROUPING (Issue 4h)
  // ============================================
  {
    patterns: [
      /(?:show\s+)?companies?\s+by\s+sector/i,
      /sector\s+(?:breakdown|grouping|list)/i,
      /(?:group|list|show).*by\s+sector/i,
    ],
    handler: async () => {
      const sectorData = await pennyDataService.getCompaniesBySector()
      if (sectorData.length === 0) {
        return { text: 'No sector data available.' }
      }
      const list = sectorData.map(s =>
        `• **${s.sector}**: ${s.count} compan${s.count !== 1 ? 'ies' : 'y'}`
      ).join('\n')
      const headers = ['Sector', 'Count', 'Companies']
      const rows = sectorData.map(s => [
        s.sector,
        s.count.toString(),
        s.companies.slice(0, 5).map(c => c.company).join(', ') + (s.companies.length > 5 ? ` (+${s.companies.length - 5} more)` : ''),
      ])
      return {
        text: `**Companies by sector** (${sectorData.length} sectors):\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: { value: sectorData.length.toString(), label: 'Sectors', detail: 'Client Summary' },
          expandList: { type: 'table', title: 'Companies by sector', data: { headers, rows } },
        },
        suggestions: ['Show sector insights', 'Show partnership averages', 'Show top companies by adoption'],
      }
    },
  },

  // ============================================
  // CONFIG FILTER (Issue 4i)
  // ============================================
  {
    patterns: [
      /companies?\s+with\s+(?:max\s+)?transfer\s+(\d+)\s*%/i,
      /companies?\s+with\s+transfers?\s+disabled/i,
      /(?:how many|which|list|show)\s+companies?\s+(?:have|with)\s+(?:max\s+)?transfer\s+(\d+)\s*%/i,
    ],
    handler: async (query) => {
      const lowerQuery = query.toLowerCase()
      if (lowerQuery.includes('disabled')) {
        const companies = await pennyDataService.getCompaniesWithTransfersDisabled()
        if (companies.length === 0) {
          return { text: 'No companies currently have employees with transfers disabled.' }
        }
        const totalDisabled = companies.reduce((sum, c) => sum + (c.disabled_users ?? 0), 0)
        const headers = ['Company', 'Disabled Users', 'Partnership']
        const rows = companies.map(c => [c.company || '—', (c.disabled_users ?? 0).toLocaleString(), c.partnership || '—'])
        return {
          text: `**${companies.length}** compan${companies.length !== 1 ? 'ies' : 'y'} with a total of **${totalDisabled.toLocaleString()}** employees with transfers disabled.`,
          richContent: {
            type: 'summary-with-list',
            summary: {
              type: 'data-card',
              data: { value: companies.length.toString(), label: 'Companies with Transfers Disabled', detail: `${totalDisabled.toLocaleString()} total disabled users` },
            },
            list: {
              type: 'table',
              data: { headers, rows },
            },
          },
        }
      }
      const pctMatch = query.match(/(\d+)\s*%/)
      if (pctMatch) {
        const pct = parseInt(pctMatch[1])
        const companies = await pennyDataService.getCompaniesByMaxTransferPct(pct)
        if (companies.length === 0) {
          return { text: `**No companies with max transfer ${pct}%.**` }
        }
        const list = companies.map(c => `• ${c.company}`).join('\n')
        return {
          text: `**${companies.length}** compan${companies.length !== 1 ? 'ies' : 'y'} with max transfer **${pct}%**:\n\n${list}`,
          richContent: {
            type: 'data-card',
            data: { value: companies.length.toString(), label: `Max Transfer ${pct}%`, detail: 'Client Summary' },
          },
        }
      }
      return null
    },
  },

  // ============================================
  // COMPANY/CLIENT QUERIES
  // ============================================
  {
    patterns: [
      // "what sector/industry/partnership is [company] in?" -> route to company card
      /(?:what|which)\s+(?:sector|industry|partnership)\s+(?:is|does)\s+.+\s+(?:in|belong|part of)/i,
      // "is [company] live?" -> Client Summary
      /is\s+.+\s+(?:company\s+)?live/i,
      // "how many companies are live" / "how many X companies are live" / "how many DPE clients live"
      /how many\s+(?:\w+\s+)?(?:companies?|clients?)\s+(?:are\s+)?live/i,
      // "how many [model] companies are there?" -> MODEL column
      /how many\s+.+\s+companies?\s*(?:are there|do we have|exist)?/i,
      // "what model is [company] using?" / "which model does [company] use?"
      /(?:what|which)\s+model\s+(?:is|does)\s+.+\s+(?:using|use)/i,
      /(?:model|ewa\s+technology)\s+(?:for|at)\s+.+/i,
      // "how many clients in [X] partnership" -> Client Summary PARTNERSHIP column
      /(?:how many|number of)?\s*(?:clients?|companies?)\s+in\s+.+\s+partnership/i,
      /(?:in|under)\s+.+\s+partnership/i,
      // "how many transfers (taken) at [company]" -> use Client Summary transfers_in_period
      /(?:how many|number of|total)?\s*transfers?\s+(?:taken\s+)?(?:at|for|in)\s+.+/i,
      /(?:compan|client).*(?:above|below|over|under)\s+\d+(?:\.\d+)?\s*%?\s*(?:percent)?\s*(?:rate\s+)?(?:of\s+)?adoption(?:\s+rate)?/i,
      /(?:show|get|list|what are).*(?:compan|client)/i,
      /(?:compan|client).*(?:stats|statistics|summary|info)/i,
      /(?:how many|total).*(?:compan|client)/i,
      /(?:top|best|highest).*(?:compan|client)/i,
      // "which [partnership] companies have the lowest/most [metric]" -> partnership-filtered metric
      /(?:which|what)\s+.+?\s+(?:compan|client).*(?:most|highest|lowest|least|best|worst)/i,
      // "top by transfer number/amount" -> top clients by transfer amount (so transfer handler doesn't return total stats)
      /(?:top|best|highest).*transfer/i,
      // "pricing model mapped?" / "pricing model" / "product type" (general, not per-company)
      /pricing\s+model/i,
      /product\s+type/i,
      // "[X] companies" / "list [X] companies" e.g. "OSV companies", "list OSV companies" -> count + View list + sidebar
      /^(?!how many)(.+?)\s+companies\s*\.?$/i,
      /^list\s+(.+?)\s+companies\s*\.?$/i,
    ],
    handler: async (query) => {
      return await handleCompanyQuery(query)
    },
  },

  // ============================================
  // ADOPTION QUERIES (general)
  // ============================================
  {
    patterns: [
      /(?:what(?:'s| is)|show|get)\s+(?:the\s+)?(?:total\s+)?adoption/i,
      /(?:total|overall|current)\s+adoption/i,
      /adoption\s+(?:rate|stats|statistics)/i,
      /(?:show|get)\s+adoption/i,
    ],
    handler: async (query) => {
      return await handleAdoptionQuery(query)
    },
  },

  // ============================================
  // SPECIFIC COMPANY QUERIES (bare company name)
  // ============================================
  {
    patterns: [
      /(?:tell me about|info on|stats for|how is)\s+(.+?)(?:\s+doing)?$/i,
      // Bare company name (e.g. "nbhf drinks", "cinema tv house") — no leading verb
      /^(?!show|list|get|how|what|who|tell|give|is|does|has|can|will|top|best|total|overall|current)([a-z0-9][a-z0-9\s\-'.]{1,55})$/i,
    ],
    handler: async (query, matches) => {
      const name = matches[1]?.trim()
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'outstanding', 'savings', 'employees', 'help', 'companies', 'company', 'adoption', 'stats', 'top']
      if (skipWords.includes(name.toLowerCase())) return null

      // Check if it's a company name
      const company = await pennyDataService.getCompanyByName(name)
      if (company) {
        return await handleCompanyQuery(query)
      }

      // Check if it's a partnership name (e.g. bare "OSV") (Issue 2)
      const partnershipMatches3 = await pennyDataService.getCompaniesByPartnership(name)
      if (partnershipMatches3.length > 0) {
        return await handleCompanyQuery(query)
      }

      return null // Not a company, let other handlers try
    },
  },

  // ============================================
  // TRANSFER QUERIES
  // ============================================
  {
    patterns: [
      /(?:show|get|what are).*transfer/i,
      /transfer.*(?:stats|statistics|total|amount)/i,
      /(?:how much|total).*transferred/i,
      /(?:how many).*transfer/i,
      /^total\s+transfers?\s*$/i,
      /^30\s+day\s+transfers?\s*$/i,
      /^average\s+transfers?\s*$/i,
    ],
    handler: async (query) => {
      return await handleTransferQuery(query)
    },
  },

  // ============================================
  // EMPLOYEE LIST QUERIES
  // ============================================
  {
    patterns: [
      /(?:show|list|get).*(?:all\s+)?employees/i,
      /(?:how many).*employees/i,
      /employee.*(?:count|total|list)/i,
    ],
    handler: async () => {
      const count = await pennyDataService.getEmployeeCount()
      const employees = await pennyDataService.getAllEmployees()

      const sample = employees.slice(0, 25).map(e =>
        `• **${e.full_name}**${e.paused ? ' (Paused)' : ''}${e.company ? ` - ${e.company}` : ''}`
      ).join('\n')

      const expandList = {
        type: 'table',
        title: 'All Enrolled Employees',
        data: {
          headers: ['Name', 'Company', 'Status'],
          rows: employees.slice(0, 500).map(e => [e.full_name, e.company || '—', e.paused ? 'Paused' : 'Active']),
          employeeNames: employees.slice(0, 500).map(e => e.full_name),
        },
      }

      return {
        text: `**${count.total} Enrolled Employees:**\n• Active: ${count.active}\n• Paused: ${count.paused}\n\n**Sample:**\n${sample}${employees.length > 25 ? `\n\n_...and ${employees.length - 25} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: {
            value: count.total.toString(),
            label: 'Enrolled Employees',
            detail: `${count.active} active, ${count.paused} paused`,
          },
          expandList,
        },
      }
    },
  },

  // ============================================
  // LOCATION-BASED QUERIES (now searches by company since location was removed)
  // ============================================
  {
    patterns: [
      /(?:who|which|employees?).*(?:at|in|from)\s+(.+)/i,
      /(?:employees?|staff|people).*location.*(.+)/i,
    ],
    handler: async (query, matches) => {
      const location = matches[1]?.trim()
      if (!location || location.length < 2) return null

      const employees = await pennyDataService.getEmployeesByCompany(location)

      if (employees.length === 0) {
        return {
          text: `No employees found at "${location}".`,
          suggestions: ['Show all employees', 'Show all companies'],
        }
      }

      const list = employees.slice(0, 25).map(e =>
        `• **${e.full_name}**${e.paused ? ' (Paused)' : ''}`
      ).join('\n')

      const expandList = {
        type: 'table',
        title: `Employees at ${location}`,
        data: {
          headers: ['Name', 'Status'],
          rows: employees.map(e => [e.full_name, e.paused ? 'Paused' : 'Active']),
          employeeNames: employees.map(e => e.full_name),
        },
      }
      return {
        text: `**${employees.length} employees at ${location}:**\n\n${list}${employees.length > 25 ? `\n\n_...and ${employees.length - 25} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: { value: employees.length.toString(), label: `Employees at ${location}` },
          expandList,
        },
      }
    },
  },

  // ============================================
  // COMPANY EMPLOYEE QUERIES (employees at a specific company)
  // ============================================
  {
    patterns: [
      /(?:who|which|employees?|list).*(?:work|works|working).*(?:at|for)\s+(.+)/i,
      /(?:employees?|staff|people).*(?:at|for)\s+company\s+(.+)/i,
      /(?:show|list|get).*employees?.*(?:at|for|from)\s+(.+)/i,
      /employees?\s+of\s+(.+)/i,
      /enrolled\s+employees?\s+of\s+(.+)/i,
    ],
    handler: async (query, matches) => {
      const companyName = matches[1]?.trim()
      if (!companyName || companyName.length < 2) return null

      const employees = await pennyDataService.getEmployeesByCompany(companyName)

      if (employees.length === 0) {
        // Maybe it's a location instead
        const byLocation = await pennyDataService.getEmployeesByLocation(companyName)
        if (byLocation.length > 0) {
          const list = byLocation.slice(0, 25).map(e =>
            `• **${e.full_name}**${e.company ? ` (${e.company})` : ''}${e.paused ? ' - Paused' : ''}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Employees at ${companyName}`,
            data: {
              headers: ['Name', 'Company', 'Status'],
              rows: byLocation.map(e => [e.full_name, e.company || '—', e.paused ? 'Paused' : 'Active']),
              employeeNames: byLocation.map(e => e.full_name),
            },
          }
          return {
            text: `**${byLocation.length} employees at ${companyName}:**\n\n${list}${byLocation.length > 25 ? `\n\n_...and ${byLocation.length - 25} more. View the full list →_` : ''}`,
            richContent: {
              type: 'data-card',
              data: { value: byLocation.length.toString(), label: `Employees at ${companyName}` },
              expandList,
            },
          }
        }
        return {
          text: `No employees found at company "${companyName}".`,
          suggestions: ['Show all companies', 'Show all employees'],
        }
      }

      const list = employees.slice(0, 25).map(e =>
        `• **${e.full_name}**${e.company ? ` (${e.company})` : ''}${e.paused ? ' - Paused' : ''}`
      ).join('\n')

      const expandList = {
        type: 'table',
        title: `Employees at ${companyName}`,
        data: {
          headers: ['Name', 'Company'],
          rows: employees.map(e => [e.full_name, e.company || '—']),
          employeeNames: employees.map(e => e.full_name),
        },
      }
      return {
        text: `**${employees.length} employees at ${companyName}:**\n\n${list}${employees.length > 25 ? `\n\n_...and ${employees.length - 25} more. View the full list →_` : ''}`,
        richContent: {
          type: 'data-card',
          data: {
            value: employees.length.toString(),
            label: `Employees at ${companyName}`,
          },
          expandList,
        },
      }
    },
  },

  // ============================================
  // HELP QUERIES
  // ============================================
  {
    patterns: [
      /(?:help|what can you|how do i|how to)/i,
      /(?:what|which) questions/i,
    ],
    handler: async () => {
      return {
        text: "I can help you with:\n\n**Employee Information:**\n• \"Tell me about [name]\"\n• \"Is [name] enrolled?\"\n• \"What is [name]'s balance?\"\n\n**Outstanding Balances:**\n• \"Show outstanding balances\"\n• \"Who owes money?\"\n\n**Savings:**\n• \"Show savings stats\"\n• \"Who are the top savers?\"\n\n**Companies/Clients:**\n• \"Show company stats\"\n• \"Top companies by adoption\"\n• \"Employees at [company name]\"\n\n**Lists:**\n• \"List paused employees\"\n• \"Employees at [location]\"",
        suggestions: [
          'Show outstanding balances',
          'Show company stats',
          'Show savings stats',
          'List paused employees',
          'Show top companies by adoption',
        ],
      }
    },
  },
]

export { getRandomFunFact }
export default { processQuery, resetConversationContext, getConversationContext, getRandomFunFact }
