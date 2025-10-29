#!/bin/bash
# Vexa System Monitor
# Usage: ./monitor.sh
# Press Ctrl+C to stop

while true; do
    clear
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         VEXA RECORDING SYSTEM - MONITORING                ║"
    echo "║                 $(date '+%Y-%m-%d %H:%M:%S')                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # System Resources
    echo "┌─ SYSTEM RESOURCES ─────────────────────────────────────────┐"
    free -h | grep -E "Mem:|Swap:" | awk '{printf "│ %-12s %8s %8s %8s %8s %8s │\n", $1, $2, $3, $4, $5, $6}'
    echo "│                                                            │"
    uptime | awk -F',' '{printf "│ Uptime: %-48s │\n", $1}' | sed 's/up //'
    uptime | awk -F'load average:' '{printf "│ Load Avg: %-46s │\n", $2}'
    echo "└────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Docker Services
    echo "┌─ DOCKER SERVICES ──────────────────────────────────────────┐"
    docker ps --filter "name=vexa_simple" --format "│ {{.Names}} │ {{.Status}} │" | head -6
    echo "└────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Active Bots
    BOT_COUNT=$(docker ps --filter "name=vexa-bot-" --format "{{.Names}}" | wc -l)
    echo "┌─ ACTIVE BOTS ──────────────────────────────────────────────┐"
    echo "│ Total: $BOT_COUNT bots running                                      │"
    if [ "$BOT_COUNT" -gt 0 ]; then
        echo "│                                                            │"
        docker ps --filter "name=vexa-bot-" --format "│ {{.Names}} │ {{.Status}} │" | head -5
        if [ "$BOT_COUNT" -gt 5 ]; then
            echo "│ ... and $(($BOT_COUNT - 5)) more                                           │"
        fi
    fi
    echo "└────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Resource Usage
    echo "┌─ RESOURCE USAGE ───────────────────────────────────────────┐"
    echo "│ Container              Memory          CPU                 │"
    echo "├────────────────────────────────────────────────────────────┤"
    docker stats --no-stream --format "│ {{.Name}} │ {{.MemUsage}} │ {{.CPUPerc}} │" | grep vexa | head -8
    echo "└────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Recordings
    echo "┌─ RECORDINGS ───────────────────────────────────────────────┐"
    REC_COUNT=$(docker exec vexa_simple-recording-storage-1 find /recordings -name "*.webm" 2>/dev/null | wc -l || echo "0")
    REC_SIZE=$(docker exec vexa_simple-recording-storage-1 du -sh /recordings 2>/dev/null | awk '{print $1}' || echo "N/A")
    echo "│ Total recordings: $REC_COUNT                                       │"
    echo "│ Disk usage: $REC_SIZE                                            │"
    echo "│                                                            │"
    echo "│ Latest recordings:                                         │"
    docker exec vexa_simple-recording-storage-1 ls -lht /recordings 2>/dev/null | grep ".webm" | head -3 | awk '{printf "│ %s %s %s                                  │\n", $9, $5, $6}' || echo "│ No recordings yet                                          │"
    echo "└────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Alerts
    USED_RAM_MB=$(free -m | awk 'NR==2{print $3}')
    AVAILABLE_RAM_MB=$(free -m | awk 'NR==2{print $7}')
    
    if [ "$USED_RAM_MB" -gt 12288 ]; then  # > 12 GB
        echo "⚠️  WARNING: High RAM usage (${USED_RAM_MB}MB)"
    fi
    
    if [ "$AVAILABLE_RAM_MB" -lt 2048 ]; then  # < 2 GB
        echo "🔴 CRITICAL: Low RAM available (${AVAILABLE_RAM_MB}MB)"
    fi
    
    if [ "$BOT_COUNT" -gt 10 ]; then
        echo "⚠️  WARNING: More than 10 bots running ($BOT_COUNT)"
    fi
    
    echo ""
    echo "Press Ctrl+C to stop monitoring | Refresh: 5s"
    
    sleep 5
done
