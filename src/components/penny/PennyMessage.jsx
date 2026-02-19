import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PennyAvatar from '../PennyAvatar'
import { employeeNames as staticEmployeeNames } from '../../data/employeeNames'

const MAX_NAMES_FOR_TEXT_SCAN = 400

// Collapsible section block for grouping fields in cards
function SectionBlock({ title, children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-t border-purple-100/60">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-full flex items-center justify-between px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 hover:bg-purple-50/40 active:bg-purple-50/60 transition-colors"
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-1 pb-2">{children}</div>}
    </div>
  )
}

// Micro bar chart: shows relative values across time windows (pure CSS, no library)
function TransferTrendBars({ bars, label = 'Transfer Trend' }) {
  if (!bars || bars.length < 2) return null
  const max = Math.max(...bars.map(b => b.value), 1)
  return (
    <div className="mt-2 px-1.5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-2 h-20">
        {bars.map((bar, i) => {
          const pct = Math.max((bar.value / max) * 100, 6)
          const hasTransfers = bar.value > 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <span className={`text-[11px] font-bold tabular-nums ${hasTransfers ? 'text-green-700' : 'text-gray-400'}`}>{bar.value.toLocaleString()}</span>
              {bar.amount != null && (
                <span className={`text-[10px] tabular-nums ${hasTransfers ? 'text-green-600' : 'text-gray-400'}`}>
                  ${bar.amount >= 1000 ? `${(bar.amount / 1000).toFixed(1)}k` : bar.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              )}
              <div
                className={`w-full rounded-t ${hasTransfers ? 'bg-gradient-to-t from-green-500 to-emerald-400' : 'bg-gradient-to-t from-purple-500 to-indigo-400'}`}
                style={{ height: `${pct}%`, minHeight: '3px' }}
              />
              <span className="text-[10px] text-gray-500 font-semibold truncate w-full text-center">{bar.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Flip card: click to toggle between graphic view and plain-text view (copy-paste friendly)
function FlipCard({ isFlipped, onFlipToggle, frontContent, backContent, borderColor = 'border-purple-100', bgGradient = 'from-purple-50/90 to-indigo-50/90' }) {
  return (
    <div
      className={`mt-2 w-full min-w-0 max-w-full rounded-lg border ${borderColor} overflow-hidden shadow-sm`}
    >
      {!isFlipped ? (
        <div className={`relative select-none bg-gradient-to-br ${bgGradient}`}>
          {frontContent}
        </div>
      ) : (
        <div className="bg-white min-h-[140px]">
          {backContent}
        </div>
      )}
    </div>
  )
}

// Parse a cell value for sorting — extracts numeric value from strings like "$1,234", "45.2%", "1,200"
function parseSortValue(cell) {
  if (cell == null) return { num: null, str: '' }
  const s = String(cell).trim()
  if (s === '' || s === '—' || s === '–' || s === '--') return { num: null, str: '' }
  const stripped = s.replace(/[$%,]/g, '').trim()
  const n = parseFloat(stripped)
  if (Number.isFinite(n)) return { num: n, str: s.toLowerCase() }
  return { num: null, str: s.toLowerCase() }
}

function PennyMessage({ message, onAction, onExpandList, companyNames = [], employeeNames: employeeNamesProp = [], onEmployeeClick, onCompanyClick }) {
  const navigate = useNavigate()
  const isUser = message.type === 'user'
  const [companyStatsFlipped, setCompanyStatsFlipped] = useState(false)
  const [employeeCardFlipped, setEmployeeCardFlipped] = useState(false)
  const [inlineSortCol, setInlineSortCol] = useState(null)
  const [inlineSortDir, setInlineSortDir] = useState('asc')
  const employeeNames = (employeeNamesProp && employeeNamesProp.length > 0) ? employeeNamesProp : staticEmployeeNames

  // Merge global employee names with per-message responseNames (bold names from query response)
  // This ensures names in the current response are always clickable even if they're not in the 2,500-name global set
  const responseNames = message.responseNames
  const employeeSet = useMemo(() => {
    const set = new Set(employeeNames)
    if (responseNames?.employees) {
      for (const n of responseNames.employees) set.add(n)
    }
    return set
  }, [employeeNames, responseNames])
  const companySet = useMemo(() => {
    const set = new Set(companyNames || [])
    if (responseNames?.companies) {
      for (const n of responseNames.companies) set.add(n)
    }
    return set
  }, [companyNames, responseNames])
  const namesForTextClick = useMemo(() => {
    const maxEmp = Math.min(employeeNames.length, 300)
    const maxCo = Math.min((companyNames || []).length, 100)
    return {
      employees: employeeNames.slice(0, maxEmp),
      companies: (companyNames || []).slice(0, maxCo),
    }
  }, [employeeNames, companyNames])

  // Check if this is an error or not-found response
  const isErrorResponse = message.type === 'not-found' ||
    message.type === 'error' ||
    message.type === 'did-you-mean' ||
    (message.content && (
      message.content.includes("couldn't find") ||
      message.content.includes("I'm sorry") ||
      message.content.includes("encountered an error") ||
      message.content.includes("not sure what") ||
      message.content.includes("not quite sure what you're looking for")
    ))

  const handleAction = (action) => {
    if (action.type === 'navigate') {
      navigate(action.target)
      if (onAction) onAction(action)
    } else if (action.type === 'download') {
      navigate('/downloads')
      if (onAction) onAction(action)
    } else if (onAction) {
      onAction(action)
    }
  }

  // Employee click: open info card in chat (no navigation)
  const handleEmployeeClick = (employeeName) => {
    if (onEmployeeClick) onEmployeeClick(employeeName)
  }

  // Adoption % color by range: 0–14 red, 15–24 orange, 25–100 green
  const getAdoptionValueClass = (valueStr, labelStr) => {
    const isAdoption = (labelStr && String(labelStr).toLowerCase().includes('adoption'))
    if (!isAdoption || valueStr == null || valueStr === '') return 'text-purple-700'
    const num = parseFloat(String(valueStr).replace(/[^\d.]/g, ''))
    if (Number.isNaN(num)) return 'text-purple-700'
    if (num <= 14) return 'text-red-600'
    if (num <= 24) return 'text-orange-600'
    return 'text-green-600'
  }

  // Make employee/company names in text clickable (uses capped list to avoid lag with huge datasets)
  const makeClickableNames = (text) => {
    if (!text || typeof text !== 'string') return text
    const { employees, companies } = namesForTextClick
    const empList = employees.map(name => ({ name, onClick: () => handleEmployeeClick(name) }))
    const coList = onCompanyClick ? companies.map(name => ({ name, onClick: () => onCompanyClick(name) })).filter(x => x.name) : []
    const all = [...empList, ...coList].filter(x => x.name.length > 0).sort((a, b) => b.name.length - a.name.length)
    if (all.length === 0 || all.length > MAX_NAMES_FOR_TEXT_SCAN) return text

    let result = []
    let remainingText = text
    let key = 0
    while (remainingText.length > 0) {
      let foundMatch = false
      for (const { name, onClick } of all) {
        const index = remainingText.indexOf(name)
        if (index !== -1) {
          if (index > 0) result.push(remainingText.substring(0, index))
          result.push(
            <button
              key={`click-${key++}`}
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 inline"
            >
              {name}
            </button>
          )
          remainingText = remainingText.substring(index + name.length)
          foundMatch = true
          break
        }
      }
      if (!foundMatch) {
        result.push(remainingText)
        break
      }
    }
    return result.length > 0 ? result : text
  }

  // Render rich content
  const renderRichContent = () => {
    if (!message.richContent) return null

    const { type, data } = message.richContent

    switch (type) {
      case 'data-card': {
        const hasExpandList = onExpandList && message.richContent.expandList
        const renderClickable = (str) => (typeof str === 'string' && str ? makeClickableNames(str) : str)
        const valueClass = getAdoptionValueClass(data.value, data.label)
        return (
          <div className="mt-2 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
            <p className="text-xs text-gray-500">{renderClickable(data.label)}</p>
            <p className={`text-lg font-bold ${valueClass}`}>{renderClickable(data.value)}</p>
            {data.detail && (
              <p className="text-xs text-gray-400 mt-0.5">{renderClickable(data.detail)}</p>
            )}
            {hasExpandList && (
              <button
                type="button"
                onClick={() => onExpandList(message.richContent.expandList)}
                className="mt-2 text-xs px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View list
              </button>
            )}
          </div>
        )
      }

      case 'company-stats-card': {
        const d = data || {}
        const company = d.company || 'Company'
        const partnership = (d.partnership != null && String(d.partnership).trim()) ? String(d.partnership).trim() : null
        const eligible = Number(d.eligible) || 0
        const adopted = Number(d.adopted) || 0
        const adoptionPercent = d.adoption_rate_percent != null ? String(d.adoption_rate_percent) : ''
        const active = d.active != null ? Number(d.active) : null
        const activePercent = d.active_percent != null ? String(d.active_percent) : null
        const transfers = d.transfers != null ? Number(d.transfers) : null
        const totalTransfer = d.total_transfer_amount != null ? Number(d.total_transfer_amount) : null
        const model = d.model && String(d.model).trim() ? String(d.model).trim() : null
        const launchDateRaw = d.launch_date != null && String(d.launch_date).trim() ? String(d.launch_date).trim() : null
        const launchDate = launchDateRaw ? (() => {
          const dt = new Date(launchDateRaw)
          return Number.isNaN(dt.getTime()) ? launchDateRaw : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        })() : null
        const admins = Array.isArray(d.admins) ? d.admins : []
        const outstandingBalanceTotal = d.outstandingBalanceTotal != null ? Number(d.outstandingBalanceTotal) : 0
        const outstandingBalanceExpandList = d.outstandingBalanceExpandList || null
        const activeUsersExpandList = d.activeUsersExpandList || null
        const partnershipExpandList = d.partnershipExpandList || null
        const revenueExpandList = d.revenueExpandList || null
        const adoptedExpandList = d.adoptedExpandList || null
        const eligibleExpandList = d.eligibleExpandList || null
        const transfersExpandList = d.transfersExpandList || null
        const savingsExpandList = d.savingsExpandList || null
        const pendingExpandList = d.pendingExpandList || null
        const enrollingExpandList = d.enrollingExpandList || null
        const pausedExpandList = d.pausedExpandList || null
        const creditScoreExpandList = d.creditScoreExpandList || null
        const outstandingDisplay = (outstandingBalanceTotal === 0 || !Number.isFinite(outstandingBalanceTotal))
          ? '$0'
          : `$${Number(outstandingBalanceTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        // New fields from expanded data
        const pending = d.pending != null ? Number(d.pending) : null
        const enrolling = d.enrolling != null ? Number(d.enrolling) : null
        const pausedCount = d.pausedCount != null ? Number(d.pausedCount) : null
        const avg30dTransfers = d.avg_30d_transfers != null ? Number(d.avg_30d_transfers) : null
        const avg30dStreamers = d.avg_30d_streamers != null ? Number(d.avg_30d_streamers) : null
        const avg30dEnrolled = d.avg_30d_enrolled != null ? Number(d.avg_30d_enrolled) : null
        const total30dTransfers = d.total_30d_transfers != null ? Number(d.total_30d_transfers) : null
        const trailing30dGrossRev = d.trailing_30d_avg_daily_gross_rev != null ? Number(d.trailing_30d_avg_daily_gross_rev) : null
        const sum30dNetRev = d.sum_trailing_30d_net_rev != null ? Number(d.sum_trailing_30d_net_rev) : null
        const trailing30dNetRev = d.trailing_30d_avg_daily_net_rev != null ? Number(d.trailing_30d_avg_daily_net_rev) : null
        const sum14dNetRev = d.sum_trailing_14d_net_rev != null ? Number(d.sum_trailing_14d_net_rev) : null
        const trailing14dNetRev = d.trailing_14d_avg_daily_net_rev != null ? Number(d.trailing_14d_avg_daily_net_rev) : null
        const dailyActiveApp = d.daily_active_app_users != null ? Number(d.daily_active_app_users) : null
        const weeklyActiveApp = d.weekly_active_app_users != null ? Number(d.weekly_active_app_users) : null
        const monthlyActiveApp = d.monthly_active_app_users != null ? Number(d.monthly_active_app_users) : null
        const activeSavingsAccts = d.active_savings_accounts != null ? Number(d.active_savings_accounts) : null
        const savingsBalanceUsd = d.savings_balance_usd != null ? Number(d.savings_balance_usd) : null
        const avgBalPerAcct = d.avg_balance_per_account != null ? Number(d.avg_balance_per_account) : null
        const configComms = d.config_comms_series || null
        const configMaxPct = d.config_max_transfer_pct != null ? d.config_max_transfer_pct : null
        const configInviteCreation = d.config_invite_on_creation
        const configInviteDemand = d.config_invite_on_demand
        const configMarketing = d.config_marketing_pref || null
        const configTransfersDisable = d.config_transfers_disable
        const csmOwner = d.csm_owner || null
        const csmExpandList = d.csmExpandList || null
        const deliveryManager = d.delivery_manager || null
        const dmExpandList = d.dmExpandList || null
        const sector = d.sector || null
        const creditScore = d.credit_score || null
        const inHypercare = d.in_hypercare
        const pricingModel = d.pricing_model || null
        const shiftsCreated = d.shifts_created_in_period != null ? Number(d.shifts_created_in_period) : null

        // Check which collapsible sections have data
        const hasAdoptionPipeline = pending != null || enrolling != null || (pausedCount != null && pausedCount > 0)
        const hasTransfer30d = [avg30dTransfers, avg30dStreamers, avg30dEnrolled, total30dTransfers].some(v => v != null)
        const hasRevenue = [trailing30dGrossRev, sum30dNetRev, trailing30dNetRev, sum14dNetRev, trailing14dNetRev].some(v => v != null)
        const hasAppUsage = [dailyActiveApp, weeklyActiveApp, monthlyActiveApp].some(v => v != null)
        const hasSavings = [activeSavingsAccts, savingsBalanceUsd, avgBalPerAcct].some(v => v != null)
        const hasConfig = [configComms, configMaxPct, configMarketing].some(v => v != null) || configInviteCreation || configInviteDemand || configTransfersDisable
        const hasAdmin = [csmOwner, deliveryManager, sector, creditScore, pricingModel].some(v => v != null) || inHypercare || shiftsCreated != null

        // New fields for redesigned card
        const productType = d.product_type && String(d.product_type).trim() ? String(d.product_type).trim() : null
        const trailing30dStreamers = d.trailing_30d_streamers != null ? Number(d.trailing_30d_streamers) : null
        const trailing14dStreamers = d.trailing_14d_streamers != null ? Number(d.trailing_14d_streamers) : null
        const trailing7dStreamers = d.trailing_7d_streamers != null ? Number(d.trailing_7d_streamers) : null
        const instantAmountInPeriod = d.instant_amount_in_period != null ? Number(d.instant_amount_in_period) : null
        const nextdayAmountInPeriod = d.nextday_amount_in_period != null ? Number(d.nextday_amount_in_period) : null
        const instantTransfersInPeriod = d.instant_transfers_in_period != null ? Number(d.instant_transfers_in_period) : null
        const nextdayTransfersInPeriod = d.nextday_transfers_in_period != null ? Number(d.nextday_transfers_in_period) : null
        const hasAdminConfig = hasConfig || [sector, pricingModel].some(v => v != null) || inHypercare || shiftsCreated != null

        const progressPct = eligible > 0 ? Math.min(100, (adopted / eligible) * 100) : 0
        const adoptionClass = getAdoptionValueClass(adoptionPercent, 'adoption')

        // Pie chart: exact circumference so the arc matches adoption %
        const chartRadius = 44
        const chartCircumference = 2 * Math.PI * chartRadius
        const progressStroke = (progressPct / 100) * chartCircumference
        const gradientId = `adoption-gradient-${message.id ?? 'card'}`

        const renderClickable = (str) => (typeof str === 'string' && str ? makeClickableNames(str) : str)

        // Partnership-specific colors
        const partnershipColorMap = {
          'osv': { text: 'text-orange-600', hover: 'hover:text-orange-800' },
          'harri pay': { text: 'text-blue-600', hover: 'hover:text-blue-800' },
          'frontline': { text: 'text-amber-800', hover: 'hover:text-amber-900' },
        }
        const pColors = partnership ? (partnershipColorMap[partnership.toLowerCase()] || null) : null

        // Full plain text for back (copy-paste friendly) — matches new 2-column layout
        const backLines = [
          `Company: ${company}`,
          ...(partnership ? [`Partnership: ${partnership}`] : []),
          ...(sector ? [`Sector: ${sector}`] : []),
          ...(productType ? [`Product Type: ${productType}`] : []),
          ...(launchDate ? [`Launch Date: ${launchDate}`] : []),
          ...(creditScore ? [`Credit Score: ${creditScore}`] : []),
          '',
          '--- Adoption ---',
          `Eligible: ${eligible.toLocaleString()}`,
          `Adopted: ${adopted.toLocaleString()} (${adoptionPercent})`,
          ...(active != null ? [`Active: ${active.toLocaleString()}${activePercent ? ` (${activePercent})` : ''}`] : []),
          ...(pending != null ? [`Pending: ${pending.toLocaleString()}`] : []),
          ...(enrolling != null ? [`Enrolling: ${enrolling.toLocaleString()}`] : []),
        ]
        // Transfer Velocity
        const hasVelocity = [trailing30dStreamers, trailing14dStreamers, trailing7dStreamers, transfers, totalTransfer].some(v => v != null)
        if (hasVelocity || hasTransfer30d) {
          backLines.push('', '--- Transfer Velocity ---')
          if (trailing30dStreamers != null) backLines.push(`30d Streamers: ${trailing30dStreamers.toLocaleString()}`)
          if (trailing14dStreamers != null) backLines.push(`14d Streamers: ${trailing14dStreamers.toLocaleString()}`)
          if (trailing7dStreamers != null) backLines.push(`7d Streamers: ${trailing7dStreamers.toLocaleString()}`)
          if (transfers != null) backLines.push(`Total Transfers: ${transfers.toLocaleString()}`)
          if (totalTransfer != null) backLines.push(`Total Transferred: $${totalTransfer.toLocaleString()}`)
        }
        // Financial Exposure
        backLines.push('', '--- Financial Exposure ---')
        backLines.push(`Outstanding: ${outstandingDisplay}`)
        if (savingsBalanceUsd != null) backLines.push(`Savings Balance: $${savingsBalanceUsd.toLocaleString()}`)
        if (activeSavingsAccts != null) backLines.push(`Savings Accounts: ${activeSavingsAccts.toLocaleString()}`)
        // Revenue
        if (hasRevenue) {
          backLines.push('', '--- Revenue ---')
          if (sum30dNetRev != null) backLines.push(`Net Rev (30d): $${sum30dNetRev.toFixed(2)}`)
          if (sum14dNetRev != null) backLines.push(`Net Rev (14d): $${sum14dNetRev.toFixed(2)}`)
          if (trailing30dGrossRev != null) backLines.push(`Avg Daily Gross Rev (30d): $${trailing30dGrossRev.toFixed(2)}`)
        }
        // App Usage
        if (hasAppUsage) {
          backLines.push('', '--- App Usage ---')
          if (dailyActiveApp != null) backLines.push(`DAU: ${dailyActiveApp.toLocaleString()}`)
          if (weeklyActiveApp != null) backLines.push(`WAU: ${weeklyActiveApp.toLocaleString()}`)
          if (monthlyActiveApp != null) backLines.push(`MAU: ${monthlyActiveApp.toLocaleString()}`)
        }
        // Admin & Ops
        backLines.push('', '--- Admin & Ops ---')
        backLines.push(admins.length > 0 ? `Admin(s): ${admins.map(a => a.admin_email).join(', ')}` : 'Admin(s): No Admins on file')
        if (csmOwner) backLines.push(`CSM: ${csmOwner}`)
        if (deliveryManager) backLines.push(`DM: ${deliveryManager}`)
        // Admin & Configuration (collapsed section content — sector already in header metadata)
        if (hasAdminConfig) {
          backLines.push('', '--- Admin & Configuration ---')
          if (pricingModel) backLines.push(`Pricing Model: ${pricingModel}`)
          if (inHypercare) backLines.push(`In Hypercare: Yes`)
          if (shiftsCreated != null) backLines.push(`Shifts Created: ${shiftsCreated.toLocaleString()}`)
          if (hasConfig) {
            if (configComms) backLines.push(`Comms Series: ${configComms}`)
            if (configMaxPct != null) backLines.push(`Max Transfer %: ${configMaxPct}`)
            if (configInviteCreation) backLines.push(`Invite on Creation: Yes`)
            if (configInviteDemand) backLines.push(`Invite on Demand: Yes`)
            if (configMarketing) backLines.push(`Marketing Pref: ${configMarketing}`)
            if (configTransfersDisable) backLines.push(`Transfers Disabled: Yes`)
          }
        }
        const backText = backLines.filter(l => l !== undefined).join('\n')

        // Clickable legend item helper
        const legendItem = (expandList, count, label, colorClass) => {
          const inner = (
            <>
              <div className={`w-2 h-2 rounded-full ${colorClass}`} />
              <span className="text-xs font-semibold text-gray-700 tabular-nums">{count.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 ml-0.5">{label}</span>
            </>
          )
          if (expandList && onExpandList) {
            return (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onExpandList(expandList) }}
                className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
              >{inner}</button>
            )
          }
          return <span className="inline-flex items-center gap-1">{inner}</span>
        }

        // Stat row helper: label left, value far right; tight spacing
        const statRow = (label, value, expandListData) => {
          const content = (
            <div className="flex items-center justify-between gap-2 w-full min-w-0 py-0.5 px-1.5">
              <span className="text-[11px] text-gray-500 font-medium truncate flex-shrink-0">{label}</span>
              <span className="text-sm font-bold text-gray-800 tabular-nums whitespace-nowrap text-right flex-shrink-0 ml-1">{value}</span>
            </div>
          )
          if (expandListData && onExpandList) {
            return (
              <button
                key={label}
                type="button"
                onClick={(e) => { e.stopPropagation(); onExpandList(expandListData) }}
                className="w-full text-left hover:bg-purple-50/60 rounded transition-colors"
              >{content}</button>
            )
          }
          return <div key={label} className="w-full">{content}</div>
        }

        // Currency formatter
        const fmtCur = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        return (
          <FlipCard
            isFlipped={companyStatsFlipped}
            onFlipToggle={() => setCompanyStatsFlipped(prev => !prev)}
            frontContent={
              <>
                {/* HEADER: company name + credit score + meta row */}
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-extrabold text-gray-900 truncate leading-snug">{renderClickable(company)}</h3>
                      {creditScore && (
                        creditScoreExpandList && onExpandList ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(creditScoreExpandList) }}
                            className="text-[10px] text-gray-400 mt-0.5 hover:text-purple-500 transition-colors">
                            Credit Score: <span className="font-semibold text-gray-600 hover:text-purple-700">{creditScore}</span>
                          </button>
                        ) : (
                          <p className="text-[10px] text-gray-400 mt-0.5">Credit Score: <span className="font-semibold text-gray-600">{creditScore}</span></p>
                        )
                      )}
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setCompanyStatsFlipped(prev => !prev) }}
                      className="flex items-center gap-0.5 text-gray-400 hover:text-purple-500 transition-colors flex-shrink-0 pt-0.5"
                      aria-label="Flip to plain text">
                      <span className="text-[9px]">Flip</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  {(partnership || sector || productType || launchDate) && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-0.5">
                      {partnership && (partnershipExpandList && onExpandList ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onExpandList(partnershipExpandList) }}
                          className={`text-[10px] font-bold uppercase tracking-wide hover:underline ${pColors ? `${pColors.text} ${pColors.hover}` : 'text-purple-500 hover:text-purple-700'}`}
                        >{partnership}</button>
                      ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${pColors ? pColors.text : 'text-gray-400'}`}>{partnership}</span>
                      ))}
                      {partnership && (sector || productType || launchDate) && <span className="text-gray-300 text-[10px]">/</span>}
                      {sector && <span className="text-[10px] text-gray-400">{sector}</span>}
                      {sector && (productType || launchDate) && <span className="text-gray-300 text-[10px]">/</span>}
                      {productType && <span className="text-[10px] text-gray-400">{productType}</span>}
                      {productType && launchDate && <span className="text-gray-300 text-[10px]">/</span>}
                      {launchDate && <span className="text-[10px] text-gray-400">{launchDate}</span>}
                    </div>
                  )}
                  {/* Hourly-Salary Breakdown link */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAction?.({ type: 'suggestion', text: `How many hourly employees at ${company}` }) }}
                    className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-purple-500 hover:text-purple-700 hover:underline transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Hourly–Salary Breakdown
                  </button>
                </div>

                {/* BODY: 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pt-1 pb-2">
                  {/* LEFT: Adoption ring + legend + active + pipeline */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-[110px] h-[110px] sm:w-[130px] sm:h-[130px]">
                      <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 block" aria-hidden>
                        <defs>
                          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r={chartRadius} fill="none" stroke="#f3e8ff" strokeWidth="8" />
                        <circle cx="50" cy="50" r={chartRadius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="8"
                          strokeDasharray={`${progressStroke} ${chartCircumference}`} strokeLinecap="round"
                          className="transition-all duration-500 ease-out" />
                      </svg>
                      {adoptedExpandList && onExpandList ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(adoptedExpandList) }}
                          className="absolute inset-0 flex flex-col items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                          <p className={`text-xl font-extrabold tabular-nums leading-none ${adoptionClass}`}>{adoptionPercent}</p>
                          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Adoption</p>
                        </button>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className={`text-xl font-extrabold tabular-nums leading-none ${adoptionClass}`}>{adoptionPercent}</p>
                          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Adoption</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      {legendItem(adoptedExpandList, adopted, 'Enrolled', 'bg-gradient-to-r from-purple-500 to-indigo-500')}
                      <span className="text-gray-300 text-xs">/</span>
                      {legendItem(eligibleExpandList, eligible, 'Eligible', 'bg-purple-200')}
                    </div>
                    {(active != null || activePercent != null) && (
                      <div className="w-full mt-2 rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80 text-center">
                        {active != null && statRow('Active Users', active.toLocaleString(), activeUsersExpandList)}
                        {activePercent != null && statRow('Active %', activePercent)}
                      </div>
                    )}
                    {hasAdoptionPipeline && (
                      <div className="flex items-center gap-2 mt-2">
                        {pending != null && (
                          <button type="button" onClick={(e) => {
                            e.stopPropagation()
                            if (pending > 0 && pendingExpandList && onExpandList) { onExpandList(pendingExpandList) }
                            else if (pending > 0 && onAction) { onAction({ type: 'suggestion', text: `List pending employees at ${company}` }) }
                          }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${pending > 0 ? 'hover:bg-amber-100 cursor-pointer' : ''} transition-colors`}>
                            Pending: {pending.toLocaleString()}
                          </button>
                        )}
                        {enrolling != null && (
                          <button type="button" onClick={(e) => {
                            e.stopPropagation()
                            if (enrolling > 0 && enrollingExpandList && onExpandList) { onExpandList(enrollingExpandList) }
                            else if (enrolling > 0 && onAction) { onAction({ type: 'suggestion', text: `List enrolling employees at ${company}` }) }
                          }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${enrolling > 0 ? 'hover:bg-blue-100 cursor-pointer' : ''} transition-colors`}>
                            Enrolling: {enrolling.toLocaleString()}
                          </button>
                        )}
                        {pausedCount != null && pausedCount > 0 && (
                          <button type="button" onClick={(e) => {
                            e.stopPropagation()
                            if (pausedExpandList && onExpandList) { onExpandList(pausedExpandList) }
                            else if (onAction) { onAction({ type: 'suggestion', text: `List paused employees at ${company}` }) }
                          }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer">
                            Paused: {pausedCount.toLocaleString()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Transfer Velocity + Financial Exposure */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-1">Transfer Velocity</p>
                      <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                        {trailing30dStreamers != null && trailing30dStreamers !== 0 && statRow('30d Streamers', trailing30dStreamers.toLocaleString(), activeUsersExpandList)}
                        {trailing14dStreamers != null && trailing14dStreamers !== 0 && statRow('14d Streamers', trailing14dStreamers.toLocaleString(), activeUsersExpandList)}
                        {trailing7dStreamers != null && trailing7dStreamers !== 0 && statRow('7d Streamers', trailing7dStreamers.toLocaleString(), activeUsersExpandList)}
                        {transfers != null && statRow('Total Transfers', transfers.toLocaleString(), transfersExpandList)}
                        {totalTransfer != null && statRow('Total Transferred', `$${totalTransfer.toLocaleString()}`, transfersExpandList)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-1">Financial Exposure</p>
                      <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                        {outstandingBalanceExpandList && onExpandList ? (
                          <button key="outstanding" type="button" onClick={(e) => { e.stopPropagation(); onExpandList(outstandingBalanceExpandList) }}
                            className="w-full text-left hover:bg-purple-50/60 rounded transition-colors">
                            <div className="flex items-center justify-between gap-2 w-full min-w-0 py-0.5 px-1.5">
                              <span className="text-[11px] text-gray-500 font-medium">Outstanding</span>
                              <span className="text-sm font-bold text-red-600 tabular-nums">{outstandingDisplay}</span>
                            </div>
                          </button>
                        ) : (
                          <div key="outstanding" className="w-full">
                            <div className="flex items-center justify-between gap-2 w-full min-w-0 py-0.5 px-1.5">
                              <span className="text-[11px] text-gray-500 font-medium">Outstanding</span>
                              <span className="text-sm font-bold text-red-600 tabular-nums">{outstandingDisplay}</span>
                            </div>
                          </div>
                        )}
                        {savingsBalanceUsd != null && statRow('Savings Balance', <span className="text-green-600">{fmtCur(savingsBalanceUsd)}</span>, savingsExpandList)}
                        {activeSavingsAccts != null && statRow('Savings Accounts', activeSavingsAccts.toLocaleString(), savingsExpandList)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* USAGE & REVENUE STRIP — DAU/WAU/MAU + Net Revenue on one line */}
                {(hasAppUsage || hasRevenue) && (
                  <div className="bg-gray-50/60 rounded-lg border border-gray-100 px-3 py-1.5 mx-3 mb-2">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      {/* App usage metrics first */}
                      {[['DAU', dailyActiveApp], ['WAU', weeklyActiveApp], ['MAU', monthlyActiveApp]].map(([label, val]) => val != null && (
                        activeUsersExpandList && onExpandList ? (
                          <button key={label} type="button" onClick={(e) => { e.stopPropagation(); onExpandList(activeUsersExpandList) }}
                            className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                            <span className="text-[10px] text-gray-400">{label}</span>
                            <span className="text-[12px] font-bold text-gray-800 tabular-nums">{val.toLocaleString()}</span>
                          </button>
                        ) : (
                          <div key={label} className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">{label}</span>
                            <span className="text-[12px] font-bold text-gray-800 tabular-nums">{val.toLocaleString()}</span>
                          </div>
                        )
                      ))}
                      {/* Divider between usage and revenue */}
                      {hasAppUsage && hasRevenue && <span className="text-gray-300 text-[10px]">|</span>}
                      {/* Revenue metrics — clickable to show partnership revenue comparison */}
                      {sum30dNetRev != null && (revenueExpandList && onExpandList ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(revenueExpandList) }} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                          <span className="text-[10px] text-gray-400">Net Rev (30d)</span><span className="text-[12px] font-bold text-gray-800 tabular-nums">{fmtCur(sum30dNetRev)}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400">Net Rev (30d)</span><span className="text-[12px] font-bold text-gray-800 tabular-nums">{fmtCur(sum30dNetRev)}</span></div>
                      ))}
                      {sum14dNetRev != null && (revenueExpandList && onExpandList ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(revenueExpandList) }} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                          <span className="text-[10px] text-gray-400">Net Rev (14d)</span><span className="text-[12px] font-bold text-gray-800 tabular-nums">{fmtCur(sum14dNetRev)}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400">Net Rev (14d)</span><span className="text-[12px] font-bold text-gray-800 tabular-nums">{fmtCur(sum14dNetRev)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONFIG SETTINGS — above admin */}
                {hasAdminConfig && (
                  <div className="mx-3 mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-1">Configuration</p>
                    <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                      {shiftsCreated != null && statRow('Shifts Created', shiftsCreated.toLocaleString())}
                      {pricingModel && statRow('Pricing Model', pricingModel)}
                      {inHypercare && statRow('In Hypercare', 'Yes')}
                      {configMaxPct != null && statRow('Max Transfer %', `${configMaxPct}`)}
                      {configComms && statRow('Comms Series', configComms)}
                      {configInviteCreation && statRow('Invite on Creation', 'Yes')}
                      {configInviteDemand && statRow('Invite on Demand', 'Yes')}
                      {configMarketing && statRow('Marketing Pref', configMarketing)}
                      {configTransfersDisable && statRow('Transfers Disabled', 'Yes')}
                    </div>
                  </div>
                )}

                {/* FOOTER: Admin + CSM/DM */}
                <div className="px-3 pb-2 pt-1 border-t border-purple-100/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Admin</p>
                      {admins.length > 0 ? (
                        <p className="text-[11px] text-gray-600 break-all line-clamp-2 leading-snug">{admins.map(a => a.admin_email).join(', ')}</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">No admins on file</p>
                      )}
                    </div>
                    {(csmOwner || deliveryManager) && (
                      <div className="flex items-center gap-1.5 flex-shrink-0 text-right pt-0.5">
                        {csmOwner && (
                          <span className="text-[11px] text-gray-500">
                            <span className="text-[10px] text-gray-400 font-semibold">CSM: </span>
                            {csmExpandList && onExpandList ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(csmExpandList) }}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium">{csmOwner}</button>
                            ) : <span className="font-medium text-gray-700">{csmOwner}</span>}
                          </span>
                        )}
                        {csmOwner && deliveryManager && <span className="text-gray-300 text-[10px]">|</span>}
                        {deliveryManager && (
                          <span className="text-[11px] text-gray-500">
                            <span className="text-[10px] text-gray-400 font-semibold">DM: </span>
                            {dmExpandList && onExpandList ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); onExpandList(dmExpandList) }}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium">{deliveryManager}</button>
                            ) : <span className="font-medium text-gray-700">{deliveryManager}</span>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            }
            backContent={
              <>
                <button type="button" onClick={() => setCompanyStatsFlipped(false)}
                  className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/80 w-full hover:bg-gray-100/80 transition-colors">
                  <span className="text-[10px] text-gray-400">Plain text — select and copy</span>
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden style={{ transform: 'rotate(180deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <pre
                  className="p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans bg-white select-text cursor-text leading-relaxed"
                  style={{ userSelect: 'text' }}
                >{backText}</pre>
              </>
            }
          />
        )
      }

      case 'summary-with-list': {
        const { summary, list } = message.richContent
        const summaryData = summary?.data
        const isPayTypeBreakdown = summary?.type === 'pay-type-breakdown'
        return (
          <>
            {isPayTypeBreakdown && summaryData ? (
              <div className="mt-2 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                <p className="text-xs text-gray-500 font-medium mb-2">{summaryData.label}</p>
                <div className="flex items-center gap-4">
                  {/* Pie chart */}
                  <svg width="72" height="72" viewBox="0 0 36 36" className="flex-shrink-0">
                    {(() => {
                      const h = summaryData.hourly || 0, s = summaryData.salary || 0, u = summaryData.unknown || 0
                      const t = h + s + u
                      if (t === 0) return <circle cx="18" cy="18" r="15.5" fill="#e5e7eb" />
                      const hPct = h / t, sPct = s / t
                      const c = 2 * Math.PI * 15.5
                      const hLen = hPct * c, sLen = sPct * c, uLen = (u / t) * c
                      return (
                        <>
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#d1d5db" strokeWidth="5" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="5"
                            strokeDasharray={`${hLen} ${c - hLen}`} strokeDashoffset={c * 0.25}
                            className="transition-all duration-500" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="5"
                            strokeDasharray={`${sLen} ${c - sLen}`} strokeDashoffset={c * 0.25 - hLen}
                            className="transition-all duration-500" />
                          {u > 0 && <circle cx="18" cy="18" r="15.5" fill="none" stroke="#d1d5db" strokeWidth="5"
                            strokeDasharray={`${uLen} ${c - uLen}`} strokeDashoffset={c * 0.25 - hLen - sLen} />}
                        </>
                      )
                    })()}
                  </svg>
                  {/* Legend */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700"><span className="font-bold">{(summaryData.hourly || 0).toLocaleString()}</span> Hourly <span className="text-gray-400">({summaryData.hourlyPct}%)</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700"><span className="font-bold">{(summaryData.salary || 0).toLocaleString()}</span> Salary <span className="text-gray-400">({summaryData.salaryPct}%)</span></span>
                    </div>
                    {summaryData.unknown > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="text-xs text-gray-700"><span className="font-bold">{summaryData.unknown.toLocaleString()}</span> Unspecified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : summaryData && (
              <div className="mt-2 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                <p className="text-xs text-gray-500">{summaryData.label}</p>
                <p className={`text-lg font-bold ${getAdoptionValueClass(summaryData.value, summaryData.label)}`}>{summaryData.value}</p>
                {summaryData.detail && (
                  <p className="text-xs text-gray-400 mt-0.5">{summaryData.detail}</p>
                )}
              </div>
            )}
            {onExpandList && list && (
              <button
                type="button"
                onClick={() => onExpandList(list)}
                className="mt-2 text-xs px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View full list
              </button>
            )}
          </>
        )
      }

      case 'table': {
        const handleInlineSort = (colIdx) => {
          if (inlineSortCol === colIdx) {
            if (inlineSortDir === 'asc') setInlineSortDir('desc')
            else { setInlineSortCol(null); setInlineSortDir('asc') }
          } else {
            setInlineSortCol(colIdx); setInlineSortDir('asc')
          }
        }
        const inlineSortedRows = inlineSortCol != null && data?.rows
          ? [...data.rows].sort((a, b) => {
              const dir = inlineSortDir === 'asc' ? 1 : -1
              const va = parseSortValue(a[inlineSortCol])
              const vb = parseSortValue(b[inlineSortCol])
              if (va.num != null && vb.num != null) return (va.num - vb.num) * dir
              if (va.num != null && vb.num == null) return -1 * dir
              if (va.num == null && vb.num != null) return 1 * dir
              return va.str.localeCompare(vb.str) * dir
            })
          : data.rows
        return (
          <>
            <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {data.headers.map((header, i) => (
                      <th
                        key={i}
                        onClick={() => handleInlineSort(i)}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:bg-gray-100 hover:text-purple-700 transition-colors group"
                        title={`Sort by ${header}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {header}
                          {inlineSortCol === i ? (
                            <svg className="w-3 h-3 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              {inlineSortDir === 'asc' ? (
                                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              ) : (
                                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              )}
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inlineSortedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {row.map((cell, j) => {
                        // Check if this cell is an exact employee name (usually first column)
                        const isEmployeeName = typeof cell === 'string' && employeeSet.has(cell)
                        if (isEmployeeName) {
                          return (
                            <td key={j} className="px-3 py-2">
                              <button
                                onClick={() => handleEmployeeClick(cell)}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left text-xs"
                              >
                                {cell}
                              </button>
                            </td>
                          )
                        }
                        // Check if this cell is an exact company name → clickable company (in-chat drill-down)
                        const isCompanyName = typeof cell === 'string' && companySet.has(cell)
                        if (isCompanyName && onCompanyClick) {
                          return (
                            <td key={j} className="px-3 py-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); onCompanyClick(cell) }}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left text-xs"
                              >
                                {cell}
                              </button>
                            </td>
                          )
                        }
                        // For any other string cell, make embedded employee/company names clickable
                        const content = typeof cell === 'string' ? makeClickableNames(cell) : cell
                        return (
                          <td key={j} className="px-3 py-2 text-gray-700">
                            {content}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {onExpandList && (
              <button
                type="button"
                onClick={() => onExpandList(message.richContent)}
                className="mt-2 text-xs px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View full list
              </button>
            )}
          </>
        )
      }

      case 'employee-card': {
        const ed = data || {}
        const displayName = ed.full_name || ed.name || 'Employee'
        const initials = displayName
          ? displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || ''
          : ''
        const empCompany = ed.company || ''
        const empSubline = empCompany

        // Status determination
        const isTerminated = !!(ed.terminated_at)
        const isPaused = ed.paused === true
        const currentState = ed.current_state || ''
        const statusLabel = isTerminated ? 'Terminated' : isPaused ? 'Paused' : (currentState || 'Active')
        const statusColor = isTerminated ? 'bg-red-100 text-red-700' : isPaused ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'

        // Status flags
        const transfersDisabled = ed.transfers_disabled === true
        const pauseReason = ed.pause_reason || ''
        const tdReason = ed.transfers_disabled_reason || ''
        const hasStatusFlags = transfersDisabled || pauseReason || tdReason

        // Financials
        const outBal = Number(ed.outstanding_balance) || 0
        const saveBal = Number(ed.save_balance) || 0
        const hasSavingsAcct = ed.has_savings_acct === true
        const hasFinancials = outBal > 0 || saveBal > 0 || hasSavingsAcct

        // Transfer activity
        const xferThisCycle = ed.transfers_14d != null ? Number(ed.transfers_14d) : null
        const amtThisCycle = ed.volume_14d_usd != null ? Number(ed.volume_14d_usd) : null
        const xferLastCycle = ed.transfers_prev_14d != null ? Number(ed.transfers_prev_14d) : null
        const amtLastCycle = ed.volume_prev_14d_usd != null ? Number(ed.volume_prev_14d_usd) : null
        const xfer90d = ed.transfers_90d != null ? Number(ed.transfers_90d) : null
        const vol90d = ed.volume_90d_usd != null ? Number(ed.volume_90d_usd) : null
        const xfer30d = ed.transfers_30d != null ? Number(ed.transfers_30d) : null
        const vol30d = ed.volume_30d_usd != null ? Number(ed.volume_30d_usd) : null
        const lifetimeXfers = ed.lifetime_total_transfers != null ? Number(ed.lifetime_total_transfers) : null
        const lifetimeVol = ed.lifetime_volume_streamed_usd != null ? Number(ed.lifetime_volume_streamed_usd) : null
        const lastStreamDate = ed.last_stream_date || null
        const daysSinceStream = lastStreamDate ? Math.floor((Date.now() - new Date(lastStreamDate).getTime()) / 86400000) : null
        const hasTransferActivity = [xferThisCycle, amtThisCycle, xferLastCycle, amtLastCycle, xfer90d, vol90d, xfer30d, vol30d, lifetimeXfers, lifetimeVol, daysSinceStream].some(v => v != null) || lastStreamDate

        // Employment
        const empId = ed.employee_id || ''
        const salaryOrHourly = ed.salary_or_hourly || ''
        const payGroup = ed.pay_group || ''
        const empCreatedAt = ed.employee_created_at || ''
        const startedOn = ed.started_on || ''
        const invitedAt = ed.invited_at || null
        const terminatedAt = ed.terminated_at || null
        const hasEmployment = [empId, salaryOrHourly, payGroup, empCreatedAt, startedOn].some(v => v) || invitedAt || terminatedAt

        // Stat row for employee card
        const empStatRow = (label, value) => (
          <div key={label} className="flex items-center justify-between gap-2 w-full min-w-0 py-0.5 px-1.5">
            <span className="text-[11px] text-gray-500 font-medium truncate flex-shrink-0">{label}</span>
            <span className="text-sm font-bold text-gray-800 tabular-nums whitespace-nowrap text-right flex-shrink-0 ml-1">{value}</span>
          </div>
        )

        const fmtCurEmp = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

        // Format date for display
        const fmtDate = (raw) => {
          if (!raw) return null
          const dt = new Date(raw)
          return Number.isNaN(dt.getTime()) ? String(raw) : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        }

        // Delta badge: compare this cycle vs last cycle transfers
        const transferDelta = (xferThisCycle != null && xferLastCycle != null && xferLastCycle > 0)
          ? ((xferThisCycle - xferLastCycle) / xferLastCycle * 100) : null

        // Full plain text for back (copy-paste friendly) — matches new 2-column layout
        const empBackLines = [
          `Employee: ${displayName}`,
          ...(empCompany ? [`Company: ${empCompany}`] : []),
          `Status: ${statusLabel}`,
        ]
        if (transfersDisabled) empBackLines.push(`Transfers Disabled: Yes${tdReason ? ` (${tdReason})` : ''}`)
        if (pauseReason) empBackLines.push(`Pause Reason: ${pauseReason}`)

        // Transfer Activity
        if (hasTransferActivity) {
          empBackLines.push('', '--- Transfer Activity ---')
          if (lastStreamDate) {
            let streamLine = `Last Stream: ${fmtDate(lastStreamDate) || lastStreamDate}`
            if (daysSinceStream != null && !isNaN(daysSinceStream)) streamLine += ` (${daysSinceStream}d ago)`
            empBackLines.push(streamLine)
          }
          if (xferThisCycle != null || amtThisCycle != null) {
            const parts = []
            if (xferThisCycle != null) parts.push(`${xferThisCycle} transfers`)
            if (amtThisCycle != null) parts.push(fmtCurEmp(amtThisCycle))
            empBackLines.push(`This Cycle (14d): ${parts.join(' / ')}`)
          }
          if (transferDelta != null) empBackLines.push(`Cycle Delta: ${transferDelta >= 0 ? '+' : ''}${transferDelta.toFixed(0)}%`)
          if (xferLastCycle != null || amtLastCycle != null) {
            const parts = []
            if (xferLastCycle != null) parts.push(`${xferLastCycle} transfers`)
            if (amtLastCycle != null) parts.push(fmtCurEmp(amtLastCycle))
            empBackLines.push(`Last Cycle (14d): ${parts.join(' / ')}`)
          }
          if (xfer30d != null) empBackLines.push(`Total Transfers (30d): ${xfer30d}${vol30d != null ? ` / ${fmtCurEmp(vol30d)}` : ''}`)
          if (xfer90d != null) empBackLines.push(`Total Transfers (90d): ${xfer90d}${vol90d != null ? ` / ${fmtCurEmp(vol90d)}` : ''}`)
          if (lifetimeXfers != null || lifetimeVol != null) {
            const parts = []
            if (lifetimeXfers != null) parts.push(`${lifetimeXfers.toLocaleString()} transfers`)
            if (lifetimeVol != null) parts.push(fmtCurEmp(lifetimeVol))
            empBackLines.push(`Lifetime: ${parts.join(' / ')}`)
          }
        }

        // Financials
        if (hasFinancials) {
          empBackLines.push('', '--- Financials ---')
          if (outBal > 0) empBackLines.push(`Outstanding: ${fmtCurEmp(outBal)}`)
          if (hasSavingsAcct) empBackLines.push(`Savings Balance: ${fmtCurEmp(saveBal)}`)
        }

        // Employment
        if (hasEmployment) {
          empBackLines.push('', '--- Employment ---')
          if (salaryOrHourly) empBackLines.push(`Pay Type: ${salaryOrHourly}`)
          if (payGroup) empBackLines.push(`Pay Group: ${payGroup}`)
          if (startedOn) empBackLines.push(`Started: ${fmtDate(startedOn) || startedOn}`)
          if (empCreatedAt) empBackLines.push(`Created: ${fmtDate(empCreatedAt) || empCreatedAt}`)
          if (invitedAt) empBackLines.push(`Invited: ${fmtDate(invitedAt) || invitedAt}`)
          if (empId) empBackLines.push(`Employee ID: ${empId}`)
          if (terminatedAt) empBackLines.push(`Terminated: ${fmtDate(terminatedAt) || terminatedAt}`)
        }
        const empBackText = empBackLines.join('\n')

        return (
          <FlipCard
            isFlipped={employeeCardFlipped}
            onFlipToggle={() => setEmployeeCardFlipped(prev => !prev)}
            frontContent={
              <>
                {/* Header */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {initials && (
                        <div className="relative flex-shrink-0">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                            isTerminated ? 'border-red-400 bg-red-50' :
                            isPaused ? 'border-orange-400 bg-orange-50' :
                            'border-green-400 bg-purple-50'
                          }`}>
                            <span className={`font-bold text-sm ${
                              isTerminated ? 'text-red-700' :
                              isPaused ? 'text-orange-700' :
                              'text-purple-700'
                            }`}>{initials}</span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isTerminated ? 'bg-red-500' :
                            isPaused ? 'bg-orange-500' :
                            'bg-green-500'
                          }`} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); displayName && handleEmployeeClick(displayName) }}
                          className="text-lg font-extrabold text-purple-600 hover:text-purple-800 truncate leading-snug block"
                        >{displayName}</button>
                        {empSubline && onCompanyClick ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onCompanyClick(empSubline) }}
                            className="text-[11px] text-purple-500 hover:text-purple-700 hover:underline truncate block text-left"
                          >{empSubline} ↗</button>
                        ) : empSubline ? (
                          <p className="text-[11px] text-gray-500 truncate">{empSubline}</p>
                        ) : null}
                        {/* Metadata row: payType / employeeID */}
                        {(salaryOrHourly || empId) && (
                          <div className="flex items-center gap-x-1.5 mt-0.5 min-w-0">
                            {salaryOrHourly && onAction ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); onAction({ type: 'suggestion', text: `List ${salaryOrHourly} employees at ${empCompany || 'all companies'}` }) }}
                                className="text-[10px] font-bold uppercase tracking-wide text-purple-500 hover:text-purple-700 hover:underline cursor-pointer flex-shrink-0">{salaryOrHourly}</button>
                            ) : salaryOrHourly ? <span className="text-[10px] font-bold uppercase tracking-wide text-purple-500 flex-shrink-0">{salaryOrHourly}</span> : null}
                            {salaryOrHourly && empId && <span className="text-gray-300 text-[10px] flex-shrink-0">/</span>}
                            {empId && <span className="text-[10px] text-gray-400 tabular-nums truncate">{empId}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEmployeeCardFlipped(prev => !prev) }}
                        className="flex items-center gap-0.5 text-gray-400 hover:text-purple-500 transition-colors"
                        aria-label="Flip to plain text">
                        <span className="text-[9px]">Flip</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning strip for important status flags */}
                {(transfersDisabled || pauseReason) && (
                  <div className="mx-3 mb-1">
                    <div className="flex flex-wrap gap-1.5">
                      {transfersDisabled && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 border border-red-200">
                          <svg className="w-3 h-3 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          <span className="text-[10px] font-semibold text-red-700">Transfers Disabled{tdReason ? `: ${tdReason}` : ''}</span>
                        </div>
                      )}
                      {pauseReason && onAction ? (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); onAction({ type: 'suggestion', text: `Show paused employees with reason ${pauseReason}${empCompany ? ` at ${empCompany}` : ''}` }) }}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer">
                          <span className="text-[10px] font-semibold text-orange-700">Paused: {pauseReason}</span>
                        </button>
                      ) : pauseReason ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 border border-orange-200">
                          <span className="text-[10px] font-semibold text-orange-700">Paused: {pauseReason}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* ─── 2-Column Grid Body ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pt-1 pb-2 items-stretch">

                  {/* ── LEFT: Transfer Activity ── */}
                  <div className="flex flex-col gap-1.5">
                    {/* Cycle Activity */}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-0.5 mt-1">Cycle Activity</p>
                    <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                      {lastStreamDate && empStatRow('Last Stream', <>{daysSinceStream != null && !isNaN(daysSinceStream) && <span className={`text-[10px] font-bold mr-1 ${daysSinceStream > 30 ? 'text-red-500' : daysSinceStream > 14 ? 'text-orange-500' : 'text-gray-500'}`}>{daysSinceStream}d ago</span>}{fmtDate(lastStreamDate) || lastStreamDate}</>)}
                      {(xferThisCycle != null || amtThisCycle != null) && empStatRow(
                        <span className="flex items-center gap-1">This Cycle{transferDelta != null && <span className={`text-[8px] font-bold px-1 py-0 rounded-full ${transferDelta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{transferDelta >= 0 ? '↑' : '↓'}{Math.abs(transferDelta).toFixed(0)}%</span>}</span>,
                        [xferThisCycle != null ? `${xferThisCycle}` : null, amtThisCycle != null ? fmtCurEmp(amtThisCycle) : null].filter(Boolean).join(' / ')
                      )}
                      {(xferLastCycle != null || amtLastCycle != null) && empStatRow('Last Cycle', [xferLastCycle != null ? `${xferLastCycle}` : null, amtLastCycle != null ? fmtCurEmp(amtLastCycle) : null].filter(Boolean).join(' / '))}
                    </div>

                    {/* Rolling totals */}
                    {(xfer30d != null || xfer90d != null) && (
                      <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                        {xfer30d != null && empStatRow('Total (30d)', xfer30d.toLocaleString() + (vol30d != null ? ` / ${fmtCurEmp(vol30d)}` : ''))}
                        {xfer90d != null && empStatRow('Total (90d)', xfer90d.toLocaleString() + (vol90d != null ? ` / ${fmtCurEmp(vol90d)}` : ''))}
                      </div>
                    )}
                  </div>

                  {/* ── RIGHT: Financial Spotlight + Timeline ── */}
                  <div className="flex flex-col gap-1.5">
                    {/* Financial spotlight cards */}
                    {hasFinancials && (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-0.5">Financials</p>
                        <div className="flex gap-2">
                          {outBal > 0 && (
                            <div className="flex-1 rounded-lg bg-red-50/80 border border-red-100 px-3 py-2 text-center">
                              <p className="text-lg font-extrabold text-red-600 tabular-nums leading-none">{fmtCurEmp(outBal)}</p>
                              <p className="text-[9px] font-medium text-red-400 uppercase tracking-wider mt-1">Outstanding</p>
                            </div>
                          )}
                          {hasSavingsAcct && (
                            <div className="flex-1 rounded-lg bg-green-50/80 border border-green-100 px-3 py-2 text-center">
                              <p className="text-lg font-extrabold text-green-600 tabular-nums leading-none">{fmtCurEmp(saveBal)}</p>
                              <p className="text-[9px] font-medium text-green-400 uppercase tracking-wider mt-1">Savings</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Timeline (dates) */}
                    {(startedOn || empCreatedAt || invitedAt || terminatedAt) && (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 mb-0.5 mt-1">Timeline</p>
                        <div className="rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                          {startedOn && empStatRow('Started', fmtDate(startedOn) || startedOn)}
                          {empCreatedAt && empStatRow('Created', fmtDate(empCreatedAt) || empCreatedAt)}
                          {invitedAt && empStatRow('Invited', fmtDate(invitedAt) || String(invitedAt))}
                          {terminatedAt && empStatRow('Terminated', <span className="text-red-600 font-bold">{fmtDate(terminatedAt) || String(terminatedAt)}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Lifetime volume hero stat — centered above transfer trend */}
                {lifetimeVol != null && (
                  <div className="flex flex-col items-center pt-3 pb-1 px-3">
                    <p className="text-2xl font-extrabold text-gray-900 tabular-nums leading-none">{fmtCurEmp(lifetimeVol)}</p>
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Lifetime Volume</p>
                    {lifetimeXfers != null && (
                      <p className="text-[10px] text-gray-500 mt-0.5 tabular-nums">{lifetimeXfers.toLocaleString()} transfers</p>
                    )}
                  </div>
                )}

                {/* Transfer trend bars — full width below grid */}
                {(() => {
                  const bars = []
                  if (xferLastCycle != null) bars.push({ label: 'Prev 14d', value: xferLastCycle, amount: amtLastCycle })
                  if (xferThisCycle != null) bars.push({ label: 'This 14d', value: xferThisCycle, amount: amtThisCycle })
                  if (xfer30d != null) bars.push({ label: '30d', value: xfer30d, amount: vol30d })
                  if (xfer90d != null) bars.push({ label: '90d', value: xfer90d, amount: vol90d })
                  return bars.length >= 2 ? <div className="px-3 pb-3"><TransferTrendBars bars={bars} label="Transfer Trend" /></div> : null
                })()}

                {/* Separator after trend graph */}
                <div className="mx-3 border-t border-gray-100" />

                {/* Footer strip */}
                <div className="px-3 pb-2 pt-1 border-t border-purple-100/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {empCompany && onCompanyClick ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onCompanyClick(empCompany) }}
                          className="text-[11px] text-purple-600 hover:text-purple-800 hover:underline font-medium"
                        >{empCompany} ↗</button>
                      ) : empCompany ? (
                        <span className="text-[11px] text-gray-500">{empCompany}</span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {empId && (
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          Employee ID: <span className="font-semibold text-gray-600">{empId}</span>
                        </span>
                      )}
                      {payGroup && (
                        <span className="text-[10px] text-gray-400">
                          Pay Schedule: <span className="font-semibold text-gray-600">{payGroup}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            }
            backContent={
              <>
                <button type="button" onClick={() => setEmployeeCardFlipped(false)}
                  className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/80 w-full hover:bg-gray-100/80 transition-colors">
                  <span className="text-[10px] text-gray-400">Plain text — select and copy</span>
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden style={{ transform: 'rotate(180deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <pre
                  className="p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans bg-white select-text cursor-text leading-relaxed"
                  style={{ userSelect: 'text' }}
                >{empBackText}</pre>
              </>
            }
          />
        )
      }

      case 'report-list':
        return (
          <>
            <div className="mt-2 space-y-1.5">
              {data.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-lg border border-gray-200 p-2 hover:border-purple-200 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-base">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
              ))}
            </div>
            {onExpandList && (
              <button
                type="button"
                onClick={() => onExpandList(message.richContent)}
                className="mt-2 text-xs px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View full list
              </button>
            )}
          </>
        )

      case 'thank-you': {
        return (
          <div className="mt-3 flex flex-col items-center justify-center py-4 relative overflow-hidden">
            {/* Mini confetti burst */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 18 }, (_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: '-8px',
                    width: `${4 + Math.random() * 4}px`,
                    height: `${4 + Math.random() * 4}px`,
                    backgroundColor: ['rgba(168,85,247,1)', 'rgba(139,92,246,1)', 'rgba(192,132,252,1)', 'rgba(236,72,153,0.9)', 'rgba(99,102,241,0.9)'][Math.floor(Math.random() * 5)],
                    animation: `thankyou-confetti ${2 + Math.random() * 2}s ease-out ${Math.random() * 1.5}s forwards`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
            {/* Bouncing Penny avatar */}
            <div className="animate-bounce mb-2">
              <PennyAvatar size={56} />
            </div>
            <style>{`
              @keyframes thankyou-confetti {
                0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                15% { opacity: 1; }
                100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
              }
            `}</style>
          </div>
        )
      }

      case 'did-you-mean': {
        const { employees = [], companies = [] } = message.richContent?.data || {}
        return (
          <div className="mt-3 space-y-3">
            {companies.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Companies</p>
                <div className="space-y-1">
                  {companies.map((c, i) => (
                    <button
                      key={`co-${i}`}
                      onClick={() => onAction?.({ type: 'suggestion', text: `Tell me about ${c.name}` })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-100 hover:border-purple-200 transition-all text-left group"
                    >
                      <span className="text-base">🏢</span>
                      <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-purple-700">{c.name}</span>
                      {c.partnership && <span className="text-xs text-gray-400">{c.partnership}</span>}
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {employees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Employees</p>
                <div className="space-y-1">
                  {employees.map((e, i) => (
                    <button
                      key={`emp-${i}`}
                      onClick={() => onAction?.({ type: 'suggestion', text: `Tell me about ${e.name}` })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] rounded-lg bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-100 hover:border-purple-200 transition-all text-left group"
                    >
                      <span className="text-base">👤</span>
                      <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-purple-700">{e.name}</span>
                      {e.company && <span className="text-xs text-gray-400">{e.company}</span>}
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  // Render suggestions for fallback
  const renderSuggestions = () => {
    if (!message.suggestions) return null

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {message.suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onAction?.({ type: 'suggestion', text: suggestion })}
            className="text-xs px-4 py-2.5 sm:px-3 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-full transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    )
  }

  // Render action buttons
  const renderActions = () => {
    if (!message.actions || message.actions.length === 0) return null

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {message.actions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleAction(action)
            }}
            className={`
              text-xs px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0
              ${i === 0
                ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
                : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700'
              }
            `}
          >
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  // Format message text (handle **bold** markdown and clickable employee/company names)
  const formatText = (text) => {
    if (!text) return null
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const innerText = part.slice(2, -2)
        // Check company first (small definitive set of 205) to avoid misclassifying company names
        // that were added to employeeSet via responseNames
        const exactCompany = companySet.has(innerText)
        if (exactCompany && onCompanyClick) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onCompanyClick(innerText) }}
              className="text-purple-600 hover:text-purple-800 hover:underline font-bold cursor-pointer bg-transparent border-none p-0 inline"
            >
              {innerText}
            </button>
          )
        }
        const exactEmployee = employeeSet.has(innerText)
        if (exactEmployee) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); handleEmployeeClick(innerText) }}
              className="text-purple-600 hover:text-purple-800 hover:underline font-bold cursor-pointer bg-transparent border-none p-0 inline"
            >
              {innerText}
            </button>
          )
        }
        return <strong key={i} className="text-purple-700 bg-purple-50 px-1 rounded">{makeClickableNames(innerText)}</strong>
      }
      return part.split('\n').map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {j > 0 && <br />}
          {makeClickableNames(line)}
        </React.Fragment>
      ))
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-3 shadow-sm">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    )
  }

  const hasCard = message.richContent?.type === 'employee-card' || message.richContent?.type === 'company-stats-card'
  return (
    <div className={`flex flex-col gap-1 max-w-full ${hasCard ? 'w-full' : ''}`}>
      <div>
        <PennyAvatar size={32} id={`msg-${message.id}`} isSurprised={isErrorResponse} />
      </div>
      <div className={`flex-1 min-w-0 ${hasCard ? 'max-w-full' : ''}`}>
        <div className={`bg-white rounded-2xl rounded-bl-none px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm border border-gray-100 animate-penny-glow ${hasCard ? 'overflow-visible' : ''}`}>
          {message.content != null && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{formatText(message.content)}</p>
          )}
          {renderRichContent()}
          {renderSuggestions()}
          {renderActions()}
        </div>
        {message.followUp && (
          <p className="text-xs text-gray-400 mt-1.5 ml-1">{message.followUp}</p>
        )}
      </div>
      <style>{`
        @keyframes penny-glow {
          0% {
            box-shadow: 0 0 0px rgba(168, 85, 247, 0);
          }
          15% {
            box-shadow: 0 0 12px rgba(168, 85, 247, 0.4), 0 0 24px rgba(168, 85, 247, 0.15);
          }
          100% {
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
        }
        .animate-penny-glow {
          animation: penny-glow 2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default PennyMessage
