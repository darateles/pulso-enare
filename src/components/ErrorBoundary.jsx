import React from 'react';
import { RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Pulso UI:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page-error">
        <span className="eyebrow">Falha de interface</span>
        <h1>O painel saiu do ritmo.</h1>
        <p>O progresso está salvo. Recarregue para voltar ao painel.</p>
        <button className="btn btn-solid" onClick={() => { this.setState({ error: null }); location.assign('/'); }}>
          <RotateCcw size={16} /> Voltar ao início
        </button>
      </div>
    );
  }
}
