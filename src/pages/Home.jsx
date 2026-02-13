import React from 'react'
import { useNavigate } from 'react-router-dom'
import PennySearchBar from '../components/penny/PennySearchBar'

const adoptionData = [
  { month: 'Aug', adoption: 22 },
  { month: 'Sep', adoption: 26 },
  { month: 'Oct', adoption: 29 },
  { month: 'Nov', adoption: 32 },
  { month: 'Dec', adoption: 35 },
  { month: 'Jan', adoption: 38 },
]

const transfersData = [
  { month: 'Aug', transfers: 1240 },
  { month: 'Sep', transfers: 1890 },
  { month: 'Oct', transfers: 2340 },
  { month: 'Nov', transfers: 2780 },
  { month: 'Dec', transfers: 3120 },
  { month: 'Jan', transfers: 3540 },
]

const saveAccountsData = [
  { month: 'Aug', accounts: 89 },
  { month: 'Sep', accounts: 142 },
  { month: 'Oct', accounts: 198 },
  { month: 'Nov', accounts: 267 },
  { month: 'Dec', accounts: 312 },
  { month: 'Jan', accounts: 378 },
]

const budgetData = [
  { month: 'Aug', users: 45 },
  { month: 'Sep', users: 78 },
  { month: 'Oct', users: 112 },
  { month: 'Nov', users: 156 },
  { month: 'Dec', users: 178 },
  { month: 'Jan', users: 189 },
]

// Savings-focused testimonials first
const employeeQuotes = [
  {
    id: 1,
    name: 'Priya Patel',
    role: 'Customer Service Rep',
    quote: "The savings feature is amazing! I've saved more in the past 3 months than I did all last year. It makes saving automatic and easy.",
    avatar: 'PP',
    feature: 'Save',
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    role: 'Warehouse Lead',
    quote: "Since using the budget tool, I finally know where my money goes. I've cut unnecessary spending by 30% and feel in control.",
    avatar: 'MJ',
    feature: 'Budget',
  },
  {
    id: 3,
    name: 'Maria Santos',
    role: 'Warehouse Associate',
    quote: "EWA helped me cover an unexpected car repair without stressing about waiting for payday. It's given me peace of mind.",
    avatar: 'MS',
    feature: 'EWA',
  },
]

const alerts = [
  { id: 1, type: 'success', title: 'Integration Healthy', message: 'Last sync: 2 hours ago. All systems operational.', time: 'Just now', action: null },
  { id: 2, type: 'error', title: '6 Outstanding Balances', message: '$996.90 total outstanding balance across employees', time: 'Just now', action: 'outstanding-balance' },
  { id: 3, type: 'info', title: 'Monthly Report Ready', message: 'January 2025 impact report is ready for review', time: '5 hours ago', action: 'monthly-report' },
]

// Myth-busting education tips
const mythBustingTips = {
  savings: [
    "Employees with savings accounts use EWA 40% less frequently.",
    "Building a $500 emergency fund reduces financial stress by 60%.",
  ],
  budget: [
    "Budgeting users request 25% less in wage advances.",
    "Employees who budget report 45% less financial anxiety.",
  ],
  ewa: [
    "EWA is NOT a loan - employees access their already-earned wages.",
    "67% of transfers are for essentials: bills, gas, groceries.",
    "Lower transfer averages indicate strategic, responsible use.",
  ],
  responsible: [
    "Repeat users often have predictable weekly expenses - this is healthy.",
    "Your employees average $85 per transfer vs $150 industry average.",
    "First-time users typically need EWA for one-time unexpected expenses.",
  ],
}

function getRandomTip(category) {
  const tips = mythBustingTips[category]
  return tips[Math.floor(Math.random() * tips.length)]
}

function getAlertStyles(type) {
  const styles = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500', title: 'text-yellow-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', title: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-800' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', title: 'text-green-800' },
  }
  return styles[type] || styles.info
}

