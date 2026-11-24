# Pulso · plataforma de estudos para o ENARE

Plataforma local, sem login, para organizar a preparação ao ENARE com foco no que mais cai. Inclui:

- **Mapa do edital** com 5 áreas, 82 subtópicos e peso por incidência real em provas de residência.
- **Checklist de 7 etapas por subtópico** (teoria, domínio, resumo, flashcards, questões, revisão D+7 e D+30).
- **Planner** de 8 semanas que distribui carga por peso, confiança e erros recentes.
- **Banco com 300 questões oficiais** do ENARE 2022, 2023 e 2024, com gabarito oficial, comentário e fonte.
- **Importador** de provas por URL/PDF ou texto colado, com extração de gabarito e deduplicação.
- **Geração de questões por IA** (opcional, via Venice).
- **Simulado cronometrado**, caderno de erros, anotações, revisão espaçada e relatórios.
- Dados **local-first**: servidor escuta só em `127.0.0.1`; backup em JSON.

## Pulso Pro

Suíte de 18 módulos com camada comercial demonstrativa:

- **Foco e rotina:** Pomodoro conectado ao planner, notas Markdown, mapas mentais, Wrapped, calendário ICS e modo offline com fila de sincronização.
- **Treino:** Battle (salas multijogador assíncronas), Arena (simulados coletivos), ECG progressivo, Recall discursivo e importação de Anki.
- **Biblioteca:** Guidelines, Atlas de anatomia/histologia/patologia, Farma e Research.
- **Serviços:** Radar de editais com detecção de mudanças, Mentoria, Podcast por voz sintetizada e flashcards com repetição espaçada.

Battle e Arena usam endpoints locais em memória persistida em `data/social.json`; para competições pela internet, basta publicar o servidor. A importação Anki lê arquivos `.apkg` localmente (até 5.000 cartões), sem enviar o arquivo para terceiros. O Atlas usa imagens abertas do Wikimedia Commons com crédito e licença em cada ficha.

> A cobrança é simulada: o plano Pro fica liberado na demonstração.

> Material de estudo independente. As provas pertencem às bancas (EBSERH/AOCP/FGV). Confira sempre a fonte oficial e as diretrizes atuais.

## Rodar

Requisitos: Node 22+ (testado no Node 26).

No macOS, dê dois cliques em `abrir.command`. Ele instala dependências, compila e abre o site. Para encerrar, use `parar.command`.

Ou pelo terminal:

```bash
cd enare
npm install
npm run dev
```

Abra `http://localhost:5173`.

Produção:

```bash
npm run build
npm start
# http://127.0.0.1:4175
```

## Hospedagem

Sim, dá para publicar — desde que com **disco persistente** e `APP_PASSWORD`. O guia para Railway, Render, Fly.io e VPS está em [`DEPLOY.md`](./DEPLOY.md). Railway/Render/Fly são recomendados; Vercel/Netlify não são ideais para esta arquitetura em arquivos.

## Dados e backup

- Progresso em `data/user.json`, banco importado em `data/questions.json`.
- Exporte em **Ajustes → Exportar backup**. Cópias automáticas manuais em `data/backups/`.
- `PRUMO_DATA_DIR` muda a pasta de dados.

## Importar

Na interface: **Questões → Importar**. Há fontes oficiais, importação por URL e colagem de texto.
A importação aceita PDF com texto selecionável, extrai alternativas A–E e, se a URL do gabarito for informada, cruza as respostas. Duplicatas pelo enunciado são descartadas.

CLI:

```bash
npm run import -- --url="https://.../prova.pdf" --answers="https://.../gabarito.pdf" --type=1 --ano=2024 --instituicao=FGV
```

## IA (opcional)

Defina no `.env` da pasta ou no `.env` do repositório pai:

```
VENICE_API_KEY=...
VENICE_MODEL=deepseek-v4-1-flash-uncensored
```

Sem a chave, o restante funciona normalmente.

## Estrutura

```
server/      API local, persistência, parser de provas e CLI
seed/        currículo e banco inicial de questões oficiais
src/         interface React
data/        dados do usuário (gerado, não versionado)
```
