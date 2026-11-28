async function request(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Falha na requisição (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  session: () => request('/api/session'),
  login: (username, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/logout', { method: 'POST', body: '{}' }),
  bootstrap: () => request('/api/bootstrap'),
  ranking: () => request('/api/ranking'),
  questions: () => request('/api/questions'),
  reportQuestion: (id, payload) => request(`/api/questions/${id}/report`, { method: 'POST', body: JSON.stringify(payload) }),
  saveState: (state) => request('/api/state', { method: 'PUT', body: JSON.stringify(state) }),
  generateQuestion: (topicId) => request('/api/ai/question', { method: 'POST', body: JSON.stringify({ topicId }) }),
  importQuestions: (payload) => request('/api/import/questions', { method: 'POST', body: JSON.stringify(payload) }),
  importText: (payload) => request('/api/import/text', { method: 'POST', body: JSON.stringify(payload) }),
  importFile: (payload) => request('/api/import/file', { method: 'POST', body: JSON.stringify(payload) }),
  importSource: (id) => request(`/api/import/source/${id}`, { method: 'POST', body: '{}' }),
  backup: () => request('/api/backup', { method: 'POST', body: '{}' }),
  importBackup: (payload) => request('/api/import/backup', { method: 'POST', body: JSON.stringify(payload) }),
  reset: () => request('/api/reset', { method: 'POST', body: '{}' }),
  battleCreate: (payload) => request('/api/battles', { method: 'POST', body: JSON.stringify(payload) }),
  battleGet: (id) => request(`/api/battles/${id}`),
  battleByCode: (code) => request(`/api/battles/code/${code}`),
  battleJoin: (id, name) => request(`/api/battles/${id}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  battleBot: (id) => request(`/api/battles/${id}/bot`, { method: 'POST', body: '{}' }),
  battleStart: (id) => request(`/api/battles/${id}/start`, { method: 'POST', body: '{}' }),
  battleAnswer: (id, payload) => request(`/api/battles/${id}/answer`, { method: 'POST', body: JSON.stringify(payload) }),
  battleFinish: (id, playerId) => request(`/api/battles/${id}/finish`, { method: 'POST', body: JSON.stringify({ playerId }) }),
  arenaList: () => request('/api/arena'),
  arenaJoin: (id, name) => request(`/api/arena/${id}/join`, { method: 'POST', body: JSON.stringify({ name }) }),
  arenaSubmit: (id, playerId, answers) => request(`/api/arena/${id}/submit`, { method: 'POST', body: JSON.stringify({ playerId, answers }) }),
  radarList: () => request('/api/radar'),
  radarAdd: (payload) => request('/api/radar', { method: 'POST', body: JSON.stringify(payload) }),
  radarDelete: (id) => request(`/api/radar/${id}`, { method: 'DELETE' }),
  radarCheck: () => request('/api/radar/check', { method: 'POST', body: '{}' }),
  importAnki: (file) => request('/api/import/anki', { method: 'POST', body: JSON.stringify({ file }) }),
  publicDecks: () => request('/api/flashcards/public'),
  publicDeck: (id) => request(`/api/flashcards/public/${id}`),
  publishPublicDeck: (payload) => request('/api/flashcards/public', { method: 'POST', body: JSON.stringify(payload) }),
  deletePublicDeck: (id) => request(`/api/flashcards/public/${id}`, { method: 'DELETE' }),
  importPublicDeck: (id) => request(`/api/flashcards/public/${id}/import`, { method: 'POST', body: '{}' }),
};

export async function downloadBackup() {
  const res = await fetch('/api/export');
  if (!res.ok) throw new Error('Não foi possível exportar agora.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pulso-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
