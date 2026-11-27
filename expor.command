#!/bin/zsh
set -e
cd "$(dirname "$0")"
mkdir -p data

if [ ! -f data/acesso.txt ] || ! grep -q '^senha:' data/acesso.txt; then
  PASS=$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-18)
  printf 'usuario: pulso\nsenha: %s\n' "$PASS" > data/acesso.txt
else
  PASS=$(awk -F': ' '/^senha:/{print $2}' data/acesso.txt)
fi

if [ ! -f data/session.secret ]; then
  openssl rand -hex 32 > data/session.secret
  chmod 600 data/session.secret
fi
SECRET=$(cat data/session.secret)

if ! lsof -nP -iTCP:4175 -sTCP:LISTEN >/dev/null 2>&1; then
  PORT=4175 HOST=127.0.0.1 APP_PASSWORD="$PASS" SESSION_SECRET="$SECRET" NODE_ENV=production nohup node server/index.js >> data/server.log 2>&1 &
  echo $! > data/server.pid
  sleep 2
fi

if [ -f data/tunnel.pid ]; then
  kill "$(cat data/tunnel.pid)" 2>/dev/null || true
fi
pkill -f 'lt --port 4175' 2>/dev/null || true
sleep 1

if ! command -v lt >/dev/null 2>&1; then npm install -g localtunnel; fi
nohup lt --port 4175 --subdomain pulso-dara > data/tunnel.log 2>&1 &
echo $! > data/tunnel.pid

URL=""
for i in {1..15}; do
  URL=$(grep -oE 'https://[a-z0-9-]+\.loca\.lt' data/tunnel.log | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Não foi possível abrir o túnel. Veja data/tunnel.log"
  read -k 1 "?Pressione uma tecla…"
  exit 1
fi

IP=$(curl -s --max-time 8 https://api.ipify.org || echo 'veja no site')
cat > data/acesso.txt <<EOF
URL pública: $URL
usuario: pulso
senha: $PASS
IP de liberação do túnel: $IP
EOF
printf '%s' "$URL" | pbcopy

echo ""
echo "PULSO PUBLICADO (enquanto o Mac estiver ligado)"
echo ""
echo "Link (copiado): $URL"
echo "Tela de aviso do túnel — digite este IP: $IP"
echo "Usuário: pulso"
echo "Senha: $PASS"
echo ""
echo "O IP muda se você trocar de rede. A senha fica em data/acesso.txt."
open "http://127.0.0.1:4175"
read -k 1 "?Pressione uma tecla para fechar esta janela (o túnel continua ativo)…"
