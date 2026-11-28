# Pulso · plataforma de estudos para o ENARE

**Produção:** https://pulso-6cr9.onrender.com

Persistência em Turso (libSQL). Render Free pode levar alguns segundos no primeiro acesso após inatividade.

Plataforma com login individual para organizar a preparação ao ENARE com foco no que mais cai. Inclui:

- **Trilha em níveis** (como um curso): 5 níveis ligados ao semestre da faculdade, 7 matérias e 90 temas. O onboarding pergunta o período e monta a trilha personalizada.
- **Cada tema dividido em páginas próprias:** Conteúdo, Flashcards, Questões, Anotações e Revisão. A página de conteúdo não carrega o baralho, as questões e a revisão ao mesmo tempo.
- **Mapa do edital** com 7 áreas ENAMED, 90 subtópicos agrupados por especialidade e orientação de estudo por tema.
- **Guia de estudo + checklist de 7 etapas por subtópico**, com sequência, perguntas-guia, pegadinhas, fontes e baralho de flashcards do tema.
- **Minha conta** concentra perfil, progresso, metas, rotina do planner, ajustes, backup e suporte. O planner apenas exibe o cronograma.
- **Navegação superior:** Início, Conteúdos, Treino, Flashcards, Mapas mentais, Ferramentas de IA e Minha conta. A aba Conteúdos lista todos os temas do nível atual, agrupados por área e especialidade.
- **Importação por arquivo:** PDF/TXT de questões na aba Treino e Anki/CSV/TXT/JSON de flashcards na aba Flashcards.
- **Planner em ciclos** de 8 semanas: codificação de um tema, recuperação no próximo dia de estudo e revisões espaçadas nos intervalos seguintes, com simulados intercalados.
- **Banco com 300 questões oficiais** do ENARE 2022, 2023 e 2024, com gabarito oficial, comentário e fonte.
- **Importador** de provas por URL/PDF ou texto colado, com extração de gabarito e deduplicação.
- **Geração de questões por IA** (opcional, via Venice).
- **Simulado cronometrado**, caderno de erros, anotações, revisão espaçada e relatórios.
- **Flashcards** com página própria na navegação principal.
- Backup em JSON e persistência local ou Turso.

### Níveis da trilha

| Nível | Semestres | Foco |
|---|---|---|
| 1 · Fundamentos | 1º e 2º | SUS, APS, epidemiologia, ética, puericultura e cuidado inicial |
| 2 · Clínica essencial | 3º e 4º | Cardiologia, endocrinologia, infectologia, pneumologia, pré-natal e saúde mental |
| 3 · Especialidades | 5º e 6º | Nefrologia, neurologia, hematologia, reumatologia, pediatria e endocrinologia |
| 4 · Prática e urgências | 7º e 8º | Cirurgia, obstetrícia, urgências e plantão |
| 5 · Alta complexidade | 9º ao 12º | Oncologia, trauma grave, medicina fetal e reta final do internato |

### Como o estudo é estruturado

O app organiza cada tema em cinco etapas: **Ativar → Codificar → Recuperar → Revisar → Intercalar**. A estrutura é baseada em princípios com suporte científico, não em uma promessa de método único:

- **Prática de recuperação** (testing effect): tentar lembrar antes de reler.
- **Prática espaçada**: revisões adaptativas em intervalos crescentes.
- **Intercalação**: treinos e simulados misturando matérias.
- **Elaboração e autoexplicação**: perguntas-guia e justificativa da conduta.
- **Feedback corretivo**: comentário do erro e nova tentativa.
- **Metacognição**: confiança registrada comparada ao acerto real.
- **Carga cognitiva e prática deliberada**: níveis progressivos e foco nas lacunas.

Referências principais: Dunlosky et al. (2013), Roediger & Karpicke (2006), Cepeda et al. (2006), Rohrer & Taylor (2007), Chi et al. (1994), Hattie & Timperley (2007), Bjork et al. (2013) e Larsen et al. (2008).

## Ranking diário

Cada conta recebe um **ID público de 4 dígitos**. O placar diário é calculado no servidor a partir das tentativas e da atividade salvas, sem confiar em um contador enviado pelo navegador:

- +10 por acerto (até 300/dia);
- +60 meta de questões, +40 meta de tempo e +30 meta de checklist;
- +50 ao fechar as três metas;
- +100 ao responder um questionário com 10+ questões e 100% de acerto.

O ranking zera diariamente. Em caso de empate, vale a maior precisão do dia. A tela **Ranking** mostra sua posição, metas e o placar dos participantes.

## Login e contas

O login é próprio do app e usa sessão assinada em cookie (`pulso_session`). Configure uma ou mais contas:

```bash
APP_USER=pulso
APP_PASSWORD=senha-longa
# ou várias contas: APP_USERS="pulso:senha1,maria:senha2"
SESSION_SECRET=$(openssl rand -hex 32)
```

No primeiro acesso, o onboarding pede nome, semestre da faculdade, data da prova e rotina. O semestre define o nível inicial da trilha e a prioridade do planner. Contas antigas são migradas e passam pelo onboarding uma vez, sem perder o progresso.

```bash
# gerar uma senha e um segredo de sessão
openssl rand -base64 18
openssl rand -hex 32
```

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

Abra `http://localhost:5173`. O servidor de desenvolvimento usa `.env` ou variáveis de ambiente; sem `APP_PASSWORD`, o login fica desativado e o app abre direto.

Produção:

```bash
npm run build
APP_USER=pulso APP_PASSWORD=senha-longa SESSION_SECRET=$(openssl rand -hex 32) npm start
# http://127.0.0.1:4175
```

## Hospedagem

Sim, dá para publicar — desde que com **disco persistente** e `APP_PASSWORD`. A arquitetura publicada usa **Render Free + Turso Free** (banco libSQL). Guia e alternativas em [`DEPLOY.md`](./DEPLOY.md).

## Dados e backup

- Progresso em `data/user:<conta>.json` (ou no Turso), banco importado em `data/questions.json`.
- Exporte em **Ajustes → Exportar backup**. Cópias manuais em `data/backups/`.
- `PULSO_DATA_DIR` muda a pasta de dados local.

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
server/      API, autenticação, persistência, parser de provas e CLI
seed/        currículo e banco inicial de questões oficiais
src/         interface React
src/trilha.js  mapa dos 90 temas nos 5 níveis do curso
data/        dados do usuário (gerado, não versionado)
```
