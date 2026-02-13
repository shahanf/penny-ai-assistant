/**
 * PennyAIService - Claude API Integration for Penny AI Assistant
 *
 * This service handles communication with the Claude API for natural language
 * understanding. It's designed to be activated when deployed to a production
 * server with API access.
 *
 * SETUP INSTRUCTIONS:
 * 1. Set VITE_PENNY_AI_MODE=claude in your .env file
 * 2. Set VITE_CLAUDE_API_KEY=your-api-key (or use server-side proxy)
 * 3. Optionally set VITE_CLAUDE_API_ENDPOINT for custom endpoint
 *
 * For production, it's recommended to proxy API calls through your backend
 * to keep the API key secure.
 */

import pennyDataService from './pennyDataService'

// Configuration
const config = {
  // Set to 'claude' to use Claude API, 'patterns' for regex-based matching
  mode: import.meta.env.VITE_PENNY_AI_MODE || 'patterns',

  // Claude API settings (use backend proxy in production)
  apiEndpoint: import.meta.env.VITE_CLAUDE_API_ENDPOINT || '/api/penny/chat',
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',

  // Model settings
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
}

/**
 * System prompt that gives Claude context about the admin portal data
 * Now uses async data from CSV files
 */
async function buildSystemPrompt() {
  // Ensure data service is initialized
  await pennyDataService.ensureInitialized()

  // Get current data for context
  const adoptionStats = await pennyDataService.getAdoptionStats()
  const transferStats = await pennyDataService.getTransferStats()
  const savingsStats = await pennyDataService.getSavingsStats()
  const outstandingStats = await pennyDataService.getOutstandingBalanceStats()
  const employeesWithBalance = await pennyDataService.getEmployeesWithOutstandingBalance()
  const allEmployees = await pennyDataService.getAllEmployees()
  const allCompanies = await pennyDataService.getAllCompanies()
  const companySummary = await pennyDataService.getCompanySummaryStats()
  const employeeCount = await pennyDataService.getEmployeeCount()

  // Build the outstanding balances section (top 20)
  const topBalances = employeesWithBalance.slice(0, 20)
  const balancesList = topBalances.map(e =>
    `  - ${e.full_name}: $${e.outstanding_balance.toFixed(2)}${e.location ? ` (${e.location})` : ''}`
  ).join('\n')

  // Build the companies section (top 10 by adoption)
  const topCompanies = [...allCompanies].sort((a, b) => b.adoption_rate - a.adoption_rate).slice(0, 10)
  const companiesList = topCompanies.map(c =>
    `  - ${c.company}: ${(c.adoption_rate * 100).toFixed(1)}% adoption, ${c.adopted}/${c.eligible} employees, $${c.total_transfer_amount.toLocaleString()} transferred`
  ).join('\n')

  // Build the employees section (sample of first 30)
  const sampleEmployees = allEmployees.slice(0, 30)
  const employeesList = sampleEmployees.map(e =>
    `- ${e.full_name}: ${e.paused ? 'Paused' : 'Active'}${e.location ? `, ${e.location}` : ''}${e.paytype ? `, ${e.paytype}` : ''}`
  ).join('\n')

  return `You are Penny, a helpful AI assistant for an EWA (Earned Wage Access) admin portal. Your role is to help HR administrators and managers get information about their employees' use of the EWA program.

CURRENT DATA CONTEXT:
====================

COMPANY/CLIENT SUMMARY (${companySummary?.totalCompanies || 0} live companies):
- Total eligible employees across all companies: ${companySummary?.totalEligible?.toLocaleString() || 0}
- Total adopted (enrolled): ${companySummary?.totalAdopted?.toLocaleString() || 0}
- Total active: ${companySummary?.totalActive?.toLocaleString() || 0}
- Overall adoption rate: ${companySummary?.overallAdoptionRatePercent || '0%'}
- Total transfers (all-time): ${companySummary?.totalTransfers?.toLocaleString() || 0}
- Total transfer amount (all-time): $${companySummary?.totalTransferAmount?.toLocaleString() || 0}

TOP COMPANIES BY ADOPTION:
${companiesList || 'No company data available'}

ENROLLED EMPLOYEES (${employeeCount?.total || 0} total):
- Active: ${employeeCount?.active || 0}
- Paused: ${employeeCount?.paused || 0}

SAMPLE EMPLOYEES:
${employeesList || 'No employee data available'}

SAVINGS PROGRAM:
- Employees with savings accounts: ${savingsStats?.totalAccounts || 0}
- Employees with savings balance: ${savingsStats?.employeesWithBalance || 0}
- Total saved: $${savingsStats?.totalSaved?.toLocaleString() || 0}
- Average per employee: $${savingsStats?.avgPerEmployee?.toFixed(2) || 0}

OUTSTANDING BALANCES:
- Total outstanding: $${outstandingStats?.totalBalance?.toFixed(2) || 0}
- Employees with balances: ${outstandingStats?.employeesWithBalance || 0}
- Average balance: $${outstandingStats?.avgBalance?.toFixed(2) || 0}

TOP OUTSTANDING BALANCES:
${balancesList || 'No outstanding balances'}

TRANSFER STATISTICS (All-time since company launches):
- Total transfers: ${transferStats?.totalTransfers?.toLocaleString() || 0}
- Total amount transferred: $${transferStats?.totalAmount?.toLocaleString() || 0}
- Average transfer amount: $${transferStats?.avgAmount?.toFixed(2) || 0}

RESPONSE GUIDELINES:
===================
1. Be concise and direct in your answers
2. Use **bold** for important numbers and names
3. When mentioning monetary values, always include the dollar sign
4. If asked about a specific employee, provide relevant details
5. If you can't find information, say so clearly and suggest alternatives
6. You can suggest navigation to relevant pages: /employees, /transfers, /savings, /adoption-usage, /impact-stats, /downloads, /settings
7. For report requests, mention the available reports: Transfers, Savings, Reconciliation, Outstanding Balances

IMPORTANT DATA NOTES:
====================
- If an employee is NOT in the Enrolled Employees list, they are NOT enrolled in EWA
- If an employee is NOT in the Outstanding Balances list, they have NO outstanding balance
- If an employee is NOT in the Savings Accounts list, they do NOT have a savings account
- Company stats (transfers, adoption) are ALL-TIME since each company's launch date

IMPORTANT - ASK CLARIFYING QUESTIONS:
=====================================
When a user asks a question that is ambiguous or missing context, DO NOT guess or attempt to answer with incomplete information. Instead, ask follow-up questions to clarify:

1. **Identify the employee** - If the question mentions an employee name but you need to confirm which one (or if there are multiple matches), ask to confirm.

2. **Identify what they're looking for** - Ask which metric or area they want information about:
   - Outstanding balance
   - Savings balance
   - Enrollment status
   - Location
   - Pay type

Example: If a user asks "tell me about Sarah" - DO NOT guess. Instead respond with:
"I found an employee named Sarah. Could you clarify what information you're looking for?
- Outstanding balance
- Savings balance
- Enrollment status
- General profile"

Always prioritize asking for clarification over giving an incorrect or incomplete answer.

RESPONSE FORMAT:
===============
Always respond with a JSON object in this format:
{
  "text": "Your main response text with **markdown** formatting",
  "type": "response|greeting|error|not-found",
  "richContent": { // Optional
    "type": "data-card|table|employee-card",
    "data": {}
  },
  "actions": [ // Optional
    { "label": "Button Text", "type": "navigate|download|show-table", "target": "/path" }
  ],
  "suggestions": ["Follow-up question 1", "Follow-up question 2"] // Optional
}

Remember: You are helping administrators manage their EWA program. Be professional, helpful, and data-focused.`
}

