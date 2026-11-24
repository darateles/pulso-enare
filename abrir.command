#!/bin/zsh
set -e
cd "$(dirname "$0")"
mkdir -p data
if [ ! -d node_modules ]; then
  echo "Instalando dependências…"
  npm install
fi
if [ ! -f dist/index.html ]; then
  npm run build
fi
if lsof -nP -iTCP:4175 -sTCP:LISTEN >/dev/null 2>&1; then
  open "http://127.0.0.1:4175"
  exit 0
fi
PORT=4175 NODE_ENV=production nohup node server/index.js > data/server.log 2>&1 &
echo $! > data/server.pid
sleep 2
open "http://127.0.0.1:4175"
echo "Pulso aberto em http://127.0.0.1:4175"
echo "Para encerrar, execute ./parar.command ou feche esta janela."
read -k 1 "?Pressione qualquer tecla para fechar…"
