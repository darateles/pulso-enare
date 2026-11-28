import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Check, Download, GitBranch,
  GripVertical, Italic, Network, Pencil, Plus, Printer, Save, Trash2, X,
} from 'lucide-react';
import blocks from '../../../seed/blocks.json';
import { Button, Card, Chip, Empty, Field, Modal, PageHead } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

const BG_COLORS = ['#ffffff', '#e3f2ec', '#dbeafe', '#f7e2df', '#f8ecd2', '#ede7f6', '#113e35', '#1d312c'];
const FONT_COLORS = ['#1d312c', '#174d40', '#2c6b9e', '#a84328', '#a84368', '#8a601d', '#ffffff'];
const NODE_DEFAULTS = { width: 160, height: 60, bg: '#ffffff', color: '#1d312c', fontSize: 12, bold: false, italic: false, align: 'left' };

const nodeWidth = (node) => Number(node?.width) || NODE_DEFAULTS.width;
const nodeHeight = (node) => Number(node?.height) || NODE_DEFAULTS.height;
const normalizeNode = (node) => ({ ...NODE_DEFAULTS, ...node });
const escapeXml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default function Blocks() {
  const { user, updateUser, toast } = useStore();
  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [connect, setConnect] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);
  const [formatOpen, setFormatOpen] = useState(null);
  const canvas = useRef(null);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!formatOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setFormatOpen(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [formatOpen]);

  const compactWidth = () => Math.max(300, Math.min((typeof window !== 'undefined' ? window.innerWidth : 860) - 32, 560));

  const reflow = (nodes) => {
    if (!compact || !nodes.length) return nodes;
    const width = compactWidth();
    const nodeW = Math.min(180, width - 24);
    return nodes.map((node, index) => ({
      ...node,
      x: Math.round((width - nodeW) / 2),
      y: 16 + index * 92,
      width: nodeW,
      height: Math.max(64, nodeHeight(node)),
    }));
  };

  useEffect(() => {
    if (!compact) return;
    setMap((current) => {
      if (!current) return current;
      const width = compactWidth();
      const needs = current.nodes.some((node) => node.x + nodeWidth(node) > width || node.x < 0 || !node.width);
      if (!needs) return current;
      return { ...current, nodes: reflow(current.nodes) };
    });
  }, [compact]);

  const start = (template) => {
    setMap({
      id: crypto.randomUUID(),
      title: template?.title || 'Novo mapa',
      nodes: reflow((template?.nodes || []).map((node) => normalizeNode(structuredClone(node)))),
      edges: structuredClone(template?.edges || []),
      createdAt: new Date().toISOString(),
    });
    setSelected(null);
    setFormatOpen(null);
    setTitle(template?.title || 'Novo mapa');
  };

  const openSaved = (m) => {
    setMap({ ...structuredClone(m), nodes: reflow((m.nodes || []).map((node) => normalizeNode(structuredClone(node)))) });
    setTitle(m.title);
    setSelected(null);
    setFormatOpen(null);
  };

  const addNode = () => {
    if (!map) return;
    const width = compact ? compactWidth() : (canvas.current?.clientWidth || 860);
    const height = canvas.current?.clientHeight || 540;
    const nodeW = compact ? Math.min(180, width - 24) : 160;
    const n = {
      ...NODE_DEFAULTS,
      id: crypto.randomUUID(),
      text: 'Novo bloco',
      width: nodeW,
      height: compact ? 64 : 60,
      x: compact ? Math.round((width - nodeW) / 2) : Math.max(10, Math.round(60 + Math.random() * Math.max(1, width - 240))),
      y: compact ? 16 + map.nodes.length * 92 : Math.max(10, Math.round(60 + Math.random() * Math.max(1, height - 140))),
    };
    setMap({ ...map, nodes: [...map.nodes, n] });
    setSelected(n.id);
  };

  const updateNode = (id, patch) => setMap((m) => ({
    ...m,
    nodes: m.nodes.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n, ...patch };
      const w = nodeWidth(next);
      const h = nodeHeight(next);
      const maxX = Math.max(0, (canvas.current?.clientWidth || 860) - w);
      const maxY = Math.max(0, (canvas.current?.clientHeight || 540) - h);
      return { ...next, x: Math.max(0, Math.min(maxX, Number(next.x) || 0)), y: Math.max(0, Math.min(maxY, Number(next.y) || 0)) };
    }),
  }));

  const resetNode = (id) => updateNode(id, { width: 160, height: 60, bg: '#ffffff', color: '#1d312c', fontSize: 12, bold: false, italic: false, align: 'left' });

  const connectTo = (targetId) => {
    if (!selected || selected === targetId) return;
    if (map.edges.some((e) => e.from === selected && e.to === targetId)) { toast('Esses blocos já estão conectados.'); return; }
    setMap((m) => ({ ...m, edges: [...m.edges, { from: selected, to: targetId }] }));
    setSelected(null);
    toast('Conexão criada.');
  };

  const removeNode = (id) => {
    setMap((m) => ({ ...m, nodes: m.nodes.filter((n) => n.id !== id), edges: m.edges.filter((e) => e.from !== id && e.to !== id) }));
    if (selected === id) setSelected(null);
    if (formatOpen === id) setFormatOpen(null);
  };

  const saveMap = () => {
    if (!map) return;
    const cleanTitle = title.trim() || 'Mapa sem título';
    const saved = { ...map, title: cleanTitle, updatedAt: new Date().toISOString() };
    updateUser((prev) => ({ ...prev, maps: prev.maps.some((m) => m.id === map.id) ? prev.maps.map((m) => m.id === map.id ? saved : m) : [saved, ...prev.maps] }));
    setMap(saved); setTitle(cleanTitle); setModal(false); toast('Mapa salvo.');
  };

  const deleteMap = () => {
    if (!map || !window.confirm('Excluir este mapa? Esta ação não pode ser desfeita.')) return;
    updateUser((prev) => ({ ...prev, maps: prev.maps.filter((m) => m.id !== map.id) }));
    setMap(null);
    setSelected(null);
    setFormatOpen(null);
    toast('Mapa excluído.');
  };

  const buildA4Svg = () => {
    if (!map) return '';
    const pageW = 794;
    const pageH = 1123;
    const margin = 48;
    const contentTop = 112;
    const contentBottom = 1060;
    const availW = pageW - margin * 2;
    const availH = contentBottom - contentTop;
    const bounds = map.nodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + nodeWidth(node)),
      maxY: Math.max(acc.maxY, node.y + nodeHeight(node)),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const hasNodes = Number.isFinite(bounds.minX);
    const contentW = hasNodes ? Math.max(1, bounds.maxX - bounds.minX) : availW;
    const contentH = hasNodes ? Math.max(1, bounds.maxY - bounds.minY) : availH;
    const scale = hasNodes ? Math.min(availW / contentW, availH / contentH) : 1;
    const tx = hasNodes ? margin + (availW - contentW * scale) / 2 - bounds.minX * scale : margin;
    const ty = hasNodes ? contentTop + (availH - contentH * scale) / 2 - bounds.minY * scale : contentTop;

    const edges = map.edges.map((edge) => {
      const a = map.nodes.find((n) => n.id === edge.from);
      const b = map.nodes.find((n) => n.id === edge.to);
      if (!a || !b) return '';
      return `<line x1="${a.x + nodeWidth(a) / 2}" y1="${a.y + nodeHeight(a) / 2}" x2="${b.x + nodeWidth(b) / 2}" y2="${b.y + nodeHeight(b) / 2}" stroke="#174d40" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    const nodes = map.nodes.map((node) => {
      const width = nodeWidth(node);
      const height = nodeHeight(node);
      const font = `${node.italic ? 'italic ' : ''}${node.bold ? 700 : 600} ${node.fontSize || 12}px sans-serif`;
      return `<g><rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="10" fill="${node.bg || '#ffffff'}" stroke="#9bb3a3" stroke-width="1.5" vector-effect="non-scaling-stroke"/><foreignObject x="${node.x + 8}" y="${node.y + 8}" width="${width - 16}" height="${height - 16}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:${font};color:${node.color || '#1d312c'};text-align:${node.align || 'left'};padding:6px;box-sizing:border-box;width:100%;height:100%">${escapeXml(node.text)}</div></foreignObject></g>`;
    }).join('');
    const safeTitle = escapeXml(String(title || 'Mapa sem título').slice(0, 70));
    const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
    return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${pageW} ${pageH}"><rect width="${pageW}" height="${pageH}" fill="#ffffff"/><text x="${margin}" y="42" font-family="Manrope, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="2" fill="#526358">MAPA MENTAL · PULSO</text><text x="${margin}" y="78" font-family="Georgia, serif" font-size="26" fill="#1d312c">${safeTitle}</text><line x1="${margin}" y1="94" x2="${pageW - margin}" y2="94" stroke="#dce3da" stroke-width="1"/><g transform="translate(${tx} ${ty}) scale(${scale})">${edges}${nodes}</g><text x="${margin}" y="1096" font-family="Manrope, Arial, sans-serif" font-size="9" fill="#526358">Gerado em ${date}</text><text x="${pageW - margin}" y="1096" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="9" fill="#526358">A4 · retrato</text></svg>`;
  };

  const exportSvg = () => {
    const svg = buildA4Svg();
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(title || 'mapa').replace(/[^\w\-]+/g, '-').toLowerCase()}-a4.svg`;
    link.click();
  };

  const printMap = () => {
    const svg = buildA4Svg();
    if (!svg) return;
    const win = window.open('', '_blank');
    if (!win) { toast('Libere pop-ups para imprimir em A4.', 'error'); return; }
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>${escapeXml(title || 'Mapa mental')}</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:100%;height:auto}</style></head><body>${svg}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e, node) => {
    if (connect) {
      e.stopPropagation();
      if (!selected) {
        setSelected(node.id);
        toast('Origem selecionada. Clique no bloco de destino.');
        return;
      }
      if (selected === node.id) { setSelected(null); return; }
      connectTo(node.id);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    setDragging({ id: node.id, dx: p.x - node.x, dy: p.y - node.y });
    setSelected(node.id);
  };

  const onPointerMove = (e) => {
    if (!dragging || !canvas.current) return;
    const p = pos(e);
    const node = map.nodes.find((n) => n.id === dragging.id);
    const maxX = Math.max(0, canvas.current.clientWidth - nodeWidth(node));
    const maxY = Math.max(0, canvas.current.clientHeight - nodeHeight(node));
    updateNode(dragging.id, {
      x: Math.max(0, Math.min(maxX, p.x - dragging.dx)),
      y: Math.max(0, Math.min(maxY, p.y - dragging.dy)),
    });
  };

  const selectedNode = map?.nodes.find((node) => node.id === selected) || null;
  const formatNode = map?.nodes.find((node) => node.id === formatOpen) || null;
  const canvasHeight = compact && map
    ? Math.max(540, ...map.nodes.map((node) => node.y + nodeHeight(node) + 24))
    : 540;

  if (!map) {
    return (
      <>
        <PageHead eyebrow="Pulso Blocks" title="Mapas mentais" subtitle="Mapas mentais editáveis para fisiopatologia, diagnóstico diferencial e conduta. Comece de um modelo ou de uma tela em branco." actions={<Button onClick={() => start()} icon={Plus}>Novo mapa</Button>} />
        <h3>Modelos prontos</h3>
        <div className="blocks-grid">
          {blocks.templates.map((t) => <Card key={t.id} className="block-template" onClick={() => start(t)}><Network size={22} /><strong>{t.title}</strong><small>{t.nodes.length} blocos · {t.edges.length} conexões</small></Card>)}
        </div>
        <h3 className="spaced-title">Meus mapas</h3>
        {user.maps.length ? <div className="blocks-grid">{user.maps.map((m) => <Card key={m.id} className="block-template" onClick={() => openSaved(m)}><GitBranch size={20} /><strong>{m.title}</strong><small>Atualizado em {new Date(m.updatedAt).toLocaleDateString('pt-BR')}</small></Card>)}</div> : <Card><Empty icon={Network} title="Nenhum mapa salvo" text="Crie um modelo e salve para revisar depois." /></Card>}
      </>
    );
  }

  return (
    <div className="blocks-editor">
      <div className="blocks-toolbar">
        <button className="back-link" onClick={() => setMap(null)}><ArrowLeft size={15} /> Mapas</button>
        <input className="blocks-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="blocks-tools">
          <Button size="sm" variant={connect ? 'solid' : 'ghost'} onClick={() => setConnect((c) => !c)} icon={GitBranch}>{connect ? 'Conectando…' : 'Conectar'}</Button>
          <Button size="sm" variant="ghost" onClick={addNode} icon={Plus}>Bloco</Button>
          <Button size="sm" variant="ghost" onClick={exportSvg} icon={Download}>SVG A4</Button>
          <Button size="sm" variant="ghost" onClick={printMap} icon={Printer}>Imprimir</Button>
          <Button size="sm" variant="ghost" onClick={deleteMap} icon={Trash2}>Excluir</Button>
          <Button size="sm" onClick={() => setModal(true)} icon={Save}>Salvar</Button>
        </div>
      </div>
      <div className="blocks-canvas-wrap">
        <div
          className="blocks-canvas"
          ref={canvas}
          style={{ height: `${canvasHeight}px` }}
          onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
        >
          <svg className="blocks-edges">
            {map.edges.map((e, i) => {
              const a = map.nodes.find((n) => n.id === e.from); const b = map.nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              return <line key={i} x1={a.x + nodeWidth(a) / 2} y1={a.y + nodeHeight(a) / 2} x2={b.x + nodeWidth(b) / 2} y2={b.y + nodeHeight(b) / 2} />;
            })}
          </svg>
          {map.nodes.map((n) => (
            <div
              key={n.id}
              className={`block-node ${selected === n.id ? 'selected' : ''} ${connect && selected === n.id ? 'connecting' : ''}`}
              style={{ left: n.x, top: n.y, width: nodeWidth(n), height: nodeHeight(n), background: n.bg || NODE_DEFAULTS.bg }}
              onPointerDown={(e) => onPointerDown(e, n)}
            >
              <button type="button" className="block-drag" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, n); }} aria-label="Mover bloco"><GripVertical size={12} /></button>
              <button
                type="button"
                className="block-format"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setSelected(n.id); setFormatOpen(n.id); }}
                aria-label="Formatar bloco"
              >
                <Pencil size={12} />
              </button>
              <textarea
                value={n.text}
                style={{
                  ...(connect ? { pointerEvents: 'none' } : {}),
                  color: n.color || NODE_DEFAULTS.color,
                  fontSize: `${n.fontSize || NODE_DEFAULTS.fontSize}px`,
                  fontWeight: n.bold ? 700 : 500,
                  fontStyle: n.italic ? 'italic' : 'normal',
                  textAlign: n.align || 'left',
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onFocus={() => setSelected(n.id)}
                onChange={(e) => updateNode(n.id, { text: e.target.value })}
              />
              <button className="block-del" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} aria-label="Excluir bloco"><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
      <p className="blocks-hint">{connect ? 'Clique na origem e depois no destino. Em telas pequenas, deslize o quadro para navegar.' : 'Arraste pela alça superior. Clique no texto para editar. Selecione um bloco para ajustar tamanho, cor e fonte.'}</p>

      {selectedNode && (
        <Card className="blocks-inspector">
          <div className="section-head small">
            <div><span className="eyebrow">Bloco selecionado</span><h3>Formatação</h3></div>
            <div className="inspector-actions">
              <Button size="sm" variant="ghost" onClick={() => resetNode(selectedNode.id)}>Restaurar</Button>
              <Button size="sm" variant="ghost" onClick={() => removeNode(selectedNode.id)} icon={Trash2}>Excluir bloco</Button>
            </div>
          </div>
          <BlockFormatControls node={selectedNode} updateNode={updateNode} />
        </Card>
      )}

      {formatNode && (
        <div className="format-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setFormatOpen(null); }}>
          <div className="format-popup" role="dialog" aria-modal="true" aria-label="Formatar bloco">
            <div className="format-popup-head">
              <div><span className="eyebrow">Bloco</span><h2>Formatar bloco</h2></div>
              <button className="icon-btn" onClick={() => setFormatOpen(null)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <BlockFormatControls node={formatNode} updateNode={updateNode} />
            <div className="format-popup-actions">
              <Button size="sm" variant="ghost" onClick={() => resetNode(formatNode.id)}>Restaurar</Button>
              <Button size="sm" variant="ghost" onClick={() => removeNode(formatNode.id)} icon={Trash2}>Excluir</Button>
              <Button size="sm" onClick={() => setFormatOpen(null)}>Concluir</Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Salvar mapa">
        <Field label="Título do mapa"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={saveMap} icon={Check}>Salvar</Button></div>
      </Modal>
    </div>
  );
}

function BlockFormatControls({ node, updateNode }) {
  return (
    <div className="inspector-grid">
      <div className="inspector-field">
        <span>Largura</span>
        <div className="inspector-range"><input type="range" min="120" max="360" value={nodeWidth(node)} onChange={(e) => updateNode(node.id, { width: Number(e.target.value) })} /><b>{nodeWidth(node)}px</b></div>
      </div>
      <div className="inspector-field">
        <span>Altura</span>
        <div className="inspector-range"><input type="range" min="50" max="240" value={nodeHeight(node)} onChange={(e) => updateNode(node.id, { height: Number(e.target.value) })} /><b>{nodeHeight(node)}px</b></div>
      </div>
      <div className="inspector-field">
        <span>Tamanho da fonte</span>
        <div className="inspector-range"><input type="range" min="10" max="24" value={node.fontSize || 12} onChange={(e) => updateNode(node.id, { fontSize: Number(e.target.value) })} /><b>{node.fontSize || 12}px</b></div>
      </div>
      <div className="inspector-field">
        <span>Cor do bloco</span>
        <div className="color-swatches">
          {BG_COLORS.map((color) => <button key={color} type="button" className={`color-swatch ${(node.bg || NODE_DEFAULTS.bg) === color ? 'active' : ''}`} style={{ background: color }} onClick={() => updateNode(node.id, { bg: color })} aria-label={`Fundo ${color}`} />)}
          <input className="color-input" type="color" value={node.bg || NODE_DEFAULTS.bg} onChange={(e) => updateNode(node.id, { bg: e.target.value })} aria-label="Cor personalizada do bloco" />
        </div>
      </div>
      <div className="inspector-field">
        <span>Cor da fonte</span>
        <div className="color-swatches">
          {FONT_COLORS.map((color) => <button key={color} type="button" className={`color-swatch ${(node.color || NODE_DEFAULTS.color) === color ? 'active' : ''}`} style={{ background: color }} onClick={() => updateNode(node.id, { color })} aria-label={`Fonte ${color}`} />)}
          <input className="color-input" type="color" value={node.color || NODE_DEFAULTS.color} onChange={(e) => updateNode(node.id, { color: e.target.value })} aria-label="Cor personalizada da fonte" />
        </div>
      </div>
      <div className="inspector-field">
        <span>Estilo e alinhamento</span>
        <div className="font-actions">
          <button type="button" className={node.bold ? 'active' : ''} onClick={() => updateNode(node.id, { bold: !node.bold })} aria-label="Negrito"><Bold size={14} /></button>
          <button type="button" className={node.italic ? 'active' : ''} onClick={() => updateNode(node.id, { italic: !node.italic })} aria-label="Itálico"><Italic size={14} /></button>
          {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([align, Icon]) => (
            <button key={align} type="button" className={(node.align || 'left') === align ? 'active' : ''} onClick={() => updateNode(node.id, { align })} aria-label={`Alinhar ${align}`}><Icon size={14} /></button>
          ))}
        </div>
      </div>
    </div>
  );
}
