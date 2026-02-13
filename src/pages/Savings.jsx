import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import PennySearchBar from '../components/penny/PennySearchBar'

// Full employee data for modal (aligned with Employees page)
const fullEmployeeData = [
  { id: 1, name: 'Sarah Johnson', location: 'New York', status: 'Enrolled', hoursWorked: 40, pay: '$28.50', rate: 'Hourly', transferAmount: '$450.00', transferCount: 8, hireDate: '2022-03-15', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'sarah.johnson@company.com', phone: '(555) 123-4567', department: 'Operations', employeeId: 'EMP-001', bankAccount: '****4521', saveBalance: '$1,245.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 2, name: 'Michael Chen', location: 'Los Angeles', status: 'Enrolled', hoursWorked: 45, pay: '$52,000', rate: 'Salary', transferAmount: '$1,200.00', transferCount: 15, hireDate: '2021-07-22', outstandingBalance: '$125.50', lastLogin: '1 day ago', email: 'michael.chen@company.com', phone: '(555) 234-5678', department: 'Engineering', employeeId: 'EMP-002', bankAccount: '****7832', saveBalance: '$3,420.00', hasSaveAccount: true, hasSupportTicket: true },
  { id: 3, name: 'Emily Rodriguez', location: 'Chicago', status: 'Enrolled', hoursWorked: 38, pay: '$24.00', rate: 'Hourly', transferAmount: '$320.00', transferCount: 5, hireDate: '2023-01-10', outstandingBalance: '$0.00', lastLogin: '3 hours ago', email: 'emily.rodriguez@company.com', phone: '(555) 345-6789', department: 'Customer Service', employeeId: 'EMP-003', bankAccount: '****2145', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 5, name: 'Ashley Martinez', location: 'Phoenix', status: 'Paused', hoursWorked: 0, pay: '$31.00', rate: 'Hourly', transferAmount: '$675.00', transferCount: 12, hireDate: '2022-08-18', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'ashley.martinez@company.com', phone: '(555) 567-8901', department: 'Warehouse', employeeId: 'EMP-005', bankAccount: '****3456', saveBalance: '$2,100.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 6, name: 'David Thompson', location: 'Philadelphia', status: 'Enrolled', hoursWorked: 50, pay: '$58,000', rate: 'Salary', transferAmount: '$890.00', transferCount: 10, hireDate: '2019-04-20', outstandingBalance: '$0.00', lastLogin: '6 hours ago', email: 'david.thompson@company.com', phone: '(555) 678-9012', department: 'Management', employeeId: 'EMP-006', bankAccount: '****6543', saveBalance: '$5,400.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 8, name: 'Christopher Lee', location: 'San Diego', status: 'Enrolled', hoursWorked: 44, pay: '$48,500', rate: 'Salary', transferAmount: '$1,100.00', transferCount: 14, hireDate: '2022-05-30', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'christopher.lee@company.com', phone: '(555) 890-1234', department: 'IT', employeeId: 'EMP-008', bankAccount: '****2341', saveBalance: '$1,890.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 9, name: 'Amanda Garcia', location: 'Dallas', status: 'Enrolled', hoursWorked: 36, pay: '$29.75', rate: 'Hourly', transferAmount: '$520.00', transferCount: 9, hireDate: '2023-02-14', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'amanda.garcia@company.com', phone: '(555) 901-2345', department: 'HR', employeeId: 'EMP-009', bankAccount: '****5678', saveBalance: '$450.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 11, name: 'Stephanie White', location: 'Austin', status: 'Enrolled', hoursWorked: 39, pay: '$33.25', rate: 'Hourly', transferAmount: '$780.00', transferCount: 11, hireDate: '2021-06-25', outstandingBalance: '$67.80', lastLogin: '1 day ago', email: 'stephanie.white@company.com', phone: '(555) 123-7890', department: 'Marketing', employeeId: 'EMP-011', bankAccount: '****4321', saveBalance: '$920.00', hasSaveAccount: true, hasSupportTicket: true },
  { id: 12, name: 'Kevin Anderson', location: 'Jacksonville', status: 'Enrolled', hoursWorked: 48, pay: '$61,000', rate: 'Salary', transferAmount: '$1,450.00', transferCount: 18, hireDate: '2018-10-12', outstandingBalance: '$0.00', lastLogin: '8 hours ago', email: 'kevin.anderson@company.com', phone: '(555) 234-8901', department: 'Operations', employeeId: 'EMP-012', bankAccount: '****9012', saveBalance: '$1,550.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 13, name: 'Nicole Taylor', location: 'Fort Worth', status: 'Enrolled', hoursWorked: 40, pay: '$27.00', rate: 'Hourly', transferAmount: '$410.00', transferCount: 7, hireDate: '2022-11-28', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'nicole.taylor@company.com', phone: '(555) 345-9012', department: 'Customer Service', employeeId: 'EMP-013', bankAccount: '****1234', saveBalance: '$780.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 15, name: 'Rachel Jackson', location: 'Charlotte', status: 'Enrolled', hoursWorked: 41, pay: '$30.50', rate: 'Hourly', transferAmount: '$590.00', transferCount: 8, hireDate: '2023-04-05', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'rachel.jackson@company.com', phone: '(555) 567-1234', department: 'Warehouse', employeeId: 'EMP-015', bankAccount: '****6789', saveBalance: '$2,340.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 16, name: 'Tyler Moore', location: 'Indianapolis', status: 'Enrolled', hoursWorked: 45, pay: '$55,000', rate: 'Salary', transferAmount: '$980.00', transferCount: 13, hireDate: '2020-01-22', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'tyler.moore@company.com', phone: '(555) 678-2345', department: 'Engineering', employeeId: 'EMP-016', bankAccount: '****7654', saveBalance: '$320.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 17, name: 'Megan Clark', location: 'San Francisco', status: 'Enrolled', hoursWorked: 43, pay: '$35.00', rate: 'Hourly', transferAmount: '$820.00', transferCount: 10, hireDate: '2022-07-11', outstandingBalance: '$0.00', lastLogin: '4 hours ago', email: 'megan.clark@company.com', phone: '(555) 789-3456', department: 'Design', employeeId: 'EMP-017', bankAccount: '****8901', saveBalance: '$3,200.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 19, name: 'Lauren Walker', location: 'Denver', status: 'Enrolled', hoursWorked: 37, pay: '$28.00', rate: 'Hourly', transferAmount: '$380.00', transferCount: 6, hireDate: '2023-05-19', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'lauren.walker@company.com', phone: '(555) 901-5678', department: 'Retail', employeeId: 'EMP-019', bankAccount: '****3210', saveBalance: '$450.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 20, name: 'Ryan Hall', location: 'Boston', status: 'Enrolled', hoursWorked: 46, pay: '$63,000', rate: 'Salary', transferAmount: '$1,680.00', transferCount: 20, hireDate: '2018-05-07', outstandingBalance: '$0.00', lastLogin: '2 hours ago', email: 'ryan.hall@company.com', phone: '(555) 012-6789', department: 'Management', employeeId: 'EMP-020', bankAccount: '****4321', saveBalance: '$4,500.00', hasSaveAccount: true, hasSupportTicket: false },
]

// Transfer fee: Instant = $3.29, Standard = Free
const INSTANT_FEE = 3.29

const transferHistory = [
  { id: 1, date: '2024-01-28', amount: '$150.00', status: 'Completed', method: 'Instant', fee: 3.29 },
  { id: 2, date: '2024-01-25', amount: '$200.00', status: 'Completed', method: 'Standard', fee: 0 },
  { id: 3, date: '2024-01-20', amount: '$75.00', status: 'Completed', method: 'Instant', fee: 3.29 },
  { id: 4, date: '2024-01-15', amount: '$300.00', status: 'Completed', method: 'Instant', fee: 3.29 },
  { id: 5, date: '2024-01-10', amount: '$125.00', status: 'Completed', method: 'Standard', fee: 0 },
]

const saveTransactions = [
  { id: 1, date: '2024-01-28', type: 'Deposit', amount: '+$50.00', balance: '$1,245.00' },
  { id: 2, date: '2024-01-21', type: 'Deposit', amount: '+$50.00', balance: '$1,195.00' },
  { id: 3, date: '2024-01-14', type: 'Withdrawal', amount: '-$100.00', balance: '$1,145.00' },
  { id: 4, date: '2024-01-07', type: 'Deposit', amount: '+$50.00', balance: '$1,245.00' },
  { id: 5, date: '2023-12-31', type: 'Deposit', amount: '+$75.00', balance: '$1,195.00' },
]

function getStatusConfig(status) {
  const configs = {
    Enrolled: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    Eligible: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    Disabled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    Paused: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  }
  return configs[status] || configs.Eligible
}

function hasOutstandingBalance(balance) {
  return parseFloat(balance.replace('$', '').replace(',', '')) > 0
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {status}
    </span>
  )
}

