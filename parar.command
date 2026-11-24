#!/bin/zsh
cd "$(dirname "$0")"
if [ -f data/server.pid ]; then
  kill "$(cat data/server.pid)" 2>/dev/null || true
  rm -f data/server.pid
fi
pkill -f "node server/index.js" 2>/dev/null || true
pkill -f "lt --port 4175" 2>/dev/null || true
rm -f data/tunnel.pid
echo "Pulso encerrado."
sleep 1