function getAlertIcon(type) {
  if (type === 'warning') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  if (type === 'error') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'success') {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Inline Education Callout Component
function EducationCallout({ tip, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-400 text-blue-700',
    amber: 'bg-amber-50 border-amber-400 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-400 text-emerald-700',
    purple: 'bg-purple-50 border-purple-400 text-purple-700',
  }
  return (
    <div className={`border-l-4 p-3 rounded-r-lg ${colors[color]}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">💡</span>
        <p className="text-sm">{tip}</p>
      </div>
    </div>
  )
}

function MiniBarChart({ data, dataKey, color, yAxisLabel = '' }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null)
  const maxValue = Math.max(...data.map(d => d[dataKey]))
  const adjustedMax = Math.ceil(maxValue / 100) * 100 || Math.ceil(maxValue / 10) * 10

  const chartHeight = 100
  const chartWidth = 280
  const marginLeft = 40
  const marginRight = 10
  const marginTop = 10
  const marginBottom = 25

  const plotWidth = chartWidth - marginLeft - marginRight
  const plotHeight = chartHeight - marginTop - marginBottom
  const barWidth = (plotWidth / data.length) * 0.6
  const barGap = (plotWidth / data.length) * 0.4

  const yTicks = [0, Math.round(adjustedMax / 2), adjustedMax]

  return (
    <div className="h-32">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick, i) => {
          const y = marginTop + plotHeight - (tick / adjustedMax) * plotHeight
          return (
            <line
              key={i}
              x1={marginLeft}
              y1={y}
              x2={chartWidth - marginRight}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        <line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke="#9ca3af"
          strokeWidth="1.5"
        />

        {yTicks.map((tick, i) => {
          const y = marginTop + plotHeight - (tick / adjustedMax) * plotHeight
          return (
            <text
              key={i}
              x={marginLeft - 5}
              y={y + 4}
              textAnchor="end"
              fill="#6b7280"
              fontSize="10"
              fontWeight="500"
            >
              {tick}{yAxisLabel}
            </text>
          )
        })}

        <line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={chartWidth - marginRight}
          y2={marginTop + plotHeight}
          stroke="#9ca3af"
          strokeWidth="1.5"
        />

        {data.map((item, index) => {
          const barHeight = (item[dataKey] / adjustedMax) * plotHeight
          const x = marginLeft + (index * (barWidth + barGap)) + barGap / 2
          const y = marginTop + plotHeight - barHeight
          const barCenterX = x + barWidth / 2
          const isHovered = hoveredIndex === index
          return (
            <g key={index}>
              {isHovered && (
                <g>
                  <rect
                    x={barCenterX - 18}
                    y={y - 26}
                    width="36"
                    height="20"
                    rx="4"
                    fill="#1f2937"
                  />
                  <polygon
                    points={`${barCenterX - 5},${y - 6} ${barCenterX + 5},${y - 6} ${barCenterX},${y - 1}`}
                    fill="#1f2937"
                  />
                  <text
                    x={barCenterX}
                    y={y - 12}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {item[dataKey]}
                  </text>
                </g>
              )}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                className={color}
                fill={isHovered ? '#7c3aed' : '#8b5cf6'}
                rx="3"
                style={{ cursor: 'pointer', transition: 'fill 0.15s ease-in-out' }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              <text
                x={barCenterX}
                y={marginTop + plotHeight + 14}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="9"
                fontWeight="500"
              >
                {item.month}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AdoptionDonutChart({ notEnrolled, enrolling, enrolled }) {
  const [isHovered, setIsHovered] = React.useState(false)
  const total = notEnrolled + enrolling + enrolled
  const strokeWidth = 24
  const radius = 70
  const circumference = Math.PI * radius

  const enrolledLength = (enrolled / total) * circumference
  const enrollingLength = (enrolling / total) * circumference
  const notEnrolledLength = (notEnrolled / total) * circumference

  const enrolledOffset = 0
  const enrollingOffset = enrolledLength
  const notEnrolledOffset = enrolledLength + enrollingLength

  const enrolledPercent = Math.round((enrolled / total) * 100)
  const enrollingPercent = Math.round((enrolling / total) * 100)
  const notEnrolledPercent = Math.round((notEnrolled / total) * 100)

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-center gap-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <svg width="180" height="100" viewBox="0 0 180 100">
          {/* Background arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          
          {/* Not Enrolled (gray) */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#94a3b8"
            strokeWidth={strokeWidth}
            strokeDasharray={`${notEnrolledLength} ${circumference}`}
            strokeDashoffset={-notEnrolledOffset}
          />

          {/* Enrolling (amber) */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${enrollingLength} ${circumference}`}
            strokeDashoffset={-enrollingOffset}
          />

          {/* Enrolled (green) */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={`${enrolledLength} ${circumference}`}
            strokeDashoffset={0}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold text-emerald-600">{enrolledPercent}%</span>
          <span className="text-xs font-medium text-gray-500">Adopted</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Enrolled</span>
            <span className="text-sm font-semibold text-gray-900">{enrolled.toLocaleString()}</span>
            <span className="text-xs text-gray-400">({enrolledPercent}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Enrolling</span>
            <span className="text-sm font-semibold text-gray-900">{enrolling.toLocaleString()}</span>
            <span className="text-xs text-gray-400">({enrollingPercent}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Not enrolled</span>
            <span className="text-sm font-semibold text-gray-900">{notEnrolled.toLocaleString()}</span>
            <span className="text-xs text-gray-400">({notEnrolledPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniLineChart({ data, dataKey, color, yAxisLabel = '%' }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null)
  const maxValue = Math.max(...data.map(d => d[dataKey]))
  const minValue = Math.min(...data.map(d => d[dataKey]))
  const padding = (maxValue - minValue) * 0.1
  const adjustedMin = Math.floor(minValue - padding)
  const adjustedMax = Math.ceil(maxValue + padding)
  const range = adjustedMax - adjustedMin || 1

  const chartHeight = 80
  const chartWidth = 280
  const marginLeft = 35
  const marginRight = 10
  const marginTop = 10
  const marginBottom = 25

  const plotWidth = chartWidth - marginLeft - marginRight
  const plotHeight = chartHeight - marginTop - marginBottom

  const points = data.map((item, index) => {
    const x = marginLeft + (index / (data.length - 1)) * plotWidth
    const y = marginTop + plotHeight - ((item[dataKey] - adjustedMin) / range) * plotHeight
    return { x, y, value: item[dataKey], month: item.month }
  })

  const pathD = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${marginTop + plotHeight} L ${points[0].x} ${marginTop + plotHeight} Z`

  const lineColor = color.includes('indigo') ? '#a855f7' : '#10b981'
  const fillColor = color.includes('indigo') ? '#a855f7' : '#10b981'

  const yTicks = [adjustedMin, Math.round((adjustedMin + adjustedMax) / 2), adjustedMax]

  return (
    <div className="h-32">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick, i) => {
          const y = marginTop + plotHeight - ((tick - adjustedMin) / range) * plotHeight
          return (
            <line
              key={i}
              x1={marginLeft}
              y1={y}
              x2={chartWidth - marginRight}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        <line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke="#9ca3af"
          strokeWidth="1.5"
        />

        {yTicks.map((tick, i) => {
          const y = marginTop + plotHeight - ((tick - adjustedMin) / range) * plotHeight
          return (
            <text
              key={i}
              x={marginLeft - 5}
              y={y + 4}
              textAnchor="end"
              fill="#6b7280"
              fontSize="10"
              fontWeight="500"
            >
              {tick}{yAxisLabel}
            </text>
          )
        })}

        <line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={chartWidth - marginRight}
          y2={marginTop + plotHeight}
          stroke="#9ca3af"
          strokeWidth="1.5"
        />

        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={marginTop + plotHeight + 14}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="9"
            fontWeight="500"
          >
            {point.month}
          </text>
        ))}

        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d={areaD}
          fill={`url(#gradient-${dataKey})`}
        />
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={index}>
            {hoveredIndex === index && (
              <g>
                <rect
                  x={point.x - 20}
                  y={point.y - 28}
                  width="40"
                  height="20"
                  rx="4"
                  fill="#1f2937"
                />
                <polygon
                  points={`${point.x - 5},${point.y - 8} ${point.x + 5},${point.y - 8} ${point.x},${point.y - 3}`}
                  fill="#1f2937"
                />
                <text
                  x={point.x}
                  y={point.y - 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="600"
                >
                  {point.value}{yAxisLabel}
                </text>
              </g>
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 6 : 4}
              fill="white"
              stroke={lineColor}
              strokeWidth="2"
              style={{ transition: 'r 0.15s ease-in-out', pointerEvents: 'none' }}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

// ROI Calculator Modal Component
function ROICalculatorModal({ isOpen, onClose }) {
  const [inputs, setInputs] = React.useState({
    totalEmployees: 500,
    avgSalary: 45000,
    turnoverRate: 25,
    costToHire: 4500,
    expectedAdoption: 40,
  })

  // Industry research-based assumptions for EWA impact:
  // - Companies with EWA see 19-36% reduction in turnover (average 25%)
  // - Absenteeism reduces by 10-15%
  // - 78% of employees feel more loyal to employers offering EWA
  // - Average cost per employee for EWA: $1-3/month
  const turnoverReduction = 0.25 // 25% reduction in turnover (conservative industry average)
  const absenteeismReduction = 0.12 // 12% reduction in absenteeism
  const avgAbsenteeismCostPerEmployee = 2660 // Bureau of Labor Statistics
  const ewaMonthlyFeePerEmployee = 2 // Conservative estimate

  const calculateROI = () => {
    const adoptedEmployees = Math.round(inputs.totalEmployees * (inputs.expectedAdoption / 100))
    
    // Current turnover costs
    const currentTurnover = Math.round(inputs.totalEmployees * (inputs.turnoverRate / 100))
    const currentTurnoverCost = currentTurnover * inputs.costToHire
    
    // Projected reduction in turnover (only affects adopted employees proportionally)
    const adoptedTurnover = Math.round(adoptedEmployees * (inputs.turnoverRate / 100))
    const reducedTurnover = Math.round(adoptedTurnover * turnoverReduction)
    const turnoverSavings = reducedTurnover * inputs.costToHire
    
    // Absenteeism savings
    const absenteeismSavings = Math.round(adoptedEmployees * avgAbsenteeismCostPerEmployee * absenteeismReduction)
    
    // Total annual savings
    const totalSavings = turnoverSavings + absenteeismSavings
    
    // Annual EWA cost
    const annualCost = adoptedEmployees * ewaMonthlyFeePerEmployee * 12
    
    // Net savings and ROI
    const netSavings = totalSavings - annualCost
    const roi = annualCost > 0 ? Math.round((netSavings / annualCost) * 100) : 0
    
    return {
      adoptedEmployees,
      currentTurnoverCost,
      reducedTurnover,
      turnoverSavings,
      absenteeismSavings,
      totalSavings,
      annualCost,
      netSavings,
      roi,
    }
  }

  const results = calculateROI()

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: Number(value) || 0 }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">EWA ROI Calculator</h2>
            <p className="text-purple-200 text-sm">Calculate the financial impact of Earned Wage Access</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Company Data</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Employees</label>
                  <input
                    type="number"
                    value={inputs.totalEmployees}
                    onChange={(e) => handleInputChange('totalEmployees', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Average Annual Salary ($)</label>
                  <input
                    type="number"
                    value={inputs.avgSalary}
                    onChange={(e) => handleInputChange('avgSalary', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Turnover Rate (%)</label>
                  <input
                    type="number"
                    value={inputs.turnoverRate}
                    onChange={(e) => handleInputChange('turnoverRate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Industry average: 20-30%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost to Hire per Employee ($)</label>
                  <input
                    type="number"
                    value={inputs.costToHire}
                    onChange={(e) => handleInputChange('costToHire', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Typically 50-200% of annual salary</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected EWA Adoption Rate (%)</label>
                  <input
                    type="number"
                    value={inputs.expectedAdoption}
                    onChange={(e) => handleInputChange('expectedAdoption', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Industry average: 30-50%</p>
                </div>
              </div>

              {/* Research Sources */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📊 Based on Industry Research</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• EWA reduces turnover by 19-36% (Payactiv, 2023)</li>
                  <li>• Absenteeism decreases 10-15% (SHRM Study)</li>
                  <li>• 78% of employees feel more loyal (ADP Research)</li>
                  <li>• Avg absenteeism cost: $2,660/employee (BLS)</li>
                </ul>
              </div>
            </div>

            {/* Results */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projected Annual Impact</h3>
              
              {/* ROI Highlight */}
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white mb-6">
                <p className="text-emerald-100 text-sm">Estimated ROI</p>
                <p className="text-5xl font-bold">{results.roi}%</p>
                <p className="text-emerald-100 text-sm mt-2">Return on Investment</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Employees Using EWA</span>
                  <span className="text-lg font-bold text-gray-900">{results.adoptedEmployees.toLocaleString()}</span>
                </div>
                
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-800 mb-3">Savings Breakdown</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-700">Turnover Reduction ({results.reducedTurnover} fewer departures)</span>
                      <span className="text-sm font-semibold text-emerald-900">${results.turnoverSavings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-700">Reduced Absenteeism</span>
                      <span className="text-sm font-semibold text-emerald-900">${results.absenteeismSavings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-200">
                      <span className="text-sm font-medium text-emerald-800">Total Annual Savings</span>
                      <span className="text-sm font-bold text-emerald-900">${results.totalSavings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-red-700">Estimated Annual EWA Cost</span>
                  <span className="text-lg font-semibold text-red-600">-${results.annualCost.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-purple-100 rounded-lg">
                  <span className="text-base font-semibold text-purple-900">Net Annual Savings</span>
                  <span className="text-2xl font-bold text-purple-600">${results.netSavings.toLocaleString()}</span>
                </div>
              </div>

              {/* Current Cost Context */}
              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Current turnover cost:</strong> ${results.currentTurnoverCost.toLocaleString()}/year
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Based on {Math.round(inputs.totalEmployees * (inputs.turnoverRate / 100))} employees leaving annually
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  )
}

function Home({ onOpenSupport }) {
  const navigate = useNavigate()
  const [showROICalculator, setShowROICalculator] = React.useState(false)

  // Get random tips for each section (memoized to not change on re-render)
  const [tips] = React.useState({
    savings: getRandomTip('savings'),
    budget: getRandomTip('budget'),
    ewa: getRandomTip('ewa'),
    responsible: getRandomTip('responsible'),
  })

  const handleViewEmployees = () => {
    navigate('/employees')
  }

  const handleDownloadReports = () => {
    navigate('/downloads')
  }

  const handleViewSavings = () => {
    navigate('/savings')
  }

  const handleViewTransfers = () => {
    navigate('/transfers')
  }

  const handleROICalculator = () => {
    setShowROICalculator(true)
  }

  return (
    <>
      <ROICalculatorModal isOpen={showROICalculator} onClose={() => setShowROICalculator(false)} />
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8 pt-12 md:pt-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome Back</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mt-2">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium text-green-600">Go Live:</span> Aug 1, 2025
              </p>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium text-purple-600">QBR:</span> Mar 18, 2026
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* January Overview & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Financial Wellness Overview - Main Adoption */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="text-lg font-semibold text-gray-900">January Overview</h3>
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium ml-auto">2,643 eligible</span>
            </div>
          </div>
          
          {/* Highlighted Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 border-b border-gray-100">
            <div
              className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 text-center rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={() => navigate('/adoption-usage')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate('/adoption-usage')
                }
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">38%</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Adoption</p>
            </div>
            <div
              className="p-4 sm:p-6 bg-gradient-to-br from-emerald-50 to-green-50 text-center rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={handleViewSavings}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleViewSavings()
                }
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600">378</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Save Accounts</p>
            </div>
            <div
              className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-violet-50 text-center rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={handleViewTransfers}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleViewTransfers()
                }
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600">3,540</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Transfers</p>
            </div>
            <div
              className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 to-orange-50 text-center rounded-xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              onClick={handleViewTransfers}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleViewTransfers()
                }
              }}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600">$298K</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Transferred</p>
            </div>
          </div>

          {/* Adoption Donut Chart */}
          <div className="p-6">
            <AdoptionDonutChart notEnrolled={1602} enrolling={29} enrolled={1012} />
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
              </div>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {alerts.length} items
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => {
              const styles = getAlertStyles(alert.type)
              const handleAlertClick = () => {
                if (alert.action === 'outstanding-balance') {
                  navigate('/employees', { state: { openOutstandingModal: true } })
                } else if (alert.action === 'monthly-report') {
                  navigate('/adoption-usage#reports')
                }
              }
              return (
                <div 
                  key={alert.id} 
                  className={`p-4 ${styles.bg} border-l-4 ${styles.border} ${alert.action ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
                  onClick={alert.action ? handleAlertClick : undefined}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 ${styles.icon}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className={`text-sm font-medium ${styles.title}`}>{alert.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
                    </div>
                    {alert.action && (
                      <button className="ml-4 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* EWA Usage & Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* EWA Usage Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            onClick={() => navigate('/adoption-usage')}
            className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              <h3 className="text-lg font-semibold text-blue-900 hover:text-blue-700">EWA Usage</h3>
              <svg className="w-4 h-4 text-blue-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-blue-700 mt-1">Earned wage access activity this period</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">892</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Transfers</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">518</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">$74.9K</p>
                <p className="text-[10px] sm:text-xs text-gray-500">This Cycle</p>
              </div>
            </div>
            <MiniLineChart data={adoptionData} dataKey="adoption" color="stroke-purple-500" />
          </div>
        </div>

        {/* Savings Highlight Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            onClick={() => navigate('/adoption-usage')}
            className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50 cursor-pointer hover:from-emerald-100 hover:to-green-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-semibold text-emerald-900 hover:text-emerald-700">Savings Highlight</h3>
              <svg className="w-4 h-4 text-emerald-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-emerald-700 mt-1">Building financial security for your team</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">$45,230</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Total Saved</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">378</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Savers</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">$120</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Avg/Employee</p>
              </div>
            </div>
            <MiniBarChart data={saveAccountsData} dataKey="accounts" color="bg-emerald-500" />
            <div className="mt-4">
              <EducationCallout tip={tips.savings} color="emerald" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== BUDGET & QUICK ACTIONS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Budget Engagement Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            onClick={() => navigate('/adoption-usage')}
            className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-violet-50 cursor-pointer hover:from-purple-100 hover:to-violet-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h3 className="text-lg font-semibold text-purple-900 hover:text-purple-700">Budget Engagement</h3>
              <svg className="w-4 h-4 text-purple-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm text-purple-700 mt-1">Employees taking control of their finances</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-purple-600">234</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Budgets</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-purple-600">189</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-purple-600">67%</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Goals Met</p>
              </div>
            </div>
            <MiniBarChart data={budgetData} dataKey="users" color="bg-purple-500" />
            <div className="mt-4">
              <EducationCallout tip={tips.budget} color="purple" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button onClick={handleViewEmployees} className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Employees</p>
                <p className="text-xs text-gray-500">Manage team</p>
              </div>
            </button>
            <button onClick={handleDownloadReports} className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Download Reports</p>
                <p className="text-xs text-gray-500">Export data</p>
              </div>
            </button>
            <button onClick={onOpenSupport} className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 hover:from-purple-100 hover:to-fuchsia-100 rounded-lg transition-colors text-left border border-purple-200">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-lg flex items-center justify-center relative">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Live Support</p>
                <p className="text-xs text-purple-600 font-medium">Enterprise • Online</p>
              </div>
            </button>
            <button onClick={handleROICalculator} className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">ROI Calculator</p>
                <p className="text-xs text-gray-500">Show value</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Education Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">📚</span>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Did you know?</p>
            <p className="text-sm text-blue-700">Research shows employees with emergency savings of $500+ report 60% less financial stress and are 25% more likely to stay with their employer.</p>
          </div>
        </div>
      </div>

      {/* Employee Spotlight */}
      <div 
        onClick={() => navigate('/impact-stats#quotes')}
        className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Employee Spotlight</h3>
            <svg className="w-4 h-4 text-gray-400 ml-auto group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Real stories from your team</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {employeeQuotes.map((quote) => (
            <div key={quote.id} className="relative">
              <div className="absolute -top-2 -left-2 text-5xl text-purple-100 font-serif">"</div>
              <div className="relative bg-gray-50 rounded-lg p-4 pl-6 h-full">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2 ${
                  quote.feature === 'Save' ? 'bg-emerald-100 text-emerald-700' :
                  quote.feature === 'Budget' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {quote.feature}
                </span>
                <p className="text-gray-700 text-sm italic leading-relaxed">{quote.quote}</p>
                <div className="flex items-center mt-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    quote.feature === 'Save' ? 'bg-emerald-500' :
                    quote.feature === 'Budget' ? 'bg-purple-500' :
                    'bg-blue-500'
                  }`}>
                    <span className="text-sm font-medium text-white">{quote.avatar}</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{quote.name}</p>
                    <p className="text-xs text-gray-500">{quote.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
    </>
  )
}

export default Home