function EmployeeModal({ employee, onClose, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Update active tab when initialTab prop changes (e.g., when opening modal for different employee)
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, employee])

  if (!employee) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transfers', label: 'Transfers', icon: '💸' },
    { id: 'savings', label: 'Savings', icon: '🏦' },
    { id: 'details', label: 'Details', icon: '📋' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-700 px-6 py-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{employee.name}</h2>
              <p className="text-purple-200 text-sm">{employee.department} • {employee.location}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={employee.status} />
                {employee.hasSupportTicket && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                    🎫 Support Ticket
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{employee.transferAmount}</p>
              <p className="text-xs text-purple-200">Total Transferred</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</p>
              <p className="text-xs text-purple-200">Savings Balance</p>
            </div>
            <div className={`backdrop-blur rounded-xl p-3 text-center ${hasOutstandingBalance(employee.outstandingBalance) ? 'bg-red-500/30' : 'bg-white/10'}`}>
              <p className={`text-2xl font-bold ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-200' : 'text-white'}`}>
                {employee.outstandingBalance}
              </p>
              <p className={`text-xs ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-200' : 'text-purple-200'}`}>Outstanding</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 bg-gray-50/50">
          <nav className="flex px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-320px)]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* EWA Activity Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">EWA Activity This Month</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{employee.transferCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Transfers</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{employee.transferAmount}</p>
                    <p className="text-xs text-gray-500 mt-1">Amount</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">$56</p>
                    <p className="text-xs text-gray-500 mt-1">Avg Transfer</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">Saved</p>
                  </div>
                </div>
              </div>

              {/* Current Pay Period */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Pay Period</h3>
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-xs">Earned So Far</p>
                      <p className="text-2xl font-bold">$1,140.00</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Next Payday</p>
                      <p className="text-lg font-semibold">Feb 2, 2026</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Transferred</span>
                      <span className="font-medium">{employee.transferAmount}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Available to Transfer</span>
                      <span className="font-medium text-emerald-400">$120.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {transferHistory.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.method === 'Instant' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {t.method === 'Instant' ? (
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Transfer • {t.method}
                            {t.fee > 0 && <span className="text-purple-600 ml-1">(${t.fee.toFixed(2)} fee)</span>}
                            {t.fee === 0 && <span className="text-gray-400 ml-1">(Free)</span>}
                          </p>
                          <p className="text-xs text-gray-500">{t.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {t.fee > 0 
                            ? `$${(parseFloat(t.amount.replace(/[$,]/g, '')) + t.fee).toFixed(2)}` 
                            : t.amount
                          }
                        </span>
                        {t.fee > 0 && (
                          <p className="text-xs text-gray-400">{t.amount} + fee</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                  Edit Employee
                </button>
                {employee.status === 'Enrolled' ? (
                  <button className="px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
                    Pause EWA
                  </button>
                ) : (
                  <button className="px-4 py-2.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
                    Enable EWA
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              {/* Calculate totals including fees */}
              {(() => {
                const baseAmount = parseFloat(employee.transferAmount.replace(/[$,]/g, ''));
                const instantCount = transferHistory.filter(t => t.method === 'Instant').length;
                const totalWithFees = baseAmount + (instantCount * INSTANT_FEE);
                const totalFeesPaid = instantCount * INSTANT_FEE;
                return (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-purple-600 font-medium">Base Amount</p>
                      <p className="text-xl font-bold text-purple-700 mt-1">{employee.transferAmount}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-xs text-amber-600 font-medium">Instant Fees</p>
                      <p className="text-xl font-bold text-amber-700 mt-1">${totalFeesPaid.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-xs text-emerald-600 font-medium">Total w/ Fees</p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">${totalWithFees.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-xs text-purple-600 font-medium">Transfers</p>
                      <p className="text-xl font-bold text-purple-700 mt-1">{employee.transferCount}</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Transfer History</h3>
                  <button className="text-xs text-purple-600 font-medium hover:text-purple-700">Export CSV</button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transferHistory.map((t) => {
                        const baseAmount = parseFloat(t.amount.replace(/[$,]/g, ''));
                        const totalAmount = baseAmount + t.fee;
                        return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{t.date}</td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-sm font-medium text-gray-900">${totalAmount.toFixed(2)}</span>
                              {t.fee > 0 && <p className="text-xs text-gray-400">{t.amount} + ${t.fee.toFixed(2)} fee</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              t.method === 'Instant' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {t.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {t.fee > 0 ? `$${t.fee.toFixed(2)}` : <span className="text-gray-400">Free</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                              <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Savings Tab */}
          {activeTab === 'savings' && (
            <div className="space-y-6">
              {employee.hasSaveAccount ? (
                <>
                  {/* Savings Overview */}
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-emerald-100 text-xs">Current Balance</p>
                        <p className="text-3xl font-bold">{employee.saveBalance}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🏦</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-emerald-100 text-xs">Auto-Save</p>
                        <p className="text-lg font-semibold">$50/week</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-emerald-100 text-xs">Goal Progress</p>
                        <p className="text-lg font-semibold">24.9%</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Transaction History</h3>
                      <button className="text-xs text-purple-600 font-medium hover:text-purple-700">Export CSV</button>
                    </div>
                    <div className="space-y-2">
                      {saveTransactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              t.type === 'Deposit' ? 'bg-emerald-100' : 'bg-red-100'
                            }`}>
                              <svg className={`w-4 h-4 ${t.type === 'Deposit' ? 'text-emerald-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.type === 'Deposit' ? "M12 4v16m8-8H4" : "M20 12H4"} />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{t.type}</p>
                              <p className="text-xs text-gray-500">{t.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${t.type === 'Deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.amount}
                            </p>
                            <p className="text-xs text-gray-400">{t.balance}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏦</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Savings Account</h3>
                  <p className="text-gray-500 text-sm mb-4">This employee hasn't set up a savings account yet.</p>
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                    Invite to Save
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm font-medium text-gray-900">{employee.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Phone</span>
                      <span className="text-sm font-medium text-gray-900">{employee.phone}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Location</span>
                      <span className="text-sm font-medium text-gray-900">{employee.location}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">Last Login</span>
                      <span className="text-sm font-medium text-gray-900">{employee.lastLogin}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Employment</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Employee ID</span>
                      <span className="text-sm font-medium text-gray-900">{employee.employeeId}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Department</span>
                      <span className="text-sm font-medium text-gray-900">{employee.department}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Hire Date</span>
                      <span className="text-sm font-medium text-gray-900">{employee.hireDate}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-500">Pay Rate</span>
                      <span className="text-sm font-medium text-gray-900">{employee.pay} ({employee.rate})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bank Account</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Chase Bank • Checking</p>
                      <p className="text-xs text-gray-500">Account ending in {employee.bankAccount}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Data aligned with Adoption & Usage page
const savingsTimelineData = {
  'pay-cycle': {
    saveAccounts: { count: 378, value: 45230, avgBalance: 119.66 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
  },
  month: {
    saveAccounts: { count: 378, value: 45230, avgBalance: 119.66 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
  },
  quarter: {
    saveAccounts: { count: 356, value: 42599, avgBalance: 119.66 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
  },
  year: {
    saveAccounts: { count: 298, value: 35659, avgBalance: 119.66 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
  },
}

// Pay cycle data
const payCycles = [
  { id: 1, name: 'Jan 16 - Jan 31, 2026', startDate: '2026-01-16', endDate: '2026-01-31' },
  { id: 2, name: 'Jan 1 - Jan 15, 2026', startDate: '2026-01-01', endDate: '2026-01-15' },
  { id: 3, name: 'Dec 16 - Dec 31, 2025', startDate: '2025-12-16', endDate: '2025-12-31' },
  { id: 4, name: 'Dec 1 - Dec 15, 2025', startDate: '2025-12-01', endDate: '2025-12-15' },
]

// Employee savings data (aligned with Transfers page)
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function parseCurrency(value) {
  return Number(value.replace(/[$,]/g, ''))
}

function getBalanceTier(balance) {
  if (balance >= 3000) return 'High Saver'
  if (balance >= 1500) return 'Growing'
  if (balance >= 750) return 'Starter'
  return 'New'
}

function Savings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [timePeriod, setTimePeriod] = useState('pay-cycle')
  const [selectedPayCycle, setSelectedPayCycle] = useState(payCycles[0].id)
  const [selectedMonth, setSelectedMonth] = useState('2026-01')
  const [selectedQuarter, setSelectedQuarter] = useState('2026-Q1')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // Function to get full employee data by employeeId
  const getFullEmployeeData = (employeeId) => {
    return fullEmployeeData.find(emp => emp.employeeId === employeeId)
  }

  // Function to get full employee data by name
  const getFullEmployeeDataByName = (name) => {
    const nameLower = name.toLowerCase()
    return fullEmployeeData.find(emp => 
      emp.name.toLowerCase() === nameLower ||
      emp.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(emp.name.split(' ')[0].toLowerCase())
    )
  }

  // Check URL params for employee to open modal (from Penny navigation)
  useEffect(() => {
    const employeeId = searchParams.get('employee')
    const employeeName = searchParams.get('name')
    
    if (employeeId) {
      const employee = getFullEmployeeData(employeeId)
      if (employee) {
        setSelectedEmployee(employee)
        // Clear the search params after opening modal
        setSearchParams({})
      }
    } else if (employeeName) {
      const employee = getFullEmployeeDataByName(employeeName)
      if (employee) {
        setSelectedEmployee(employee)
        // Clear the search params after opening modal
        setSearchParams({})
      }
    }
  }, [searchParams, setSearchParams])

  // Listen for Penny events to open employee modal
  useEffect(() => {
    const handlePennyAction = (e) => {
      const { action, employeeId, employeeName } = e.detail || {}
      
      if (action === 'openEmployeeSavings') {
        let employee = null
        if (employeeId) {
          employee = getFullEmployeeData(employeeId)
        } else if (employeeName) {
          employee = getFullEmployeeDataByName(employeeName)
        }
        if (employee) {
          setSelectedEmployee(employee)
        }
      }
    }
    
    window.addEventListener('penny-action', handlePennyAction)
    return () => window.removeEventListener('penny-action', handlePennyAction)
  }, [])

  // Tour action listener
  useEffect(() => {
    const handleTourAction = (e) => {
      const { action } = e.detail
      if (action === 'closeAllModals') {
        setSelectedEmployee(null)
      }
    }
    
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [])

  const savingsAccounts = useMemo(() => {
    return Object.entries(employeeData).map(([employeeId, employee]) => {
      const balance = parseCurrency(employee.saveBalance)
      return {
        employeeId,
        ...employee,
        saveBalanceAmount: balance,
        balanceTier: employee.hasSaveAccount ? getBalanceTier(balance) : 'Not Enrolled',
      }
    })
  }, [])

  const filteredAccounts = savingsAccounts.filter((account) => {
    const matchesSearch = searchQuery
      ? account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.department.toLowerCase().includes(searchQuery.toLowerCase())
      : true

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && account.hasSaveAccount) ||
      (statusFilter === 'Not Enrolled' && !account.hasSaveAccount) ||
      (statusFilter === 'Low Balance' && account.hasSaveAccount && account.saveBalanceAmount < 500)

    return matchesSearch && matchesStatus
  })

  const currentStats = savingsTimelineData[timePeriod]
  const totalAccounts = currentStats.saveAccounts.count
  const totalSaved = currentStats.saveAccounts.value
  const totalEnrolled = currentStats.totalAdoption.count
  const participationRate = Math.round((totalAccounts / totalEnrolled) * 100)
  const avgSavedPerEnrolled = totalSaved / totalEnrolled
  const avgSavedPerAccount = totalAccounts > 0 ? totalSaved / totalAccounts : 0
  const notEnrolledCount = savingsAccounts.filter(account => !account.hasSaveAccount).length

  const getTimePeriodLabel = () => {
    if (timePeriod === 'pay-cycle') {
      return payCycles.find(c => c.id === selectedPayCycle)?.name || ''
    } else if (timePeriod === 'month') {
      const [year, month] = selectedMonth.split('-')
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    } else if (timePeriod === 'quarter') {
      return selectedQuarter.replace('-', ' ')
    }
    return selectedYear
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Savings</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1">
          <p className="text-gray-500 text-sm">Track and grow employee savings accounts</p>
          <div className="hidden sm:block">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
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
      <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-4 mb-4 sm:mb-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide" data-tour="savings-stats">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Active Save Accounts</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{totalAccounts.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">{participationRate}% of enrolled employees</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Saved</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalSaved)}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">Across {totalAccounts.toLocaleString()} accounts</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Avg / Account</p>
              <p className="text-lg md:text-2xl font-bold text-amber-600 mt-1">{formatCurrency(avgSavedPerAccount)}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">Blended across all savers</p>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Avg / Enrolled</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 mt-1">{formatCurrency(avgSavedPerEnrolled)}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l3-3 4 4 6-6" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 hidden md:block">Across {totalEnrolled.toLocaleString()} enrolled</p>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="All">All Accounts</option>
              <option value="Active">Active Only</option>
              <option value="Low Balance">Low Balance</option>
              <option value="Not Enrolled">Not Enrolled</option>
            </select>
            <button className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap" data-tour="savings-export">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Savings Accounts Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden" data-tour="savings-table">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Savings Accounts</h3>
              <p className="text-sm text-gray-500">{notEnrolledCount} employees not enrolled</p>
            </div>
            <span className="text-sm text-gray-500">{filteredAccounts.length} records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Save Balance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Tier</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <tr
                    key={account.employeeId}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedEmployee(getFullEmployeeData(account.employeeId))}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">
                            {account.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-500">{account.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{account.department}</p>
                      <p className="text-xs text-gray-500">{account.location}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-semibold ${account.hasSaveAccount ? 'text-gray-900' : 'text-gray-400'}`}>
                        {account.hasSaveAccount ? formatCurrency(account.saveBalanceAmount) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        account.balanceTier === 'High Saver'
                          ? 'bg-emerald-100 text-emerald-700'
                          : account.balanceTier === 'Growing'
                          ? 'bg-blue-100 text-blue-700'
                          : account.balanceTier === 'Starter'
                          ? 'bg-amber-100 text-amber-700'
                          : account.balanceTier === 'New'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {account.balanceTier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        account.hasSaveAccount ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${account.hasSaveAccount ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {account.hasSaveAccount ? 'Active' : 'Not Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">No accounts match this filter</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings Accounts List - Mobile */}
      <div className="md:hidden">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Savings Accounts</h3>
              <span className="text-xs text-gray-500">{filteredAccounts.length} records</span>
            </div>
          </div>
        </div>

        {filteredAccounts.length > 0 ? (
          <div className="space-y-3">
            {filteredAccounts.map((account) => (
              <div
                key={account.employeeId}
                onClick={() => setSelectedEmployee(getFullEmployeeData(account.employeeId))}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {account.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.name}</p>
                    <p className="text-xs text-gray-500">{account.department}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    account.hasSaveAccount ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {account.hasSaveAccount ? 'Active' : 'Not Enrolled'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500">Balance:</span>
                    <span className={`ml-1 text-sm font-semibold ${account.hasSaveAccount ? 'text-gray-900' : 'text-gray-400'}`}>
                      {account.hasSaveAccount ? formatCurrency(account.saveBalanceAmount) : '—'}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    account.balanceTier === 'High Saver'
                      ? 'bg-emerald-100 text-emerald-700'
                      : account.balanceTier === 'Growing'
                      ? 'bg-blue-100 text-blue-700'
                      : account.balanceTier === 'Starter'
                      ? 'bg-amber-100 text-amber-700'
                      : account.balanceTier === 'New'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {account.balanceTier}
                  </span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-center">
              <p className="text-sm text-gray-500">{notEnrolledCount} employees not enrolled</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No accounts match this filter</p>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {selectedEmployee && (
        <EmployeeModal 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)} 
          initialTab="savings"
        />
      )}
    </div>
  )
}

export default Savings
