#!/bin/bash
# Vexa Health Check Script
# Run via cron: */5 * * * * /opt/vexa/check-health.sh

LOG_FILE="/var/log/vexa-health.log"
ALERT_FILE="/tmp/vexa-alerts.txt"

# Email configuration (optional)
ALERT_EMAIL="${VEXA_ALERT_EMAIL:-}"
SEND_EMAIL=false

if [ -n "$ALERT_EMAIL" ]; then
    SEND_EMAIL=true
fi

# Function to log and alert
alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    echo "[$timestamp] [$level] $message" >> "$ALERT_FILE"
    
    if [ "$SEND_EMAIL" = true ] && [ "$level" != "INFO" ]; then
        echo "$message" | mail -s "Vexa Alert: $level" "$ALERT_EMAIL"
    fi
}

# Clear old alerts
> "$ALERT_FILE"

# Check 1: RAM availability
AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
USED_RAM=$(free -m | awk 'NR==2{print $3}')
TOTAL_RAM=$(free -m | awk 'NR==2{print $2}')
RAM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($USED_RAM/$TOTAL_RAM)*100}")

if [ "$AVAILABLE_RAM" -lt 1024 ]; then  # < 1 GB
    alert "CRITICAL" "Low RAM available: ${AVAILABLE_RAM}MB (${RAM_PERCENT}% used)"
elif [ "$AVAILABLE_RAM" -lt 2048 ]; then  # < 2 GB
    alert "WARNING" "RAM getting low: ${AVAILABLE_RAM}MB available"
else
    alert "INFO" "RAM OK: ${AVAILABLE_RAM}MB available (${RAM_PERCENT}% used)"
fi

# Check 2: Stopped containers
STOPPED=$(docker ps -a --filter "status=exited" --filter "name=vexa_simple" --format "{{.Names}}" | wc -l)
if [ "$STOPPED" -gt 0 ]; then
    STOPPED_NAMES=$(docker ps -a --filter "status=exited" --filter "name=vexa_simple" --format "{{.Names}}" | tr '\n' ', ')
    alert "CRITICAL" "$STOPPED containers stopped: $STOPPED_NAMES"
fi

# Check 3: Service health
SERVICES=("vexa_simple-postgres-1" "vexa_simple-redis-1" "vexa_simple-api-gateway-1" "vexa_simple-bot-manager-1" "vexa_simple-recording-storage-1")

for service in "${SERVICES[@]}"; do
    if ! docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        alert "CRITICAL" "Service not running: $service"
    fi
done

# Check 4: Disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    alert "CRITICAL" "Disk usage critical: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -gt 80 ]; then
    alert "WARNING" "Disk usage high: ${DISK_USAGE}%"
fi

# Check 5: Bot count
BOT_COUNT=$(docker ps --filter "name=vexa-bot-" --format "{{.Names}}" | wc -l)
if [ "$BOT_COUNT" -gt 12 ]; then
    alert "WARNING" "High bot count: $BOT_COUNT bots running (recommended max: 10)"
fi

# Check 6: Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$LOAD_AVG > 6.0" | bc -l) )); then
    alert "CRITICAL" "Load average very high: $LOAD_AVG"
elif (( $(echo "$LOAD_AVG > 4.0" | bc -l) )); then
    alert "WARNING" "Load average high: $LOAD_AVG"
fi

# Check 7: Recordings disk usage
REC_SIZE=$(docker exec vexa_simple-recording-storage-1 du -sm /recordings 2>/dev/null | awk '{print $1}' || echo "0")
if [ "$REC_SIZE" -gt 50000 ]; then  # > 50 GB
    alert "WARNING" "Recordings using ${REC_SIZE}MB (consider cleanup)"
fi

# Summary
ALERT_COUNT=$(grep -c "CRITICAL\|WARNING" "$ALERT_FILE" || echo "0")

if [ "$ALERT_COUNT" -eq 0 ]; then
    alert "INFO" "All health checks passed"
    exit 0
else
    echo ""
    echo "⚠️  $ALERT_COUNT alerts found:"
    cat "$ALERT_FILE"
    exit 1
fi
