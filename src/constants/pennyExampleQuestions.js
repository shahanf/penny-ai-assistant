/**
 * Placeholder replaced with a random employee name from Enrolled Employees at runtime.
 */
export const RANDOM_EMPLOYEE_PLACEHOLDER = '__RANDOM_EMPLOYEE__'

/**
 * Placeholder replaced with a random company name from Client Summary at runtime.
 */
export const RANDOM_COMPANY_PLACEHOLDER = '__RANDOM_COMPANY__'

/**
 * Placeholder replaced with a random partnership name from Client Summary at runtime.
 */
export const RANDOM_PARTNERSHIP_PLACEHOLDER = '__RANDOM_PARTNERSHIP__'

/**
 * Example questions for Penny "More questions" / "Try asking" section.
 * Show 6 at a time, rotate every 20 seconds.
 * Use displayText for UI when different from the actual query (e.g. "Show US stats" -> query "Show Company stats").
 * Employee examples use RANDOM_EMPLOYEE_PLACEHOLDER; company uses RANDOM_COMPANY_PLACEHOLDER; partnership uses RANDOM_PARTNERSHIP_PLACEHOLDER.
 */
export const PENNY_EXAMPLE_QUESTIONS = [
  { text: 'Which companies are above 20% adoption', icon: '📈' },
  { text: 'Which companies are below 10% adoption rate', icon: '📉' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} enrolled?`, icon: '✅' },
  { text: 'How many companies are live?', icon: '🏢' },
  { text: `How many ${RANDOM_PARTNERSHIP_PLACEHOLDER} companies are live?`, icon: '🤝' },
  { text: `Does ${RANDOM_EMPLOYEE_PLACEHOLDER} have an outstanding balance?`, icon: '💰' },
  { text: `Where does ${RANDOM_EMPLOYEE_PLACEHOLDER} work?`, icon: '📍' },
  { text: `Tell me about ${RANDOM_EMPLOYEE_PLACEHOLDER}`, icon: '👤' },
  { text: `Tell me about ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🏢' },
  { text: 'Show Outstanding Balances', icon: '💰' },
  { text: 'Show Savings stats', icon: '🏦' },
  { text: 'Show Company stats', displayText: 'Show US stats', icon: '🇺🇸' },
  { text: "What's Total Adoption", icon: '📈' },
  { text: 'Top Companies by Adoption', icon: '📈' },
  { text: 'Top Companies by Transfers', icon: '💸' },
  { text: 'Top Companies by Total Outstanding Balance', icon: '💰' },
  { text: 'Top Companies by Paused Employees', icon: '⏸️' },
  { text: 'Top Companies by Enrolled Employees', icon: '👥' },
  { text: `Does ${RANDOM_EMPLOYEE_PLACEHOLDER} have a Savings account?`, icon: '🏦' },
  { text: `Is ${RANDOM_EMPLOYEE_PLACEHOLDER} active?`, icon: '✅' },
  { text: 'List paused employees', icon: '⏸️' },
  { text: `Active users at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '👥' },
  { text: `Savings at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '🏦' },
  { text: `Outstanding balance at ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '💰' },
  { text: `How many employees at ${RANDOM_COMPANY_PLACEHOLDER}?`, icon: '📋' },
  { text: 'Who has outstanding balances?', icon: '💰' },
  { text: `Admin email for ${RANDOM_COMPANY_PLACEHOLDER}`, icon: '📧' },
]

export const PENNY_EXAMPLE_ROTATE_MS = 20 * 1000
export const PENNY_EXAMPLE_SHOW_COUNT = 6

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
export function substituteRandomEmployeeAndCompany(prompt, randomEmployeeName, randomCompanyName, randomPartnershipName = null) {
  const employeeName = randomEmployeeName || FALLBACK_EMPLOYEE_DISPLAY
  const companyName = randomCompanyName || FALLBACK_COMPANY_DISPLAY
  const partnershipName = randomPartnershipName || FALLBACK_PARTNERSHIP_DISPLAY
  let s = (prompt.text || '')
  s = replaceAll(s, RANDOM_EMPLOYEE_PLACEHOLDER, employeeName)
  s = replaceAll(s, RANDOM_COMPANY_PLACEHOLDER, companyName)
  s = replaceAll(s, RANDOM_PARTNERSHIP_PLACEHOLDER, partnershipName)
  let displayText = prompt.displayText != null ? prompt.displayText : undefined
  if (displayText != null) {
    displayText = replaceAll(displayText, RANDOM_EMPLOYEE_PLACEHOLDER, employeeName)
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
 * @param {number} startIndex - Current rotation index (0-based).
 * @param {string} [randomEmployeeName] - Name from Enrolled Employees to use in employee examples.
 * @param {string} [randomCompanyName] - Name from Client Summary to use in company examples.
 * @param {string} [randomPartnershipName] - Name from Client Summary PARTNERSHIP to use in partnership examples.
 * @returns {Array<{text: string, displayText?: string, icon: string}>}
 */
export function getRotatingExampleQuestions(startIndex, randomEmployeeName = null, randomCompanyName = null, randomPartnershipName = null) {
  const len = PENNY_EXAMPLE_QUESTIONS.length
  const start = startIndex % len
  const slice = []
  for (let i = 0; i < PENNY_EXAMPLE_SHOW_COUNT; i++) {
    const prompt = PENNY_EXAMPLE_QUESTIONS[(start + i) % len]
    slice.push(substituteRandomEmployeeAndCompany(prompt, randomEmployeeName, randomCompanyName, randomPartnershipName))
  }
  return slice
}
