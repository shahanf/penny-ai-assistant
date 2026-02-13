import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PennyAvatar from '../PennyAvatar'
import { employeeNames as staticEmployeeNames } from '../../data/employeeNames'

const MAX_NAMES_FOR_TEXT_SCAN = 400

// Company stats card: click to toggle between graphic view and plain-text view (copy-paste friendly)
function CompanyStatsFlipCard({ isFlipped, onFlipToggle, frontContent, backContent }) {
  return (
    <div
      className="mt-2 w-full min-w-0 max-w-full rounded-lg border border-purple-100 overflow-hidden shadow-sm"
      role="button"
      tabIndex={0}
      onClick={onFlipToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlipToggle() } }}
      aria-label={isFlipped ? 'Show graphic view' : 'Show plain text to copy'}
    >
      {!isFlipped ? (
        <div className="relative cursor-pointer select-none bg-gradient-to-br from-purple-50/90 to-indigo-50/90">
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

function PennyMessage({ message, onAction, onExpandList, companyNames = [], employeeNames: employeeNamesProp = [], onEmployeeClick, onCompanyClick }) {
  const navigate = useNavigate()
  const isUser = message.type === 'user'
  const [companyStatsFlipped, setCompanyStatsFlipped] = useState(false)
  const employeeNames = (employeeNamesProp && employeeNamesProp.length > 0) ? employeeNamesProp : staticEmployeeNames

  const employeeSet = useMemo(() => new Set(employeeNames), [employeeNames])
  const companySet = useMemo(() => new Set(companyNames || []), [companyNames])
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
                className="mt-2 text-xs px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
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
          const d = new Date(launchDateRaw)
          return Number.isNaN(d.getTime()) ? launchDateRaw : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        })() : null
        const admins = Array.isArray(d.admins) ? d.admins : []
        const outstandingBalanceTotal = d.outstandingBalanceTotal != null ? Number(d.outstandingBalanceTotal) : 0
        const outstandingBalanceExpandList = d.outstandingBalanceExpandList || null
        const activeUsersExpandList = d.activeUsersExpandList || null
        const partnershipExpandList = d.partnershipExpandList || null
        const adoptedExpandList = d.adoptedExpandList || null
        const eligibleExpandList = d.eligibleExpandList || null
        const outstandingDisplay = (outstandingBalanceTotal === 0 || !Number.isFinite(outstandingBalanceTotal))
          ? '$0'
          : `$${outstandingBalanceTotal.toFixed(2)}`

        const progressPct = eligible > 0 ? Math.min(100, (adopted / eligible) * 100) : 0
        const adoptionClass = getAdoptionValueClass(adoptionPercent, 'adoption')

        // Pie chart: exact circumference so the arc matches adoption %
        const chartRadius = 44
        const chartCircumference = 2 * Math.PI * chartRadius
        const progressStroke = (progressPct / 100) * chartCircumference
        const gradientId = `adoption-gradient-${message.id ?? 'card'}`

        const renderClickable = (str) => (typeof str === 'string' && str ? makeClickableNames(str) : str)

        // Simplified plain text for back (copy-paste friendly)
        const backLines = [
          `Company: ${company}`,
        ...(partnership ? [`Partnership: ${partnership}`] : []),
        ...(launchDate ? [`Launch date: ${launchDate}`] : []),
        `Eligible: ${eligible.toLocaleString()}`,
          `Adopted: ${adopted.toLocaleString()}`,
          `Adoption rate: ${adoptionPercent}`,
        ]
        if (active != null) backLines.push(`Active Users: ${active.toLocaleString()}`)
        if (activePercent != null) backLines.push(`% Active of Adopted: ${activePercent}`)
        if (transfers != null) backLines.push(`Total Transfers: ${transfers.toLocaleString()}`)
        if (totalTransfer != null) backLines.push(`Total Transferred: $${totalTransfer.toLocaleString()}`)
        if (model) backLines.push(`Model: ${model}`)
        backLines.push(admins.length > 0 ? `Admin(s): ${admins.map(a => a.admin_email).join(', ')}` : 'Admin(s): No Admins on file. Check A3')
        backLines.push(`Outstanding Balance: ${outstandingDisplay}`)
        const backText = backLines.join('\n')

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

        return (
          <CompanyStatsFlipCard
            isFlipped={companyStatsFlipped}
            onFlipToggle={() => setCompanyStatsFlipped(prev => !prev)}
            frontContent={
              <>
                {/* Header: company name + meta */}
                <div className="px-3 pt-3 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate leading-snug">{renderClickable(company)}</h3>
                      {(partnership || model || launchDate) && (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 mt-0.5">
                          {partnership && (partnershipExpandList && onExpandList ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onExpandList(partnershipExpandList) }}
                              className="text-[10px] font-bold text-purple-500 uppercase tracking-wide hover:text-purple-700 hover:underline"
                            >{partnership}</button>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{partnership}</span>
                          ))}
                          {partnership && (model || launchDate) && <span className="text-gray-300 text-[10px]">/</span>}
                          {model && <span className="text-[10px] text-gray-400">{model}</span>}
                          {model && launchDate && <span className="text-gray-300 text-[10px]">/</span>}
                          {launchDate && <span className="text-[10px] text-gray-400">{launchDate}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 text-gray-400 flex-shrink-0 pt-0.5">
                      <span className="text-[9px]">Flip</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Row: pie chart left, 4 stats right */}
                <div className="flex items-stretch gap-3 px-3 pt-1 pb-2">
                  {/* Left: adoption ring + legend */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="relative w-[130px] h-[130px]">
                      <svg
                        width="130"
                        height="130"
                        viewBox="0 0 100 100"
                        className="transform -rotate-90 block"
                        aria-hidden
                      >
                        <defs>
                          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r={chartRadius} fill="none" stroke="#f3e8ff" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r={chartRadius} fill="none"
                          stroke={`url(#${gradientId})`} strokeWidth="8"
                          strokeDasharray={`${progressStroke} ${chartCircumference}`}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className={`text-xl font-extrabold tabular-nums leading-none ${adoptionClass}`}>{adoptionPercent}</p>
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-1">Adoption</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      {legendItem(adoptedExpandList, adopted, 'Enrolled', 'bg-gradient-to-r from-purple-500 to-indigo-500')}
                      <span className="text-gray-300 text-xs">/</span>
                      {legendItem(eligibleExpandList, eligible, 'Eligible', 'bg-purple-200')}
                    </div>
                  </div>

                  {/* Right: 4 stats */}
                  <div className="flex-1 min-w-0 rounded-lg bg-gray-50/80 border border-gray-100 divide-y divide-gray-100/80">
                    {active != null && statRow('Active Users', active.toLocaleString(), activeUsersExpandList)}
                    {activePercent != null && statRow('Active % of Adopted', activePercent)}
                    {transfers != null && statRow('Total Transfers', transfers.toLocaleString())}
                    {totalTransfer != null && statRow('Total Transferred', `$${totalTransfer.toLocaleString()}`)}
                  </div>
                </div>

                {/* Footer: admin + outstanding */}
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Outstanding</p>
                      {outstandingBalanceExpandList && onExpandList ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onExpandList(outstandingBalanceExpandList) }}
                          className="text-sm font-bold text-red-600 hover:text-red-700 hover:underline tabular-nums"
                        >{outstandingDisplay}</button>
                      ) : (
                        <span className="text-sm font-bold text-red-600 tabular-nums">{outstandingDisplay}</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            }
            backContent={
              <>
                <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/80">
                  <span className="text-[10px] text-gray-400">Plain text — select and copy</span>
                  <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden style={{ transform: 'rotate(180deg)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <pre
                  className="p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans bg-white select-text cursor-text leading-relaxed"
                  style={{ userSelect: 'text' }}
                  onClick={(e) => e.stopPropagation()}
                >{backText}</pre>
              </>
            }
          />
        )
      }

      case 'summary-with-list': {
        const { summary, list } = message.richContent
        const summaryData = summary?.data
        return (
          <>
            {summaryData && (
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
                className="mt-2 text-xs px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
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

      case 'table':
        return (
          <>
            <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {data.headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((row, i) => (
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
                className="mt-2 text-xs px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View full list
              </button>
            )}
          </>
        )

      case 'employee-card': {
        const displayName = data.full_name || data.name
        const initials = displayName
          ? displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || ''
          : ''
        const hasSubline = data.company || data.location || (data.department && data.employeeId)
        const subline = data.company && data.location
          ? `${data.company} • ${data.location}`
          : data.company || data.location || (data.department ? `${data.department} • ${data.employeeId}` : null)
        return (
          <div 
            className="mt-2 w-full min-w-0 bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all"
            onClick={() => displayName && handleEmployeeClick(displayName)}
          >
            <div className="flex items-center gap-2">
              {initials ? (
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-semibold text-xs">{initials}</span>
                </div>
              ) : null}
              <div>
                <p className="font-semibold text-purple-600 hover:text-purple-800 text-base">{displayName}</p>
                {hasSubline && subline ? (
                  <p className="text-sm text-gray-500">{subline}</p>
                ) : null}
              </div>
            </div>
            {data.balance !== undefined && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Outstanding Balance</span>
                  <span className={`text-base font-semibold ${data.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${data.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {data.dueDate && (
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-sm text-gray-500">Due Date</span>
                    <span className="text-sm text-gray-700">{data.dueDate}</span>
                  </div>
                )}
              </div>
            )}
          </div>
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
                className="mt-2 text-xs px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                View full list
              </button>
            )}
          </>
        )

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
            className="text-xs px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full transition-colors"
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
              text-xs px-4 py-2 rounded-lg font-medium transition-colors
              ${i === 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
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
        const exactEmployee = employeeSet.has(innerText)
        const exactCompany = companySet.has(innerText)
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
        return <strong key={i}>{makeClickableNames(innerText)}</strong>
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
    <div className={`flex items-start gap-2 sm:gap-3 max-w-full ${hasCard ? 'w-full' : 'max-w-[92%]'}`}>
      <div className="flex-shrink-0 mt-0.5">
        <PennyAvatar size={32} id={`msg-${message.id}`} isSurprised={isErrorResponse} />
      </div>
      <div className={`flex-1 min-w-0 ${hasCard ? 'max-w-full' : ''}`}>
        <div className={`bg-white rounded-2xl rounded-bl-none px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm border border-gray-100 ${hasCard ? 'overflow-visible' : ''}`}>
          {message.richContent?.type !== 'company-stats-card' && message.content != null && (
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
    </div>
  )
}

export default PennyMessage
