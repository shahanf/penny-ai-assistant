#!/bin/bash
# Auto Sync: Ensures VPN is connected, runs Redash → Neon sync
# Usage:
#   ./auto-sync.sh          — Scheduled daily sync (7 AM via launchd)
#   ./auto-sync.sh check    — Check for force-sync requests (runs every 5 min via launchd)

PRITUNL="/Applications/Pritunl.app/Contents/Resources/pritunl-client"
PROFILE_ID="50ce622ee4a89473"
PROJECT_DIR="/Users/shahan/Documents/RELAUNCH/penny-ai-assistant"
LOG_FILE="$PROJECT_DIR/scripts/sync.log"
NODE="/usr/local/bin/node"

# Use homebrew node if system node not found
if [ ! -f "$NODE" ]; then
  NODE="$(which node 2>/dev/null)"
fi

# ── Check mode: poll DB for force-sync requests ──
if [ "$1" = "check" ]; then
  # Quick check if there's a pending request — no VPN needed for Neon
  HAS_REQUEST=$("$NODE" -e "
    import pg from 'pg';
    import { config } from 'dotenv';
    config({ path: '$PROJECT_DIR/.env' });
    const url = process.env.DATABASE_URL.replace('-pooler.', '.');
    const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 });
    const r = await pool.query(\"SELECT id FROM sync_log WHERE status = 'requested' LIMIT 1\");
    console.log(r.rows.length > 0 ? 'yes' : 'no');
    await pool.end();
  " 2>/dev/null)

  if [ "$HAS_REQUEST" = "yes" ]; then
    echo "=== Force Sync Request Detected $(date) ===" >> "$LOG_FILE"
    # Fall through to run the sync below
  else
    exit 0  # No pending requests, exit silently
  fi
else
  echo "=== Auto Sync $(date) ===" >> "$LOG_FILE"
fi

# ── VPN check ──
VPN_STATE=$("$PRITUNL" list 2>/dev/null | grep "$PROFILE_ID" | awk '{print $7}')

if [ "$VPN_STATE" != "Active" ]; then
  echo "VPN not connected, starting..." >> "$LOG_FILE"
  "$PRITUNL" start "$PROFILE_ID" >> "$LOG_FILE" 2>&1

  # Wait up to 30 seconds for VPN to connect
  for i in {1..30}; do
    sleep 1
    VPN_STATE=$("$PRITUNL" list 2>/dev/null | grep "$PROFILE_ID" | awk '{print $7}')
    if [ "$VPN_STATE" = "Active" ]; then
      echo "VPN connected after ${i}s" >> "$LOG_FILE"
      break
    fi
  done

  if [ "$VPN_STATE" != "Active" ]; then
    echo "ERROR: VPN failed to connect" >> "$LOG_FILE"
    exit 1
  fi
else
  echo "VPN already connected" >> "$LOG_FILE"
fi

# ── Run the sync ──
cd "$PROJECT_DIR"
"$NODE" scripts/sync-redash.js >> "$LOG_FILE" 2>&1
SYNC_EXIT=$?

if [ $SYNC_EXIT -eq 0 ]; then
  echo "Sync completed successfully" >> "$LOG_FILE"
else
  echo "ERROR: Sync failed with exit code $SYNC_EXIT" >> "$LOG_FILE"
fi

echo "=== Done $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
