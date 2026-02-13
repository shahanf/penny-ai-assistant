import { useState, useEffect } from 'react'
import PennySearchBar from '../components/penny/PennySearchBar'

// Report data for different time periods
const reportPeriods = {
  'Pay Cycle': { label: 'Jan 16 - Jan 31, 2026', dateRange: 'Current Pay Cycle' },
  'Month': { label: 'January 2026', dateRange: 'Full Month' },
  'Quarter': { label: 'Q1 2026', dateRange: 'Jan - Mar 2026' },
  'Year': { label: '2026', dateRange: 'Year to Date' },
}

// Report types with metadata
const reports = [
  {
    id: 'transfers',
    name: 'Transfers Report',
    description: 'Complete breakdown of all wage transfers including instant vs standard, amounts, and employee activity.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'purple',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'save',
    name: 'Save Accounts Report',
    description: 'Employee savings activity, account balances, contribution trends, and savings milestones.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: 'emerald',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'reconciliation',
    name: 'Reconciliation Report',
    description: 'Payroll reconciliation data with transfer totals, fees, and payback deductions by pay period.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    color: 'blue',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'outstanding',
    name: 'Outstanding Balances Report',
    description: 'Detailed list of employees with outstanding balances, amounts owed, and expected payback dates.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'red',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'feedback',
    name: 'Employee Feedback Report',
    description: 'Aggregated employee feedback, satisfaction scores, feature requests, and sentiment analysis.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    color: 'amber',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'impact',
    name: 'Total Impact Stats Report',
    description: 'Comprehensive impact metrics including financial wellness scores, retention data, and ROI analysis.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'indigo',
    formats: ['PDF', 'CSV', 'Excel'],
  },
  {
    id: 'quotes',
    name: 'Employee Quotes Report',
    description: 'Collection of employee testimonials and quotes about their experience with the EWA program. Great for internal communications, marketing materials, and leadership presentations.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    color: 'purple',
    formats: ['PDF', 'CSV', 'Excel'],
    wide: true,
  },
]

const colorClasses = {
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'bg-purple-100 text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-100 text-purple-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'bg-emerald-100 text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-600',
    button: 'bg-red-600 hover:bg-red-700',
    badge: 'bg-red-100 text-red-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'bg-indigo-100 text-indigo-600',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
  },
}

function ReportCard({ report, selectedPeriod }) {
  const [selectedFormat, setSelectedFormat] = useState(report.formats[0])
  const colors = colorClasses[report.color]
  const periodInfo = reportPeriods[selectedPeriod]

  const handleDownload = () => {
    // Simulate download - in production this would trigger actual file download
    alert(`Downloading ${report.name} for ${periodInfo.label} as ${selectedFormat}`)
  }

  return (
    <div className={`bg-white rounded-xl border ${colors.border} overflow-hidden hover:shadow-lg transition-all group ${report.wide ? 'md:col-span-2' : ''}`}>
      <div className={`${colors.bg} px-4 sm:px-6 py-3 sm:py-4 border-b ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6`}>
            {report.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{report.name}</h3>
            <p className="text-xs text-gray-500">{periodInfo.dateRange}</p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{report.description}</p>

        {/* Period Badge */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
            {periodInfo.label}
          </span>
        </div>

        {/* Format Selection */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <span className="text-xs text-gray-500">Format:</span>
          <div className="flex gap-1">
            {report.formats.map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedFormat === format
                    ? `${colors.button} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className={`w-full ${colors.button} text-white py-2 sm:py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download {selectedFormat}
        </button>
      </div>
    </div>
  )
}

function DownloadableAssets() {
  const [selectedPeriod, setSelectedPeriod] = useState('Month')

  const periods = ['Pay Cycle', 'Month', 'Quarter', 'Year']

  // Tour action listener
  useEffect(() => {
    const handleTourAction = (e) => {
      const { action } = e.detail
      if (action === 'closeAllModals') {
        // No modals to close on this page
      }
    }
    
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Downloadable Assets</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-2 sm:mt-1 sm:ml-14 md:ml-16">
          <p className="text-sm sm:text-base text-gray-600">Reports, flyers, posters, and marketing materials</p>
          <div className="w-full sm:w-auto">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg sm:text-xl">📊</span>
              Reports & Data Exports
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Download detailed reports for any time period</p>
          </div>

          {/* Time Period Selector */}
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1 overflow-x-auto" data-tour="download-period">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedPeriod === period
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {period === 'Pay Cycle' ? <span className="sm:hidden">Cycle</span> : null}
                {period === 'Pay Cycle' ? <span className="hidden sm:inline">{period}</span> : period}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" data-tour="download-reports">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} selectedPeriod={selectedPeriod} />
          ))}
        </div>

        {/* Bulk Download Option */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl border border-gray-200 p-4 sm:p-6" data-tour="download-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Download All Reports</h4>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Get all {reports.length} reports for {reportPeriods[selectedPeriod].label} in one ZIP file</p>
              </div>
            </div>
            <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All (ZIP)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadableAssets
