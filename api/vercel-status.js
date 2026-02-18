const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_VxiNYWkNdppO8juTFZLGbQi5oRnk';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_ZfpjbjwPnzNrvvHYxF0KUwqk';

// Hobby plan limits
const FAST_ORIGIN_TRANSFER_LIMIT_BYTES = 10 * 1073741824; // 10 GB
const FUNCTION_EXEC_LIMIT_GB_HOURS = 360; // 360 GB-hrs provisioned memory

function getBillingPeriodDates() {
  // Vercel hobby billing resets on the 1st of each month
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const result = {
    status: 'down',
    latestDeployment: null,
    recentDeployments: [],
    deployHealth: { healthy: 0, total: 0, label: '--' },
    selfCheck: { responseTimeMs: null, healthy: false },
    usage: null,
    checkedAt: new Date().toISOString(),
  };

  const token = process.env.VERCEL_TOKEN;
  const headers = token
    ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    : null;

  // 1. Vercel API — recent production deployments + usage data (in parallel)
  try {
    if (headers) {
      const { from, to } = getBillingPeriodDates();
      const encodedFrom = encodeURIComponent(from);
      const encodedTo = encodeURIComponent(to);

      const [deploymentsResp, usageResp] = await Promise.all([
        fetch(
          `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=5&target=production`,
          { headers }
        ),
        fetch(
          `https://api.vercel.com/v2/usage?teamId=${VERCEL_TEAM_ID}&type=requests&from=${encodedFrom}&to=${encodedTo}`,
          { headers }
        ),
      ]);

      // Process deployments
      if (deploymentsResp.ok) {
        const data = await deploymentsResp.json();
        const deployments = data.deployments || [];

        if (deployments.length > 0) {
          const latest = deployments[0];
          const buildDurationMs = latest.ready && latest.created
            ? latest.ready - latest.created
            : null;

          result.latestDeployment = {
            uid: latest.uid,
            url: latest.url,
            readyState: latest.readyState || latest.state || 'UNKNOWN',
            created: latest.created,
            ready: latest.ready,
            buildDurationMs,
          };

          result.recentDeployments = deployments.map(d => ({
            readyState: d.readyState || d.state || 'UNKNOWN',
            buildDurationMs: d.ready && d.created ? d.ready - d.created : null,
            created: d.created,
          }));

          const healthyCount = deployments.filter(d =>
            (d.readyState || d.state) === 'READY'
          ).length;
          result.deployHealth = {
            healthy: healthyCount,
            total: deployments.length,
            label: `${healthyCount}/${deployments.length} healthy`,
          };
        }
      }

      // Process usage
      if (usageResp.ok) {
        const usageData = await usageResp.json();
        const days = usageData.data || [];

        const totalBwIn = days.reduce((s, d) => s + (d.bandwidth_incoming_bytes || 0), 0);
        const totalBwOut = days.reduce((s, d) => s + (d.bandwidth_outgoing_bytes || 0), 0);
        const totalTransfer = totalBwIn + totalBwOut;
        const totalFnGbHrs = days.reduce((s, d) => s + (d.function_execution_successful_gb_hours || 0), 0);

        result.usage = {
          fastOriginTransferBytes: totalTransfer,
          fastOriginTransferLimitBytes: FAST_ORIGIN_TRANSFER_LIMIT_BYTES,
          fastOriginTransferPct: Math.round((totalTransfer / FAST_ORIGIN_TRANSFER_LIMIT_BYTES) * 1000) / 10,
          functionExecGbHours: Math.round(totalFnGbHrs * 100) / 100,
          functionExecLimitGbHours: FUNCTION_EXEC_LIMIT_GB_HOURS,
          functionExecPct: Math.round((totalFnGbHrs / FUNCTION_EXEC_LIMIT_GB_HOURS) * 1000) / 10,
        };
      }
    }
  } catch (err) {
    console.error('Vercel API error:', err.message);
  }

  // 2. Self health check — time a call to /api/bootstrap
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://penny-ai-assistant.vercel.app';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const start = Date.now();
    const checkResp = await fetch(`${baseUrl}/api/health`, {
      signal: controller.signal,
    });
    const responseTimeMs = Date.now() - start;
    clearTimeout(timeout);

    result.selfCheck = {
      responseTimeMs,
      healthy: checkResp.ok,
    };
  } catch (err) {
    console.error('Self-check failed:', err.message);
    result.selfCheck = { responseTimeMs: null, healthy: false };
  }

  // 3. Derive overall status
  const hasDeployData = result.latestDeployment !== null;
  const latestReady = !hasDeployData || result.latestDeployment?.readyState === 'READY';
  const selfHealthy = result.selfCheck.healthy;
  const selfSlow = result.selfCheck.responseTimeMs !== null && result.selfCheck.responseTimeMs > 3000;

  if (selfHealthy && latestReady && !selfSlow) {
    result.status = 'operational';
  } else if ((selfHealthy && selfSlow) || (selfHealthy && !latestReady)) {
    result.status = 'degraded';
  } else {
    result.status = 'down';
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  return res.status(200).json(result);
}
