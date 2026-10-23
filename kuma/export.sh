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

# data = main + one commit adding state.json, force-pushed each run. It has
# to contain main's workflow, since GitHub reads workflows from the pushed commit.
cd "$work/repo"
export GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes"
export GIT_AUTHOR_NAME="IIIT Uptime" GIT_AUTHOR_EMAIL="iiit-uptime@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
git init -q
git fetch -q --depth=1 "$REPO" main
git read-tree FETCH_HEAD
git add -f state.json
commit=$(git commit-tree "$(git write-tree)" -p FETCH_HEAD -m "Kuma snapshot $(date -u +%FT%TZ)")
git push -q -f "$REPO" "$commit:refs/heads/data"
