import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Check, Download, GitBranch,
  GripVertical, Italic, Network, Plus, Save, Trash2, X,
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
  const [text, setText] = useState('');
  const canvas = useRef(null);

  const start = (template) => {
    setMap({
      id: crypto.randomUUID(),
      title: template?.title || 'Novo mapa',
      nodes: (template?.nodes || []).map((node) => normalizeNode(structuredClone(node))),
      edges: structuredClone(template?.edges || []),
      createdAt: new Date().toISOString(),
    });
    setSelected(null);
    setTitle(template?.title || 'Novo mapa');
  };

  const openSaved = (m) => {
    setMap({ ...structuredClone(m), nodes: (m.nodes || []).map((node) => normalizeNode(structuredClone(node))) });
    setTitle(m.title);
    setSelected(null);
  };

  const addNode = () => {
    if (!map) return;
    const width = canvas.current?.clientWidth || 860;
    const height = canvas.current?.clientHeight || 540;
    const n = {
      ...NODE_DEFAULTS,
      id: crypto.randomUUID(),
      text: 'Novo bloco',
      x: Math.max(10, Math.round(60 + Math.random() * Math.max(1, width - 240))),
      y: Math.max(10, Math.round(60 + Math.random() * Math.max(1, height - 140))),
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
    toast('Mapa excluído.');
  };

  const exportSvg = () => {
    if (!map) return;
    const edges = map.edges.map((edge) => {
      const a = map.nodes.find((n) => n.id === edge.from);
      const b = map.nodes.find((n) => n.id === edge.to);
      if (!a || !b) return '';
      return `<line x1="${a.x + nodeWidth(a) / 2}" y1="${a.y + nodeHeight(a) / 2}" x2="${b.x + nodeWidth(b) / 2}" y2="${b.y + nodeHeight(b) / 2}" stroke="#c94a21" stroke-width="2"/>`;
    }).join('');
    const nodes = map.nodes.map((node) => {
      const width = nodeWidth(node);
      const height = nodeHeight(node);
      const font = `${node.italic ? 'italic ' : ''}${node.bold ? 700 : 600} ${node.fontSize || 12}px sans-serif`;
      return `<g><rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="10" fill="${node.bg || '#ffffff'}" stroke="#c94a21"/><foreignObject x="${node.x + 8}" y="${node.y + 8}" width="${width - 16}" height="${height - 16}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:${font};color:${node.color || '#1d312c'};text-align:${node.align || 'left'};padding:4px;box-sizing:border-box;width:100%;height:100%">${escapeXml(node.text)}</div></foreignObject></g>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="560"><rect width="100%" height="100%" fill="#f4f0e7"/>${edges}${nodes}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || 'mapa'}.svg`;
    link.click();
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
          <Button size="sm" variant="ghost" onClick={exportSvg} icon={Download}>SVG</Button>
          <Button size="sm" variant="ghost" onClick={deleteMap} icon={Trash2}>Excluir</Button>
          <Button size="sm" onClick={() => setModal(true)} icon={Save}>Salvar</Button>
        </div>
      </div>
      <div className="blocks-canvas-wrap">
        <div
          className="blocks-canvas"
          ref={canvas}
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
              <Button size="sm" variant="ghost" onClick={() => updateNode(selectedNode.id, { width: 160, height: 60, bg: '#ffffff', color: '#1d312c', fontSize: 12, bold: false, italic: false, align: 'left' })}>Restaurar</Button>
              <Button size="sm" variant="ghost" onClick={() => removeNode(selectedNode.id)} icon={Trash2}>Excluir bloco</Button>
            </div>
          </div>
          <div className="inspector-grid">
            <div className="inspector-field">
              <span>Largura</span>
              <div className="inspector-range"><input type="range" min="120" max="360" value={nodeWidth(selectedNode)} onChange={(e) => updateNode(selectedNode.id, { width: Number(e.target.value) })} /><b>{nodeWidth(selectedNode)}px</b></div>
            </div>
            <div className="inspector-field">
              <span>Altura</span>
              <div className="inspector-range"><input type="range" min="50" max="240" value={nodeHeight(selectedNode)} onChange={(e) => updateNode(selectedNode.id, { height: Number(e.target.value) })} /><b>{nodeHeight(selectedNode)}px</b></div>
            </div>
            <div className="inspector-field">
              <span>Tamanho da fonte</span>
              <div className="inspector-range"><input type="range" min="10" max="24" value={selectedNode.fontSize || 12} onChange={(e) => updateNode(selectedNode.id, { fontSize: Number(e.target.value) })} /><b>{selectedNode.fontSize || 12}px</b></div>
            </div>
            <div className="inspector-field">
              <span>Cor do bloco</span>
              <div className="color-swatches">
                {BG_COLORS.map((color) => <button key={color} type="button" className={`color-swatch ${(selectedNode.bg || NODE_DEFAULTS.bg) === color ? 'active' : ''}`} style={{ background: color }} onClick={() => updateNode(selectedNode.id, { bg: color })} aria-label={`Fundo ${color}`} />)}
                <input className="color-input" type="color" value={selectedNode.bg || NODE_DEFAULTS.bg} onChange={(e) => updateNode(selectedNode.id, { bg: e.target.value })} aria-label="Cor personalizada do bloco" />
              </div>
            </div>
            <div className="inspector-field">
              <span>Cor da fonte</span>
              <div className="color-swatches">
                {FONT_COLORS.map((color) => <button key={color} type="button" className={`color-swatch ${(selectedNode.color || NODE_DEFAULTS.color) === color ? 'active' : ''}`} style={{ background: color }} onClick={() => updateNode(selectedNode.id, { color })} aria-label={`Fonte ${color}`} />)}
                <input className="color-input" type="color" value={selectedNode.color || NODE_DEFAULTS.color} onChange={(e) => updateNode(selectedNode.id, { color: e.target.value })} aria-label="Cor personalizada da fonte" />
              </div>
            </div>
            <div className="inspector-field">
              <span>Estilo e alinhamento</span>
              <div className="font-actions">
                <button type="button" className={selectedNode.bold ? 'active' : ''} onClick={() => updateNode(selectedNode.id, { bold: !selectedNode.bold })} aria-label="Negrito"><Bold size={14} /></button>
                <button type="button" className={selectedNode.italic ? 'active' : ''} onClick={() => updateNode(selectedNode.id, { italic: !selectedNode.italic })} aria-label="Itálico"><Italic size={14} /></button>
                {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([align, Icon]) => (
                  <button key={align} type="button" className={(selectedNode.align || 'left') === align ? 'active' : ''} onClick={() => updateNode(selectedNode.id, { align })} aria-label={`Alinhar ${align}`}><Icon size={14} /></button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Salvar mapa">
        <Field label="Título do mapa"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={saveMap} icon={Check}>Salvar</Button></div>
      </Modal>
    </div>
  );
}
