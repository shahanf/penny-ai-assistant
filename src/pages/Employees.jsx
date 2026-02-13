import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import PennySearchBar from '../components/penny/PennySearchBar'

// Initial groups with colors
const initialGroups = [
  { id: 1, name: 'Warehouse Team', color: 'blue', emoji: '📦' },
  { id: 2, name: 'Office Staff', color: 'purple', emoji: '💼' },
  { id: 3, name: 'Management', color: 'amber', emoji: '👔' },
  { id: 4, name: 'New Hires', color: 'green', emoji: '🌱' },
]

// Employee to group mappings (employee id -> group ids)
const initialEmployeeGroups = {
  1: [2], // Sarah Johnson - Office Staff
  2: [2, 3], // Michael Chen - Office Staff, Management
  5: [1], // Ashley Martinez - Warehouse Team
  6: [3], // David Thompson - Management
  8: [2], // Christopher Lee - Office Staff
  12: [1, 3], // Kevin Anderson - Warehouse Team, Management
  15: [1], // Rachel Jackson - Warehouse Team
  20: [3], // Ryan Hall - Management
}

const groupColors = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-indigo-500' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
}

const employees = [
  { id: 1, name: 'Sarah Johnson', location: 'New York', status: 'Enrolled', hoursWorked: 40, pay: '$28.50', rate: 'Hourly', transferAmount: '$450.00', transferCount: 8, hireDate: '2022-03-15', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'sarah.johnson@company.com', phone: '(555) 123-4567', department: 'Operations', employeeId: 'EMP-001', bankAccount: '****4521', saveBalance: '$1,245.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 2, name: 'Michael Chen', location: 'Los Angeles', status: 'Enrolled', hoursWorked: 45, pay: '$52,000', rate: 'Salary', transferAmount: '$1,200.00', transferCount: 15, hireDate: '2021-07-22', outstandingBalance: '$125.50', lastLogin: '1 day ago', email: 'michael.chen@company.com', phone: '(555) 234-5678', department: 'Engineering', employeeId: 'EMP-002', bankAccount: '****7832', saveBalance: '$3,420.00', hasSaveAccount: true, hasSupportTicket: true },
  { id: 3, name: 'Emily Rodriguez', location: 'Chicago', status: 'Enrolled', hoursWorked: 38, pay: '$24.00', rate: 'Hourly', transferAmount: '$320.00', transferCount: 5, hireDate: '2023-01-10', outstandingBalance: '$0.00', lastLogin: '3 hours ago', email: 'emily.rodriguez@company.com', phone: '(555) 345-6789', department: 'Customer Service', employeeId: 'EMP-003', bankAccount: '****2145', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 4, name: 'James Wilson', location: 'Houston', status: 'Eligible', hoursWorked: 0, pay: '$45,000', rate: 'Salary', transferAmount: '$0.00', transferCount: 0, hireDate: '2020-11-05', outstandingBalance: '$89.25', lastLogin: '2 days ago', email: 'james.wilson@company.com', phone: '(555) 456-7890', department: 'Sales', employeeId: 'EMP-004', bankAccount: '****9876', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 5, name: 'Ashley Martinez', location: 'Phoenix', status: 'Paused', hoursWorked: 0, pay: '$31.00', rate: 'Hourly', transferAmount: '$675.00', transferCount: 12, hireDate: '2022-08-18', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'ashley.martinez@company.com', phone: '(555) 567-8901', department: 'Warehouse', employeeId: 'EMP-005', bankAccount: '****3456', saveBalance: '$2,100.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 6, name: 'David Thompson', location: 'Philadelphia', status: 'Enrolled', hoursWorked: 50, pay: '$58,000', rate: 'Salary', transferAmount: '$890.00', transferCount: 10, hireDate: '2019-04-20', outstandingBalance: '$0.00', lastLogin: '6 hours ago', email: 'david.thompson@company.com', phone: '(555) 678-9012', department: 'Management', employeeId: 'EMP-006', bankAccount: '****6543', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 7, name: 'Jessica Brown', location: 'San Antonio', status: 'Disabled', hoursWorked: 0, pay: '$26.50', rate: 'Hourly', transferAmount: '$0.00', transferCount: 0, hireDate: '2021-12-01', outstandingBalance: '$245.00', lastLogin: '3 days ago', email: 'jessica.brown@company.com', phone: '(555) 789-0123', department: 'Retail', employeeId: 'EMP-007', bankAccount: '****7890', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: true },
  { id: 8, name: 'Christopher Lee', location: 'San Diego', status: 'Enrolled', hoursWorked: 44, pay: '$48,500', rate: 'Salary', transferAmount: '$1,100.00', transferCount: 14, hireDate: '2022-05-30', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'christopher.lee@company.com', phone: '(555) 890-1234', department: 'IT', employeeId: 'EMP-008', bankAccount: '****2341', saveBalance: '$4,200.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 9, name: 'Amanda Garcia', location: 'Dallas', status: 'Enrolled', hoursWorked: 36, pay: '$29.75', rate: 'Hourly', transferAmount: '$520.00', transferCount: 9, hireDate: '2023-02-14', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'amanda.garcia@company.com', phone: '(555) 901-2345', department: 'HR', employeeId: 'EMP-009', bankAccount: '****5678', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 10, name: 'Daniel Harris', location: 'San Jose', status: 'Eligible', hoursWorked: 0, pay: '$42,000', rate: 'Salary', transferAmount: '$0.00', transferCount: 0, hireDate: '2020-09-08', outstandingBalance: '$0.00', lastLogin: '3 days ago', email: 'daniel.harris@company.com', phone: '(555) 012-3456', department: 'Finance', employeeId: 'EMP-010', bankAccount: '****8765', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 11, name: 'Stephanie White', location: 'Austin', status: 'Enrolled', hoursWorked: 39, pay: '$33.25', rate: 'Hourly', transferAmount: '$780.00', transferCount: 11, hireDate: '2021-06-25', outstandingBalance: '$67.80', lastLogin: '1 day ago', email: 'stephanie.white@company.com', phone: '(555) 123-7890', department: 'Marketing', employeeId: 'EMP-011', bankAccount: '****4321', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: true },
  { id: 12, name: 'Kevin Anderson', location: 'Jacksonville', status: 'Enrolled', hoursWorked: 48, pay: '$61,000', rate: 'Salary', transferAmount: '$1,450.00', transferCount: 18, hireDate: '2018-10-12', outstandingBalance: '$0.00', lastLogin: '8 hours ago', email: 'kevin.anderson@company.com', phone: '(555) 234-8901', department: 'Operations', employeeId: 'EMP-012', bankAccount: '****9012', saveBalance: '$8,900.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 13, name: 'Nicole Taylor', location: 'Fort Worth', status: 'Enrolled', hoursWorked: 40, pay: '$27.00', rate: 'Hourly', transferAmount: '$410.00', transferCount: 7, hireDate: '2022-11-28', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'nicole.taylor@company.com', phone: '(555) 345-9012', department: 'Customer Service', employeeId: 'EMP-013', bankAccount: '****1234', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 14, name: 'Brandon Thomas', location: 'Columbus', status: 'Disabled', hoursWorked: 0, pay: '$39,500', rate: 'Salary', transferAmount: '$0.00', transferCount: 0, hireDate: '2021-03-17', outstandingBalance: '$312.45', lastLogin: '5 days ago', email: 'brandon.thomas@company.com', phone: '(555) 456-0123', department: 'Logistics', employeeId: 'EMP-014', bankAccount: '****5432', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 15, name: 'Rachel Jackson', location: 'Charlotte', status: 'Enrolled', hoursWorked: 41, pay: '$30.50', rate: 'Hourly', transferAmount: '$590.00', transferCount: 8, hireDate: '2023-04-05', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'rachel.jackson@company.com', phone: '(555) 567-1234', department: 'Warehouse', employeeId: 'EMP-015', bankAccount: '****6789', saveBalance: '$1,120.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 16, name: 'Tyler Moore', location: 'Indianapolis', status: 'Enrolled', hoursWorked: 45, pay: '$55,000', rate: 'Salary', transferAmount: '$980.00', transferCount: 13, hireDate: '2020-01-22', outstandingBalance: '$0.00', lastLogin: '2 days ago', email: 'tyler.moore@company.com', phone: '(555) 678-2345', department: 'Engineering', employeeId: 'EMP-016', bankAccount: '****7654', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 17, name: 'Megan Clark', location: 'San Francisco', status: 'Enrolled', hoursWorked: 43, pay: '$35.00', rate: 'Hourly', transferAmount: '$820.00', transferCount: 10, hireDate: '2022-07-11', outstandingBalance: '$0.00', lastLogin: '4 hours ago', email: 'megan.clark@company.com', phone: '(555) 789-3456', department: 'Design', employeeId: 'EMP-017', bankAccount: '****8901', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 18, name: 'Justin Lewis', location: 'Seattle', status: 'Paused', hoursWorked: 0, pay: '$47,000', rate: 'Salary', transferAmount: '$0.00', transferCount: 0, hireDate: '2019-08-30', outstandingBalance: '$156.90', lastLogin: '3 days ago', email: 'justin.lewis@company.com', phone: '(555) 890-4567', department: 'Sales', employeeId: 'EMP-018', bankAccount: '****2109', saveBalance: '$780.00', hasSaveAccount: true, hasSupportTicket: false },
  { id: 19, name: 'Lauren Walker', location: 'Denver', status: 'Enrolled', hoursWorked: 37, pay: '$28.00', rate: 'Hourly', transferAmount: '$380.00', transferCount: 6, hireDate: '2023-05-19', outstandingBalance: '$0.00', lastLogin: '1 day ago', email: 'lauren.walker@company.com', phone: '(555) 901-5678', department: 'Retail', employeeId: 'EMP-019', bankAccount: '****3210', saveBalance: '$0.00', hasSaveAccount: false, hasSupportTicket: false },
  { id: 20, name: 'Ryan Hall', location: 'Boston', status: 'Enrolled', hoursWorked: 46, pay: '$63,000', rate: 'Salary', transferAmount: '$1,680.00', transferCount: 20, hireDate: '2018-05-07', outstandingBalance: '$0.00', lastLogin: '2 hours ago', email: 'ryan.hall@company.com', phone: '(555) 012-6789', department: 'Management', employeeId: 'EMP-020', bankAccount: '****4321', saveBalance: '$12,450.00', hasSaveAccount: true, hasSupportTicket: false },
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

function parseBalance(balance) {
  return parseFloat(balance.replace('$', '').replace(',', '')) || 0
}

// Get employees with outstanding balances
const employeesWithOutstandingBalance = employees.filter(emp => hasOutstandingBalance(emp.outstandingBalance))
const totalOutstandingBalance = employeesWithOutstandingBalance.reduce((sum, emp) => sum + parseBalance(emp.outstandingBalance), 0)

// Payback dates for employees with outstanding balances
const paybackDates = {
  2: '2026-02-15',
  4: '2026-02-14',
  7: '2026-02-28',
  11: '2026-02-10',
  14: '2026-02-20',
  18: '2026-02-18',
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

function GroupBadge({ group }) {
  const colors = groupColors[group.color] || groupColors.blue
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span>{group.emoji}</span>
      {group.name}
    </span>
  )
}

function GroupManagementModal({ isOpen, onClose, groups, setGroups, employeeGroups, setEmployeeGroups, employees }) {
  const [activeTab, setActiveTab] = useState('groups')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('blue')
  const [newGroupEmoji, setNewGroupEmoji] = useState('👥')
  const [selectedEmployeeForGroup, setSelectedEmployeeForGroup] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)

  const availableColors = Object.keys(groupColors)
  const availableEmojis = ['👥', '📦', '💼', '👔', '🌱', '⭐', '🎯', '🚀', '💡', '🔧', '📊', '🎨']

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup = {
      id: Math.max(...groups.map(g => g.id), 0) + 1,
      name: newGroupName.trim(),
      color: newGroupColor,
      emoji: newGroupEmoji,
    }
    setGroups([...groups, newGroup])
    setNewGroupName('')
    setNewGroupColor('blue')
    setNewGroupEmoji('👥')
  }

  const handleDeleteGroup = (groupId) => {
    setGroups(groups.filter(g => g.id !== groupId))
    // Remove group from all employees
    const updatedEmployeeGroups = { ...employeeGroups }
    Object.keys(updatedEmployeeGroups).forEach(empId => {
      updatedEmployeeGroups[empId] = updatedEmployeeGroups[empId].filter(gId => gId !== groupId)
      if (updatedEmployeeGroups[empId].length === 0) {
        delete updatedEmployeeGroups[empId]
      }
    })
    setEmployeeGroups(updatedEmployeeGroups)
  }

  const handleToggleEmployeeGroup = (employeeId, groupId) => {
    const currentGroups = employeeGroups[employeeId] || []
    let updatedGroups
    if (currentGroups.includes(groupId)) {
      updatedGroups = currentGroups.filter(id => id !== groupId)
    } else {
      updatedGroups = [...currentGroups, groupId]
    }

    if (updatedGroups.length === 0) {
      const { [employeeId]: _, ...rest } = employeeGroups
      setEmployeeGroups(rest)
    } else {
      setEmployeeGroups({ ...employeeGroups, [employeeId]: updatedGroups })
    }
  }

  const getEmployeesInGroup = (groupId) => {
    return employees.filter(emp => (employeeGroups[emp.id] || []).includes(groupId))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden" data-tour="groups-modal">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-fuchsia-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Manage Groups</h2>
              <p className="text-purple-200 text-xs sm:text-sm">Organize employees into custom groups</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 bg-gray-50/50">
          <nav className="flex px-2 sm:px-4">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                activeTab === 'groups'
                  ? 'border-purple-600 text-purple-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>🏷️</span>
              Groups
            </button>
            <button
              onClick={() => setActiveTab('assign')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                activeTab === 'assign'
                  ? 'border-purple-600 text-purple-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>👥</span>
              <span className="hidden sm:inline">Assign Employees</span>
              <span className="sm:hidden">Assign</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(85vh-180px)]">
          {activeTab === 'groups' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Create New Group */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Create New Group</h3>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Group Name</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Color</label>
                      <div className="flex gap-1 flex-wrap">
                        {availableColors.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewGroupColor(color)}
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${groupColors[color].dot} ${newGroupColor === color ? 'ring-2 ring-offset-2 ring-purple-500' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Icon</label>
                      <select
                        value={newGroupEmoji}
                        onChange={(e) => setNewGroupEmoji(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {availableEmojis.map(emoji => (
                          <option key={emoji} value={emoji}>{emoji}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Group
                  </button>
                </div>
              </div>

              {/* Existing Groups */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Groups ({groups.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {groups.map(group => {
                    const colors = groupColors[group.color]
                    const membersCount = getEmployeesInGroup(group.id).length
                    return (
                      <div key={group.id} className={`rounded-xl border-2 ${colors.border} p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center text-lg`}>
                              {group.emoji}
                            </span>
                            <div>
                              <h4 className="font-semibold text-gray-900">{group.name}</h4>
                              <p className="text-xs text-gray-500">{membersCount} member{membersCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {membersCount > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {getEmployeesInGroup(group.id).slice(0, 4).map(emp => (
                              <div key={emp.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">
                                  {emp.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                            ))}
                            {membersCount > 4 && (
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-[10px] font-medium text-gray-600">+{membersCount - 4}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assign' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Click on groups to assign or remove employees.</p>
              <div className="space-y-2">
                {employees.map(emp => {
                  const empGroups = employeeGroups[emp.id] || []
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {groups.map(group => {
                          const isInGroup = empGroups.includes(group.id)
                          const colors = groupColors[group.color]
                          return (
                            <button
                              key={group.id}
                              onClick={() => handleToggleEmployeeGroup(emp.id, group.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                isInGroup 
                                  ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ${colors.border}` 
                                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              }`}
                            >
                              {group.emoji} {group.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeeModal({ employee, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!employee) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transfers', label: 'Transfers', icon: '💸' },
    { id: 'savings', label: 'Savings', icon: '🏦' },
    { id: 'details', label: 'Details', icon: '📋' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden" data-tour="employee-modal">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-700 px-4 sm:px-6 py-4 sm:py-6">
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pr-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-2xl font-bold text-white">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">{employee.name}</h2>
              <p className="text-purple-200 text-xs sm:text-sm truncate">{employee.department} • {employee.location}</p>
              <div className="flex items-center gap-2 mt-1.5 sm:mt-2 flex-wrap">
                <StatusBadge status={employee.status} />
                {employee.hasSupportTicket && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                    🎫 <span className="hidden sm:inline">Support </span>Ticket
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <p className="text-base sm:text-2xl font-bold text-white">{employee.transferAmount}</p>
              <p className="text-[10px] sm:text-xs text-purple-200">Transferred</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
              <p className="text-base sm:text-2xl font-bold text-white">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</p>
              <p className="text-[10px] sm:text-xs text-purple-200">Savings</p>
            </div>
            <div className={`backdrop-blur rounded-lg sm:rounded-xl p-2 sm:p-3 text-center ${hasOutstandingBalance(employee.outstandingBalance) ? 'bg-red-500/30' : 'bg-white/10'}`}>
              <p className={`text-base sm:text-2xl font-bold ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-200' : 'text-white'}`}>
                {employee.outstandingBalance}
              </p>
              <p className={`text-[10px] sm:text-xs ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-200' : 'text-purple-200'}`}>Outstanding</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100 bg-gray-50/50 overflow-x-auto scrollbar-hide">
          <nav className="flex px-2 sm:px-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-320px)] sm:max-h-[calc(85vh-320px)]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6">
              {/* EWA Activity Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3">EWA Activity This Month</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">{employee.transferCount}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Transfers</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-emerald-600">{employee.transferAmount}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Amount</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">$56</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Avg Transfer</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-lg sm:text-2xl font-bold text-amber-600">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Saved</p>
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
            <div className="space-y-4 sm:space-y-6">
              {/* Calculate totals including fees */}
              {(() => {
                const baseAmount = parseFloat(employee.transferAmount.replace(/[$,]/g, ''));
                const instantCount = transferHistory.filter(t => t.method === 'Instant').length;
                const totalWithFees = baseAmount + (instantCount * INSTANT_FEE);
                const totalFeesPaid = instantCount * INSTANT_FEE;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Base Amount</p>
                      <p className="text-base sm:text-xl font-bold text-purple-700 mt-0.5 sm:mt-1">{employee.transferAmount}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-amber-600 font-medium">Instant Fees</p>
                      <p className="text-base sm:text-xl font-bold text-amber-700 mt-0.5 sm:mt-1">${totalFeesPaid.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">Total w/ Fees</p>
                      <p className="text-base sm:text-xl font-bold text-emerald-700 mt-0.5 sm:mt-1">${totalWithFees.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Transfers</p>
                      <p className="text-base sm:text-xl font-bold text-purple-700 mt-0.5 sm:mt-1">{employee.transferCount}</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Transfer History</h3>
                  <button className="text-xs text-purple-600 font-medium hover:text-purple-700">Export CSV</button>
                </div>
                {/* Mobile card view */}
                <div className="sm:hidden space-y-2">
                  {transferHistory.map((t) => {
                    const baseAmount = parseFloat(t.amount.replace(/[$,]/g, ''));
                    const totalAmount = baseAmount + t.fee;
                    return (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">{t.date}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            t.method === 'Instant' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {t.method}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-gray-900">${totalAmount.toFixed(2)}</span>
                            {t.fee > 0 && <span className="text-xs text-gray-400 ml-1">({t.amount} + fee)</span>}
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table view */}
                <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
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
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Personal Information</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Email</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">{employee.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Phone</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.phone}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Location</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate ml-2">{employee.location}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2">
                      <span className="text-xs sm:text-sm text-gray-500">Last Login</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.lastLogin}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Employment</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Employee ID</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.employeeId}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Department</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.department}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100">
                      <span className="text-xs sm:text-sm text-gray-500">Hire Date</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.hireDate}</span>
                    </div>
                    <div className="flex justify-between py-1.5 sm:py-2">
                      <span className="text-xs sm:text-sm text-gray-500">Pay Rate</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{employee.pay} ({employee.rate})</span>
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

function Employees() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [specialFilter, setSpecialFilter] = useState('All')
  const [groupFilter, setGroupFilter] = useState('All')
  const [viewMode, setViewMode] = useState('cards')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groups, setGroups] = useState(initialGroups)
  const [employeeGroups, setEmployeeGroups] = useState(initialEmployeeGroups)
  const [showOutstandingModal, setShowOutstandingModal] = useState(false)

  // Handle URL params for opening employee modal (from Penny chat)
  useEffect(() => {
    const employeeName = searchParams.get('name') || searchParams.get('employee')
    if (employeeName) {
      const decodedName = decodeURIComponent(employeeName)
      const employee = employees.find(
        emp => emp.name.toLowerCase() === decodedName.toLowerCase() ||
               emp.name.toLowerCase().includes(decodedName.toLowerCase())
      )
      if (employee) {
        setSelectedEmployee(employee)
        // Clear the URL param after opening the modal
        setSearchParams({})
      }
    }
  }, [searchParams, setSearchParams])

  const getEmployeeGroups = (employeeId) => {
    const groupIds = employeeGroups[employeeId] || []
    return groups.filter(g => groupIds.includes(g.id))
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter
    
    let matchesSpecial = true
    if (specialFilter === 'Outstanding Balance') {
      matchesSpecial = hasOutstandingBalance(emp.outstandingBalance)
    } else if (specialFilter === 'Has Savings Account') {
      matchesSpecial = emp.hasSaveAccount
    } else if (specialFilter === 'Has Support Ticket Open') {
      matchesSpecial = emp.hasSupportTicket
    }

    let matchesGroup = true
    if (groupFilter !== 'All') {
      const empGroupIds = employeeGroups[emp.id] || []
      matchesGroup = empGroupIds.includes(parseInt(groupFilter))
    }
    
    return matchesSearch && matchesStatus && matchesSpecial && matchesGroup
  })

  // Listen for tour actions
  useEffect(() => {
    const handleTourAction = (event) => {
      const { action } = event.detail
      switch (action) {
        case 'openGroupsModal':
          setShowGroupModal(true)
          break
        case 'closeGroupsModal':
          setShowGroupModal(false)
          break
        case 'openEmployeeModal':
          // Open the first employee in the filtered list
          if (filteredEmployees.length > 0) {
            setSelectedEmployee(filteredEmployees[0])
          }
          break
        case 'closeEmployeeModal':
          setSelectedEmployee(null)
          break
        case 'closeAllModals':
          setShowGroupModal(false)
          setSelectedEmployee(null)
          setShowOutstandingModal(false)
          break
        default:
          break
      }
    }
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [filteredEmployees])

  // Auto-open Outstanding Balance modal when navigated from Home alerts
  useEffect(() => {
    if (location.state?.openOutstandingModal) {
      setShowOutstandingModal(true)
      // Clear the state so modal doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname])

  // Stats matching Home page - 2,643 eligible, 1,012 enrolled (38%), 378 save accounts, 3,540 transfers
  const totalEmployees = 2643
  const enrolledCount = 1012 // 38%
  const saveAccountsCount = 378
  const totalTransfersCount = 3540

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Employees</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1">
          <p className="text-gray-500 text-sm">Manage your team and their EWA activity</p>
          <div className="hidden sm:block">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Stats Cards - horizontally scrollable on mobile */}
      <div className="flex md:grid md:grid-cols-5 gap-3 md:gap-4 mb-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Total Employees</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{totalEmployees.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 mt-2">{enrolledCount.toLocaleString()} enrolled in EWA</p>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Adoption Rate</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">38%</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 mt-2">{enrolledCount.toLocaleString()} employees enrolled</p>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Save Accounts</p>
              <p className="text-xl md:text-2xl font-bold text-blue-600 mt-1">{saveAccountsCount}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 mt-2">Active savings accounts</p>
        </div>
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-gray-500">Transfers (Jan)</p>
              <p className="text-xl md:text-2xl font-bold text-purple-600 mt-1">{totalTransfersCount.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 mt-2">This month</p>
        </div>
        <div
          className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 md:p-5 shadow-lg cursor-pointer hover:from-red-600 hover:to-rose-700 hover:shadow-xl transition-all text-white min-w-[140px] md:min-w-0 flex-shrink-0 md:flex-shrink"
          onClick={() => setShowOutstandingModal(true)}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-red-100">Outstanding Balance</p>
              <p className="text-xl md:text-2xl font-bold mt-1">${totalOutstandingBalance.toFixed(2)}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-red-200 mt-2">{employeesWithOutstandingBalance.length} employees • Click to view</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          {/* Search - full width on mobile */}
          <div className="relative" data-tour="employee-search">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, department, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full md:w-72 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          {/* Filters - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-tour="status-filter"
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-shrink-0"
            >
              <option value="All">All Status</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Paused">Paused</option>
              <option value="Eligible">Eligible</option>
              <option value="Disabled">Disabled</option>
            </select>
            <select
              value={specialFilter}
              onChange={(e) => setSpecialFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-shrink-0"
            >
              <option value="All">All Employees</option>
              <option value="Outstanding Balance">Outstanding Balance</option>
              <option value="Has Savings Account">Has Savings Account</option>
              <option value="Has Support Ticket Open">Has Support Ticket Open</option>
            </select>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white flex-shrink-0"
            >
              <option value="All">All Groups</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.emoji} {group.name}</option>
              ))}
            </select>
            {/* Manage Groups button - hidden on mobile */}
            <button
              onClick={() => setShowGroupModal(true)}
              data-tour="manage-groups-btn"
              className="hidden md:flex px-3 py-2 border border-purple-200 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors items-center gap-2 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Groups
            </button>
            {/* View toggle - hidden on mobile (force list view on mobile) */}
            <div className="hidden md:flex items-center ml-auto">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'cards' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards view - only shown on desktop when viewMode is 'cards' */}
      {viewMode === 'cards' && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee, index) => (
            <div
              key={employee.id}
              onClick={() => setSelectedEmployee(employee)}
              data-tour={index === 0 ? "employee-card" : undefined}
              className={`bg-white rounded-xl border ${hasOutstandingBalance(employee.outstandingBalance) ? 'border-red-200' : 'border-gray-200'} p-5 cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{employee.name}</h3>
                    <p className="text-xs text-gray-500">{employee.department} • {employee.location}</p>
                  </div>
                </div>
                <StatusBadge status={employee.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-bold text-gray-900">{employee.transferAmount}</p>
                  <p className="text-[10px] text-gray-500">Transferred</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm font-bold text-emerald-600">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</p>
                  <p className="text-[10px] text-gray-500">Saved</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${hasOutstandingBalance(employee.outstandingBalance) ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-bold ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-600' : 'text-gray-400'}`}>
                    {employee.outstandingBalance}
                  </p>
                  <p className="text-[10px] text-gray-500">Outstanding</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {getEmployeeGroups(employee.id).slice(0, 2).map(group => (
                    <GroupBadge key={group.id} group={group} />
                  ))}
                  {getEmployeeGroups(employee.id).length > 2 && (
                    <span className="text-xs text-gray-400">+{getEmployeeGroups(employee.id).length - 2}</span>
                  )}
                  {employee.hasSaveAccount && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                      💰 Save
                    </span>
                  )}
                  {employee.hasSupportTicket && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600">
                      🎫 Ticket
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{employee.lastLogin}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile list view - always shown on mobile */}
      <div className="md:hidden space-y-3">
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => setSelectedEmployee(employee)}
            className={`bg-white rounded-xl border ${hasOutstandingBalance(employee.outstandingBalance) ? 'border-red-200' : 'border-gray-200'} p-4 cursor-pointer hover:shadow-md transition-all`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{employee.name}</h3>
                  <StatusBadge status={employee.status} />
                </div>
                <p className="text-xs text-gray-500 truncate">{employee.department} • {employee.location}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Transferred:</span>
                <span className="text-sm font-medium text-gray-900">{employee.transferAmount}</span>
              </div>
              <div className="flex items-center gap-1">
                {employee.hasSaveAccount && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">💰</span>
                )}
                {employee.hasSupportTicket && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-50 text-orange-600">🎫</span>
                )}
                {hasOutstandingBalance(employee.outstandingBalance) && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600">{employee.outstandingBalance}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="px-4 py-3 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500 text-center">Showing {filteredEmployees.length} of {employees.length} employees</p>
        </div>
      </div>

      {/* Desktop table view - only shown on desktop when viewMode is 'table' */}
      {viewMode === 'table' && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Groups</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Transferred</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className={`cursor-pointer hover:bg-purple-50 transition-colors ${hasOutstandingBalance(employee.outstandingBalance) ? 'bg-red-50/50' : ''}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.department} • {employee.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={employee.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {getEmployeeGroups(employee.id).slice(0, 2).map(group => (
                        <GroupBadge key={group.id} group={group} />
                      ))}
                      {getEmployeeGroups(employee.id).length > 2 && (
                        <span className="text-xs text-gray-400">+{getEmployeeGroups(employee.id).length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">{employee.transferAmount}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-medium text-emerald-600">{employee.hasSaveAccount ? employee.saveBalance : 'N/A'}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-medium ${hasOutstandingBalance(employee.outstandingBalance) ? 'text-red-600' : 'text-gray-400'}`}>
                      {employee.outstandingBalance}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {employee.hasSaveAccount && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                          💰
                        </span>
                      )}
                      {employee.hasSupportTicket && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600">
                          🎫
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500">{employee.lastLogin}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Showing {filteredEmployees.length} of {employees.length} employees</p>
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
        </div>
      )}

      {selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      <GroupManagementModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        groups={groups}
        setGroups={setGroups}
        employeeGroups={employeeGroups}
        setEmployeeGroups={setEmployeeGroups}
        employees={employees}
      />

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

export default Employees
