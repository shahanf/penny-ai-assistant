import { useState, useEffect } from 'react'
import PennySearchBar from '../components/penny/PennySearchBar'

const recentShifts = [
  { id: 1, name: 'Sarah Johnson', location: 'New York - Warehouse A', status: 'Completed', shiftDate: '2024-01-28', shiftTime: '6:00 AM - 2:00 PM', hoursWorked: 8.0, payRate: 28.50, totalPay: 228.00, empId: 'EMP-001', department: 'Operations', hireDate: '2023-03-15', ewaStatus: 'Enrolled', transferAmount: '$450.00', transferCount: 3, saveBalance: '$1,245.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 2, name: 'Michael Chen', location: 'Los Angeles - Distribution', status: 'Completed', shiftDate: '2024-01-28', shiftTime: '2:00 PM - 10:00 PM', hoursWorked: 8.0, payRate: 32.00, totalPay: 256.00, empId: 'EMP-002', department: 'Engineering', hireDate: '2022-11-20', ewaStatus: 'Enrolled', transferAmount: '$380.00', transferCount: 2, saveBalance: '$890.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 3, name: 'Emily Rodriguez', location: 'Chicago - Fulfillment', status: 'In Progress', shiftDate: '2024-01-28', shiftTime: '10:00 PM - 6:00 AM', hoursWorked: 4.5, payRate: 26.00, totalPay: 117.00, empId: 'EMP-003', department: 'Customer Service', hireDate: '2023-06-01', ewaStatus: 'Enrolled', transferAmount: '$275.00', transferCount: 4, saveBalance: '$0.00', hasSaveAccount: false, outstandingBalance: '$125.00' },
  { id: 4, name: 'James Wilson', location: 'Houston - Retail Store', status: 'Completed', shiftDate: '2024-01-28', shiftTime: '9:00 AM - 5:00 PM', hoursWorked: 8.0, payRate: 24.00, totalPay: 192.00, empId: 'EMP-004', department: 'Retail', hireDate: '2024-01-02', ewaStatus: 'Eligible', transferAmount: '$0.00', transferCount: 0, saveBalance: '$0.00', hasSaveAccount: false, outstandingBalance: '$0.00' },
  { id: 5, name: 'Ashley Martinez', location: 'Phoenix - Call Center', status: 'Completed', shiftDate: '2024-01-28', shiftTime: '8:00 AM - 4:00 PM', hoursWorked: 8.0, payRate: 22.50, totalPay: 180.00, empId: 'EMP-005', department: 'Warehouse', hireDate: '2023-08-10', ewaStatus: 'Enrolled', transferAmount: '$520.00', transferCount: 5, saveBalance: '$2,100.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 6, name: 'David Thompson', location: 'Philadelphia - HQ', status: 'Completed', shiftDate: '2024-01-27', shiftTime: '9:00 AM - 6:00 PM', hoursWorked: 9.0, payRate: 35.00, totalPay: 315.00, empId: 'EMP-006', department: 'Management', hireDate: '2021-05-15', ewaStatus: 'Enrolled', transferAmount: '$890.00', transferCount: 6, saveBalance: '$5,400.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 7, name: 'Jessica Brown', location: 'San Antonio - Warehouse B', status: 'Completed', shiftDate: '2024-01-27', shiftTime: '6:00 AM - 2:30 PM', hoursWorked: 8.5, payRate: 27.00, totalPay: 229.50, empId: 'EMP-007', department: 'Warehouse', hireDate: '2023-02-28', ewaStatus: 'Enrolled', transferAmount: '$310.00', transferCount: 3, saveBalance: '$670.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 8, name: 'Christopher Lee', location: 'San Diego - Tech Hub', status: 'Completed', shiftDate: '2024-01-27', shiftTime: '10:00 AM - 7:00 PM', hoursWorked: 9.0, payRate: 38.00, totalPay: 342.00, empId: 'EMP-008', department: 'IT', hireDate: '2022-09-12', ewaStatus: 'Enrolled', transferAmount: '$425.00', transferCount: 2, saveBalance: '$1,890.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 9, name: 'Amanda Garcia', location: 'Dallas - Distribution', status: 'Completed', shiftDate: '2024-01-27', shiftTime: '4:00 AM - 12:00 PM', hoursWorked: 8.0, payRate: 29.00, totalPay: 232.00, empId: 'EMP-009', department: 'HR', hireDate: '2023-04-20', ewaStatus: 'Enrolled', transferAmount: '$195.00', transferCount: 2, saveBalance: '$450.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 10, name: 'Daniel Harris', location: 'San Jose - Fulfillment', status: 'Pending Approval', shiftDate: '2024-01-27', shiftTime: '2:00 PM - 10:30 PM', hoursWorked: 8.5, payRate: 31.00, totalPay: 263.50, empId: 'EMP-010', department: 'Logistics', hireDate: '2023-07-05', ewaStatus: 'Paused', transferAmount: '$150.00', transferCount: 1, saveBalance: '$0.00', hasSaveAccount: false, outstandingBalance: '$75.00' },
  { id: 11, name: 'Stephanie White', location: 'Austin - Retail Store', status: 'Completed', shiftDate: '2024-01-27', shiftTime: '11:00 AM - 7:00 PM', hoursWorked: 8.0, payRate: 23.50, totalPay: 188.00, empId: 'EMP-011', department: 'Marketing', hireDate: '2023-01-15', ewaStatus: 'Enrolled', transferAmount: '$280.00', transferCount: 3, saveBalance: '$920.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 12, name: 'Kevin Anderson', location: 'Jacksonville - Warehouse C', status: 'Completed', shiftDate: '2024-01-26', shiftTime: '5:00 AM - 1:30 PM', hoursWorked: 8.5, payRate: 30.00, totalPay: 255.00, empId: 'EMP-012', department: 'Operations', hireDate: '2022-12-01', ewaStatus: 'Enrolled', transferAmount: '$610.00', transferCount: 5, saveBalance: '$1,550.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 13, name: 'Nicole Taylor', location: 'Fort Worth - Call Center', status: 'Completed', shiftDate: '2024-01-26', shiftTime: '12:00 PM - 8:00 PM', hoursWorked: 8.0, payRate: 24.50, totalPay: 196.00, empId: 'EMP-013', department: 'Customer Service', hireDate: '2023-09-18', ewaStatus: 'Enrolled', transferAmount: '$340.00', transferCount: 4, saveBalance: '$780.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 14, name: 'Brandon Thomas', location: 'Columbus - Distribution', status: 'Completed', shiftDate: '2024-01-26', shiftTime: '3:00 AM - 11:00 AM', hoursWorked: 8.0, payRate: 28.00, totalPay: 224.00, empId: 'EMP-014', department: 'Logistics', hireDate: '2023-05-22', ewaStatus: 'Enrolled', transferAmount: '$475.00', transferCount: 4, saveBalance: '$1,100.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 15, name: 'Rachel Jackson', location: 'Charlotte - HQ', status: 'Completed', shiftDate: '2024-01-26', shiftTime: '8:30 AM - 5:30 PM', hoursWorked: 9.0, payRate: 33.00, totalPay: 297.00, empId: 'EMP-015', department: 'Warehouse', hireDate: '2022-08-30', ewaStatus: 'Enrolled', transferAmount: '$720.00', transferCount: 6, saveBalance: '$2,340.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 16, name: 'Tyler Moore', location: 'Indianapolis - Warehouse A', status: 'Pending Approval', shiftDate: '2024-01-26', shiftTime: '6:00 AM - 2:00 PM', hoursWorked: 8.0, payRate: 27.50, totalPay: 220.00, empId: 'EMP-016', department: 'Engineering', hireDate: '2023-10-10', ewaStatus: 'Enrolled', transferAmount: '$185.00', transferCount: 2, saveBalance: '$320.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 17, name: 'Megan Clark', location: 'San Francisco - Tech Hub', status: 'Completed', shiftDate: '2024-01-26', shiftTime: '9:00 AM - 6:30 PM', hoursWorked: 9.5, payRate: 42.00, totalPay: 399.00, empId: 'EMP-017', department: 'Design', hireDate: '2022-06-15', ewaStatus: 'Enrolled', transferAmount: '$950.00', transferCount: 5, saveBalance: '$3,200.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 18, name: 'Justin Lewis', location: 'Seattle - Fulfillment', status: 'Completed', shiftDate: '2024-01-25', shiftTime: '7:00 AM - 3:30 PM', hoursWorked: 8.5, payRate: 29.50, totalPay: 250.75, empId: 'EMP-018', department: 'Logistics', hireDate: '2023-03-08', ewaStatus: 'Enrolled', transferAmount: '$395.00', transferCount: 3, saveBalance: '$890.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 19, name: 'Lauren Walker', location: 'Denver - Retail Store', status: 'Completed', shiftDate: '2024-01-25', shiftTime: '10:00 AM - 6:00 PM', hoursWorked: 8.0, payRate: 25.00, totalPay: 200.00, empId: 'EMP-019', department: 'Retail', hireDate: '2023-11-01', ewaStatus: 'Enrolled', transferAmount: '$210.00', transferCount: 2, saveBalance: '$450.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
  { id: 20, name: 'Ryan Hall', location: 'Boston - Distribution', status: 'Completed', shiftDate: '2024-01-25', shiftTime: '4:00 AM - 12:30 PM', hoursWorked: 8.5, payRate: 34.00, totalPay: 289.00, empId: 'EMP-020', department: 'Management', hireDate: '2021-12-15', ewaStatus: 'Enrolled', transferAmount: '$1,100.00', transferCount: 7, saveBalance: '$4,500.00', hasSaveAccount: true, outstandingBalance: '$0.00' },
]

function getStatusBadge(status) {
  const styles = {
    'Completed': 'bg-green-100 text-green-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Pending Approval': 'bg-yellow-100 text-yellow-800',
  }
  return styles[status] || 'bg-gray-100 text-gray-800'
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

const INSTANT_FEE = 3.29

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

function ShiftsPay() {
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showOutstandingModal, setShowOutstandingModal] = useState(false)

  // Tour action listener
  useEffect(() => {
    const handleTourAction = (e) => {
      const { action } = e.detail
      if (action === 'closeAllModals') {
        setSelectedEmployee(null)
        setActiveTab('overview')
        setShowOutstandingModal(false)
      }
    }
    
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [])
  
  const totalHours = recentShifts.reduce((sum, shift) => sum + shift.hoursWorked, 0)
  const totalPay = recentShifts.reduce((sum, shift) => sum + shift.totalPay, 0)
  const totalAvailable = totalPay * 0.5

  const handleEmployeeClick = (shift) => {
    setSelectedEmployee(shift)
    setActiveTab('overview')
  }

  const closeModal = () => {
    setSelectedEmployee(null)
    setActiveTab('overview')
  }

  // Generate mock transfer history for the selected employee
  const getEmployeeTransfers = (employee) => {
    if (!employee) return []
    const transferCount = employee.transferCount || 0
    const transfers = []
    const statuses = ['Completed', 'Completed', 'Completed', 'Pending']
    const methods = ['Instant', 'Standard', 'Instant']
    for (let i = 0; i < transferCount; i++) {
      const method = methods[i % methods.length]
      transfers.push({
        id: i + 1,
        date: `2024-01-${28 - i}`,
        amount: parseFloat(employee.transferAmount?.replace(/[$,]/g, '') || 0) / Math.max(transferCount, 1),
        method,
        fee: method === 'Instant' ? INSTANT_FEE : 0,
        status: statuses[i % statuses.length],
      })
    }
    return transfers
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shifts & Pay</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-1">
          <p className="text-sm sm:text-base text-gray-600">View recent shifts worked and available balances for transfer.</p>
          <div className="w-full sm:w-auto">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex md:grid md:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0" data-tour="shifts-stats">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[160px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Shifts</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{recentShifts.length}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[160px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{totalHours.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[160px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Pay</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalPay)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-4 sm:p-6 text-white min-w-[180px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-100">Available to Transfer</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{formatCurrency(totalAvailable)}</p>
              <p className="text-[10px] sm:text-xs text-green-200 mt-1">50% of earned wages</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div
          className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg p-4 sm:p-6 text-white cursor-pointer hover:from-red-600 hover:to-rose-700 hover:shadow-xl transition-all min-w-[180px] md:min-w-0 flex-shrink-0 md:flex-shrink"
          onClick={() => setShowOutstandingModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-red-100">Outstanding Balance</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">$996.90</p>
              <p className="text-[10px] sm:text-xs text-red-200 mt-1">6 employees • Click to view</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-tour="shifts-table">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Shifts</h3>
              <p className="text-sm text-gray-500">Showing shifts from the past week</p>
            </div>
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option>All Locations</option>
                <option>New York</option>
                <option>Los Angeles</option>
                <option>Chicago</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option>All Statuses</option>
                <option>Completed</option>
                <option>In Progress</option>
                <option>Pending Approval</option>
              </select>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors" data-tour="shifts-export">
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Rate</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pay</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available (50%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentShifts.map((shift) => {
                const availableBalance = shift.totalPay * 0.5
                return (
                  <tr 
                    key={shift.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleEmployeeClick(shift)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-purple-600">
                            {shift.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{shift.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{shift.location}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{shift.shiftDate}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{shift.shiftTime}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(shift.status)}`}>
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">{shift.hoursWorked.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-600">{formatCurrency(shift.payRate)}/hr</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(shift.totalPay)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(availableBalance)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan="5" className="px-6 py-4 text-sm font-semibold text-gray-900">Totals</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{totalHours.toFixed(1)}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-500">—</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{formatCurrency(totalPay)}</td>
                <td className="px-6 py-4 text-right text-sm font-bold text-green-600">{formatCurrency(totalAvailable)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Showing 1 to 20 of 156 shifts</p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
                    <p className="text-purple-200">{selectedEmployee.empId} • {selectedEmployee.department}</p>
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
                {['overview', 'transfers', 'savings', 'shifts'].map((tab) => (
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
                      <p className="text-sm text-green-600 font-medium">Transferred</p>
                      <p className="text-2xl font-bold text-green-700">{selectedEmployee.transferAmount}</p>
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

                  {/* Recent Shift */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Most Recent Shift</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900 font-medium">{selectedEmployee.shiftDate}</p>
                        <p className="text-sm text-gray-500">{selectedEmployee.shiftTime}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-medium">{selectedEmployee.hoursWorked} hours</p>
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedEmployee.totalPay)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">Transfer History</h4>
                    <span className="text-xs text-gray-500">{selectedEmployee.transferCount} total transfers</span>
                  </div>
                  
                  {getEmployeeTransfers(selectedEmployee).length > 0 ? (
                    <div className="space-y-3">
                      {getEmployeeTransfers(selectedEmployee).map((transfer) => (
                        <div key={transfer.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transfer.method === 'Instant' ? 'bg-yellow-100' : 'bg-green-100'
                            }`}>
                              <svg className={`w-5 h-5 ${transfer.method === 'Instant' ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{transfer.method} Transfer</p>
                              <p className="text-xs text-gray-500">{transfer.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(transfer.amount)}</p>
                            <p className="text-xs text-gray-500">
                              Fee: {transfer.fee > 0 ? `$${transfer.fee.toFixed(2)}` : 'Free'}
                            </p>
                          </div>
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transfer.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
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

              {activeTab === 'shifts' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Shift</h4>
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedEmployee.shiftDate}</p>
                        <p className="text-xs text-gray-500">{selectedEmployee.shiftTime}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedEmployee.status)}`}>
                          {selectedEmployee.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{selectedEmployee.hoursWorked}</p>
                        <p className="text-xs text-gray-500">Hours</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedEmployee.payRate)}</p>
                        <p className="text-xs text-gray-500">Rate/hr</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(selectedEmployee.totalPay)}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Available to Transfer</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(selectedEmployee.totalPay * 0.5)}</p>
                      </div>
                      <span className="text-xs text-green-500">50% of earned wages</span>
                    </div>
                  </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
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

export default ShiftsPay
