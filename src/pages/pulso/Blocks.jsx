import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, GitBranch, GripVertical, Network, Plus, Save, Trash2, X } from 'lucide-react';
import blocks from '../../../seed/blocks.json';
import { Button, Card, Chip, Empty, Field, Modal, PageHead } from '../../components/ui.jsx';
import { useStore } from '../../store.jsx';

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
    setMap({ id: crypto.randomUUID(), title: template?.title || 'Novo mapa', nodes: structuredClone(template?.nodes || []), edges: structuredClone(template?.edges || []), createdAt: new Date().toISOString() });
    setSelected(null); setTitle(template?.title || 'Novo mapa');
  };

  const openSaved = (m) => { setMap(structuredClone(m)); setTitle(m.title); setSelected(null); };

  const addNode = () => {
    if (!map) return;
    const width = canvas.current?.clientWidth || 860;
    const height = canvas.current?.clientHeight || 540;
    const n = {
      id: crypto.randomUUID(),
      text: 'Novo bloco',
      x: Math.max(10, Math.round(60 + Math.random() * Math.max(1, width - 240))),
      y: Math.max(10, Math.round(60 + Math.random() * Math.max(1, height - 140))),
      color: 'green',
    };
    setMap({ ...map, nodes: [...map.nodes, n] });
    setSelected(n.id);
  };

  const updateNode = (id, patch) => setMap((m) => ({ ...m, nodes: m.nodes.map((n) => n.id === id ? { ...n, ...patch } : n) }));

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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="560"><rect width="100%" height="100%" fill="#f4f0e7"/>${map.edges.map((e) => { const a = map.nodes.find((n) => n.id === e.from), b = map.nodes.find((n) => n.id === e.to); return a && b ? `<line x1="${a.x + 70}" y1="${a.y + 25}" x2="${b.x + 70}" y2="${b.y + 25}" stroke="#c94a21" stroke-width="2"/>` : ''; }).join('')}${map.nodes.map((n) => `<g><rect x="${n.x}" y="${n.y}" width="160" height="60" rx="10" fill="#fffdf8" stroke="#c94a21"/><foreignObject x="${n.x + 8}" y="${n.y + 8}" width="144" height="44"><div xmlns="http://www.w3.org/1999/xhtml" style="font:600 12px sans-serif;color:#162521">${n.text.replace(/</g, '&lt;')}</div></foreignObject></g>`).join('')}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title || 'mapa'}.svg`; a.click();
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
    const maxX = Math.max(0, canvas.current.clientWidth - 160);
    const maxY = Math.max(0, canvas.current.clientHeight - 60);
    updateNode(dragging.id, {
      x: Math.max(0, Math.min(maxX, p.x - dragging.dx)),
      y: Math.max(0, Math.min(maxY, p.y - dragging.dy)),
    });
  };

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
              return <line key={i} x1={a.x + 70} y1={a.y + 30} x2={b.x + 70} y2={b.y + 30} />;
            })}
          </svg>
          {map.nodes.map((n) => (
            <div key={n.id} className={`block-node ${selected === n.id ? 'selected' : ''} ${connect && selected === n.id ? 'connecting' : ''}`} style={{ left: n.x, top: n.y }} onPointerDown={(e) => onPointerDown(e, n)}>
              <button type="button" className="block-drag" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, n); }} aria-label="Mover bloco"><GripVertical size={12} /></button>
              <textarea
                value={n.text}
                style={connect ? { pointerEvents: 'none' } : undefined}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => updateNode(n.id, { text: e.target.value })}
              />
              <button className="block-del" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} aria-label="Excluir bloco"><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
      <p className="blocks-hint">{connect ? 'Clique na origem e depois no destino. Em telas pequenas, deslize o quadro para navegar.' : 'Arraste os blocos. Clique para editar. Use Conectar para ligar ideias. Em telas pequenas, deslize o quadro.'}</p>
      <Modal open={modal} onClose={() => setModal(false)} title="Salvar mapa">
        <Field label="Título do mapa"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={saveMap} icon={Check}>Salvar</Button></div>
      </Modal>
    </div>
  );
}
