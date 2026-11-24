# Deploy do Pulso

O Pulso é um app Node com **estado em arquivo**. Para hospedar, use um provedor com **disco persistente** e defina uma senha de acesso. Não use Vercel/Netlify como host principal sem trocar a persistência para banco.

## Antes de publicar

1. Escolha uma senha longa (`APP_PASSWORD`) e usuário (`APP_USER`).
2. Monte um volume persistente em `/data`.
3. Configure `PULSO_DATA_DIR=/data`.
4. Configure `HOST=0.0.0.0` e mantenha `PORT` do provedor.
5. Faça o primeiro acesso, conclua o onboarding e exporte um backup em Ajustes.

> Importante: a versão atual é **single-user**. Todas as pessoas que tiverem a senha veem o mesmo progresso. Para vender para vários alunos, o próximo passo é adicionar autenticação individual e banco (Postgres/Supabase).

## Arquitetura recomendada (grátis, 24/7)

- App: Render Free (Docker)
- Dados: Turso Free (libSQL)

O Render dorme após 15 min de inatividade e acorda na primeira visita. Os dados continuam no Turso. Configure `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` no serviço.

## Railway

1. Crie um projeto e envie a pasta `enare/` para um repositório GitHub, ou use `railway up`.
2. Em **Variables**, defina:
   - `APP_PASSWORD` (forte)
   - `APP_USER=pulso`
   - `PULSO_DATA_DIR=/data`
   - `HOST=0.0.0.0`
   - `TRUST_PROXY=1`
3. Em **Volumes**, adicione um volume montado em `/data`.
4. O `railway.json` já configura o Dockerfile e o healthcheck.
5. Gere o domínio público em **Settings → Networking**.

## Render

O `render.yaml` já descreve o serviço com disco de 1 GB. O plano `starter` é necessário para disco persistente.

1. Suba o repositório no GitHub.
2. Em Render, escolha **New → Blueprint** e aponte para o repositório.
3. Confirme o `APP_PASSWORD` gerado e copie usuário `pulso`.
4. Após o deploy, acesse a URL HTTPS.

## Fly.io

```bash
cd enare
fly launch --no-deploy
fly volumes create pulso_data --size 1
fly secrets set APP_PASSWORD="senha-longa" APP_USER=pulso
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
# edite APP_USER e APP_PASSWORD
docker compose up -d --build
```

Coloque Caddy/Nginx na frente para TLS. Alternativa: Cloudflare Tunnel, sem abrir porta.

## Variáveis

| Variável | Uso |
|---|---|
| `APP_PASSWORD` | Obrigatória em produção; ativa Basic Auth |
| `APP_USER` | Usuário do Basic Auth (padrão `pulso`) |
| `PULSO_DATA_DIR` | Pasta persistente (use `/data`) |
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
- Basic Auth é uma porta de entrada, não um sistema de contas. Compartilhar senha significa compartilhar dados.
- Upload de Anki é processado no servidor; o limite atual é 30 MB.
