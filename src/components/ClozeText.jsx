import React from 'react';
import { parseCloze } from '../cloze.js';

export default function ClozeText({ text, index, revealed = false, className = '' }) {
  const { parts } = parseCloze(text);
  return (
    <span className={`cloze-text ${className}`.trim()}>
      {parts.map((part, partIndex) => {
        if (part.type === 'text') return <React.Fragment key={partIndex}>{part.text}</React.Fragment>;
        if (part.index === index) {
          return revealed
            ? <mark key={partIndex} className="cloze-answer">{part.answer}</mark>
            : <span key={partIndex} className="cloze-blank">[_____]</span>;
        }
        return <span key={partIndex} className="cloze-context">{part.answer}</span>;
      })}
    </span>
  );
}
