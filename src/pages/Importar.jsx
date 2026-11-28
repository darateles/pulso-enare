import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, CheckCircle2, ClipboardPaste, Download, ExternalLink, FileUp, Info,
  Link2, RefreshCw, ShieldCheck, Sparkles, Wand2,
} from 'lucide-react';
import { api } from '../api.js';
import { Button, Card, Chip, Field, InlineError, PageHead, Segmented, Spinner } from '../components/ui.jsx';
import { useStore } from '../store.jsx';

const TABS = [
  { value: 'arquivo', label: 'Arquivo' },
  { value: 'oficiais', label: 'Fontes oficiais' },
  { value: 'url', label: 'Por URL' },
  { value: 'colar', label: 'Colar texto' },
  { value: 'ia', label: 'Gerar com IA' },
];

export default function Importar() {
  const { sources, curriculum, questions, refreshData, toast } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('arquivo');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [urlForm, setUrlForm] = useState({ url: '', answerUrl: '', answerType: '1', areaId: '', institution: '', year: '' });
  const [paste, setPaste] = useState({ text: '', answerText: '', areaId: '', institution: '' });
  const [ai, setAi] = useState({ area: 'clinica', topicId: '' });
  const [generated, setGenerated] = useState(null);
  const [file, setFile] = useState(null);
  const [fileForm, setFileForm] = useState({ areaId: '', institution: '', year: '', answerText: '' });
  const fileRef = useRef(null);

  const runSource = async (id) => {
    setBusy(id);
    setError('');
    try {
      const res = await api.importSource(id);
      await refreshData();
      toast(`${res.found} questões lidas, ${res.added} novas adicionadas.`);
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runFile = async () => {
    if (!file) { setError('Selecione um arquivo PDF ou TXT.'); return; }
    setBusy('file');
    setError('');
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.importFile({
        name: file.name,
        data,
        ...fileForm,
        areaId: fileForm.areaId || undefined,
      });
      await refreshData();
      toast(`${res.found} questões lidas, ${res.added} novas adicionadas.`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runUrl = async () => {
    if (!urlForm.url) { setError('Informe a URL da prova.'); return; }
    setBusy('url');
    setError('');
    try {
      const res = await api.importQuestions({ ...urlForm, areaId: urlForm.areaId || undefined });
      await refreshData();
      toast(`${res.found} questões lidas, ${res.added} novas adicionadas.`);
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runPaste = async () => {
    if (!paste.text.trim()) { setError('Cole o texto das questões.'); return; }
    setBusy('paste');
    setError('');
    try {
      const res = await api.importText({ ...paste, areaId: paste.areaId || undefined });
      await refreshData();
      toast(`${res.found} questões lidas, ${res.added} novas adicionadas.`);
      setPaste({ text: '', answerText: '', areaId: '', institution: '' });
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runAi = async () => {
    if (!ai.topicId) { setError('Escolha um subtópico.'); return; }
    setBusy('ia');
    setError('');
    setGenerated(null);
    try {
      const q = await api.generateQuestion(ai.topicId);
      await refreshData();
      setGenerated(q);
      toast('Questão gerada e adicionada ao banco. Revise o comentário.');
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const topics = curriculum.areas.find((a) => a.id === ai.area)?.topics || [];

  return (
    <>
      <button className="back-link" onClick={() => navigate('/questoes')}><ArrowLeft size={15} /> Banco de questões</button>
      <PageHead
        eyebrow="Importar"
        title="Importar questões"
        subtitle="Prova oficial, URL pública ou texto. O importador reconhece enunciados, alternativas A–E e gabarito."
      />

      <Card className="import-tabs"><Segmented options={TABS} value={tab} onChange={setTab} label="Forma de importação" /></Card>
      <InlineError>{error}</InlineError>

      {tab === 'arquivo' && (
        <Card className="import-form">
          <div className="import-form-note"><FileUp size={18} /><p>PDF com texto selecionável ou TXT. O arquivo é lido no servidor e não fica armazenado.</p></div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="file-picker">
            <Button onClick={() => fileRef.current?.click()} icon={FileUp}>Selecionar arquivo</Button>
            <span>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Nenhum arquivo selecionado'}</span>
          </div>
          <div className="form-3">
            <Field label="Área" hint="Obrigatória se o arquivo não tiver o cabeçalho da área."><select value={fileForm.areaId} onChange={(e) => setFileForm({ ...fileForm, areaId: e.target.value })}><option value="">Detectar pelo cabeçalho</option>{curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Instituição"><input placeholder="Ex.: ENARE / FGV" value={fileForm.institution} onChange={(e) => setFileForm({ ...fileForm, institution: e.target.value })} /></Field>
            <Field label="Ano"><input type="number" placeholder="2024" value={fileForm.year} onChange={(e) => setFileForm({ ...fileForm, year: e.target.value })} /></Field>
          </div>
          <Field label="Gabarito (opcional)" hint="Cole o gabarito ou envie depois em “Colar texto”.">
            <textarea rows={3} value={fileForm.answerText} onChange={(e) => setFileForm({ ...fileForm, answerText: e.target.value })} placeholder="1 C, 2 A, 3 E…" />
          </Field>
          <Button onClick={runFile} disabled={Boolean(busy)} icon={Download}>{busy === 'file' ? <><Spinner /> Lendo arquivo…</> : 'Importar arquivo'}</Button>
          <p className="muted-note">Limite: 18 MB. PDFs escaneados sem texto não são reconhecidos.</p>
        </Card>
      )}

      {tab === 'oficiais' && (
        <div className="source-grid">
          <div className="source-note"><ShieldCheck size={18} /><div><strong>Fontes públicas oficiais</strong><p>Cadernos de prova e gabaritos do ENARE/EBSERH. O banco já vem com 300 questões de 2022 a 2024; reimportar não duplica.</p></div></div>
          {sources.map((s) => (
            <Card key={s.id} className="source-card">
              <div className="source-head">
                <Chip tone="soft">{s.institution}</Chip>
                <span>{s.year}</span>
              </div>
              <h3>{s.label}</h3>
              <p>{s.note}</p>
              <div className="source-actions">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-link">Abrir original <ExternalLink size={13} /></a>
                {s.url.includes('.pdf') ? (
                  <Button size="sm" onClick={() => runSource(s.id)} disabled={Boolean(busy)} icon={busy === s.id ? undefined : Download}>
                    {busy === s.id ? <><Spinner /> Importando…</> : 'Importar'}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
          <Card className="source-card add-source">
            <FileUp size={22} />
            <h3>Tem outra fonte?</h3>
            <p>Use a aba “Por URL” para cadernos de outras bancas ou “Colar texto” para um material avulso.</p>
          </Card>
        </div>
      )}

      {tab === 'url' && (
        <Card className="import-form">
          <div className="import-form-note"><Link2 size={18} /><p>Funciona com PDF de texto selecionável ou página HTML. Se o gabarito estiver em arquivo separado, informe também a URL dele e o tipo de prova (1 a 4).</p></div>
          <Field label="URL do caderno de questões">
            <input placeholder="https://…/prova.pdf" value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} />
          </Field>
          <div className="form-2">
            <Field label="URL do gabarito (opcional)"><input placeholder="https://…/gabarito.pdf" value={urlForm.answerUrl} onChange={(e) => setUrlForm({ ...urlForm, answerUrl: e.target.value })} /></Field>
            <Field label="Tipo / cor da prova"><select value={urlForm.answerType} onChange={(e) => setUrlForm({ ...urlForm, answerType: e.target.value })}>{[1,2,3,4].map((n) => <option key={n} value={n}>Tipo {n}</option>)}</select></Field>
          </div>
          <div className="form-3">
            <Field label="Área (se não houver cabeçalhos)"><select value={urlForm.areaId} onChange={(e) => setUrlForm({ ...urlForm, areaId: e.target.value })}><option value="">Detectar automaticamente</option>{curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Instituição"><input placeholder="Ex.: ENARE / FGV" value={urlForm.institution} onChange={(e) => setUrlForm({ ...urlForm, institution: e.target.value })} /></Field>
            <Field label="Ano"><input type="number" placeholder="2024" value={urlForm.year} onChange={(e) => setUrlForm({ ...urlForm, year: e.target.value })} /></Field>
          </div>
          <Button onClick={runUrl} disabled={Boolean(busy)} icon={Download}>{busy === 'url' ? <><Spinner /> Lendo fonte…</> : 'Buscar e importar'}</Button>
        </Card>
      )}

      {tab === 'colar' && (
        <Card className="import-form">
          <div className="import-form-note"><ClipboardPaste size={18} /><p>Cole no formato: número + enunciado + alternativas (A) a (E). O gabarito pode vir como “1 C 2 A…” ou bloco de letras.</p></div>
          <div className="form-2">
            <Field label="Área"><select value={paste.areaId} onChange={(e) => setPaste({ ...paste, areaId: e.target.value })}><option value="">Detectar por cabeçalho</option>{curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Origem"><input placeholder="Ex.: prova da USP 2023" value={paste.institution} onChange={(e) => setPaste({ ...paste, institution: e.target.value })} /></Field>
          </div>
          <Field label="Texto das questões"><textarea rows={12} placeholder={`1\nPaciente de 45 anos…\n(A) …\n(B) …\n…`} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} /></Field>
          <Field label="Gabarito (opcional)" hint="Ex.: 1 C, 2 A, 3 E… ou apenas as letras na ordem."><textarea rows={3} value={paste.answerText} onChange={(e) => setPaste({ ...paste, answerText: e.target.value })} /></Field>
          <Button onClick={runPaste} disabled={Boolean(busy)} icon={Download}>{busy === 'paste' ? <><Spinner /> Processando…</> : 'Importar texto'}</Button>
        </Card>
      )}

      {tab === 'ia' && (
        <div className="ia-grid">
          <Card className="import-form">
            <div className="import-form-note"><Bot size={18} /><p>A IA cria uma questão inédita a partir do subtópico escolhido, com gabarito e comentário. Revise antes de confiar: questões geradas ganham a etiqueta <em>Gerada por IA</em>.</p></div>
            <Field label="Área"><select value={ai.area} onChange={(e) => setAi({ area: e.target.value, topicId: '' })}>{curriculum.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
            <Field label="Subtópico"><select value={ai.topicId} onChange={(e) => setAi({ ...ai, topicId: e.target.value })}><option value="">Escolha…</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
            <Button onClick={runAi} disabled={Boolean(busy)} icon={Wand2}>{busy === 'ia' ? <><Spinner /> Gerando…</> : 'Gerar questão'}</Button>
            <p className="muted-note">Usa a chave Venice configurada no servidor. Sem chave, a geração fica indisponível.</p>
          </Card>
          <Card className="ia-preview">
            <span className="eyebrow">Prévia</span>
            {!generated ? (
              <div className="ia-empty"><Sparkles size={26} /><h3>A questão aparecerá aqui</h3><p>Ela também é adicionada ao banco imediatamente.</p></div>
            ) : (
              <>
                <Chip tone="accent"><CheckCircle2 size={12} /> criada</Chip>
                <p className="q-stem">{generated.stem}</p>
                {generated.options.map((o) => <div key={o.key} className={`ia-option ${o.key === generated.answer ? 'correct' : ''}`}><b>{o.key}</b> {o.text}</div>)}
                <div className="q-explanation"><Info size={16} /><p>{generated.explanation}</p></div>
                <Button variant="soft" size="sm" onClick={() => navigate(`/questoes?q=${generated.id}`)}>Abrir questão</Button>
              </>
            )}
          </Card>
        </div>
      )}

      <Card className="import-footer">
        <RefreshCw size={17} />
        <p><strong>{questions.length} questões no banco.</strong> Questões importadas sem gabarito entram com a etiqueta “sem gabarito” e podem ser treinadas, mas não contam acerto. Duplicatas são descartadas pelo enunciado.</p>
      </Card>
    </>
  );
}
