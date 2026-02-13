import React, { useState, useMemo } from 'react'
import { employeeNames } from '../../data/employeeNames'

// Escape a cell for CSV (wrap in quotes if contains comma, quote, or newline)
function csvEscape(cell) {
  const s = String(cell ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Find column index for "Company" (case-insensitive)
function getCompanyColumnIndex(headers) {
  if (!Array.isArray(headers)) return -1
  const i = headers.findIndex(h => String(h).toLowerCase() === 'company')
  return i >= 0 ? i : -1
}

// Parse currency string (e.g. "$1,234.56") to number
function parseCurrencyCell(cell) {
  if (cell == null) return 0
  const s = String(cell).replace(/[^0-9.-]/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function PennyListExpandedPanel({ richContent, title = 'Full list', onClose, onEmployeeClick, onCompanyClick, companyNames = [] }) {
  const [companyFilter, setCompanyFilter] = useState('')

  if (!richContent?.type) return null

  const { type, data, amountColumnIndex, totalLabel } = richContent
  const nameList = (type === 'table' && data?.employeeNames?.length) ? data.employeeNames : employeeNames

  // Company column index and unique companies (for tables with a Company column)
  const companyColumnIndex = type === 'table' && data?.headers ? getCompanyColumnIndex(data.headers) : -1
  const uniqueCompanies = useMemo(() => {
    if (companyColumnIndex < 0 || !data?.rows?.length) return []
    const set = new Set()
    data.rows.forEach(row => {
      const val = row[companyColumnIndex]
      const s = String(val ?? '').trim()
      if (s && s !== '—' && s !== '–') set.add(s)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [type, data?.rows, companyColumnIndex])

  // Filtered rows for table (by company)
  const filteredRows = useMemo(() => {
    if (type !== 'table' || !data?.rows) return []
    if (companyColumnIndex < 0 || !companyFilter) return data.rows
    return data.rows.filter(row => {
      const cell = String(row[companyColumnIndex] ?? '').trim()
      return cell === companyFilter
    })
  }, [type, data?.rows, companyColumnIndex, companyFilter])

  // Total for balance columns (uses filtered rows so it updates when company filter changes)
  const totalAmount = useMemo(() => {
    if (type !== 'table' || !filteredRows.length || amountColumnIndex == null || amountColumnIndex < 0) return null
    return filteredRows.reduce((acc, row) => acc + parseCurrencyCell(row[amountColumnIndex]), 0)
  }, [type, filteredRows, amountColumnIndex])

  const showCompanyFilter = companyColumnIndex >= 0 && uniqueCompanies.length > 0

  const handleExport = () => {
    const slug = title.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'list'
    const date = new Date().toISOString().slice(0, 10)
    const filename = `penny-${slug}-${date}.csv`

    if (type === 'table' && data?.headers && data?.rows) {
      const headerRow = data.headers.map(csvEscape).join(',')
      const rowsToExport = companyFilter ? filteredRows : data.rows
      const bodyRows = rowsToExport.map(row => row.map(csvEscape).join(','))
      const csv = [headerRow, ...bodyRows].join('\r\n')
      downloadCSV(csv, filename)
      return
    }

    if (type === 'report-list' && Array.isArray(data)) {
      const headerRow = 'Name,Description'
      const bodyRows = data.map(r => [csvEscape(r.name), csvEscape(r.description ?? '')].join(','))
      const csv = [headerRow, ...bodyRows].join('\r\n')
      downloadCSV(csv, filename)
    }
  }

  const canExport = (type === 'table' && data?.headers && data?.rows) || (type === 'report-list' && Array.isArray(data))

  const renderContent = () => {
    if (type === 'table' && data?.headers && data?.rows) {
      return (
        <>
          {totalLabel != null && totalAmount != null && (
            <div className="mb-3 px-1">
              <p className="text-sm font-semibold text-gray-800">
                {totalLabel}: <span className="text-purple-700">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <colgroup>
              {data.headers.map((_, i) => (
                <col key={i} style={{ width: `${100 / data.headers.length}%` }} />
              ))}
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {data.headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-1.5 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase break-words"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => {
                    const isEmployeeName = typeof cell === 'string' && nameList.some(name => cell === name)
                    if (isEmployeeName && onEmployeeClick) {
                      return (
                        <td key={j} className="px-1.5 py-1.5 text-gray-700 break-words align-top">
                          <button
                            type="button"
                            onClick={() => onEmployeeClick(cell)}
                            className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left text-sm break-words"
                          >
                            {cell}
                          </button>
                        </td>
                      )
                    }
                    const isCompanyCell = j === companyColumnIndex && typeof cell === 'string' && String(cell).trim() && cell !== '—' && cell !== '–'
                    if (isCompanyCell && onCompanyClick) {
                      return (
                        <td key={j} className="px-1.5 py-1.5 text-gray-700 break-words align-top">
                          <button
                            type="button"
                            onClick={() => onCompanyClick(cell)}
                            className="text-purple-600 hover:text-purple-800 hover:underline font-medium cursor-pointer bg-transparent border-none p-0 text-left text-sm break-words"
                          >
                            {cell}
                          </button>
                        </td>
                      )
                    }
                    return (
                      <td key={j} className="px-1.5 py-1.5 text-gray-700 break-words align-top">
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )
    }

    if (type === 'report-list' && Array.isArray(data)) {
      return (
        <div className="space-y-2">
          {data.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:border-purple-200 transition-colors"
            >
              <p className="font-medium text-gray-900 text-sm">{report.name}</p>
              {report.description && (
                <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
              )}
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-lg">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 pt-6 pb-3 border-b border-gray-200 bg-gray-50/80">
        <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canExport && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
              aria-label="Export as CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {((type === 'table' && data?.rows != null) || (type === 'report-list' && Array.isArray(data))) && (
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50/50">
          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
            Count: {type === 'table' ? (companyFilter ? filteredRows.length : data.rows.length) : data.length}
          </span>
          {showCompanyFilter && (
            <>
              <label htmlFor="penny-company-filter" className="text-xs font-medium text-gray-600 whitespace-nowrap">
                Filter by company:
              </label>
              <select
                id="penny-company-filter"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All companies</option>
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto p-4">
        {renderContent()}
      </div>
    </div>
  )
}

export default PennyListExpandedPanel
