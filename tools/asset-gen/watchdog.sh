#!/usr/bin/env bash
# watchdog.sh — pure bash ComfyUI generation watchdog (V2)
#
# V2 fix: `find | wc -l` is a bad progress signal because gen-batch overwrites
# files on restart (same filenames v00..v07). Use `gen-batch.log` SIZE instead:
# every "saved X.png" line appends ~30 bytes, so log growth = real work.
# Secondary signal: mtime of newest .png in generated/ (files get rewritten even
# on overwrite, so mtime advances even if count doesn't).
#
# Runs until generation is done (>= TARGET_COUNT images AND all 58 prompts processed)
# or 3 restart attempts fail.

set -u
cd "$(dirname "$0")/../.."

GEN_DIR="E:/cv5/wisdom/tools/asset-gen/generated"
LOG="E:/cv5/wisdom/tools/asset-gen/gen-batch.log"
STDERR="E:/ComfyUI/comfyui_stderr.log"
STATUS_JSON="E:/cv5/wisdom/tools/asset-gen/watchdog-status.json"
DONE_FLAG="E:/cv5/wisdom/tools/asset-gen/watchdog-done.flag"
TARGET_COUNT=450
# With --highvram, prompts complete in 30s; 10 min idle is a genuine catastrophe, not normal swap.
STUCK_THRESHOLD_SEC=600
POLL_INTERVAL=120         # Check less often since we no longer expect frequent issues
MAX_RESTARTS=10
START_TIME=$(date +%s)

restart_count=0
last_log_size=0
last_log_growth_time=$START_TIME
last_newest_mtime=0
last_mtime_change_time=$START_TIME
last_stderr_tail_hash=""
last_stderr_change_time=$START_TIME

log() {
  echo "[$(date +%H:%M:%S)] $1"
}

check_comfy_alive() {
  # Try up to 3 times before declaring dead — handles transient network blips / GC pauses
  for try in 1 2 3; do
    if curl -s -m 5 http://127.0.0.1:8188/system_stats > /dev/null 2>&1; then
      return 0
    fi
    [ "$try" -lt 3 ] && sleep 2
  done
  return 1
}

get_image_count() {
  find "$GEN_DIR" -name "*.png" 2>/dev/null | wc -l | tr -d ' '
}

