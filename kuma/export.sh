#!/usr/bin/env bash
# Snapshot Kuma's database into UptimeFlare's state format and force-push it
# to the data branch, which triggers the Pages deploy. Runs every 5 minutes
# from a systemd user timer on the Kuma host.
set -euo pipefail

REPO=git@github.com:shouryadixitisverycool/iiit-uptime.git
KEY=${DEPLOY_KEY:-$HOME/.ssh/iiit-uptime-deploy}
IDS="1,2,3,4,5,6"

here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

q() { docker exec uptime-kuma mariadb --socket=/app/data/run/mariadb.sock -u root kuma -e "$1"; }

q "SELECT monitor_id, MIN(UNIX_TIMESTAMP(time)) FROM heartbeat
   WHERE monitor_id IN ($IDS) GROUP BY monitor_id" > "$work/first.tsv"
# important=1 marks the beats where a monitor changed status
q "SELECT monitor_id, UNIX_TIMESTAMP(time), status, REPLACE(REPLACE(IFNULL(msg,''),'\t',' '),'\n',' ')
   FROM heartbeat WHERE important = 1 AND monitor_id IN ($IDS) ORDER BY monitor_id, time" > "$work/events.tsv"
q "SELECT monitor_id, UNIX_TIMESTAMP(time), status, IFNULL(ping,0)
   FROM heartbeat WHERE time > UTC_TIMESTAMP() - INTERVAL 12 HOUR AND monitor_id IN ($IDS)
   ORDER BY monitor_id, time" > "$work/latency.tsv"

mkdir "$work/repo"
python3 -I "$here/kuma_to_state.py" "$work" "$work/repo/state.json"

# One orphan commit per run, force-pushed, so the branch never grows history
cd "$work/repo"
git init -q
git add state.json
git -c user.name="IIIT Uptime" -c user.email="iiit-uptime@users.noreply.github.com" \
  commit -q -m "Kuma snapshot $(date -u +%FT%TZ)"
GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes" git push -q -f "$REPO" HEAD:data
