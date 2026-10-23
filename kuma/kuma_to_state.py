#!/usr/bin/env python3
"""Turn Kuma heartbeat exports (see export.sh) into UptimeFlare's compacted state JSON.

Also writes speed.json next to OUTPUT_PATH: the D Block speed tests as
[time, down Mbps, up Mbps, latency ms] rows.

Usage: kuma_to_state.py TSV_DIR OUTPUT_PATH
"""
import csv, json, os, struct, sys, time
from collections import defaultdict

data_dir, out = sys.argv[1], sys.argv[2]
IDS = {1: "moodle", 2: "ims", 3: "dining", 4: "intranet", 5: "matrix", 6: "dblock"}
now = int(time.time())
horizon = now - 90 * 86400

def rows(name):
    with open(f"{data_dir}/{name}") as f:
        r = csv.reader(f, delimiter="\t")
        next(r)
        return [row for row in r]

first = {int(m): int(t) for m, t in rows("first.tsv")}
events = defaultdict(list)
for m, t, s, msg in rows("events.tsv"):
    events[int(m)].append((int(t), int(s), msg))
lat = defaultdict(list)
for m, t, s, p in rows("latency.tsv"):
    lat[int(m)].append((int(t), int(s), int(p)))

state = {"lastUpdate": now, "overallUp": 0, "overallDown": 0, "incident": {}, "latency": {}}
for mid, key in IDS.items():
    # UptimeFlare marks the start of monitoring with a "dummy" incident; days before it render as no data.
    start = max(first[mid], horizon)
    inc = {"start": [[start]], "end": [start], "error": [["dummy"]]}
    is_down = False
    for t, s, msg in events[mid]:
        if t < horizon:
            continue
        if s == 0 and not is_down:
            inc["start"].append([t]); inc["end"].append(None); inc["error"].append([msg or "Down"])
            is_down = True
        elif s == 0 and is_down and msg and msg != inc["error"][-1][-1]:
            inc["start"][-1].append(t); inc["error"][-1].append(msg)
        elif s in (1, 3) and is_down:
            inc["end"][-1] = t
            is_down = False
    state["incident"][key] = inc

    beats = lat[mid]
    state["latency"][key] = {
        "loc": {"v": ["HYD"], "c": [len(beats)]},
        "ping": struct.pack(f"<{len(beats)}H", *[min(p, 65535) for _, _, p in beats]).hex(),
        "time": struct.pack(f"<{len(beats)}I", *[t for t, _, _ in beats]).hex(),
    }
    state["overallUp"] += 1 if beats and beats[-1][1] != 0 else 0
    state["overallDown"] += 1 if beats and beats[-1][1] == 0 else 0

with open(out, "w") as f:
    json.dump(state, f, separators=(",", ":"))

speed = []
for t, msg in rows("speed.tsv"):
    fields = dict(f.split("=", 1) for f in msg.split() if "=" in f)
    try:
        speed.append([int(t), float(fields["down"]), float(fields["up"]), float(fields.get("latency", 0))])
    except (KeyError, ValueError):
        continue

with open(os.path.join(os.path.dirname(out), "speed.json"), "w") as f:
    json.dump(speed, f, separators=(",", ":"))
