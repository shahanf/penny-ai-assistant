import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PennySearchBar from '../components/penny/PennySearchBar'

// Transfer fee: Instant = $3.29, Standard = Free
const INSTANT_FEE = 3.29

// Data for different time periods
// Consistent with Home page: 2,643 eligible, 1,012 enrolled (38%), 378 save accounts, 3,540 transfers in Jan = ~$298K
// Fee calculation: instantCount × $3.29
const timelineData = {
  'Pay Cycle': {
    transfers: { count: 892, value: 74936, avgCount: 44.6, avgValue: 84, instantCount: 517, standardCount: 375, totalFees: 1700.93 },
    saveAccounts: { count: 378, value: 45230, avgBalance: 119.66 },
    savingsGrowth: [
      { name: 'Day 1', value: 42100 },
      { name: 'Day 3', value: 42800 },
      { name: 'Day 5', value: 43200 },
      { name: 'Day 7', value: 43900 },
      { name: 'Day 9', value: 44400 },
      { name: 'Day 11', value: 44800 },
      { name: 'Day 14', value: 45230 },
    ],
    appMinutes: 2847,
    appVisits: 4521,
    activePercent: 85,
    trackFeaturePercent: 72,
    payFeaturePercent: 68,
    saveFeaturePercent: 45,
    appLogins: { count: 3842, percent: 78 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
    dailyLogins: [320, 445, 512, 389, 478, 521, 498, 445, 389, 456, 523, 489, 512, 385],
    featureUsageTrend: [
      { name: 'Week 1', track: 68, pay: 62, save: 40 },
      { name: 'Week 2', track: 72, pay: 68, save: 45 },
    ],
    transfersByDay: [
      { day: 'Mon', count: 156, value: 13104 },
      { day: 'Tue', count: 134, value: 11256 },
      { day: 'Wed', count: 128, value: 10752 },
      { day: 'Thu', count: 145, value: 12180 },
      { day: 'Fri', count: 189, value: 15876 },
      { day: 'Sat', count: 78, value: 6552 },
      { day: 'Sun', count: 62, value: 5208 },
    ],
  },
  'Month': {
    transfers: { count: 3540, value: 297360, avgCount: 118, avgValue: 84, instantCount: 1947, standardCount: 1593, totalFees: 6405.63 },
    saveAccounts: { count: 378, value: 45230, avgBalance: 119.66 },
    savingsGrowth: [
      { name: 'Week 1', value: 38500 },
      { name: 'Week 2', value: 40200 },
      { name: 'Week 3', value: 42800 },
      { name: 'Week 4', value: 45230 },
    ],
    appMinutes: 12450,
    appVisits: 18920,
    activePercent: 82,
    trackFeaturePercent: 74,
    payFeaturePercent: 71,
    saveFeaturePercent: 48,
    appLogins: { count: 15680, percent: 76 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
    dailyLogins: [420, 485, 512, 498, 534, 489, 456, 512, 545, 523, 498, 534, 567, 534, 512, 489, 523, 545, 512, 489, 534, 556, 523, 498, 512, 534, 545, 523, 498, 512],
    featureUsageTrend: [
      { name: 'Week 1', track: 70, pay: 65, save: 42 },
      { name: 'Week 2', track: 72, pay: 68, save: 44 },
      { name: 'Week 3', track: 73, pay: 70, save: 46 },
      { name: 'Week 4', track: 74, pay: 71, save: 48 },
    ],
    transfersByDay: [
      { day: 'Mon', count: 634, value: 53256 },
      { day: 'Tue', count: 545, value: 45780 },
      { day: 'Wed', count: 498, value: 41832 },
      { day: 'Thu', count: 567, value: 47628 },
      { day: 'Fri', count: 712, value: 59808 },
      { day: 'Sat', count: 312, value: 26208 },
      { day: 'Sun', count: 272, value: 22848 },
    ],
  },
  'Quarter': {
    transfers: { count: 10620, value: 892080, avgCount: 118, avgValue: 84, instantCount: 5735, standardCount: 4885, totalFees: 18868.15 },
    saveAccounts: { count: 356, value: 42599, avgBalance: 119.66 },
    savingsGrowth: [
      { name: 'Month 1', value: 28400 },
      { name: 'Month 2', value: 35200 },
      { name: 'Month 3', value: 42599 },
    ],
    appMinutes: 38450,
    appVisits: 52340,
    activePercent: 79,
    trackFeaturePercent: 71,
    payFeaturePercent: 67,
    saveFeaturePercent: 43,
    appLogins: { count: 42560, percent: 73 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
    dailyLogins: [380, 425, 478, 456, 489, 445, 412, 456, 498, 478, 456, 489, 512, 489, 467, 445, 478, 512, 489, 456, 489, 523, 498, 467, 478, 498, 512, 489, 467, 478, 456, 489, 512, 498, 478, 467, 489, 512, 534, 512, 489, 467, 478, 498, 523, 498, 478, 467, 489, 512, 534, 512, 489, 467, 478, 498, 523, 512, 489, 478, 489, 512, 534, 523, 498, 478, 489, 512, 545, 534, 512, 489, 498, 523, 545, 534, 512, 498, 512, 534, 556, 545, 523, 498, 512, 534, 567, 545, 523, 512],
    featureUsageTrend: [
      { name: 'Month 1', track: 68, pay: 62, save: 38 },
      { name: 'Month 2', track: 70, pay: 65, save: 41 },
      { name: 'Month 3', track: 74, pay: 71, save: 48 },
    ],
    transfersByDay: [
      { day: 'Mon', count: 1902, value: 159768 },
      { day: 'Tue', count: 1635, value: 137340 },
      { day: 'Wed', count: 1494, value: 125496 },
      { day: 'Thu', count: 1701, value: 142884 },
      { day: 'Fri', count: 2136, value: 179424 },
      { day: 'Sat', count: 936, value: 78624 },
      { day: 'Sun', count: 816, value: 68544 },
    ],
  },
  'Year': {
    transfers: { count: 42480, value: 3568320, avgCount: 118, avgValue: 84, instantCount: 22090, standardCount: 20390, totalFees: 72676.10 },
    saveAccounts: { count: 298, value: 35659, avgBalance: 119.66 },
    savingsGrowth: [
      { name: 'Q1', value: 12500 },
      { name: 'Q2', value: 19800 },
      { name: 'Q3', value: 27400 },
      { name: 'Q4', value: 35659 },
    ],
    appMinutes: 156780,
    appVisits: 198450,
    activePercent: 76,
    trackFeaturePercent: 68,
    payFeaturePercent: 64,
    saveFeaturePercent: 38,
    appLogins: { count: 168920, percent: 71 },
    totalAdoption: { count: 1012, percent: 38, total: 2643 },
    dailyLogins: [320, 345, 378, 356, 389, 345, 312, 356, 398, 378, 356, 389, 412, 389, 367, 345, 378, 412, 389, 356, 389, 423, 398, 367, 378, 398, 412, 389, 367, 378, 356, 389, 412, 398, 378, 367, 389, 412, 434, 412, 389, 367, 378, 398, 423, 398, 378, 367, 389, 412, 434, 412, 389, 367, 378, 398, 423, 412, 389, 378, 389, 412, 434, 423, 398, 378, 389, 412, 445, 434, 412, 389, 398, 423, 445, 434, 412, 398, 412, 434, 456, 445, 423, 398, 412, 434, 467, 445, 423, 412, 423, 445, 478, 456, 434, 412, 423, 445, 489, 467, 445, 423, 434, 456, 498, 478, 456, 434, 445, 467, 512, 489, 467, 445, 456, 478, 523, 498, 478, 456],
    featureUsageTrend: [
      { name: 'Q1', track: 62, pay: 56, save: 32 },
      { name: 'Q2', track: 66, pay: 60, save: 36 },
      { name: 'Q3', track: 70, pay: 65, save: 42 },
      { name: 'Q4', track: 74, pay: 71, save: 48 },
    ],
    transfersByDay: [
      { day: 'Mon', count: 7608, value: 639072 },
      { day: 'Tue', count: 6540, value: 549360 },
      { day: 'Wed', count: 5976, value: 501984 },
      { day: 'Thu', count: 6804, value: 571536 },
      { day: 'Fri', count: 8544, value: 717696 },
      { day: 'Sat', count: 3744, value: 314496 },
      { day: 'Sun', count: 3264, value: 274176 },
    ],
  },
}

// Animated counter hook
function useAnimatedCounter(endValue, duration = 1000) {
  const [count, setCount] = useState(0)

  React.useEffect(() => {
    let startTime = null
    const startValue = 0

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(startValue + (endValue - startValue) * easeOutQuart))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [endValue, duration])

  return count
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function formatCurrency(num) {
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K'
  return '$' + num.toLocaleString()
}

// Savings Line Chart Component
function SavingsLineChart({ data, height = 80 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const width = 300
  const padding = { top: 10, right: 10, bottom: 24, left: 10 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const values = data.map(d => d.value)
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const range = maxValue - minValue || 1

  const getY = (value) => padding.top + plotHeight - ((value - minValue) / range) * plotHeight
  const getX = (index) => padding.left + (index / (data.length - 1)) * plotWidth

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ')
  const areaD = `${pathD} L ${getX(data.length - 1)} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        {/* Gradient fill area */}
        <defs>
          <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#savingsGradient)" />
        
        {/* Line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.value)}
            r={hoveredPoint === i ? 5 : 3}
            fill="white"
            stroke="#10b981"
            strokeWidth="2"
            style={{ cursor: 'pointer', transition: 'r 0.15s' }}
            onMouseEnter={() => setHoveredPoint(i)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={height - 4} textAnchor="middle" fill="#9ca3af" fontSize="9">
            {d.name}
          </text>
        ))}

        {/* Tooltip */}
        {hoveredPoint !== null && (
          <g>
            <rect
              x={getX(hoveredPoint) - 28}
              y={getY(data[hoveredPoint].value) - 26}
              width="56"
              height="20"
              rx="4"
              fill="#1f2937"
            />
            <text
              x={getX(hoveredPoint)}
              y={getY(data[hoveredPoint].value) - 12}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="600"
            >
              {formatCurrency(data[hoveredPoint].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// Circular Progress Ring Component
function CircularProgress({ percent, size = 120, strokeWidth = 10, color = '#6366f1', label, sublabel }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold text-gray-900">{percent}%</span>
        </div>
      </div>
      {label && <span className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-gray-700">{label}</span>}
      {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
    </div>
  )
}

// Mini Sparkline Chart
function Sparkline({ data, color = '#6366f1', height = 40, showArea = true }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 200
  const padding = 2

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    const y = padding + (height - padding * 2) - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  return (
    <svg width={width} height={height} className="w-full">
      {showArea && (
        <path d={areaD} fill={color} fillOpacity="0.1" />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Bar Chart Component
function BarChart({ data, dataKey, labelKey, color = '#6366f1', height = 160 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const maxValue = Math.max(...data.map(d => d[dataKey]))

  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item[dataKey] / maxValue) * (height - 30)
        const isHovered = hoveredIndex === index
        return (
          <div key={index} className="flex flex-col items-center flex-1 relative">
            {isHovered && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {formatNumber(item[dataKey])}
              </div>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-200 cursor-pointer"
              style={{
                height: barHeight,
                backgroundColor: isHovered ? color : color + 'cc',
                minHeight: 4,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <span className="text-xs text-gray-500 mt-2 font-medium">{item[labelKey]}</span>
          </div>
        )
      })}
    </div>
  )
}

// Feature Usage Donut Chart
function FeatureDonut({ trackPercent, payPercent, savePercent }) {
  const size = 180
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  const segments = [
    { percent: trackPercent, color: '#6366f1', label: 'Track', offset: 0 },
    { percent: payPercent, color: '#10b981', label: 'Pay', offset: trackPercent },
    { percent: savePercent, color: '#f59e0b', label: 'Save', offset: trackPercent + payPercent },
  ]

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {segments.map((segment, index) => {
            const segmentLength = (segment.percent / 100) * circumference
            const segmentOffset = circumference - (segment.offset / 100) * circumference
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={segmentOffset}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">Features</span>
          <span className="text-xs text-gray-500">Usage</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-sm text-gray-600">{segment.label}</span>
            <span className="text-sm font-bold text-gray-900">{segment.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Trend Line Chart
function TrendLineChart({ data, height = 200 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const width = 400
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxValue = 100
  const minValue = 0
  const range = maxValue - minValue || 1

  const getY = (value) => padding.top + plotHeight - ((value - minValue) / range) * plotHeight
  const getX = (index) => padding.left + (index / (data.length - 1)) * plotWidth

  const lines = [
    { key: 'track', color: '#6366f1', label: 'Track' },
    { key: 'pay', color: '#10b981', label: 'Pay' },
    { key: 'save', color: '#f59e0b', label: 'Save' },
  ]

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = getY(tick)
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{tick}%</text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fill="#6b7280" fontSize="11" fontWeight="500">
            {d.name}
          </text>
        ))}

        {/* Lines */}
        {lines.map((line) => {
          const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[line.key])}`).join(' ')
          return (
            <g key={line.key}>
              <path d={pathD} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(d[line.key])}
                  r={hoveredPoint?.line === line.key && hoveredPoint?.index === i ? 6 : 4}
                  fill="white"
                  stroke={line.color}
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoveredPoint({ line: line.key, index: i, value: d[line.key] })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          )
        })}

        {/* Tooltip */}
        {hoveredPoint && (
          <g>
            <rect
              x={getX(hoveredPoint.index) - 20}
              y={getY(hoveredPoint.value) - 30}
              width="40"
              height="22"
              rx="4"
              fill="#1f2937"
            />
            <text
              x={getX(hoveredPoint.index)}
              y={getY(hoveredPoint.value) - 15}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="600"
            >
              {hoveredPoint.value}%
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
            <span className="text-sm text-gray-600">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ title, value, subvalue, icon, color, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subvalue && <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subvalue}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 sm:mt-2 text-xs sm:text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${trendUp ? '' : 'transform rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="truncate">{trend}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: color + '20' }}>
          <span className="[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Large Hero Stat
function HeroStat({ label, value, subtext, color, icon }) {
  return (
    <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden`} style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}>
      <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 opacity-10">
        <svg viewBox="0 0 100 100" fill="currentColor">
          <circle cx="80" cy="20" r="60" />
        </svg>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{icon}</span>
          <span className="text-xs sm:text-sm font-medium opacity-90 truncate">{label}</span>
        </div>
        <p className="text-2xl sm:text-4xl font-bold">{value}</p>
        <p className="text-xs sm:text-sm opacity-80 mt-1 truncate">{subtext}</p>
      </div>
    </div>
  )
}

function AdoptionUsage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Month')
  const data = timelineData[selectedPeriod]
  const location = useLocation()

  const periods = ['Pay Cycle', 'Month', 'Quarter', 'Year']

  // Scroll to reports section if hash is present
  useEffect(() => {
    if (location.hash === '#reports') {
      setTimeout(() => {
        const reportsSection = document.getElementById('reports')
        if (reportsSection) {
          reportsSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }, [location])

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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Adoption & Usage</h2>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <p className="text-sm sm:text-base text-gray-600">Company-wide employee behavior and engagement metrics</p>
            <div className="w-full sm:w-auto">
              <PennySearchBar />
            </div>
          </div>
          {/* Time Period Selector */}
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1 overflow-x-auto">
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
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8" data-tour="adoption-stats">
        <HeroStat
          label="Total Adoption"
          value={`${data.totalAdoption.percent}%`}
          subtext={`${data.totalAdoption.count.toLocaleString()} of ${data.totalAdoption.total.toLocaleString()} employees`}
          color="#6366f1"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <HeroStat
          label="App Logins"
          value={formatNumber(data.appLogins.count)}
          subtext={`${data.appLogins.percent}% login rate`}
          color="#10b981"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
        />
        <HeroStat
          label="Active Users"
          value={`${data.activePercent}%`}
          subtext="of enrolled employees"
          color="#8b5cf6"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <HeroStat
          label="Avg Minutes per Enrolled"
          value={`${(data.appMinutes / data.totalAdoption.count).toFixed(1)} min`}
          subtext="per enrolled employee"
          color="#f59e0b"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Transfers & Save Accounts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Transfers Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transfers</h3>
              <p className="text-xs sm:text-sm text-gray-500">Earned wage access activity</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Total Transfers</p>
              <p className="text-xl sm:text-3xl font-bold text-purple-700">{data.transfers.count.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-600 font-medium">Total Value</p>
              <p className="text-xl sm:text-3xl font-bold text-green-700">{formatCurrency(data.transfers.value)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-purple-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Instant</p>
              <p className="text-sm sm:text-lg font-bold text-purple-700">{data.transfers.instantCount.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-purple-500 hidden sm:block">${INSTANT_FEE} fee</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Standard</p>
              <p className="text-sm sm:text-lg font-bold text-blue-700">{data.transfers.standardCount.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-blue-500 hidden sm:block">Free</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-amber-600 font-medium">Fees</p>
              <p className="text-sm sm:text-lg font-bold text-amber-700">{formatCurrency(data.transfers.totalFees)}</p>
              <p className="text-[10px] sm:text-xs text-amber-500 hidden sm:block">Instant fees</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-100 pt-3 sm:pt-4">
            <div className="text-center">
              <p className="text-gray-500">Avg/Day</p>
              <p className="font-semibold text-gray-900">{data.transfers.avgCount.toFixed(1)}</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-gray-500">Avg Value</p>
              <p className="font-semibold text-gray-900">${data.transfers.avgValue}</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-gray-500">Avg/Emp</p>
              <p className="font-semibold text-gray-900">{(data.transfers.count / data.totalAdoption.count).toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Save Accounts Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Save Accounts</h3>
              <p className="text-xs sm:text-sm text-gray-500">Employee savings program</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-emerald-600 font-medium">Active Accounts</p>
              <p className="text-xl sm:text-3xl font-bold text-emerald-700">{data.saveAccounts.count.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-teal-600 font-medium">Total Saved</p>
              <p className="text-xl sm:text-3xl font-bold text-teal-700">{formatCurrency(data.saveAccounts.value)}</p>
            </div>
          </div>

          {/* Savings Growth Line Graph */}
          <div className="mb-3 sm:mb-4">
            <p className="text-xs text-gray-500 mb-2">Savings Balance Growth</p>
            <SavingsLineChart data={data.savingsGrowth} />
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-100 pt-3 sm:pt-4">
            <div className="text-center">
              <p className="text-gray-500">Avg Bal</p>
              <p className="font-semibold text-gray-900">${data.saveAccounts.avgBalance.toFixed(2)}</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-gray-500">Particip.</p>
              <p className="font-semibold text-gray-900">{Math.round((data.saveAccounts.count / data.totalAdoption.count) * 100)}%</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-gray-500">vs Last</p>
              <p className="font-semibold text-green-600">+12%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Usage & Engagement Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8" data-tour="adoption-charts">
        {/* Feature Usage Rings */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Feature Usage</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">Percentage of users utilizing each feature</p>

          <div className="flex justify-around">
            <CircularProgress percent={data.trackFeaturePercent} size={80} strokeWidth={6} color="#6366f1" label="Track" />
            <CircularProgress percent={data.payFeaturePercent} size={80} strokeWidth={6} color="#10b981" label="Pay" />
            <CircularProgress percent={data.saveFeaturePercent} size={80} strokeWidth={6} color="#f59e0b" label="Save" />
          </div>
        </div>

        {/* Feature Usage Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Feature Adoption Trend</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">How feature usage has evolved over time</p>

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TrendLineChart data={data.featureUsageTrend} height={180} />
          </div>
        </div>
      </div>

      {/* App Engagement & Transfers by Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Daily Logins Sparkline */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Daily App Activity</h3>
              <p className="text-xs sm:text-sm text-gray-500">Login trends over the period</p>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(data.appVisits)}</p>
              <p className="text-xs sm:text-sm text-gray-500">Total visits</p>
            </div>
          </div>

          <div className="h-16 sm:h-20">
            <Sparkline data={data.dailyLogins} color="#6366f1" height={70} />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Peak</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">{Math.max(...data.dailyLogins).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Avg</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">{Math.round(data.dailyLogins.reduce((a, b) => a + b, 0) / data.dailyLogins.length).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Low</p>
              <p className="text-sm sm:text-base font-semibold text-gray-900">{Math.min(...data.dailyLogins).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Transfers by Day of Week */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transfers by Day</h3>
              <p className="text-xs sm:text-sm text-gray-500">When employees transfer most</p>
            </div>
          </div>

          <BarChart data={data.transfersByDay} dataKey="count" labelKey="day" color="#8b5cf6" height={140} />

          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs sm:text-sm text-gray-600">Busiest: <span className="font-semibold">Fri</span></span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-xs sm:text-sm text-gray-600">Slowest: <span className="font-semibold">Sun</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          title="App Visits"
          value={formatNumber(data.appVisits)}
          subvalue="Total sessions"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          color="#3b82f6"
        />
        <StatCard
          title="Minutes in App"
          value={formatNumber(data.appMinutes)}
          subvalue={`${(data.appMinutes / data.appVisits).toFixed(1)} min avg`}
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="#8b5cf6"
        />
        <StatCard
          title="Active Rate"
          value={`${data.activePercent}%`}
          subvalue="of enrolled users"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="#10b981"
          trend="+3.2% vs prior"
          trendUp={true}
        />
        <StatCard
          title="Login Rate"
          value={`${data.appLogins.percent}%`}
          subvalue={`${formatNumber(data.appLogins.count)} logins`}
          icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
          color="#f59e0b"
        />
      </div>

      {/* Executive Summary Card */}
      <div id="reports" className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 text-white" data-tour="adoption-reports">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0">
          <div>
            <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Executive Summary</h3>
            <p className="text-purple-200 text-sm sm:text-base mb-4 sm:mb-6 max-w-2xl">
              Your EWA program is driving significant employee engagement. Here are the key highlights for this {selectedPeriod.toLowerCase()}.
            </p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto" data-tour="adoption-export">
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white/10 rounded-xl p-3 sm:p-4">
            <p className="text-purple-200 text-xs sm:text-sm">Adoption Rate</p>
            <p className="text-xl sm:text-3xl font-bold">{data.totalAdoption.percent}%</p>
            <p className="text-purple-200 text-[10px] sm:text-xs mt-1">{data.totalAdoption.count.toLocaleString()} employees</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 sm:p-4">
            <p className="text-purple-200 text-xs sm:text-sm">Transferred</p>
            <p className="text-xl sm:text-3xl font-bold">{formatCurrency(data.transfers.value)}</p>
            <p className="text-purple-200 text-[10px] sm:text-xs mt-1">{data.transfers.count.toLocaleString()} transactions</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 sm:p-4">
            <p className="text-purple-200 text-xs sm:text-sm">Total Saved</p>
            <p className="text-xl sm:text-3xl font-bold">{formatCurrency(data.saveAccounts.value)}</p>
            <p className="text-purple-200 text-[10px] sm:text-xs mt-1">{data.saveAccounts.count} accounts</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 sm:p-4">
            <p className="text-purple-200 text-xs sm:text-sm">Engagement</p>
            <p className="text-xl sm:text-3xl font-bold">{Math.round((data.activePercent + data.appLogins.percent + data.trackFeaturePercent) / 3)}%</p>
            <p className="text-purple-200 text-[10px] sm:text-xs mt-1">composite metric</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdoptionUsage
