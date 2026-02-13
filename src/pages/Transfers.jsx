import { useState, useEffect } from 'react'
import PennySearchBar from '../components/penny/PennySearchBar'
import { aggregateStats } from '../data/employeeMasterData'

// Transfer fee structure: Standard = Free, Instant = $3.29
const INSTANT_FEE = 3.29

// Employee data for modals
const employeeData = {
  'EMP-001': { name: 'Sarah Johnson', department: 'Operations', hireDate: '2023-03-15', ewaStatus: 'Enrolled', payRate: 28.50, location: 'New York - Warehouse A', totalTransferred: '$450.00', transferCount: 3, saveBalance: '$1,245.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-002': { name: 'Michael Chen', department: 'Engineering', hireDate: '2022-11-20', ewaStatus: 'Enrolled', payRate: 32.00, location: 'Los Angeles - Distribution', totalTransferred: '$550.00', transferCount: 2, saveBalance: '$890.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-003': { name: 'Emily Rodriguez', department: 'Customer Service', hireDate: '2023-06-01', ewaStatus: 'Enrolled', payRate: 26.00, location: 'Chicago - Fulfillment', totalTransferred: '$205.00', transferCount: 2, saveBalance: '$0.00', hasSaveAccount: false, outstandingBalance: '$125.00' },
  'EMP-005': { name: 'Ashley Martinez', department: 'Warehouse', hireDate: '2023-08-10', ewaStatus: 'Enrolled', payRate: 22.50, location: 'Phoenix - Call Center', totalTransferred: '$290.00', transferCount: 2, saveBalance: '$2,100.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-006': { name: 'David Thompson', department: 'Management', hireDate: '2021-05-15', ewaStatus: 'Enrolled', payRate: 35.00, location: 'Philadelphia - HQ', totalTransferred: '$455.00', transferCount: 2, saveBalance: '$5,400.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-008': { name: 'Christopher Lee', department: 'IT', hireDate: '2022-09-12', ewaStatus: 'Enrolled', payRate: 38.00, location: 'San Diego - Tech Hub', totalTransferred: '$405.00', transferCount: 2, saveBalance: '$1,890.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-009': { name: 'Amanda Garcia', department: 'HR', hireDate: '2023-04-20', ewaStatus: 'Enrolled', payRate: 29.00, location: 'Dallas - Distribution', totalTransferred: '$445.00', transferCount: 2, saveBalance: '$450.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-011': { name: 'Stephanie White', department: 'Marketing', hireDate: '2023-01-15', ewaStatus: 'Enrolled', payRate: 23.50, location: 'Austin - Retail Store', totalTransferred: '$220.00', transferCount: 1, saveBalance: '$920.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-012': { name: 'Kevin Anderson', department: 'Operations', hireDate: '2022-12-01', ewaStatus: 'Enrolled', payRate: 30.00, location: 'Jacksonville - Warehouse C', totalTransferred: '$575.00', transferCount: 2, saveBalance: '$1,550.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-013': { name: 'Nicole Taylor', department: 'Customer Service', hireDate: '2023-09-18', ewaStatus: 'Enrolled', payRate: 24.50, location: 'Fort Worth - Call Center', totalTransferred: '$175.00', transferCount: 2, saveBalance: '$780.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-015': { name: 'Rachel Jackson', department: 'Warehouse', hireDate: '2022-08-30', ewaStatus: 'Enrolled', payRate: 33.00, location: 'Charlotte - HQ', totalTransferred: '$190.00', transferCount: 1, saveBalance: '$2,340.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-016': { name: 'Tyler Moore', department: 'Engineering', hireDate: '2023-10-10', ewaStatus: 'Enrolled', payRate: 27.50, location: 'Indianapolis - Warehouse A', totalTransferred: '$160.00', transferCount: 1, saveBalance: '$320.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-017': { name: 'Megan Clark', department: 'Design', hireDate: '2022-06-15', ewaStatus: 'Enrolled', payRate: 42.00, location: 'San Francisco - Tech Hub', totalTransferred: '$85.00', transferCount: 1, saveBalance: '$3,200.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-019': { name: 'Lauren Walker', department: 'Retail', hireDate: '2023-11-01', ewaStatus: 'Enrolled', payRate: 25.00, location: 'Denver - Retail Store', totalTransferred: '$110.00', transferCount: 1, saveBalance: '$450.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  'EMP-020': { name: 'Ryan Hall', department: 'Management', hireDate: '2021-12-15', ewaStatus: 'Enrolled', payRate: 34.00, location: 'Boston - Distribution', totalTransferred: '$900.00', transferCount: 2, saveBalance: '$4,500.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
}

// Sample transfer data
const allTransfers = [
  { id: 1, employeeName: 'Sarah Johnson', employeeId: 'EMP-001', department: 'Operations', amount: 150.00, method: 'Instant', status: 'Completed', date: '2026-01-31', time: '2:34 PM', fee: 3.29 },
  { id: 2, employeeName: 'Michael Chen', employeeId: 'EMP-002', department: 'Engineering', amount: 200.00, method: 'Standard', status: 'Completed', date: '2026-01-31', time: '11:22 AM', fee: 0 },
  { id: 3, employeeName: 'Emily Rodriguez', employeeId: 'EMP-003', department: 'Customer Service', amount: 75.00, method: 'Instant', status: 'Completed', date: '2026-01-30', time: '4:15 PM', fee: 3.29 },
  { id: 4, employeeName: 'Kevin Anderson', employeeId: 'EMP-012', department: 'Operations', amount: 300.00, method: 'Instant', status: 'Completed', date: '2026-01-30', time: '9:45 AM', fee: 3.29 },
  { id: 5, employeeName: 'Ashley Martinez', employeeId: 'EMP-005', department: 'Warehouse', amount: 125.00, method: 'Standard', status: 'Completed', date: '2026-01-29', time: '3:20 PM', fee: 0 },
  { id: 6, employeeName: 'Ryan Hall', employeeId: 'EMP-020', department: 'Management', amount: 400.00, method: 'Instant', status: 'Completed', date: '2026-01-29', time: '10:11 AM', fee: 3.29 },
  { id: 7, employeeName: 'Christopher Lee', employeeId: 'EMP-008', department: 'IT', amount: 180.00, method: 'Standard', status: 'Completed', date: '2026-01-28', time: '1:45 PM', fee: 0 },
  { id: 8, employeeName: 'Nicole Taylor', employeeId: 'EMP-013', department: 'Customer Service', amount: 95.00, method: 'Instant', status: 'Completed', date: '2026-01-28', time: '11:30 AM', fee: 3.29 },
  { id: 9, employeeName: 'Amanda Garcia', employeeId: 'EMP-009', department: 'HR', amount: 250.00, method: 'Instant', status: 'Completed', date: '2026-01-27', time: '4:55 PM', fee: 3.29 },
  { id: 10, employeeName: 'David Thompson', employeeId: 'EMP-006', department: 'Management', amount: 175.00, method: 'Standard', status: 'Completed', date: '2026-01-27', time: '9:20 AM', fee: 0 },
  { id: 11, employeeName: 'Stephanie White', employeeId: 'EMP-011', department: 'Marketing', amount: 220.00, method: 'Instant', status: 'Completed', date: '2026-01-26', time: '2:10 PM', fee: 3.29 },
  { id: 12, employeeName: 'Tyler Moore', employeeId: 'EMP-016', department: 'Engineering', amount: 160.00, method: 'Standard', status: 'Completed', date: '2026-01-26', time: '10:45 AM', fee: 0 },
  { id: 13, employeeName: 'Megan Clark', employeeId: 'EMP-017', department: 'Design', amount: 85.00, method: 'Instant', status: 'Completed', date: '2026-01-25', time: '3:30 PM', fee: 3.29 },
  { id: 14, employeeName: 'Rachel Jackson', employeeId: 'EMP-015', department: 'Warehouse', amount: 190.00, method: 'Instant', status: 'Completed', date: '2026-01-25', time: '11:15 AM', fee: 3.29 },
  { id: 15, employeeName: 'Lauren Walker', employeeId: 'EMP-019', department: 'Retail', amount: 110.00, method: 'Standard', status: 'Completed', date: '2026-01-24', time: '4:40 PM', fee: 0 },
  { id: 16, employeeName: 'Sarah Johnson', employeeId: 'EMP-001', department: 'Operations', amount: 200.00, method: 'Standard', status: 'Completed', date: '2026-01-24', time: '9:00 AM', fee: 0 },
  { id: 17, employeeName: 'Michael Chen', employeeId: 'EMP-002', department: 'Engineering', amount: 350.00, method: 'Instant', status: 'Completed', date: '2026-01-23', time: '2:25 PM', fee: 3.29 },
  { id: 18, employeeName: 'Kevin Anderson', employeeId: 'EMP-012', department: 'Operations', amount: 275.00, method: 'Instant', status: 'Completed', date: '2026-01-23', time: '10:50 AM', fee: 3.29 },
  { id: 19, employeeName: 'Emily Rodriguez', employeeId: 'EMP-003', department: 'Customer Service', amount: 130.00, method: 'Standard', status: 'Completed', date: '2026-01-22', time: '3:15 PM', fee: 0 },
  { id: 20, employeeName: 'Ashley Martinez', employeeId: 'EMP-005', department: 'Warehouse', amount: 165.00, method: 'Instant', status: 'Completed', date: '2026-01-22', time: '11:40 AM', fee: 3.29 },
  { id: 21, employeeName: 'Ryan Hall', employeeId: 'EMP-020', department: 'Management', amount: 500.00, method: 'Instant', status: 'Completed', date: '2026-01-21', time: '4:05 PM', fee: 3.29 },
  { id: 22, employeeName: 'Christopher Lee', employeeId: 'EMP-008', department: 'IT', amount: 225.00, method: 'Standard', status: 'Completed', date: '2026-01-21', time: '9:30 AM', fee: 0 },
  { id: 23, employeeName: 'Nicole Taylor', employeeId: 'EMP-013', department: 'Customer Service', amount: 80.00, method: 'Instant', status: 'Completed', date: '2026-01-20', time: '2:50 PM', fee: 3.29 },
  { id: 24, employeeName: 'Amanda Garcia', employeeId: 'EMP-009', department: 'HR', amount: 195.00, method: 'Standard', status: 'Completed', date: '2026-01-20', time: '10:20 AM', fee: 0 },
  { id: 25, employeeName: 'David Thompson', employeeId: 'EMP-006', department: 'Management', amount: 280.00, method: 'Instant', status: 'Completed', date: '2026-01-19', time: '3:45 PM', fee: 3.29 },
]

// Pay cycle data
const payCycles = [
  { id: 1, name: 'Jan 16 - Jan 31, 2026', startDate: '2026-01-16', endDate: '2026-01-31' },
  { id: 2, name: 'Jan 1 - Jan 15, 2026', startDate: '2026-01-01', endDate: '2026-01-15' },
  { id: 3, name: 'Dec 16 - Dec 31, 2025', startDate: '2025-12-16', endDate: '2025-12-31' },
  { id: 4, name: 'Dec 1 - Dec 15, 2025', startDate: '2025-12-01', endDate: '2025-12-15' },
]

// Outstanding balance data
const employeesWithOutstandingBalance = [
  { id: 2, name: 'Michael Chen', employeeId: 'EMP-002', department: 'Engineering', outstandingBalance: '$125.50' },
  { id: 4, name: 'James Wilson', employeeId: 'EMP-004', department: 'Retail', outstandingBalance: '$89.25' },
  { id: 7, name: 'Jessica Brown', employeeId: 'EMP-007', department: 'Warehouse', outstandingBalance: '$245.00' },
  { id: 11, name: 'Stephanie White', employeeId: 'EMP-011', department: 'Marketing', outstandingBalance: '$67.80' },
  { id: 14, name: 'Brandon Thomas', employeeId: 'EMP-014', department: 'Logistics', outstandingBalance: '$312.45' },
  { id: 18, name: 'Justin Lewis', employeeId: 'EMP-018', department: 'Logistics', outstandingBalance: '$156.90' },
]
const totalOutstandingBalance = 996.90
const paybackDates = {
  2: '2026-02-15',
  4: '2026-02-14',
  7: '2026-02-28',
  11: '2026-02-10',
  14: '2026-02-20',
  18: '2026-02-18',
}

function Transfers() {
  const [timePeriod, setTimePeriod] = useState('pay-cycle')
  const [selectedPayCycle, setSelectedPayCycle] = useState(payCycles[0].id)
  const [selectedMonth, setSelectedMonth] = useState('2026-01')
  const [selectedQuarter, setSelectedQuarter] = useState('2026-Q1')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('transfers')
  const [showOutstandingModal, setShowOutstandingModal] = useState(false)

  // Tour action listener
  useEffect(() => {
    const handleTourAction = (e) => {
      const { action } = e.detail
      if (action === 'openOutstandingModal') {
        setShowOutstandingModal(true)
      } else if (action === 'closeOutstandingModal') {
        setShowOutstandingModal(false)
      } else if (action === 'openTransferEmployeeModal') {
        // Open modal for first transfer's employee
        const firstTransfer = allTransfers[0]
        if (firstTransfer) {
          const empData = employeeData[firstTransfer.employeeId]
          if (empData) {
            setSelectedEmployee({
              ...empData,
              employeeId: firstTransfer.employeeId,
            })
            setActiveTab('transfers')
          }
        }
      } else if (action === 'closeTransferEmployeeModal') {
        setSelectedEmployee(null)
        setActiveTab('transfers')
      } else if (action === 'closeAllModals') {
        setShowOutstandingModal(false)
        setSelectedEmployee(null)
        setActiveTab('transfers')
      }
    }
    
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [])

  const handleEmployeeClick = (transfer) => {
    const empData = employeeData[transfer.employeeId]
    if (empData) {
      setSelectedEmployee({
        ...empData,
        employeeId: transfer.employeeId,
      })
      setActiveTab('transfers') // Open to transfers tab by default
    }
  }

  const closeModal = () => {
    setSelectedEmployee(null)
    setActiveTab('transfers')
  }

  // Get all transfers for the selected employee
  const getEmployeeTransfers = (employeeId) => {
    return allTransfers.filter(t => t.employeeId === employeeId)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // Filter transfers based on time period
  const getFilteredTransfers = () => {
    let filtered = [...allTransfers]

    // Filter by time period
    if (timePeriod === 'pay-cycle') {
      const cycle = payCycles.find(c => c.id === selectedPayCycle)
      if (cycle) {
        filtered = filtered.filter(t => t.date >= cycle.startDate && t.date <= cycle.endDate)
      }
    } else if (timePeriod === 'month') {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth))
    } else if (timePeriod === 'quarter') {
      const [year, q] = selectedQuarter.split('-Q')
      const quarterMonths = {
        '1': ['01', '02', '03'],
        '2': ['04', '05', '06'],
        '3': ['07', '08', '09'],
        '4': ['10', '11', '12'],
      }
      const months = quarterMonths[q]
      filtered = filtered.filter(t => {
        const month = t.date.substring(5, 7)
        return t.date.startsWith(year) && months.includes(month)
      })
    } else if (timePeriod === 'year') {
      filtered = filtered.filter(t => t.date.startsWith(selectedYear))
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by method
    if (methodFilter !== 'All') {
      filtered = filtered.filter(t => t.method === methodFilter)
    }

    return filtered
  }

  const filteredTransfers = getFilteredTransfers()

  // Stats data based on time period - using master data as source of truth
  const statsData = {
    'pay-cycle': {
      totalCount: aggregateStats.payCycleTransfers,
      totalValue: aggregateStats.payCycleTransferAmount,
      instantPercent: Math.round((aggregateStats.payCycleInstantTransfers / aggregateStats.payCycleTransfers) * 100),
      avgTransfer: aggregateStats.payCycleAvgTransfer,
      totalFees: aggregateStats.payCycleFees
    },
    'month': {
      totalCount: aggregateStats.monthlyTransfers,
      totalValue: aggregateStats.monthlyTransferAmount,
      instantPercent: Math.round((aggregateStats.monthlyInstantTransfers / aggregateStats.monthlyTransfers) * 100),
      avgTransfer: aggregateStats.monthlyAvgTransfer,
      totalFees: aggregateStats.monthlyFees
    },
    'quarter': {
      totalCount: aggregateStats.quarterlyTransfers,
      totalValue: aggregateStats.quarterlyTransferAmount,
      instantPercent: Math.round((aggregateStats.quarterlyInstantTransfers / aggregateStats.quarterlyTransfers) * 100),
      avgTransfer: aggregateStats.monthlyAvgTransfer,
      totalFees: aggregateStats.quarterlyFees
    },
    'year': {
      totalCount: aggregateStats.yearlyTransfers,
      totalValue: aggregateStats.yearlyTransferAmount,
      instantPercent: Math.round((aggregateStats.yearlyInstantTransfers / aggregateStats.yearlyTransfers) * 100),
      avgTransfer: aggregateStats.monthlyAvgTransfer,
      totalFees: aggregateStats.yearlyFees
    },
  }

  const currentStats = statsData[timePeriod]
  
  // For display, use the actual filtered transfers but show scaled stats
  const totalTransfers = currentStats.totalCount
  const totalValue = currentStats.totalValue
  const instantTransfers = Math.round(totalTransfers * (currentStats.instantPercent / 100))
  const standardTransfers = totalTransfers - instantTransfers
  const avgTransfer = currentStats.avgTransfer
  const totalFees = currentStats.totalFees

  const getTimePeriodLabel = () => {
    if (timePeriod === 'pay-cycle') {
      return payCycles.find(c => c.id === selectedPayCycle)?.name || ''
    } else if (timePeriod === 'month') {
      const [year, month] = selectedMonth.split('-')
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    } else if (timePeriod === 'quarter') {
      return selectedQuarter.replace('-', ' ')
    } else {
      return selectedYear
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Transfers</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1">
          <p className="text-gray-500 text-sm">Track and manage employee wage transfers</p>
          <div className="hidden sm:block">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6" data-tour="time-filter">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">View by:</span>
            <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto scrollbar-hide">
              {[
                { id: 'pay-cycle', label: 'Pay Cycle', shortLabel: 'Cycle' },
                { id: 'month', label: 'Month', shortLabel: 'Month' },
                { id: 'quarter', label: 'Quarter', shortLabel: 'Qtr' },
                { id: 'year', label: 'Year', shortLabel: 'Year' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setTimePeriod(option.id)}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    timePeriod === option.id
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

          {/* Dynamic selector based on time period */}
          <div className="flex items-center gap-2 sm:gap-4">
            {timePeriod === 'pay-cycle' && (
              <select
                value={selectedPayCycle}
                onChange={(e) => setSelectedPayCycle(parseInt(e.target.value))}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {payCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                ))}
              </select>
            )}

            {timePeriod === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="2026-01">January 2026</option>
                <option value="2025-12">December 2025</option>
                <option value="2025-11">November 2025</option>
                <option value="2025-10">October 2025</option>
              </select>
            )}

            {timePeriod === 'quarter' && (
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="2026-Q1">Q1 2026</option>
                <option value="2025-Q4">Q4 2025</option>
                <option value="2025-Q3">Q3 2025</option>
                <option value="2025-Q2">Q2 2025</option>
              </select>
            )}

            {timePeriod === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            )}
          </div>

          <div className="hidden md:flex ml-auto items-center gap-2">
            <span className="text-sm text-gray-500">Showing data for:</span>
            <span className="text-sm font-semibold text-purple-600">{getTimePeriodLabel()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex md:grid md:grid-cols-6 gap-3 md:gap-4 mb-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide" data-tour="transfer-stats">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Transfers</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{totalTransfers.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">All transfer requests</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Transferred</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-600 mt-1">${(totalValue + totalFees).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">Includes ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in instant fees</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Instant Transfers</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 mt-1">{instantTransfers.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">${INSTANT_FEE.toFixed(2)} fee each • {totalTransfers > 0 ? ((instantTransfers / totalTransfers) * 100).toFixed(0) : 0}%</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Standard Transfers</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600 mt-1">{standardTransfers.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">Free • {totalTransfers > 0 ? ((standardTransfers / totalTransfers) * 100).toFixed(0) : 0}%</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Fees</p>
              <p className="text-lg md:text-2xl font-bold text-amber-600 mt-1">${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">From {instantTransfers.toLocaleString()} instant transfers</p>
        </div>

        <div
          className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 md:p-5 shadow-lg text-white cursor-pointer hover:from-red-600 hover:to-rose-700 hover:shadow-xl transition-all min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink"
          onClick={() => setShowOutstandingModal(true)}
          data-tour="outstanding-balance"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-red-100">Outstanding Balance</p>
              <p className="text-lg md:text-2xl font-bold mt-1">$996.90</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-red-200 mt-2 hidden md:block">6 employees • Click to view</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by employee name, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="All">All Methods</option>
              <option value="Instant">Instant Only</option>
              <option value="Standard">Standard Only</option>
            </select>
            <button className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transfers Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour="transfer-table">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Transfers</h3>
            <span className="text-sm text-gray-500">{filteredTransfers.length} transfers</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransfers.length > 0 ? (
                filteredTransfers.map((transfer, index) => (
                  <tr
                    key={transfer.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleEmployeeClick(transfer)}
                    data-tour={index === 0 ? "transfer-row" : undefined}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">
                            {transfer.employeeName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transfer.employeeName}</p>
                          <p className="text-xs text-gray-500">{transfer.employeeId} • {transfer.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{transfer.date}</p>
                      <p className="text-xs text-gray-500">{transfer.time}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(transfer.amount + transfer.fee).toFixed(2)}
                        </span>
                        {transfer.fee > 0 && (
                          <p className="text-xs text-gray-400">${transfer.amount.toFixed(2)} + fee</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        transfer.method === 'Instant'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {transfer.method === 'Instant' && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {transfer.method === 'Standard' && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {transfer.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm ${transfer.fee > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {transfer.fee > 0 ? `$${transfer.fee.toFixed(2)}` : 'Free'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">No transfers found for this period</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransfers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {filteredTransfers.length} transfers
              </p>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-50" disabled>
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm">1</button>
                <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-50" disabled>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transfers List - Mobile */}
      <div className="md:hidden">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recent Transfers</h3>
              <span className="text-xs text-gray-500">{filteredTransfers.length} transfers</span>
            </div>
          </div>
        </div>

        {filteredTransfers.length > 0 ? (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <div
                key={transfer.id}
                onClick={() => handleEmployeeClick(transfer)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {transfer.employeeName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{transfer.employeeName}</p>
                    <p className="text-xs text-gray-500">{transfer.date} • {transfer.time}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    transfer.method === 'Instant'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {transfer.method === 'Instant' ? '⚡' : '⏱'} {transfer.method}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${(transfer.amount + transfer.fee).toFixed(2)}
                    </span>
                    {transfer.fee > 0 && (
                      <span className="text-xs text-gray-400 ml-1">+${transfer.fee.toFixed(2)} fee</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {transfer.status}
                  </span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-center">
              <p className="text-sm text-gray-500">Showing {filteredTransfers.length} transfers</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No transfers found for this period</p>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()} data-tour="transfer-employee-modal">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                    <p className="text-purple-200">{selectedEmployee.employeeId} • {selectedEmployee.department}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-white/80 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Status Badge */}
              <div className="mt-3 flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedEmployee.ewaStatus === 'Enrolled' ? 'bg-green-100 text-green-800' :
                  selectedEmployee.ewaStatus === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedEmployee.ewaStatus}
                </span>
                <span className="text-purple-200 text-sm">Hired {selectedEmployee.hireDate}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {['overview', 'transfers', 'savings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <p className="text-sm text-green-600 font-medium">Total Transferred</p>
                      <p className="text-2xl font-bold text-green-700">{selectedEmployee.totalTransferred}</p>
                      <p className="text-xs text-green-500 mt-1">{selectedEmployee.transferCount} transfers</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-sm text-blue-600 font-medium">Save Balance</p>
                      <p className="text-2xl font-bold text-blue-700">{selectedEmployee.saveBalance}</p>
                      <p className="text-xs text-blue-500 mt-1">{selectedEmployee.hasSaveAccount ? 'Active' : 'No account'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                      <p className="text-sm text-violet-600 font-medium">Outstanding</p>
                      <p className="text-2xl font-bold text-violet-700">{selectedEmployee.outstandingBalance}</p>
                      <p className="text-xs text-violet-500 mt-1">Balance due</p>
                    </div>
                  </div>

                  {/* Employee Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Employee Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 text-gray-900">{selectedEmployee.location}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Department:</span>
                        <span className="ml-2 text-gray-900">{selectedEmployee.department}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pay Rate:</span>
                        <span className="ml-2 text-gray-900">{formatCurrency(selectedEmployee.payRate)}/hr</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hire Date:</span>
                        <span className="ml-2 text-gray-900">{selectedEmployee.hireDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">Transfer History</h4>
                    <span className="text-xs text-gray-500">{getEmployeeTransfers(selectedEmployee.employeeId).length} transfers</span>
                  </div>
                  
                  {getEmployeeTransfers(selectedEmployee.employeeId).length > 0 ? (
                    <div className="space-y-3">
                      {getEmployeeTransfers(selectedEmployee.employeeId).map((transfer) => (
                        <div key={transfer.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transfer.method === 'Instant' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              <svg className={`w-5 h-5 ${transfer.method === 'Instant' ? 'text-purple-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {transfer.method === 'Instant' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{transfer.method} Transfer</p>
                              <p className="text-xs text-gray-500">{transfer.date} at {transfer.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(transfer.amount + transfer.fee)}</p>
                            <p className="text-xs text-gray-500">
                              Fee: {transfer.fee > 0 ? `$${transfer.fee.toFixed(2)}` : 'Free'}
                            </p>
                          </div>
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {transfer.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>No transfers yet</p>
                    </div>
                  )}
                  
                  {/* Transfer Summary */}
                  {getEmployeeTransfers(selectedEmployee.employeeId).length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-100 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Total Transferred</p>
                          <p className="text-xl font-bold text-purple-700">{selectedEmployee.totalTransferred}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-purple-600 font-medium">Total Fees Paid</p>
                          <p className="text-xl font-bold text-purple-700">
                            {formatCurrency(getEmployeeTransfers(selectedEmployee.employeeId).reduce((sum, t) => sum + t.fee, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'savings' && (
                <div className="space-y-4">
                  {selectedEmployee.hasSaveAccount ? (
                    <>
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Save Account Balance</p>
                            <p className="text-3xl font-bold text-blue-700 mt-1">{selectedEmployee.saveBalance}</p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-blue-500 mt-2">Building healthy financial habits</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Savings Goal</h4>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">65% of $5,000 goal reached</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-1">No Save Account</h4>
                      <p className="text-sm text-gray-500">This employee hasn't set up a Save account yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Balance Modal */}
      {showOutstandingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOutstandingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()} data-tour="outstanding-modal">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-rose-600">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Outstanding Balances</h2>
                  <p className="text-red-200 text-sm">{employeesWithOutstandingBalance.length} employees with balances due</p>
                </div>
                <button
                  onClick={() => setShowOutstandingModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Total Outstanding</p>
                  <p className="text-3xl font-bold text-red-700">${totalOutstandingBalance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600 font-medium">Employees Affected</p>
                  <p className="text-3xl font-bold text-red-700">{employeesWithOutstandingBalance.length}</p>
                </div>
              </div>
            </div>

            {/* Employee List */}
            <div className="overflow-y-auto max-h-[50vh]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Payback Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeesWithOutstandingBalance.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.employeeId} • {emp.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-red-600">{emp.outstandingBalance}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-600">{paybackDates[emp.id] || '2026-02-15'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowOutstandingModal(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transfers