/**
 * Call Claude API with the user's query
 */
async function callClaudeAPI(userMessage, conversationHistory = []) {
  const systemPrompt = await buildSystemPrompt()

  // Build messages array
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    // If using direct API (not recommended for production - use backend proxy instead)
    if (config.apiKey && config.apiEndpoint.includes('anthropic')) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          system: systemPrompt,
          messages,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return parseClaudeResponse(data.content[0].text)
    }

    // Use backend proxy (recommended)
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversationHistory,
        systemPrompt,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return parseClaudeResponse(data.response || data.content)
  } catch (error) {
    console.error('Claude API error:', error)
    return {
      text: "I'm having trouble connecting to my AI backend. Let me try to help with pattern matching instead.",
      type: 'error',
      fallbackToPatterns: true,
    }
  }
}

/**
 * Parse Claude's response into our expected format
 */
function parseClaudeResponse(responseText) {
  try {
    // Try to parse as JSON first
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        text: parsed.text || responseText,
        type: parsed.type || 'response',
        richContent: parsed.richContent,
        actions: parsed.actions,
        suggestions: parsed.suggestions,
      }
    }
  } catch {
    // If JSON parsing fails, treat as plain text
  }

  // Return as plain text response
  return {
    text: responseText,
    type: 'response',
  }
}

/**
 * Main query processor that can use either Claude or patterns
 */
export async function processQueryWithAI(query, conversationHistory = []) {
  // Always ensure data is loaded first
  await pennyDataService.ensureInitialized()

  if (config.mode === 'claude') {
    const response = await callClaudeAPI(query, conversationHistory)

    // If Claude fails, fall back to pattern matching
    if (response.fallbackToPatterns) {
      const { processQuery } = await import('../utils/pennyQueryProcessor')
      return processQuery(query)
    }

    return response
  }

  // Default: use pattern matching
  const { processQuery } = await import('../utils/pennyQueryProcessor')
  return processQuery(query)
}

/**
 * Check if Claude mode is enabled
 */
export function isClaudeModeEnabled() {
  return config.mode === 'claude'
}

/**
 * Get current configuration (for debugging)
 */
export function getConfig() {
  return {
    mode: config.mode,
    hasApiKey: !!config.apiKey,
    endpoint: config.apiEndpoint,
    model: config.model,
  }
}

export default {
  processQueryWithAI,
  isClaudeModeEnabled,
  getConfig,
}
