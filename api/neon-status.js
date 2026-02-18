import { neon } from '@neondatabase/serverless';

const NEON_PROJECT_ID = 'sweet-snow-25280250';
const DATA_TRANSFER_LIMIT_BYTES = 5368709120; // 5 GB

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const result = {
    status: 'down',
    project: null,
    branch: null,
    healthCheck: { latencyMs: null, healthy: false },
    checkedAt: new Date().toISOString(),
  };

  // 1. Neon REST API — project details + branches (separate endpoints)
  try {
    const apiKey = process.env.NEON_API_KEY;
    if (apiKey) {
      const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
      const [projectResp, branchesResp] = await Promise.all([
        fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}`, { headers }),
        fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, { headers }),
      ]);

      if (projectResp.ok) {
        const data = await projectResp.json();
        const project = data.project;
        result.project = {
          name: project?.name || 'penny',
          regionId: project?.region_id || null,
        };
      }

      if (branchesResp.ok) {
        const data = await branchesResp.json();
        const branches = data.branches || [];
        const branch = branches.find(b => b.default) || branches[0];

        if (branch) {
          const transferBytes = branch.data_transfer_bytes || 0;
          result.branch = {
            name: branch.name,
            state: branch.current_state || 'unknown',
            logicalSizeBytes: branch.logical_size || 0,
            dataTransferBytes: transferBytes,
            dataTransferLimitBytes: DATA_TRANSFER_LIMIT_BYTES,
            dataTransferPct: Math.round((transferBytes / DATA_TRANSFER_LIMIT_BYTES) * 1000) / 10,
          };
        }
      }
    }
  } catch (err) {
    console.error('Neon API error:', err.message);
  }

  // 2. DB health check — timed SELECT 1
  try {
    const sql = neon(process.env.DATABASE_URL);
    const start = Date.now();
    await sql`SELECT 1`;
    const latencyMs = Date.now() - start;

    result.healthCheck = { latencyMs, healthy: true };
  } catch (err) {
    console.error('Neon health check failed:', err.message);
    result.healthCheck = { latencyMs: null, healthy: false };
  }

  // 3. Derive overall status
  const branchReady = !result.branch || result.branch.state === 'ready'; // no API key = assume ok
  const dbHealthy = result.healthCheck.healthy;
  const latencyOk = result.healthCheck.latencyMs !== null && result.healthCheck.latencyMs < 2000;
  const transferPct = result.branch?.dataTransferPct || 0;

  if (dbHealthy && branchReady && latencyOk && transferPct < 80) {
    result.status = 'operational';
  } else if (dbHealthy && (result.healthCheck.latencyMs > 2000 || transferPct >= 80)) {
    result.status = 'degraded';
  } else if (!dbHealthy) {
    result.status = 'down';
  } else {
    result.status = 'degraded';
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).json(result);
}