get_log_size() {
  if [ -f "$LOG" ]; then
    stat -c '%s' "$LOG" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

get_newest_mtime() {
  find "$GEN_DIR" -name "*.png" -printf '%T@\n' 2>/dev/null | sort -n | tail -1 | cut -d'.' -f1
}

get_genbatch_pids() {
  powershell.exe -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { \$_.CommandLine -like '*gen-batch*' } | ForEach-Object { \$_.ProcessId }" 2>/dev/null | tr -d '\r' | grep -E "^[0-9]+$" || true
}

kill_genbatch() {
  local pids=$(get_genbatch_pids)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      powershell.exe -Command "Stop-Process -Id $pid -Force" 2>/dev/null || true
    done
    sleep 2
  fi
}

kill_comfyui() {
  powershell.exe -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { \$_.CommandLine -like '*ComfyUI*' -or \$_.CommandLine -like '*main.py*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }" 2>/dev/null || true
  sleep 3
}

start_comfyui() {
  powershell.exe -Command "Start-Process -FilePath 'E:\\ComfyUI\\ComfyUI_windows_portable\\python_embeded\\python.exe' -ArgumentList '-s','ComfyUI\\main.py','--listen','127.0.0.1','--port','8188','--windows-standalone-build' -WorkingDirectory 'E:\\ComfyUI\\ComfyUI_windows_portable' -WindowStyle Hidden -RedirectStandardOutput 'E:\\ComfyUI\\comfyui_stdout.log' -RedirectStandardError 'E:\\ComfyUI\\comfyui_stderr.log' -PassThru | Out-Null" 2>/dev/null
  for i in $(seq 1 15); do
    sleep 4
    if check_comfy_alive; then
      log "ComfyUI ready after $((i*4))s"
      return 0
    fi
  done
  log "WARN: ComfyUI didn't respond in 60s"
  return 1
}

start_genbatch() {
  powershell.exe -Command "Start-Process -FilePath 'C:\\Program Files\\nodejs\\node.exe' -ArgumentList 'tools/asset-gen/gen-batch.mjs','--all' -WorkingDirectory 'E:\\cv5\\wisdom' -WindowStyle Hidden -RedirectStandardOutput 'E:\\cv5\\wisdom\\tools\\asset-gen\\gen-batch.log' -RedirectStandardError 'E:\\cv5\\wisdom\\tools\\asset-gen\\gen-batch.err.log' -PassThru | Out-Null" 2>/dev/null
  sleep 4
  local pids=$(get_genbatch_pids)
  if [ -n "$pids" ]; then log "gen-batch started (PIDs: $(echo $pids | tr '\n' ' '))"; return 0; fi
  log "WARN: gen-batch didn't start"
  return 1
}

recover() {
  restart_count=$((restart_count + 1))
  log "### RECOVERY #$restart_count ###"
  log "  killing gen-batch + ComfyUI..."
  kill_genbatch
  kill_comfyui
  sleep 5
  log "  starting ComfyUI..."
  start_comfyui || true
  log "  starting gen-batch..."
  start_genbatch || true
  # Reset stuck-detection timers (fresh processes get a grace period)
  now=$(date +%s)
  last_log_growth_time=$now
  last_mtime_change_time=$now
  last_stderr_change_time=$now
}

write_status() {
  local count=$1
  local log_size=$2
  local comfy_alive=$3
  local genbatch_alive=$4
  local elapsed=$(( $(date +%s) - START_TIME ))
  cat > "$STATUS_JSON" <<EOF
{
  "timestamp": "$(date -u +%FT%TZ)",
  "elapsed_sec": $elapsed,
  "image_count": $count,
  "log_size": $log_size,
  "target_count": $TARGET_COUNT,
  "progress_pct": $(awk "BEGIN{printf \"%.1f\", $count*100/$TARGET_COUNT}"),
  "comfyui_alive": $comfy_alive,
  "gen_batch_alive": $genbatch_alive,
  "restart_count": $restart_count,
  "last_log_growth_sec_ago": $(( $(date +%s) - last_log_growth_time )),
  "last_mtime_change_sec_ago": $(( $(date +%s) - last_mtime_change_time )),
  "last_stderr_change_sec_ago": $(( $(date +%s) - last_stderr_change_time ))
}
EOF
}

log "=== Watchdog V2 started (log-size signal, target=$TARGET_COUNT, stuck=${STUCK_THRESHOLD_SEC}s) ==="

while true; do
  now=$(date +%s)
  count=$(get_image_count)
  log_size=$(get_log_size)
  newest_mtime=$(get_newest_mtime)
  newest_mtime=${newest_mtime:-0}

  # Primary signal: log file size growth
  if [ "$log_size" -gt "$last_log_size" ]; then
    last_log_size=$log_size
    last_log_growth_time=$now
  fi
  # Secondary signal: newest-file mtime advancement (catches overwrites)
  if [ "$newest_mtime" -gt "$last_newest_mtime" ]; then
    last_newest_mtime=$newest_mtime
    last_mtime_change_time=$now
  fi
  # Tertiary signal: ComfyUI stderr changes (progress bars)
  stderr_tail=$(tail -c 500 "$STDERR" 2>/dev/null | md5sum | cut -d' ' -f1)
  if [ "$stderr_tail" != "$last_stderr_tail_hash" ]; then
    last_stderr_tail_hash=$stderr_tail
    last_stderr_change_time=$now
  fi

  comfy_alive=false
  if check_comfy_alive; then comfy_alive=true; fi
  genbatch_pids=$(get_genbatch_pids)
  genbatch_alive=false
  if [ -n "$genbatch_pids" ]; then genbatch_alive=true; fi

  log "tick: imgs=$count log_size=$log_size comfy=$comfy_alive genbatch=$genbatch_alive  log_idle=$((now-last_log_growth_time))s mtime_idle=$((now-last_mtime_change_time))s stderr_idle=$((now-last_stderr_change_time))s"
  write_status "$count" "$log_size" "$comfy_alive" "$genbatch_alive"

  # --- Completion check ---
  if grep -q "^Done\. Generated" "$LOG" 2>/dev/null; then
    log "=== DONE: gen-batch log reports completion ==="
    echo "{\"image_count\": $count, \"elapsed_sec\": $((now - START_TIME)), \"restart_count\": $restart_count, \"via\": \"log_done_line\"}" > "$DONE_FLAG"
    break
  fi
  if [ "$count" -ge "$TARGET_COUNT" ] && [ "$genbatch_alive" = "false" ]; then
    log "=== DONE: $count images generated and gen-batch exited ==="
    echo "{\"image_count\": $count, \"elapsed_sec\": $((now - START_TIME)), \"restart_count\": $restart_count, \"via\": \"count_threshold\"}" > "$DONE_FLAG"
    break
  fi

  # --- Stuck detection: ANY single signal idle for threshold ---
  # log_idle is the most reliable signal: gen-batch.log grows every "saved X.png" line,
  # which should happen every ~10s when healthy. If no growth for 5 min -> truly stuck.
  stuck_reason=""
  log_idle=$((now - last_log_growth_time))
  mtime_idle=$((now - last_mtime_change_time))
  stderr_idle=$((now - last_stderr_change_time))

  if [ "$log_idle" -gt "$STUCK_THRESHOLD_SEC" ]; then
    stuck_reason="log file hasn't grown in ${log_idle}s (threshold ${STUCK_THRESHOLD_SEC}s)"
  elif [ "$comfy_alive" = "false" ]; then
    stuck_reason="ComfyUI unreachable"
  elif [ "$genbatch_alive" = "false" ] && ! grep -q "^Done\. Generated" "$LOG" 2>/dev/null; then
    stuck_reason="gen-batch process gone (not done)"
  elif [ "$mtime_idle" -gt $((STUCK_THRESHOLD_SEC + 120)) ] && [ "$stderr_idle" -gt $((STUCK_THRESHOLD_SEC - 60)) ]; then
    # Backup: no file mtime advancement AND stderr static for a long time
    stuck_reason="file+stderr both long-idle: mtime=${mtime_idle}s stderr=${stderr_idle}s"
  fi

  if [ -n "$stuck_reason" ]; then
    log "STUCK: $stuck_reason"
    if [ "$restart_count" -ge "$MAX_RESTARTS" ]; then
      log "=== ABORT: max restarts ($MAX_RESTARTS) exceeded ==="
      echo "{\"aborted\": true, \"reason\": \"max_restarts_exceeded\", \"image_count\": $count, \"last_stuck\": \"$stuck_reason\"}" > "$DONE_FLAG"
      break
    fi
    recover
  fi

  sleep "$POLL_INTERVAL"
done

log "=== Watchdog exit ==="
