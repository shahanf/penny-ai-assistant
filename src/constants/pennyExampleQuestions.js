/**
 * Placeholder replaced with a random employee name from Enrolled Employees at runtime.
 */
export const RANDOM_EMPLOYEE_PLACEHOLDER = '__RANDOM_EMPLOYEE__'

/**
 * Placeholder replaced with a random company name from Client Summary at runtime.
 */
export const RANDOM_COMPANY_PLACEHOLDER = '__RANDOM_COMPANY__'

/**
 * Second company placeholder for comparisons — replaced with a different random company name.
 */
export const RANDOM_COMPANY_B_PLACEHOLDER = '__RANDOM_COMPANY_B__'

/**
 * Placeholder replaced with a random partnership name from Client Summary at runtime.
 */
export const RANDOM_PARTNERSHIP_PLACEHOLDER = '__RANDOM_PARTNERSHIP__'

/**
 * Example questions for Penny "More questions" / "Try asking" section.
 * Show 8 at a time, rotate every 20 seconds.
 * Use displayText for UI when different from the actual query (e.g. "Show US stats" -> query "Show Company stats").
 * Employee examples use RANDOM_EMPLOYEE_PLACEHOLDER; company uses RANDOM_COMPANY_PLACEHOLDER; partnership uses RANDOM_PARTNERSHIP_PLACEHOLDER.
 *
 * Organized by category to ensure variety in each rotation window.
 */
