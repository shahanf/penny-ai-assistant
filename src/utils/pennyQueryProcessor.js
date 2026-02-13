/**
 * PennyQueryProcessor - Pattern matching for Penny AI Assistant queries
 *
 * Processes user queries and generates appropriate responses using the CSV data service.
 * Data sources:
 * - Client Summary: Company stats (adoption, transfers, etc.)
 * - Enrolled Employees: Employee list with employee_code, paused, location, paytype
 * - Outstanding Balances: employee_code + outstanding balance
 * - Save Accounts: employee_code + savings balance + has_savings_acct
 */

import pennyDataService from '../services/pennyDataService'

// Conversation context - tracks the last mentioned employee for follow-up questions
let lastMentionedEmployee = null

// Reset conversation context (call when starting a new conversation)
export function resetConversationContext() {
  lastMentionedEmployee = null
}

// Get the current conversation context
export function getConversationContext() {
  return { lastMentionedEmployee }
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

// Helper to check if query contains any of the synonym variations
function matchesSynonyms(query, category) {
  const lowerQuery = query.toLowerCase()
  return synonyms[category]?.some(syn => lowerQuery.includes(syn)) || false
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

// Check if query uses a pronoun referring to a previous employee
function resolvePronouns(query) {
  const lowerQuery = query.toLowerCase()

  if (lastMentionedEmployee) {
    for (const pronoun of employeePronouns) {
      const pronounRegex = new RegExp(`\\b${pronoun}\\b`, 'i')
      if (pronounRegex.test(lowerQuery)) {
        const resolvedQuery = query.replace(pronounRegex, lastMentionedEmployee)
        return { resolved: true, query: resolvedQuery, originalPronoun: pronoun }
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

// ============================================
// MAIN QUERY PROCESSOR
// ============================================

export async function processQuery(query) {
  // Ensure data service is initialized
  await pennyDataService.ensureInitialized()

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
          console.error('Error in query handler:', error)
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

  if (matchesSynonyms(lowerQuery, 'adoption') || matchesSynonyms(lowerQuery, 'enrolled')) {
    return await handleAdoptionQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'company')) {
    return await handleCompanyQuery(effectiveQuery)
  }

  if (matchesSynonyms(lowerQuery, 'transfers')) {
    return await handleTransferQuery(effectiveQuery)
  }

  // Default response
  return {
    type: 'response',
    text: "I'm not sure how to help with that. You can ask me about:\n\n• **Employee information** - \"Tell me about [name]\"\n• **Outstanding balances** - \"Who has outstanding balances?\"\n• **Savings accounts** - \"Show savings stats\"\n• **Company/client stats** - \"Show company adoption rates\"\n• **Enrollment status** - \"Is [name] enrolled?\"",
    suggestions: [
      'Show outstanding balances',
      'Show company stats',
      'Show savings stats',
      'List paused employees',
      'Show top companies by adoption',
    ],
  }
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
    const company = (e.company || e.location || '').trim()
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
      return {
        text: `I couldn't find an employee named "${name}".`,
        type: 'not-found',
        suggestions: ['Show all outstanding balances', 'List all employees'],
      }
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
        e.location || e.company || '—',
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
      e.location || e.company || '—',
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
      return {
        text: `I couldn't find an employee named "${name}".`,
        type: 'not-found',
      }
    }
  }

  // General savings query
  const stats = await pennyDataService.getSavingsStats()
  const companySavings = await pennyDataService.getCompanySavingsStats()
  const employeesWithBalance = await pennyDataService.getEmployeesWithSavingsBalance()

  const lowerQuery = query.toLowerCase()
  const wantPerCompany = lowerQuery.includes('per company') || lowerQuery.includes('by company')

  let body = `**Savings Program Stats:**\n\n`
  body += `• **Total saved:** $${stats.totalSaved.toFixed(2)}\n`
  body += `• Employees with savings accounts: **${stats.totalAccounts}**\n`
  body += `• Employees with a balance: **${stats.employeesWithBalance}**\n`
  body += `• **Average saved per employee** (all enrolled): **$${stats.avgPerEmployeeAll.toFixed(2)}**\n`
  body += `• **Average saved per employee** (among those with balance): **$${stats.avgPerEmployee.toFixed(2)}**`

  if (companySavings.length > 0 && (wantPerCompany || companySavings.length <= 30)) {
    body += `\n\n**Total saved per company:**\n`
    const showCompanies = companySavings.slice(0, 25)
    showCompanies.forEach((c) => {
      body += `• **${c.company}**: $${c.totalSaved.toFixed(2)} (${c.employeeCount} employees; avg **$${c.avgPerEmployee.toFixed(2)}** per employee)\n`
    })
    if (companySavings.length > 25) {
      body += `\n...and ${companySavings.length - 25} more companies.`
    }
  }

  // Full list for sidebar: Name, Savings Balance, Company (only when we have employees with balance)
  const headers = ['Name', 'Savings Balance', 'Company']
  const rows = employeesWithBalance.map(e => [
    e.full_name,
    `$${(e.save_balance || 0).toFixed(2)}`,
    (e.company || e.location || '—').trim() || '—',
  ])

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
              value: `$${stats.totalSaved.toFixed(2)}`,
              label: 'Total Savings',
              detail: `${stats.totalAccounts} accounts • ${stats.employeesWithBalance} with balance`,
            },
          },
          list: {
            type: 'table',
            data: { headers, rows },
            amountColumnIndex: 1,
            totalLabel: 'Total Savings',
          },
        }
      : {
          type: 'data-card',
          data: {
            value: `$${stats.totalSaved.toFixed(2)}`,
            label: 'Total Savings',
            detail: `${stats.totalAccounts} accounts • avg $${stats.avgPerEmployeeAll.toFixed(2)}/employee`,
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
      `${i + 1}. **${c.company}**: ${(c.adoption_rate * 100).toFixed(1)}% adoption (${c.adopted}/${c.eligible}) • $${(c.total_transfer_amount || 0).toLocaleString()} transferred`
    ).join('\n')
    const more = sorted.length > 25 ? `\n\n...and ${sorted.length - 25} more companies.` : ''
    return {
      text: `**Companies by adoption** (${stats.totalCompanies} total):\n\n${list}${more}`,
      richContent: {
        type: 'data-card',
        data: {
          value: stats.adoptionRate,
          label: 'Adoption Rate',
          detail: `${stats.totalCompanies} companies`,
        },
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

  // 0. "How many [X] companies are live?" e.g. "How many OSV companies are live?" - partnership count
  const livePartnershipMatch = lowerQuery.match(/how many\s+(.+?)\s+companies?\s+(?:are\s+)?live/i)
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
        ? companies.map(c => `• ${c.company}`).join('\n')
        : count > 25
          ? companies.slice(0, 25).map(c => `• ${c.company}`).join('\n') + `\n\n...and ${count - 25} more.`
          : ''
      const body = list ? `\n\n**Companies:**\n${list}` : ''
      return {
        text: `**${count}** ${modelName} companies (from Client Summary, MODEL column).${body}`,
        richContent: count > 0 ? { type: 'data-card', data: { value: count.toString(), label: `${modelName} (model)`, detail: 'Client Summary' } } : undefined,
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
        ? companies.map(c => `• ${c.company}`).join('\n')
        : count > 25
          ? companies.slice(0, 25).map(c => `• ${c.company}`).join('\n') + `\n\n...and ${count - 25} more.`
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

  // 0. "Which companies are above/below X% adoption (rate)" - Client Summary, top 25
  const isAdoptionThresholdQuery = lowerQuery.includes('compan') || lowerQuery.includes('which') || lowerQuery.includes('list') || lowerQuery.includes('show')
  const aboveMatch = lowerQuery.match(/(?:above|over)\s+(\d+(?:\.\d+)?)\s*%?\s*(?:percent)?\s*(?:rate\s+)?(?:of\s+)?adoption/i) ||
    lowerQuery.match(/adoption\s+(?:rate\s+)?(?:above|over)\s+(\d+(?:\.\d+)?)\s*%?/i)
  const belowMatch = lowerQuery.match(/(?:below|under)\s+(\d+(?:\.\d+)?)\s*%?\s*(?:percent)?\s*(?:rate\s+)?(?:of\s+)?adoption/i) ||
    lowerQuery.match(/adoption\s+(?:rate\s+)?(?:below|under)\s+(\d+(?:\.\d+)?)\s*%?/i)

  if (isAdoptionThresholdQuery && (aboveMatch || belowMatch)) {
    const percent = parseFloat((aboveMatch || belowMatch)[1])
    if (!Number.isNaN(percent)) {
      const isAbove = !!aboveMatch
      const companies = isAbove
        ? await pennyDataService.getCompaniesAboveAdoptionRate(percent, 25)
        : await pennyDataService.getCompaniesBelowAdoptionRate(percent, 25)
      if (companies.length === 0) {
        const msg = isAbove
          ? `**No companies with adoption rate at or above ${percent}%.**`
          : `**No companies with adoption rate below ${percent}%.**`
        return { text: msg }
      }
      const list = companies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.adoption_rate * 100).toFixed(1)}% (${c.adopted.toLocaleString()}/${c.eligible.toLocaleString()} adopted)`
      ).join('\n')
      const header = isAbove
        ? `**Top 25 companies with adoption ≥ ${percent}%:**`
        : `**Top 25 companies with adoption < ${percent}%:**`
      return { text: `${header}\n\n${list}` }
    }
  }

  // 1. Check for top companies queries FIRST
  if (lowerQuery.includes('top') || lowerQuery.includes('best') || lowerQuery.includes('highest')) {
    // "Top [partnership] companies by adoption" e.g. "top OSV companies by adoption" — filter by partnership then sort by adoption
    const topPartnershipAdoptionMatch = lowerQuery.match(/top\s+(.+?)\s+companies?\s+by\s+adoption/i)
    if (topPartnershipAdoptionMatch && lowerQuery.includes('adoption')) {
      const partnershipName = topPartnershipAdoptionMatch[1].trim()
      if (partnershipName.length >= 2) {
        const byPartnership = await pennyDataService.getCompaniesByPartnership(partnershipName)
        if (byPartnership.length > 0) {
          const sorted = [...byPartnership]
            .sort((a, b) => (b.adoption_rate ?? 0) - (a.adoption_rate ?? 0))
            .slice(0, 25)
          const list = sorted.map((c, i) =>
            `${i + 1}. **${c.company}**: ${((c.adoption_rate ?? 0) * 100).toFixed(1)}% (${c.adopted}/${c.eligible})`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Top ${partnershipName} companies by adoption`,
            data: {
              headers: ['Company', 'Partnership', 'Adoption'],
              rows: sorted.map(c => [c.company || '—', c.partnership || '—', `${((c.adoption_rate ?? 0) * 100).toFixed(1)}%`]),
            },
          }
          return {
            text: `**Top ${partnershipName} companies by adoption:**\n\n${list}`,
            richContent: {
              type: 'data-card',
              data: {
                value: sorted.length ? `${((sorted[0]?.adoption_rate ?? 0) * 100).toFixed(1)}%` : '—',
                label: `Top ${partnershipName} by adoption`,
                detail: `${sorted.length} clients`,
              },
              expandList,
            },
            suggestions: ['Show top companies by adoption', 'Show company stats', `How many ${partnershipName} companies are live?`],
          }
        }
      }
    }

    if (lowerQuery.includes('transfer')) {
      // Only "number of transfers" (not "transfer number") -> count; else -> amount (dollar) with view list
      const byNumber = /\b(?:number\s+of\s+transfers?|by\s+number\s+(?:of\s+)?transfers?)\b/i.test(lowerQuery)
      const topCompanies = byNumber
        ? await pennyDataService.getTopCompaniesByTransferCount(25)
        : await pennyDataService.getTopCompaniesByTransfers(25)

      if (byNumber) {
        const list = topCompanies.map((c, i) =>
          `${i + 1}. **${c.company}**: ${(c.transfers_in_period ?? 0).toLocaleString()} transfers`
        ).join('\n')
        const expandList = topCompanies.length > 0 ? {
          type: 'table',
          title: 'Top clients by number of transfers',
          data: {
            headers: ['Company', 'Number of transfers'],
            rows: topCompanies.map(c => [c.company || '—', (c.transfers_in_period ?? 0).toLocaleString()]),
          },
        } : null
        return {
          text: `**Top clients by number of transfers:**\n\n${list}`,
          richContent: {
            type: 'data-card',
            data: {
              value: topCompanies.length ? (topCompanies[0]?.transfers_in_period ?? 0).toLocaleString() : '—',
              label: 'Top by number of transfers',
              detail: `${topCompanies.length} clients`,
            },
            ...(expandList && { expandList }),
          },
          suggestions: ['Show top companies by transfer amount', 'Show top companies by adoption', 'Show company stats'],
        }
      }

      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${c.total_transfer_amount.toLocaleString()}`
      ).join('\n')
      const expandList = topCompanies.length > 0 ? {
        type: 'table',
        title: 'Top clients by transfer amount',
        data: {
          headers: ['Company', 'Transfer amount'],
          rows: topCompanies.map(c => [c.company || '—', `$${c.total_transfer_amount.toLocaleString()}`]),
        },
        amountColumnIndex: 1,
      } : null
      return {
        text: `**Top clients by transfer amount:**\n\n${list}`,
        richContent: {
          type: 'data-card',
          data: {
            value: topCompanies.length ? `$${(topCompanies[0]?.total_transfer_amount ?? 0).toLocaleString()}` : '—',
            label: 'Top by transfer amount',
            detail: `${topCompanies.length} clients`,
          },
          ...(expandList && { expandList }),
        },
        suggestions: ['Show top companies by number of transfers', 'Show top companies by adoption', 'Show company stats'],
      }
    } else if (lowerQuery.includes('active')) {
      const topCompanies = await pennyDataService.getTopCompaniesByActiveUsers(25)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.active.toLocaleString()} active users (${c.adopted.toLocaleString()} adopted)`
      ).join('\n')
      return {
        text: `**Top 25 Companies by Active Users:**\n\n${list}`,
      }
    } else if (lowerQuery.includes('outstanding') || (lowerQuery.includes('balance') && !lowerQuery.includes('savings'))) {
      const topCompanies = await pennyDataService.getTopCompaniesByOutstandingBalance(25)
      if (topCompanies.length === 0) {
        return {
          text: `**No companies with outstanding balances found.**`,
        }
      }
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: $${c.totalBalance.toFixed(2)} (${c.employeeCount} employee${c.employeeCount !== 1 ? 's' : ''})`
      ).join('\n')
      return {
        text: `**Top 25 Companies by Outstanding Balance:**\n\n${list}`,
      }
    } else if (lowerQuery.includes('paused')) {
      const topCompanies = await pennyDataService.getTopCompaniesByPausedEmployees(25)
      if (topCompanies.length === 0) {
        return { text: `**No companies with paused employees.**` }
      }
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.paused} paused employee${c.paused !== 1 ? 's' : ''}`
      ).join('\n')
      return { text: `**Top 25 Companies by Paused Employees:**\n\n${list}` }
    } else if (lowerQuery.includes('enrolled')) {
      const topCompanies = await pennyDataService.getTopCompaniesByEnrolledEmployees(25)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${c.enrolled} enrolled`
      ).join('\n')
      return { text: `**Top 25 Companies by Enrolled Employees:**\n\n${list}` }
    } else {
      const topCompanies = await pennyDataService.getTopCompaniesByAdoption(25)
      const list = topCompanies.map((c, i) =>
        `${i + 1}. **${c.company}**: ${(c.adoption_rate * 100).toFixed(1)}% (${c.adopted}/${c.eligible})`
      ).join('\n')
      return {
        text: `**Top 25 Companies by Adoption Rate:**\n\n${list}`,
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
    const allCompanies = await pennyDataService.getAllCompanies()
    const byLength = [...allCompanies].filter(c => (c.company || '').trim()).sort((a, b) => (b.company || '').length - (a.company || '').length)
    for (const c of byLength) {
      const cName = (c.company || '').trim().toLowerCase()
      if (!cName || cName.length < 3) continue
      // Query must contain the company name (not the other way around)
      if (lowerQuery.includes(cName)) {
        stats = await pennyDataService.getCompanyStats(c.company)
        if (stats) break
      }
    }
  }

  // 4. If we found a specific company, return that company's stats
  if (stats) {
    // "Is [company] live?" -> short yes answer
    if (/is\s+.+\s+(?:company\s+)?live/i.test(lowerQuery)) {
      return {
        text: `**Yes**, ${stats.company} is live (in Client Summary).`,
        richContent: { type: 'data-card', data: { value: stats.company, label: 'Live', detail: 'Client Summary' } },
      }
    }
    // "What model is [company] using?" / "Which model does [company] use?" -> short answer
    if (/what\s+model\s+is\s+.+\s+using/i.test(lowerQuery) || /which\s+model\s+(?:does\s+)?.+\s+use/i.test(lowerQuery) || /(?:model|ewa\s+technology)\s+(?:for|at)\s+.+/i.test(lowerQuery)) {
      const modelDisplay = (stats.model && String(stats.model).trim()) || 'Not specified'
      return {
        text: `**${stats.company}** is using the **${modelDisplay}** model (from Client Summary).`,
        richContent: { type: 'data-card', data: { value: modelDisplay, label: 'Model', detail: stats.company } },
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
        rows: employeesWithBalance.sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0)).map(e => [e.full_name, `$${(e.outstanding_balance || 0).toFixed(2)}`, e.company || e.location || '—']),
      },
      amountColumnIndex: 1,
      totalLabel: 'Total outstanding',
    }
    const activeEmployees = employeeStats ? (employeeStats.employees || []).filter(e => !e.paused) : []
    const activeUsersExpandList = {
      type: 'table',
      title: `Active Users at ${companyName}`,
      data: {
        headers: ['Name', 'Company'],
        rows: activeEmployees.map(e => [e.full_name, e.company || e.location || '—']),
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
          },
        }
      }
    }
    const adoptedEmployees = employeeStats?.employees || []
    const adoptedExpandList = adoptedEmployees.length > 0 ? {
      type: 'table',
      title: `Adopted at ${companyName}`,
      data: {
        headers: ['Name', 'Location', 'Company'],
        rows: adoptedEmployees.map(e => [e.full_name, e.location || '—', e.company || '—']),
        employeeNames: adoptedEmployees.map(e => e.full_name),
      },
    } : null
    const eligibleExpandList = adoptedEmployees.length > 0 ? {
      type: 'table',
      title: `Employees at ${companyName}`,
      data: {
        headers: ['Name', 'Location', 'Company'],
        rows: adoptedEmployees.map(e => [e.full_name, e.location || '—', e.company || '—']),
        employeeNames: adoptedEmployees.map(e => e.full_name),
      },
    } : null
    const adminLine = admins.length > 0
      ? `\n• Admin email(s): **${admins.map(a => a.admin_email).join(', ')}**`
      : '\n• No Admins listed in A3'
    const modelLine = (stats.model && String(stats.model).trim()) ? `• Model: **${stats.model}**\n` : ''
    return {
      text: `**${stats.company}** (Client Summary):\n\n${modelLine}• Eligible: **${stats.eligible}**\n• Adopted (enrolled): **${stats.adopted}**\n• Adoption rate: **${stats.adoption_rate_percent}**\n• Active: **${stats.active}**\n• Active % of adopted: **${stats.active_percent}**\n• Transfers in period: **${(stats.transfers ?? 0).toLocaleString()}**\n• Total transfer amount: **$${(stats.total_transfer_amount ?? 0).toLocaleString()}**${adminLine}`,
      richContent: {
        type: 'company-stats-card',
        data: {
          company: stats.company,
          partnership: stats.partnership,
          launch_date: stats.launch_date,
          eligible: stats.eligible,
          adopted: stats.adopted,
          adoption_rate_percent: stats.adoption_rate_percent,
          active: stats.active,
          active_percent: stats.active_percent,
          transfers: stats.transfers ?? 0,
          total_transfer_amount: stats.total_transfer_amount ?? 0,
          model: stats.model,
          admins,
          outstandingBalanceTotal,
          outstandingBalanceExpandList,
          activeUsersExpandList,
          ...(partnershipExpandList && { partnershipExpandList }),
          ...(adoptedExpandList && { adoptedExpandList }),
          ...(eligibleExpandList && { eligibleExpandList }),
        },
      },
      suggestions: [
        `Show outstanding balances at ${companyName}`,
        `Savings at ${companyName}`,
        `Employees at ${companyName}`,
        `Admin email for ${companyName}`,
        `Employees of ${companyName}`,
        `Enrolled Employees of ${companyName}`,
        'Show company stats',
        'Show top companies by adoption',
      ],
    }
  }

  // 5. Fallback: return general company stats
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

async function handleTransferQuery(query) {
  const stats = await pennyDataService.getTransferStats()
  const companySummary = await pennyDataService.getCompanySummaryStats()

  return {
    text: `**Transfer Statistics (All-time since launches):**\n\n• Total transfers: **${stats.totalTransfers.toLocaleString()}**\n• Total amount transferred: **$${stats.totalAmount.toLocaleString()}**\n• Average transfer amount: **$${stats.avgAmount.toFixed(2)}**`,
    richContent: {
      type: 'data-card',
      data: {
        value: `$${stats.totalAmount.toLocaleString()}`,
        label: 'Total Transferred',
        detail: `${stats.totalTransfers.toLocaleString()} transfers`,
      },
    },
  }
}

// ============================================
// QUERY HANDLERS
// ============================================

const queryHandlers = [
  // ============================================
  // GREETING QUERIES
  // ============================================
  {
    patterns: [
      /^(?:hi|hello|hey|howdy|good\s*(?:morning|afternoon|evening))[\s!.]*$/i,
      /^(?:hi|hello|hey)\s+(?:penny|there)[\s!.]*$/i,
    ],
    handler: async () => {
      return {
        text: "Hello! I'm Penny, your EWA assistant. I can help you with:\n\n• **Employee information** - balances, savings, enrollment status\n• **Company stats** - adoption rates, transfer volumes\n• **Outstanding balances** - who owes what\n• **Savings accounts** - balances and participation\n\nWhat would you like to know?",
        type: 'greeting',
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

      // Clean up company name - remove trailing punctuation
      const cleanCompanyName = companyName.replace(/[?.!,]+$/, '').trim()

      // Use Client Summary (COMPANY column) as source of truth for company stats
      const summary = await pennyDataService.getCompanyStats(cleanCompanyName)
      if (!summary) {
        return {
          text: `I couldn't find "${cleanCompanyName}" in the Client Summary. Check the company name matches the COMPANY column in the Client Summary file.`,
          type: 'not-found',
          suggestions: ['Show all companies', 'List all employees'],
        }
      }

      const lowerQuery = query.toLowerCase()
      const displayName = summary.company || cleanCompanyName

      // "How many active users at [company]" -> use Client Summary ACTIVE + list from employee data
      if (lowerQuery.includes('active') && (lowerQuery.includes('user') || lowerQuery.includes('employee') || lowerQuery.includes('how many'))) {
        const employeeStats = await pennyDataService.getCompanyEmployeeStats(cleanCompanyName)
        const activeEmployees = employeeStats?.employees?.filter(e => !e.paused) ?? []
        const expandList = activeEmployees.length > 0 ? {
          type: 'table',
          title: `Active Users at ${displayName}`,
          data: {
            headers: ['Name', 'Location', 'Company'],
            rows: activeEmployees.map(e => [e.full_name, e.location || '—', e.company || '—']),
            employeeNames: activeEmployees.map(e => e.full_name),
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
            headers: ['Name', 'Location', 'Company'],
            rows: employeeStats.employees.map(e => [e.full_name, e.location || '—', e.company || '—']),
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
        const admins = await pennyDataService.getAdminsByCompany(cleanCompanyName)
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
            headers: ['Name', 'Location', 'Company'],
            rows: employeeStats.employees.map(e => [e.full_name, e.location || '—', e.company || '—']),
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
          const list = employeeStats.employees.slice(0, 10).map(e =>
            `• ${e.full_name}${e.paused ? ' (Paused)' : ' (Active)'}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Employees at ${displayName}`,
            data: {
              headers: ['Name', 'Location', 'Company'],
              rows: employeeStats.employees.map(e => [e.full_name, e.location || '—', e.company || '—']),
              employeeNames: employeeStats.employees.map(e => e.full_name),
            },
          }
          return {
            text: `**${employeeStats.totalEmployees} employees at ${displayName}:**\n\n${list}${employeeStats.totalEmployees > 10 ? `\n\n...and ${employeeStats.totalEmployees - 10} more` : ''}`,
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
          const employees = employeeStats.employees.slice(0, 10)
          const list = employees.map(e =>
            `• ${e.full_name}${e.paused ? ' (Paused)' : ' (Active)'}`
          ).join('\n')
          const expandList = {
            type: 'table',
            title: `Enrolled Employees at ${displayName}`,
            data: {
              headers: ['Name', 'Location', 'Company'],
              rows: employeeStats.employees.map(e => [e.full_name, e.location || '—', e.company || '—']),
              employeeNames: employeeStats.employees.map(e => e.full_name),
            },
          }
          return {
            text: `**Enrolled employees at ${displayName}** (${employeeStats.totalEmployees} total; Client Summary has ${summary.adopted} adopted):\n\n${list}${employeeStats.totalEmployees > 10 ? `\n\n...and ${employeeStats.totalEmployees - 10} more` : ''}`,
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
          rows: employeesWithBalanceSummary.sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0)).map(e => [e.full_name, `$${(e.outstanding_balance || 0).toFixed(2)}`, e.company || e.location || '—']),
        },
        amountColumnIndex: 1,
        totalLabel: 'Total outstanding',
      }
      const activeEmployeesSummary = employeeStatsSummary ? (employeeStatsSummary.employees || []).filter(e => !e.paused) : []
      const activeUsersExpandListSummary = {
        type: 'table',
        title: `Active Users at ${displayName}`,
        data: {
          headers: ['Name', 'Company'],
          rows: activeEmployeesSummary.map(e => [e.full_name, e.company || e.location || '—']),
        },
      }
      const adoptedEmployeesSummary = employeeStatsSummary?.employees || []
      const adoptedExpandListSummary = adoptedEmployeesSummary.length > 0 ? {
        type: 'table',
        title: `Adopted at ${displayName}`,
        data: {
          headers: ['Name', 'Location', 'Company'],
          rows: adoptedEmployeesSummary.map(e => [e.full_name, e.location || '—', e.company || '—']),
          employeeNames: adoptedEmployeesSummary.map(e => e.full_name),
        },
      } : null
      const eligibleExpandListSummary = adoptedEmployeesSummary.length > 0 ? {
        type: 'table',
        title: `Employees at ${displayName}`,
        data: {
          headers: ['Name', 'Location', 'Company'],
          rows: adoptedEmployeesSummary.map(e => [e.full_name, e.location || '—', e.company || '—']),
          employeeNames: adoptedEmployeesSummary.map(e => e.full_name),
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
      const adminLine = admins.length > 0
        ? `\n• Admin email(s): **${admins.map(a => a.admin_email).join(', ')}**`
        : '\n• No Admins listed in A3'
      const modelLineSummary = (summary.model && String(summary.model).trim()) ? `• Model: **${summary.model}**\n` : ''
      return {
        text: `**${displayName}** (Client Summary):\n\n${modelLineSummary}• Eligible: **${summary.eligible}**\n• Adopted (enrolled): **${summary.adopted}**\n• Adoption rate: **${summary.adoption_rate_percent}**\n• Active: **${summary.active}**\n• Active % of adopted: **${summary.active_percent}**\n• Transfers in period: **${summary.transfers?.toLocaleString() ?? 0}**\n• Total transfer amount: **$${(summary.total_transfer_amount ?? 0).toLocaleString()}**${adminLine}`,
        richContent: {
          type: 'company-stats-card',
          data: {
            company: displayName,
            partnership: summary.partnership,
            launch_date: summary.launch_date,
            eligible: summary.eligible,
            adopted: summary.adopted,
            adoption_rate_percent: summary.adoption_rate_percent,
            active: summary.active,
            active_percent: summary.active_percent,
            transfers: summary.transfers ?? 0,
            total_transfer_amount: summary.total_transfer_amount ?? 0,
            model: summary.model,
            admins,
            outstandingBalanceTotal: outstandingBalanceTotalSummary,
            outstandingBalanceExpandList: outstandingBalanceExpandListSummary,
            activeUsersExpandList: activeUsersExpandListSummary,
            ...(partnershipExpandListSummary && { partnershipExpandList: partnershipExpandListSummary }),
            ...(adoptedExpandListSummary && { adoptedExpandList: adoptedExpandListSummary }),
            ...(eligibleExpandListSummary && { eligibleExpandList: eligibleExpandListSummary }),
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
      const rawName = (matches[1]?.trim() || extractEmployeeName(query))
      const name = cleanEmployeeNameFromQuery(rawName)
      if (!name || name.length < 2) return null

      const skipWords = ['the', 'total', 'all', 'our', 'my', 'outstanding', 'savings', 'everyone', 'employees', 'savings stats', 'saving stats', 'save stats']
      const nameNorm = name.toLowerCase().replace(/\s+/g, ' ').trim()
      if (skipWords.includes(nameNorm)) return null
      // Don't treat "savings stats"-style phrases as employee names (e.g. "savings  stats", "saving stat")
      if (/saving/.test(nameNorm) && /stat/.test(nameNorm)) return null

      // If this is a company name, don't treat as employee — let company handler respond
      const company = await pennyDataService.getCompanyByName(name)
      if (company) return null

      // Check for duplicates - get ALL matching employees
      const allMatches = await pennyDataService.getEmployeesByName(name)
      
      if (allMatches.length === 0) {
        return {
          text: `I couldn't find an employee named "${name}".`,
          type: 'not-found',
          suggestions: ['Show all employees', 'Search by location'],
        }
      }

      // If multiple employees with same name, show all of them
      if (allMatches.length > 1) {
        let details = `**Found ${allMatches.length} employees named "${name}":**\n\n`
        allMatches.forEach((emp, i) => {
          details += `**${i + 1}. ${emp.full_name}**\n`
          details += `   • Status: ${emp.paused ? 'Paused' : 'Active'}\n`
          if (emp.company) details += `   • Company: ${emp.company}\n`
          if (emp.location) details += `   • Location: ${emp.location}\n`
          if (emp.employee_code) details += `   • Employee Code: ${emp.employee_code}\n`
          if (emp.outstanding_balance > 0) details += `   • Outstanding: $${emp.outstanding_balance.toFixed(2)}\n`
          if (emp.save_balance > 0) details += `   • Savings: $${emp.save_balance.toFixed(2)}\n`
          details += '\n'
        })
        details += `_Use employee code for exact lookup if needed._`
        
        return {
          text: details,
          richContent: { 
            type: 'data-card', 
            data: { 
              value: allMatches.length.toString(), 
              label: 'Duplicate Names Found',
              detail: `${allMatches.length} employees named "${name}"` 
            } 
          },
        }
      }

      // Single match - show full details
      const employee = await pennyDataService.getEmployeeFullDetails(name)
      if (!employee) {
        return {
          text: `I couldn't find an employee named "${name}".`,
          type: 'not-found',
          suggestions: ['Show all employees', 'Search by location'],
        }
      }

      await updateEmployeeContext(employee.full_name)

      let details = `**${employee.full_name}**\n\n`
      details += `• Status: **${employee.status}**\n`
      if (employee.company) details += `• Company: ${employee.company}\n`
      if (employee.location) details += `• Location: ${employee.location}\n`
      if (employee.paytype) details += `• Pay type: ${employee.paytype}\n`
      if (employee.hasOutstandingBalance) {
        details += `• Outstanding balance: **$${employee.outstanding_balance.toFixed(2)}**\n`
      }
      if (employee.hasSavings) {
        details += `• Savings balance: **$${employee.save_balance.toFixed(2)}**\n`
      }

      const empSuggestions = [
        `What is ${employee.full_name}'s outstanding balance?`,
        `Does ${employee.full_name} have savings?`,
        `Is ${employee.full_name} enrolled?`,
      ]
      if (employee.company) {
        empSuggestions.push(`Show company stats for ${employee.company}`, `Outstanding balance at ${employee.company}`)
      }
      return {
        text: details,
        richContent: { type: 'employee-card', data: employee },
        suggestions: empSuggestions.slice(0, 6),
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

      // Check for duplicates
      const allMatches = await pennyDataService.getEmployeesByName(name)
      
      if (allMatches.length === 0) {
        return {
          text: `I couldn't find an employee named "${name}". They may not be enrolled in EWA.`,
          type: 'not-found',
          suggestions: ['Show adoption stats', 'List enrolled employees'],
        }
      }

      // If multiple employees with same name, show all statuses
      if (allMatches.length > 1) {
        let details = `**Found ${allMatches.length} employees named "${name}":**\n\n`
        allMatches.forEach((emp, i) => {
          const statusEmoji = emp.paused ? '⏸️' : '✅'
          const status = emp.paused ? 'Paused' : 'Active'
          details += `${statusEmoji} **${i + 1}. ${emp.full_name}** - ${status}\n`
          if (emp.company) details += `   Company: ${emp.company}\n`
          if (emp.employee_code) details += `   Code: ${emp.employee_code}\n`
          details += '\n'
        })
        return { text: details }
      }

      const result = await pennyDataService.isEmployeeEnrolled(name)

      if (!result.found) {
        return {
          text: `I couldn't find an employee named "${name}". They may not be enrolled in EWA.`,
          type: 'not-found',
          suggestions: ['Show adoption stats', 'List enrolled employees'],
        }
      }

      await updateEmployeeContext(result.employee.full_name)

      const statusEmoji = result.isPaused ? '⏸️' : '✅'
      const statusMsg = result.isPaused
        ? 'is currently **Paused** and cannot make transfers'
        : 'is **Active** and enrolled in the EWA program'

      return {
        text: `${statusEmoji} **${result.employee.full_name}** ${statusMsg}.`,
        richContent: { type: 'employee-card', data: result.employee },
      }
    },
  },

  // ============================================
  // PAUSED EMPLOYEES QUERIES
  // ============================================
  {
    patterns: [
      /(?:who|which|list|show).*(?:paused|blocked|inactive)/i,
      /paused employees/i,
      /employees.*paused/i,
    ],
    handler: async () => {
      const pausedEmployees = await pennyDataService.getEmployeesByStatus('paused')

      if (pausedEmployees.length === 0) {
        return {
          text: 'There are no paused employees currently.',
        }
      }

      const headers = ['Name', 'Location', 'Company']
      const rows = pausedEmployees.map(e => [e.full_name, e.location || '—', e.company || '—'])
      const drillSuggestions = buildDrillDownSuggestions(pausedEmployees, 2, 2)

      return {
        text: `There are **${pausedEmployees.length} paused employees**.`,
        richContent: {
          type: 'summary-with-list',
          summary: {
            type: 'data-card',
            data: {
              label: 'Paused Employees',
              value: pausedEmployees.length.toString(),
            },
          },
          list: {
            type: 'table',
            data: { headers, rows },
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
        return { text: `I couldn't find an employee named "${name}".`, type: 'not-found' }
      }
      if (allMatches.length > 1) {
        const lines = allMatches.map((e, i) => {
          const loc = [e.company, e.location].filter(Boolean).join(', ') || '—'
          return `${i + 1}. **${e.full_name}**: ${loc}`
        }).join('\n')
        return { text: `**Found ${allMatches.length} employees named "${name}":**\n\n${lines}` }
      }
      const emp = allMatches[0]
      const place = [emp.company, emp.location].filter(Boolean).join(emp.company && emp.location ? ' · ' : '') || '—'
      return {
        text: `**${emp.full_name}** works at ${place}.`,
        richContent: { type: 'employee-card', data: emp },
      }
    },
  },

  // ============================================
  // COMPANY/CLIENT QUERIES
  // ============================================
  {
    patterns: [
      // "is [company] live?" -> Client Summary
      /is\s+.+\s+(?:company\s+)?live/i,
      // "how many companies are live" / "how many X companies are live"
      /how many\s+(?:\w+\s+)?companies?\s+(?:are\s+)?live/i,
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
      // "top by transfer number/amount" -> top clients by transfer amount (so transfer handler doesn't return total stats)
      /(?:top|best|highest).*transfer/i,
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

      const sample = employees.slice(0, 15).map(e =>
        `• ${e.full_name}${e.paused ? ' (Paused)' : ''}${e.location ? ` - ${e.location}` : ''}`
      ).join('\n')

      return {
        text: `**${count.total} Enrolled Employees:**\n• Active: ${count.active}\n• Paused: ${count.paused}\n\n**Sample:**\n${sample}${employees.length > 15 ? `\n\n...and ${employees.length - 15} more` : ''}`,
        richContent: {
          type: 'data-card',
          data: {
            value: count.total.toString(),
            label: 'Enrolled Employees',
            detail: `${count.active} active, ${count.paused} paused`,
          },
        },
      }
    },
  },

  // ============================================
  // LOCATION-BASED QUERIES
  // ============================================
  {
    patterns: [
      /(?:who|which|employees?).*(?:at|in|from)\s+(.+)/i,
      /(?:employees?|staff|people).*location.*(.+)/i,
    ],
    handler: async (query, matches) => {
      const location = matches[1]?.trim()
      if (!location || location.length < 2) return null

      const employees = await pennyDataService.getEmployeesByLocation(location)

      if (employees.length === 0) {
        return {
          text: `No employees found at location "${location}".`,
          suggestions: ['Show all employees', 'List all locations'],
        }
      }

      const list = employees.slice(0, 20).map(e =>
        `• ${e.full_name}${e.paused ? ' (Paused)' : ''}`
      ).join('\n')

      return {
        text: `**${employees.length} employees at ${location}:**\n\n${list}${employees.length > 20 ? `\n\n...and ${employees.length - 20} more` : ''}`,
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
          const list = byLocation.slice(0, 20).map(e =>
            `• ${e.full_name}${e.company ? ` (${e.company})` : ''}${e.paused ? ' - Paused' : ''}`
          ).join('\n')
          return {
            text: `**${byLocation.length} employees at ${companyName}:**\n\n${list}${byLocation.length > 20 ? `\n\n...and ${byLocation.length - 20} more` : ''}`,
          }
        }
        return {
          text: `No employees found at company "${companyName}".`,
          suggestions: ['Show all companies', 'Show all employees'],
        }
      }

      const list = employees.slice(0, 20).map(e =>
        `• ${e.full_name}${e.location ? ` (${e.location})` : ''}${e.paused ? ' - Paused' : ''}`
      ).join('\n')

      const expandList = {
        type: 'table',
        title: `Employees at ${companyName}`,
        data: {
          headers: ['Name', 'Location', 'Company'],
          rows: employees.map(e => [e.full_name, e.location || '—', e.company || '—']),
          employeeNames: employees.map(e => e.full_name),
        },
      }
      return {
        text: `**${employees.length} employees at ${companyName}:**\n\n${list}${employees.length > 20 ? `\n\n...and ${employees.length - 20} more` : ''}`,
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

export default { processQuery, resetConversationContext, getConversationContext }
