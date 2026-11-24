#!/bin/sh
set -e
DATA="${PULSO_DATA_DIR:-/data}"
mkdir -p "$DATA"
chown -R node:node "$DATA"
exec su-exec node "$@"
