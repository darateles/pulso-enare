export const MODULES = [
  { id: 'focus', name: 'Pulso Focus', tag: 'Rotina', icon: 'Timer', path: '/pulso/focus', desc: 'Pomodoro conectado às sessões do planner, com registro de foco e pausas.', color: '#0f6b5c' },
  { id: 'battle', name: 'Pulso Battle', tag: 'Social', icon: 'Swords', path: '/pulso/battle', desc: 'Duelos de questões assíncronos com código de sala e ranking ao vivo.', color: '#a84368' },
  { id: 'arena', name: 'Pulso Arena', tag: 'Social', icon: 'Trophy', path: '/pulso/arena', desc: 'Simulados coletivos semanais com ranking e janela de participação.', color: '#c45a2b' },
  { id: 'radar', name: 'Pulso Radar', tag: 'Editais', icon: 'Radar', path: '/pulso/radar', desc: 'Monitor de editais, cronogramas e provas com alerta de mudança.', color: '#2c6b9e' },
  { id: 'guidelines', name: 'Pulso Guidelines', tag: 'Clínica', icon: 'ScrollText', path: '/pulso/guidelines', desc: 'Atualizações de diretrizes e consensos filtradas por especialidade.', color: '#65762c' },
  { id: 'atlas', name: 'Pulso Atlas', tag: 'Clínica', icon: 'ScanEye', path: '/pulso/atlas', desc: 'Atlas visual de anatomia, histologia e patologia com correlação clínica.', color: '#8a5d2e' },
  { id: 'ecg', name: 'Pulso ECG', tag: 'Treino', icon: 'Activity', path: '/pulso/ecg', desc: 'Treinamento progressivo de ECG com traçados e explicações.', color: '#b4443b' },
  { id: 'farma', name: 'Pulso Farma', tag: 'Clínica', icon: 'Pill', path: '/pulso/farma', desc: 'Farmacologia por mecanismo, dose, efeitos e interações.', color: '#3f6f8f' },
  { id: 'research', name: 'Pulso Research', tag: 'Clínica', icon: 'FlaskConical', path: '/pulso/research', desc: 'Leitura crítica de artigos e epidemiologia aplicada.', color: '#6a5a92' },
  { id: 'notes', name: 'Pulso Notes', tag: 'Rotina', icon: 'NotebookPen', path: '/pulso/notes', desc: 'Caderno digital com tags, busca e vínculo aos subtópicos.', color: '#9a6227' },
  { id: 'blocks', name: 'Pulso Blocks', tag: 'Rotina', icon: 'Network', path: '/pulso/blocks', desc: 'Mapas mentais interativos para organizar fisiopatologia e conduta.', color: '#35785e' },
  { id: 'podcast', name: 'Pulso Podcast', tag: 'Clínica', icon: 'Headphones', path: '/pulso/podcast', desc: 'Revisões narradas por voz sintetizada, com transcrição e velocidade.', color: '#7d4b72' },
  { id: 'recall', name: 'Pulso Recall', tag: 'Treino', icon: 'MessageSquareQuote', path: '/pulso/recall', desc: 'Recordação ativa discursiva com resposta-modelo e autoavaliação.', color: '#176a58' },
  { id: 'mentoria', name: 'Pulso Mentoria', tag: 'Suporte', icon: 'Users', path: '/pulso/mentoria', desc: 'Relatório para mentor, check-ins e devolutivas organizadas.', color: '#8a4b3b' },
  { id: 'wrapped', name: 'Pulso Wrapped', tag: 'Rotina', icon: 'Sparkles', path: '/pulso/wrapped', desc: 'Retrospectiva mensal e anual pronta para compartilhar.', color: '#c27a1e' },
  { id: 'import', name: 'Pulso Import', tag: 'Treino', icon: 'FileUp', path: '/pulso/import', desc: 'Importação de flashcards do Anki, CSV, TXT e JSON.', color: '#496c94' },
  { id: 'connect', name: 'Pulso Connect', tag: 'Rotina', icon: 'CalendarPlus', path: '/pulso/connect', desc: 'Exporte o planner para Google Calendar via arquivo ICS.', color: '#2f7c7a' },
  { id: 'offline', name: 'Pulso Offline', tag: 'Rotina', icon: 'CloudOff', path: '/pulso/offline', desc: 'Estudo sem internet e sincronização automática ao voltar.', color: '#5d6a64' },
];

export const CATEGORIES = [
  { id: 'Rotina', label: 'Rotina e foco', desc: 'Ferramentas para sustentar execução.' },
  { id: 'Treino', label: 'Treino ativo', desc: 'Recuperação, simulados e repetição.' },
  { id: 'Clínica', label: 'Biblioteca clínica', desc: 'Conteúdo visual e atualização médica.' },
  { id: 'Social', label: 'Competição', desc: 'Estudo com outras pessoas.' },
  { id: 'Editais', label: 'Radar e editais', desc: 'Calendário e monitoramento.' },
  { id: 'Suporte', label: 'Suporte', desc: 'Mentoria e acompanhamento.' },
];
