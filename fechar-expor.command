#!/bin/zsh
cd "$(dirname "$0")"
if [ -f data/tunnel.pid ]; then
  kill "$(cat data/tunnel.pid)" 2>/dev/null || true
  rm -f data/tunnel.pid
fi
pkill -f 'lt --port 4175' 2>/dev/null || true
echo "Link público encerrado. O Pulso continua disponível só neste Mac."
sleep 1
