import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function timeAgo(dateString) {
  if (!dateString) return '--'
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function timeAgoFromTimestamp(ts) {
  if (!ts) return '--'
  return timeAgo(new Date(ts).toISOString())
}

function formatDate(dateString) {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function getNextSyncTime() {
  const now = new Date()
  const syncHours = [8, 12, 16]
  for (const hour of syncHours) {
    const next = new Date(now)
    next.setHours(hour, 0, 0, 0)
    if (next > now) return next
  }
  // All today's syncs passed — next is 8 AM tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  return tomorrow
}

function timeUntil(date) {
  const ms = date.getTime() - Date.now()
  if (ms <= 0) return 'any moment now'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`
  return `${(bytes / 1073741824).toFixed(1)} GB`
}

function StatusBadge({ status }) {
  const styles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    running: 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse',
    requested: 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  )
}

function PlatformStatusDot({ status }) {
  const colors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500 animate-pulse',
    down: 'bg-red-500 animate-pulse',
  }
  const labels = {
    operational: 'Operational',
    degraded: 'Degraded',
    down: 'Down',
  }
  const textColors = {
    operational: 'text-green-400',
    degraded: 'text-yellow-400',
    down: 'text-red-400',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
      <span className={`text-xs font-medium ${textColors[status] || 'text-gray-400'}`}>
        {labels[status] || 'Unknown'}
      </span>
    </div>
  )
}

function LatencyBadge({ ms }) {
  if (ms == null) return <span className="text-xs text-gray-500">--</span>
  const color = ms < 500 ? 'text-green-400' : ms < 2000 ? 'text-yellow-400' : 'text-red-400'
  return <span className={`text-xs font-mono ${color}`}>{ms}ms</span>
}

function TransferBar({ pct }) {
  const barColor =
    pct < 60 ? 'bg-green-500' :
    pct < 80 ? 'bg-yellow-500' :
    pct < 95 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-700/50 p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 bg-gray-700 rounded w-20" />
        <div className="h-3 bg-gray-700 rounded w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function SyncStatusDashboard({ onClose } = {}) {
  const [syncs, setSyncs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)
  const [syncRequested, setSyncRequested] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [vercelStatus, setVercelStatus] = useState(null)
  const [neonStatus, setNeonStatus] = useState(null)
  const pollRef = useRef(null)
  const navigate = useNavigate()

  const fetchSyncs = useCallback(() => {
    return fetch('/api/sync-status')
      .then(res => res.json())
      .then(data => {
        const rows = Array.isArray(data) ? data : []
        setSyncs(rows)
        setLoading(false)
        return rows
      })
      .catch(() => {
        setError('Failed to load sync status')
        setLoading(false)
        return []
      })
  }, [])

  const fetchPlatformHealth = useCallback(async () => {
    const [vercelResult, neonResult] = await Promise.allSettled([
      fetch('/api/vercel-status').then(r => r.ok ? r.json() : null),
      fetch('/api/neon-status').then(r => r.ok ? r.json() : null),
    ])
    if (vercelResult.status === 'fulfilled' && vercelResult.value) {
      setVercelStatus(vercelResult.value)
    }
    if (neonResult.status === 'fulfilled' && neonResult.value) {
      setNeonStatus(neonResult.value)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchSyncs() }, [fetchSyncs])

  // Platform health — load on mount, refresh every 60s
  useEffect(() => {
    fetchPlatformHealth()
    const interval = setInterval(fetchPlatformHealth, 300000)
    return () => clearInterval(interval)
  }, [fetchPlatformHealth])

  // Poll when a sync is requested or running
  useEffect(() => {
    const hasPending = syncs.some(s => s.status === 'requested' || s.status === 'running')
    if (hasPending || syncRequested) {
      pollRef.current = setInterval(async () => {
        const rows = await fetchSyncs()
        const stillPending = rows.some(s => s.status === 'requested' || s.status === 'running')
        if (!stillPending) {
          setSyncRequested(false)
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }, 5000)
      return () => { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [syncRequested, syncs.length, fetchSyncs])

  const handleForceSync = async () => {
    setRequesting(true)
    try {
      const res = await fetch('/api/request-sync', { method: 'POST' })
      const data = await res.json()
      if (data.status === 'requested' || data.status === 'running') {
        setSyncRequested(true)
        await fetchSyncs()
      }
    } catch {
      setError('Failed to request sync')
    } finally {
      setRequesting(false)
    }
  }

  const latest = syncs[0] || null
  const nextSync = getNextSyncTime()
  const isPending = syncs.some(s => s.status === 'requested' || s.status === 'running')

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Data Sync Monitor</h1>
            <p className="text-purple-200 text-sm mt-0.5">Redash → Neon data pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSyncConfirm(true)}
              disabled={requesting || isPending}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                isPending
                  ? 'bg-orange-500/80 text-white border-orange-400 animate-pulse cursor-not-allowed'
                  : requesting
                    ? 'bg-red-400 text-white border-red-300 cursor-wait'
                    : 'bg-red-500 hover:bg-red-600 text-white border-red-400 hover:border-red-500 shadow-lg hover:shadow-red-500/25'
              }`}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {syncs.find(s => s.status === 'running') ? 'Syncing...' : 'Waiting for runner...'}
                </span>
              ) : requesting ? (
                'Requesting...'
              ) : (
                'Force Sync'
              )}
            </button>
            <button
              onClick={onClose || (() => navigate('/'))}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors border border-white/20"
            >
              Back to Penny
            </button>
          </div>
        </div>

        {/* Pending sync banner */}
        {isPending && (
          <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-orange-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-800">
                {syncs.find(s => s.status === 'running')
                  ? 'Sync is running — refreshing every 5 seconds...'
                  : 'Sync requested — waiting for your Mac to pick it up (checks every 5 min)...'}
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                {syncs.find(s => s.status === 'running')
                  ? 'Data will update automatically when complete.'
                  : 'Make sure your Mac is on and VPN is connected.'}
              </p>
            </div>
          </div>
        )}

        {/* Platform Health */}
        <div className="mb-6">
          <p className="text-xs font-medium text-purple-200/80 uppercase tracking-wide mb-2">Platform Health</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Vercel Card */}
            {!vercelStatus ? <SkeletonCard /> : (
              <a href="https://vercel.com/shahans-projects-df65c820/penny-ai-assistant/DNVmYkns1Zizv7Nvng4rf82RR698" target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-700/50 p-4 cursor-pointer hover:border-gray-500/70 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 76 65" fill="currentColor">
                      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Vercel</span>
                  </div>
                  <PlatformStatusDot status={vercelStatus.status} />
                </div>

                <div className="space-y-2">
                  {/* API Response */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">API Response</span>
                    <LatencyBadge ms={vercelStatus.selfCheck?.responseTimeMs} />
                  </div>

                  {/* Latest Deploy */}
                  {vercelStatus.latestDeployment && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Latest Deploy</span>
                      <span className="text-xs text-gray-300">{timeAgoFromTimestamp(vercelStatus.latestDeployment.created)}</span>
                    </div>
                  )}

                  {/* Deploy Health */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Deploy Health</span>
                    <span className="text-xs font-medium text-gray-300">
                      {vercelStatus.deployHealth?.label || '--'}
                    </span>
                  </div>

                  {/* Fast Origin Transfer + Fluid Compute side by side */}
                  {vercelStatus.usage && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] text-gray-400">Fast Origin Transfer</span>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${vercelStatus.usage.fastOriginTransferPct < 60 ? 'bg-green-500' : vercelStatus.usage.fastOriginTransferPct < 80 ? 'bg-yellow-500' : vercelStatus.usage.fastOriginTransferPct < 95 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(vercelStatus.usage.fastOriginTransferPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">
                          {formatBytes(vercelStatus.usage.fastOriginTransferBytes)} / {formatBytes(vercelStatus.usage.fastOriginTransferLimitBytes)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-400">Fluid Compute</span>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${vercelStatus.usage.functionExecPct < 60 ? 'bg-green-500' : vercelStatus.usage.functionExecPct < 80 ? 'bg-yellow-500' : vercelStatus.usage.functionExecPct < 95 ? 'bg-orange-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(vercelStatus.usage.functionExecPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">
                          {vercelStatus.usage.functionExecGbHours} / {vercelStatus.usage.functionExecLimitGbHours} GB-hrs
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {vercelStatus.checkedAt && (
                  <p className="text-[10px] text-gray-600 mt-3 text-right">Checked {timeAgo(vercelStatus.checkedAt)}</p>
                )}
              </div>
              </a>
            )}

            {/* Neon Card */}
            {!neonStatus ? <SkeletonCard /> : (
              <a href="https://console.neon.tech/app/projects/little-bar-64800022" target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-700/50 p-4 cursor-pointer hover:border-gray-500/70 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 36 36" fill="none">
                      <path d="M0 7.2C0 3.22 3.22 0 7.2 0h21.6C32.78 0 36 3.22 36 7.2v21.6c0 3.98-3.22 7.2-7.2 7.2H7.2C3.22 36 0 32.78 0 28.8V7.2Z" fill="#0A0"/>
                      <path d="M27 9v13.5l-4.5-6V27l-9-12v10.5L9 18V9l4.5 6V4.5l9 12V6L27 9Z" fill="#fff"/>
                    </svg>
                    <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Neon Database</span>
                  </div>
                  <PlatformStatusDot status={neonStatus.status} />
                </div>

                <div className="space-y-2">
                  {/* DB Health */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Database</span>
                    <LatencyBadge ms={neonStatus.healthCheck?.latencyMs} />
                  </div>

                  {/* Last Sync */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Last Sync</span>
                    <span className="text-xs text-gray-300">{latest?.started_at ? timeAgo(latest.started_at) : '--'}</span>
                  </div>

                  {/* Total Syncs */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Total Syncs</span>
                    <span className="text-xs text-gray-300">{syncs.filter(s => s.status === 'success').length}</span>
                  </div>

                  {/* Storage + Network Transfer side by side */}
                  {neonStatus.branch && (() => {
                    const storageLimitBytes = 512 * 1048576; // 512 MB free tier
                    const storagePct = Math.round((neonStatus.branch.logicalSizeBytes / storageLimitBytes) * 1000) / 10;
                    return (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[11px] text-gray-400">Storage</span>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${storagePct < 60 ? 'bg-green-500' : storagePct < 80 ? 'bg-yellow-500' : storagePct < 95 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(storagePct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">
                            {formatBytes(neonStatus.branch.logicalSizeBytes)} / {formatBytes(storageLimitBytes)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-400">Network Transfer</span>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${neonStatus.branch.dataTransferPct < 60 ? 'bg-green-500' : neonStatus.branch.dataTransferPct < 80 ? 'bg-yellow-500' : neonStatus.branch.dataTransferPct < 95 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(neonStatus.branch.dataTransferPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 mt-0.5 block">
                            {formatBytes(neonStatus.branch.dataTransferBytes)} / {formatBytes(neonStatus.branch.dataTransferLimitBytes)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {neonStatus.checkedAt && (
                  <p className="text-[10px] text-gray-600 mt-3 text-right">Checked {timeAgo(neonStatus.checkedAt)}</p>
                )}
              </div>
              </a>
            )}

          </div>
        </div>

        {/* Sync Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Last Sync */}
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-purple-200/50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Last Sync</p>
            {latest ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={latest.status} />
                  <span className="text-sm text-gray-500">{timeAgo(latest.started_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{formatDate(latest.started_at)}</p>
                {latest.duration_s > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{latest.duration_s}s duration</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No syncs recorded</p>
            )}
          </div>

          {/* Next Sync */}
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-purple-200/50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Next Sync</p>
            <p className="text-lg font-semibold text-purple-700">{timeUntil(nextSync)}</p>
            <p className="text-sm text-gray-700">{formatDate(nextSync)}</p>
            <p className="text-xs text-gray-400 mt-1">3x daily: 8 AM, 12 PM, 4 PM</p>
          </div>

          {/* Data Totals */}
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-purple-200/50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Data Totals</p>
            {latest && latest.total_employees > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-semibold text-purple-700">
                    {Number(latest.total_employees).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">employees</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-purple-700">
                    {Number(latest.total_companies).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">companies</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">--</p>
            )}
          </div>
        </div>

        {/* Data Totals Over Time */}
        {(() => {
          // Filter to successful syncs with data, chronological order (oldest first)
          const chartData = syncs
            .filter(s => s.status === 'success' && Number(s.total_employees) > 0)
            .reverse()
          if (chartData.length === 0) return null

          const empValues = chartData.map(s => Number(s.total_employees))
          const compValues = chartData.map(s => Number(s.total_companies))
          const empMin = Math.min(...empValues)
          const empMax = Math.max(...empValues)
          const compMin = Math.min(...compValues)
          const compMax = Math.max(...compValues)

          // Add 5% padding to ranges (or fixed padding if all values are the same)
          const empRange = empMax - empMin || Math.max(empMax * 0.05, 100)
          const compRange = compMax - compMin || Math.max(compMax * 0.05, 5)
          const empLo = empMin - empRange * 0.1
          const empHi = empMax + empRange * 0.1
          const compLo = compMin - compRange * 0.1
          const compHi = compMax + compRange * 0.1

          const W = 600, H = 180, PAD_L = 55, PAD_R = 55, PAD_T = 15, PAD_B = 30
          const plotW = W - PAD_L - PAD_R
          const plotH = H - PAD_T - PAD_B

          const xForIdx = (i) => PAD_L + (chartData.length === 1 ? plotW / 2 : (i / (chartData.length - 1)) * plotW)
          const yForEmp = (v) => PAD_T + plotH - ((v - empLo) / (empHi - empLo)) * plotH
          const yForComp = (v) => PAD_T + plotH - ((v - compLo) / (compHi - compLo)) * plotH

          const empPoints = empValues.map((v, i) => `${xForIdx(i)},${yForEmp(v)}`).join(' ')
          const compPoints = compValues.map((v, i) => `${xForIdx(i)},${yForComp(v)}`).join(' ')

          // Y-axis ticks (3 ticks each side)
          const empTicks = [empLo, (empLo + empHi) / 2, empHi].map(v => Math.round(v))
          const compTicks = [compLo, (compLo + compHi) / 2, compHi].map(v => Math.round(v))

          // Delta from last two data points
          const latestEmp = empValues[empValues.length - 1]
          const prevEmp = empValues.length >= 2 ? empValues[empValues.length - 2] : null
          const empDelta = prevEmp != null ? latestEmp - prevEmp : null
          const latestComp = compValues[compValues.length - 1]
          const prevComp = compValues.length >= 2 ? compValues[compValues.length - 2] : null
          const compDelta = prevComp != null ? latestComp - prevComp : null

          const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toLocaleString()

          return (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200/50 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Data Totals Over Time</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track employee &amp; company counts across syncs</p>
              </div>

              <div className="p-4">
                {/* SVG Chart */}
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
                  {/* Grid lines */}
                  {[0, 0.5, 1].map((pct, i) => {
                    const y = PAD_T + plotH * (1 - pct)
                    return <line key={`grid-${i}`} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 2" />
                  })}

                  {/* Left Y-axis labels (employees) */}
                  {empTicks.map((val, i) => {
                    const y = yForEmp(val)
                    return <text key={`emp-y-${i}`} x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9333ea" fontFamily="monospace">{fmtK(val)}</text>
                  })}

                  {/* Right Y-axis labels (companies) */}
                  {compTicks.map((val, i) => {
                    const y = yForComp(val)
                    return <text key={`comp-y-${i}`} x={W - PAD_R + 6} y={y + 3} textAnchor="start" fontSize="9" fill="#3b82f6" fontFamily="monospace">{val}</text>
                  })}

                  {/* X-axis labels */}
                  {chartData.map((s, i) => {
                    // Show max ~8 labels to avoid overlap
                    if (chartData.length > 8 && i % Math.ceil(chartData.length / 8) !== 0 && i !== chartData.length - 1) return null
                    const label = new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return <text key={`x-${i}`} x={xForIdx(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
                  })}

                  {/* Employee line (purple) */}
                  {chartData.length > 1 && (
                    <polyline points={empPoints} fill="none" stroke="#9333ea" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  {/* Employee area fill */}
                  {chartData.length > 1 && (
                    <polygon
                      points={`${xForIdx(0)},${PAD_T + plotH} ${empPoints} ${xForIdx(chartData.length - 1)},${PAD_T + plotH}`}
                      fill="url(#empGrad)" opacity="0.15"
                    />
                  )}

                  {/* Company line (blue) */}
                  {chartData.length > 1 && (
                    <polyline points={compPoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 3" />
                  )}

                  {/* Data points - employees */}
                  {empValues.map((v, i) => (
                    <g key={`emp-dot-${i}`}>
                      <circle cx={xForIdx(i)} cy={yForEmp(v)} r="4" fill="#9333ea" stroke="white" strokeWidth="1.5" />
                      <title>{`${new Date(chartData[i].started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}\nEmployees: ${v.toLocaleString()}\nCompanies: ${compValues[i].toLocaleString()}`}</title>
                    </g>
                  ))}

                  {/* Data points - companies */}
                  {compValues.map((v, i) => (
                    <g key={`comp-dot-${i}`}>
                      <circle cx={xForIdx(i)} cy={yForComp(v)} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                      <title>{`${new Date(chartData[i].started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}\nEmployees: ${empValues[i].toLocaleString()}\nCompanies: ${v.toLocaleString()}`}</title>
                    </g>
                  ))}

                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Legend with deltas */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-purple-600 rounded-full inline-block" />
                    <span className="text-sm font-semibold text-gray-700">{latestEmp.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">employees</span>
                    {empDelta != null && (
                      <span className={`text-xs font-medium ${empDelta > 0 ? 'text-green-600' : empDelta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {empDelta > 0 ? '▲' : empDelta < 0 ? '▼' : '—'} {empDelta !== 0 ? Math.abs(empDelta).toLocaleString() : '0'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block border-t border-dashed border-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">{latestComp.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">companies</span>
                    {compDelta != null && (
                      <span className={`text-xs font-medium ${compDelta > 0 ? 'text-green-600' : compDelta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {compDelta > 0 ? '▲' : compDelta < 0 ? '▼' : '—'} {compDelta !== 0 ? Math.abs(compDelta).toLocaleString() : '0'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Sync History */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Sync History</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : syncs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No syncs recorded yet. Click <strong>Force Sync</strong> or run <code className="bg-gray-100 px-1 rounded text-sm">node scripts/sync-redash.js manual</code> to trigger one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3 text-right">Companies</th>
                    <th className="px-4 py-3 text-right">Employees</th>
                    <th className="px-4 py-3 text-right">Errors</th>
                    <th className="px-4 py-3 text-right">Speed</th>
                    <th className="px-4 py-3 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {syncs.map((sync) => {
                    const totalErrors = Number(sync.companies_errors) + Number(sync.employees_errors)
                    const totalRows = Number(sync.companies_upserted) + Number(sync.employees_upserted)
                    const speed = sync.duration_s > 0 ? `${Math.round(totalRows / sync.duration_s).toLocaleString()}/s` : '--'
                    const hasError = sync.error_message && sync.error_message.length > 0
                    const isExpanded = expandedRow === sync.id

                    return (
                      <tr
                        key={sync.id}
                        className={`border-t border-gray-50 hover:bg-purple-50/50 transition-colors ${hasError ? 'cursor-pointer' : ''}`}
                        onClick={() => hasError && setExpandedRow(isExpanded ? null : sync.id)}
                      >
                        <td className="px-4 py-3 text-gray-700">
                          <div>{formatDate(sync.started_at)}</div>
                          <div className="text-xs text-gray-400">{timeAgo(sync.started_at)}</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={sync.status} /></td>
                        <td className="px-4 py-3 text-right text-gray-600 font-mono">{sync.duration_s > 0 ? `${sync.duration_s}s` : '--'}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {Number(sync.companies_upserted).toLocaleString()}
                          {sync.companies_fetched > 0 && sync.companies_fetched !== sync.companies_upserted && (
                            <span className="text-xs text-gray-400"> / {Number(sync.companies_fetched).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {Number(sync.employees_upserted).toLocaleString()}
                          {sync.employees_fetched > 0 && sync.employees_fetched !== sync.employees_upserted && (
                            <span className="text-xs text-gray-400"> / {Number(sync.employees_fetched).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {totalErrors > 0 ? (
                            <span className="text-red-600 font-medium">{totalErrors}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 font-mono">{speed}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">{sync.triggered_by}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Expanded error details */}
              {expandedRow && (() => {
                const sync = syncs.find(s => s.id === expandedRow)
                if (!sync?.error_message) return null
                return (
                  <div className="px-5 py-3 bg-red-50 border-t border-red-100">
                    <p className="text-xs font-medium text-red-700 mb-1">Error Details</p>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">{sync.error_message}</pre>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-purple-200/60 mt-6">Penny AI Assistant — Data Pipeline Monitor</p>
      </div>

      {/* Confirm Sync Modal */}
      {showSyncConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowSyncConfirm(false) }}
        >
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowSyncConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirm Sync</h3>
            <p className="text-sm text-gray-500 mb-5">This will trigger a full data sync from Redash. Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSyncConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSyncConfirm(false); handleForceSync() }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-lg"
              >
                Yes, Sync Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
