# Deploy do Pulso

O Pulso é um app Node com autenticação por cookie de sessão. Para hospedar com segurança, use **Turso** (recomendado) ou um volume persistente, e defina senha + segredo de sessão. Não use Vercel/Netlify como host principal sem trocar a persistência.

## Antes de publicar

1. Escolha uma senha longa (`APP_PASSWORD`) e usuário (`APP_USER`). Para várias contas, use `APP_USERS="pulso:senha1,maria:senha2"`.
2. Gere `SESSION_SECRET=$(openssl rand -hex 32)`. Sem ele, o servidor deriva o segredo da senha, mas o explícito é recomendado.
3. Configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` (recomendado) ou monte um volume em `/data` com `PULSO_DATA_DIR=/data`.
4. Configure `HOST=0.0.0.0` e mantenha `PORT` do provedor.
5. Faça o primeiro acesso, informe o semestre no onboarding e exporte um backup em Ajustes.

> Cada conta tem seu próprio `user:<conta>`, com trilha, progresso e plano separados. O banco de questões e os dados sociais (Battle/Arena) são compartilhados.

## Arquitetura recomendada (grátis, 24/7)

- App: Render Free (Docker)
- Dados: Turso Free (libSQL)

O Render dorme após 15 min de inatividade e acorda na primeira visita. Os dados continuam no Turso. Configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` no serviço. Sem Turso, o plano Free não tem disco persistente e os dados locais somem a cada deploy/restart.

## Railway

1. Crie um projeto e envie a pasta `enare/` para um repositório GitHub, ou use `railway up`.
2. Em **Variables**, defina:
   - `APP_PASSWORD` (forte)
   - `APP_USER=pulso`
   - `SESSION_SECRET` (forte, `openssl rand -hex 32`)
   - `PULSO_DATA_DIR=/data`
   - `HOST=0.0.0.0`
   - `TRUST_PROXY=1`
3. Em **Volumes**, adicione um volume montado em `/data`.
4. O `railway.json` já configura o Dockerfile e o healthcheck.
5. Gere o domínio público em **Settings → Networking**.

## Render

O `render.yaml` descreve o serviço no plano **free**, com `APP_PASSWORD` e `SESSION_SECRET` gerados automaticamente, sem disco. A persistência recomendada é o **Turso** (variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`).

1. Suba o repositório no GitHub.
2. Em Render, escolha **New → Blueprint** e aponte para o repositório.
3. Confirme `APP_PASSWORD` e `SESSION_SECRET` gerados; copie o usuário `pulso`.
4. Após o deploy, acesse a URL HTTPS e conclua o onboarding.
5. Se quiser disco local em vez de Turso, troque para um plano pago e adicione um disco em `/data`.

## Fly.io

```bash
cd enare
fly launch --no-deploy
fly volumes create pulso_data --size 1
fly secrets set APP_PASSWORD="senha-longa" APP_USER=pulso SESSION_SECRET="$(openssl rand -hex 32)"
fly deploy
```

Garanta no `fly.toml`:

```toml
[env]
  HOST = "0.0.0.0"
  PORT = "4175"
  PULSO_DATA_DIR = "/data"

[[mounts]]
  source = "pulso_data"
  destination = "/data"
```

## VPS com Docker

```bash
cd enare
cp .env.production.example .env
# edite APP_USER, APP_PASSWORD e SESSION_SECRET
docker compose up -d --build
```

Coloque Caddy/Nginx na frente para TLS. Alternativa: Cloudflare Tunnel, sem abrir porta.

## Variáveis

| Variável | Uso |
|---|---|
| `APP_PASSWORD` | Obrigatória em produção; senha da conta única |
| `APP_USER` | Usuário da conta única (padrão `pulso`) |
| `APP_USERS` | Várias contas: `usuario1:senha1,usuario2:senha2` |
| `SESSION_SECRET` | Assina o cookie de sessão; use `openssl rand -hex 32` |
| `PULSO_DATA_DIR` | Pasta persistente local (use `/data` com volume) |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Banco libSQL persistente (recomendado no Render Free) |
| `HOST` / `PORT` | Bind do servidor |
| `TRUST_PROXY` | `1` atrás de proxy/HTTPS |
| `VENICE_API_KEY` | Opcional, geração de questões por IA |

## Backup e atualização

- Baixe backup JSON periodicamente em **Ajustes → Exportar backup**.
- O volume também pode ser snapshotted pelo provedor.
- Para atualizar, faça deploy da nova versão; o volume mantém os dados.
- Nunca faça deploy com `data/` do repositório sobrescrevendo o volume.

## Limitações de hospedagem

- Batalhas e Arena rodam na memória do servidor + `data/social.json`; em múltiplas réplicas falta sincronização (Redis seria o próximo passo).
- O login usa cookie assinado, não OAuth. Quem tiver a senha da conta acessa aquele progresso; para várias pessoas, use `APP_USERS`.
- Upload de Anki é processado no servidor; o limite atual é 30 MB.