export const PENNY_EXAMPLE_QUESTIONS = [
  // ── Employee Info ──
  { text: `Tell me about ${RANDOM_EMPLOYEE_PLACEHOLDER}`, icon: '👤' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} enrolled?`, icon: '✅' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} active?`, icon: '✅' },
  { text: `Where does ${RANDOM_EMPLOYEE_PLACEHOLDER} work?`, icon: '📍' },
  { text: `Does ${RANDOM_EMPLOYEE_PLACEHOLDER} have an outstanding balance?`, icon: '💰' },
  { text: `Does ${RANDOM_EMPLOYEE_PLACEHOLDER} have a savings account?`, icon: '🏦' },
  { text: `What is ${RANDOM_EMPLOYEE_PLACEHOLDER}'s savings balance?`, icon: '🏦' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} paused?`, icon: '⏸️' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} salary or hourly?`, icon: '💳' },
  { text: `When did ${RANDOM_EMPLOYEE_PLACEHOLDER} start?`, icon: '📅' },
  { text: `Who does ${RANDOM_EMPLOYEE_PLACEHOLDER} work for?`, icon: '🏢' },
  { text: `How many transfers has ${RANDOM_EMPLOYEE_PLACEHOLDER} made?`, icon: '💸' },
  { text: `When was ${RANDOM_EMPLOYEE_PLACEHOLDER}'s last transfer?`, icon: '📅' },
  { text: `How active is ${RANDOM_EMPLOYEE_PLACEHOLDER} in the last 30 days?`, icon: '📊' },

  // ── Employee Lists ──
  { text: 'List paused employees', icon: '⏸️' },
  { text: `Paused employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '⏸️' },
  { text: 'Show all employees', icon: '👥' },
  { text: 'How many employees total?', icon: '📋' },
  { text: `Hourly employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💳' },
  { text: `Salary employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💳' },

  // ── Company Info ──
  { text: `Tell me about ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🏢' },
  { text: `Is ${RANDOM_COMPANY_PLACEHOLDER} live?`, icon: '🔍' },
  { text: `Admin email for ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📧' },
  { text: `Who is the CSM for ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '🧑' },
  { text: `Delivery manager for ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🧑' },
  { text: `When did ${RANDOM_COMPANY_PLACEHOLDER} launch?`, icon: '🚀' },
  { text: `What sector is ${RANDOM_COMPANY_PLACEHOLDER} in?`, icon: '🏷️' },
  { text: `What is ${RANDOM_COMPANY_PLACEHOLDER}'s credit score?`, icon: '📊' },
  { text: `What is ${RANDOM_COMPANY_PLACEHOLDER}'s product type?`, icon: '🏷️' },

  // ── Per-Company Metrics ──
  { text: `Active users at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '👥' },
  { text: `How many employees at ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '📋' },
  { text: `How many enrolled at ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '✅' },
  { text: `Outstanding balance at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💰' },
  { text: `Savings at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🏦' },
  { text: `Shifts at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📅' },
  { text: `Adoption rate at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📈' },
  { text: `30-day net revenue at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💵' },
  { text: `Average transfers at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📊' },
  { text: `Average streamers at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📊' },
  { text: `Weekly active users at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📱' },
  { text: `Daily active users at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📱' },
  { text: `Monthly active users at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📱' },
  { text: `Pending employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '⏳' },
  { text: `New joiners at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🆕' },
  { text: `Employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '👥' },
  { text: `Transfers at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💸' },
  { text: `Total transfers at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💸' },
  { text: `30 day transfers at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💸' },
  { text: `Enrolling employees at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📝' },

  // ── Top Companies Rankings ──
  { text: 'Top companies by adoption', icon: '📈' },
  { text: 'Top companies by transfers', icon: '💸' },
  { text: 'Top companies by number of transfers', icon: '🔢' },
  { text: 'Top companies by 30d net revenue', icon: '💵' },
  { text: 'Top companies by active users', icon: '👥' },
  { text: 'Top companies by daily active users', icon: '📱' },
  { text: 'Top companies by weekly active users', icon: '📱' },
  { text: 'Top companies by monthly active users', icon: '📱' },
  { text: 'Top companies by outstanding balance', icon: '💰' },
  { text: 'Top companies by savings balance', icon: '🏦' },
  { text: 'Top companies by paused employees', icon: '⏸️' },
  { text: 'Top companies by enrolled employees', icon: '👥' },
  { text: 'Top companies by trailing 30d streamers', icon: '📊' },
  { text: 'Top companies by shifts', icon: '📅' },

  // ── Partnership Queries ──
  { text: `List all live ${RANDOM_PARTNERSHIP_PLACEHOLDER} clients`, icon: '🤝' },
  { text: `List all live ${RANDOM_PARTNERSHIP_PLACEHOLDER} companies`, icon: '🤝' },
  { text: `How many ${RANDOM_PARTNERSHIP_PLACEHOLDER} companies are live?`, icon: '🤝' },
  { text: `${RANDOM_PARTNERSHIP_PLACEHOLDER} companies`, icon: '🤝' },
  { text: `Top ${RANDOM_PARTNERSHIP_PLACEHOLDER} companies by adoption`, icon: '📈' },
  { text: `Is ${RANDOM_COMPANY_PLACEHOLDER} a ${RANDOM_PARTNERSHIP_PLACEHOLDER} client?`, icon: '🤝' },
  { text: `What is ${RANDOM_COMPANY_PLACEHOLDER}'s partnership?`, icon: '🤝' },
  { text: 'Top partnerships by adoption', icon: '📈' },
  { text: `Which ${RANDOM_PARTNERSHIP_PLACEHOLDER} company has the most daily active users?`, icon: '📱' },
  { text: `Which ${RANDOM_PARTNERSHIP_PLACEHOLDER} companies have the lowest adoption?`, icon: '📉' },
  { text: `Which ${RANDOM_PARTNERSHIP_PLACEHOLDER} company has the most transfers?`, icon: '💸' },

  // ── User Segments ──
  { text: 'Show power users', icon: '⚡' },
  { text: 'Show dormant users', icon: '😴' },
  { text: 'Users with 5+ transfers a month', icon: '🔥' },
  { text: 'High-frequency users', icon: '🔥' },
  { text: 'New users this week', icon: '🆕' },
  { text: 'First-time users this week', icon: '🆕' },
  { text: 'Who transfers the most?', icon: '⚡' },

  // ── Company Comparison ──
  { text: `Compare ${RANDOM_COMPANY_PLACEHOLDER} vs ${RANDOM_COMPANY_B_PLACEHOLDER}`, icon: '⚖️' },
  { text: `How does ${RANDOM_COMPANY_PLACEHOLDER} compare to sector avg?`, icon: '📊' },
  { text: `Is ${RANDOM_COMPANY_PLACEHOLDER} below avg adoption for its partnership?`, icon: '📊' },
  { text: `Rank ${RANDOM_COMPANY_PLACEHOLDER} against similar size peers`, icon: '🏅' },

  // ── Sector Insights ──
  { text: 'Which sector has highest adoption?', icon: '🏷️' },
  { text: 'Best performing sector by revenue', icon: '🏷️' },
  { text: 'Sector breakdown', icon: '🏷️' },
  { text: 'Sector comparison', icon: '🏷️' },

  // ── Partnership Comparisons ──
  { text: 'Show partnership averages', icon: '🤝' },
  { text: 'Partnership comparison', icon: '🤝' },

  // ── Adoption Thresholds ──
  { text: 'Which companies are above 20% adoption?', icon: '📈' },
  { text: 'Which companies are below 10% adoption rate?', icon: '📉' },
  { text: 'Companies above 50% adoption', icon: '📈' },

  // ── Company Counts & Filters ──
  { text: 'How many companies are live?', icon: '🏢' },
  { text: 'Companies with transfers disabled', icon: '🚫' },
  { text: 'Companies by sector', icon: '🏷️' },
  { text: 'Sector breakdown', icon: '🏷️' },

  // ── General Stats ──
  { text: "What's total adoption?", icon: '📈' },
  { text: 'Show outstanding balances', icon: '💰' },
  { text: 'Show savings stats', icon: '🏦' },
  { text: 'Show transfer stats', icon: '💸' },
  { text: 'Who has outstanding balances?', icon: '💰' },
  { text: 'How much has been transferred?', icon: '💸' },
  { text: 'Average transfer amount', icon: '📊' },
  { text: 'How many employees are enrolled?', icon: '✅' },
  { text: 'Total revenue', icon: '💵' },
  { text: 'Total 30d net revenue', icon: '💵' },
  { text: 'How many employees are paused?', icon: '⏸️' },

  // ── CSM / Delivery Manager ──
  { text: `Who launched ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '🚀' },

  // ── Employees by Company ──
  { text: `Who works at ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '🏢' },

  // ── Follow-up / Context ──
  { text: 'What about their adoption?', displayText: 'Follow-up: What about their adoption?', icon: '💬' },
  { text: 'Who launched them?', displayText: 'Follow-up: Who launched them?', icon: '💬' },
]

export const PENNY_EXAMPLE_ROTATE_MS = 4 * 1000
export const PENNY_EXAMPLE_SHOW_COUNT = 4

/** Fallback when Enrolled Employees aren't loaded yet */
const FALLBACK_EMPLOYEE_DISPLAY = 'an employee'

/** Fallback when Client Summary isn't loaded yet */
const FALLBACK_COMPANY_DISPLAY = 'a company'

/** Fallback when partnerships aren't loaded yet */
const FALLBACK_PARTNERSHIP_DISPLAY = 'partnership'

function replaceAll(s, placeholder, value) {
  if (!s) return s
  const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return s.replace(new RegExp(escaped, 'g'), value)
}

/**
 * Substitute random employee and company names into prompt text/displayText.
 */
export function substituteRandomEmployee(prompt, randomEmployeeName) {
  const name = randomEmployeeName || FALLBACK_EMPLOYEE_DISPLAY
  const replace = (s) => replaceAll(s, RANDOM_EMPLOYEE_PLACEHOLDER, name)
  return {
    ...prompt,
    text: replace(prompt.text),
    displayText: prompt.displayText != null ? replace(prompt.displayText) : undefined,
  }
}

/**
 * Substitute random employee, company, and partnership names into prompt text/displayText.
 */
export function substituteRandomEmployeeAndCompany(prompt, randomEmployeeName, randomCompanyName, randomPartnershipName = null, randomCompanyBName = null) {
  const employeeName = randomEmployeeName || FALLBACK_EMPLOYEE_DISPLAY
  const companyName = randomCompanyName || FALLBACK_COMPANY_DISPLAY
  const companyBName = randomCompanyBName || FALLBACK_COMPANY_DISPLAY
  const partnershipName = randomPartnershipName || FALLBACK_PARTNERSHIP_DISPLAY
  let s = (prompt.text || '')
  s = replaceAll(s, RANDOM_EMPLOYEE_PLACEHOLDER, employeeName)
  s = replaceAll(s, RANDOM_COMPANY_B_PLACEHOLDER, companyBName)
  s = replaceAll(s, RANDOM_COMPANY_PLACEHOLDER, companyName)
  s = replaceAll(s, RANDOM_PARTNERSHIP_PLACEHOLDER, partnershipName)
  let displayText = prompt.displayText != null ? prompt.displayText : undefined
  if (displayText != null) {
    displayText = replaceAll(displayText, RANDOM_EMPLOYEE_PLACEHOLDER, employeeName)
    displayText = replaceAll(displayText, RANDOM_COMPANY_B_PLACEHOLDER, companyBName)
    displayText = replaceAll(displayText, RANDOM_COMPANY_PLACEHOLDER, companyName)
    displayText = replaceAll(displayText, RANDOM_PARTNERSHIP_PLACEHOLDER, partnershipName)
  }
  return {
    ...prompt,
    text: s,
    displayText,
  }
}

/**
 * Get the current slice of example questions for display (rotating window).
 * Accepts arrays of names so each question gets a different random name.
 * @param {number} startIndex - Current rotation index (0-based).
 * @param {string[]} [randomEmployeeNames] - Array of employee names to cycle through.
 * @param {string[]} [randomCompanyNames] - Array of company names to cycle through.
 * @param {string[]} [randomPartnershipNames] - Array of partnership names to cycle through.
 * @returns {Array<{text: string, displayText?: string, icon: string}>}
 */
export function getRotatingExampleQuestions(startIndex, randomEmployeeNames = [], randomCompanyNames = [], randomPartnershipNames = []) {
  const empNames = Array.isArray(randomEmployeeNames) ? randomEmployeeNames : []
  const compNames = Array.isArray(randomCompanyNames) ? randomCompanyNames : []
  const partNames = Array.isArray(randomPartnershipNames) ? randomPartnershipNames : []
  const len = PENNY_EXAMPLE_QUESTIONS.length
  const start = startIndex % len
  const slice = []
  for (let i = 0; i < PENNY_EXAMPLE_SHOW_COUNT; i++) {
    const prompt = PENNY_EXAMPLE_QUESTIONS[(start + i) % len]
    const empName = empNames.length > 0 ? empNames[i % empNames.length] : null
    const compName = compNames.length > 0 ? compNames[i % compNames.length] : null
    const partName = partNames.length > 0 ? partNames[i % partNames.length] : null
    // Pick a different company name for Company B (offset by 1 to avoid same name)
    const compBName = compNames.length > 1 ? compNames[(i + 1) % compNames.length] : (compNames.length === 1 ? compNames[0] : null)
    slice.push(substituteRandomEmployeeAndCompany(prompt, empName, compName, partName, compBName))
  }
  return slice
}

/**
 * Pick a random question from the pool that isn't already displayed.
 * Returns the raw (un-substituted) question object.
 * @param {Array} currentQuestions - Array of currently displayed raw question indices to avoid.
 * @returns {{ question: object, index: number }} - The raw question and its index in PENNY_EXAMPLE_QUESTIONS.
 */
export function pickRandomQuestion(currentIndices = []) {
  const available = []
  for (let i = 0; i < PENNY_EXAMPLE_QUESTIONS.length; i++) {
    if (!currentIndices.includes(i)) available.push(i)
  }
  if (available.length === 0) {
    // All shown, just pick any
    const idx = Math.floor(Math.random() * PENNY_EXAMPLE_QUESTIONS.length)
    return { question: PENNY_EXAMPLE_QUESTIONS[idx], index: idx }
  }
  const idx = available[Math.floor(Math.random() * available.length)]
  return { question: PENNY_EXAMPLE_QUESTIONS[idx], index: idx }
}

/**
 * Build an initial set of PENNY_EXAMPLE_SHOW_COUNT questions, all unique.
 * Returns array of { question, index } objects (raw, un-substituted).
 */
export function buildInitialQuestions() {
  const indices = []
  const shuffled = Array.from({ length: PENNY_EXAMPLE_QUESTIONS.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
  for (let i = 0; i < PENNY_EXAMPLE_SHOW_COUNT && i < shuffled.length; i++) {
    indices.push(shuffled[i])
  }
  return indices.map(idx => ({ question: PENNY_EXAMPLE_QUESTIONS[idx], index: idx }))
}
