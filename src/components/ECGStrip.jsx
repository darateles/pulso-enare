import React, { useMemo } from 'react';

function rand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export default function ECGStrip({ params = {}, seed = 7 }) {
  const d = useMemo(() => {
    const rnd = rand(seed);
    const w = 820;
    const base = 110;
    let path = `M 0 ${base}`;
    if (params.rhythm === 'chaotic') {
      for (let x = 0; x < w; x += 6) {
        const amp = 8 + rnd() * 55;
        path += ` L ${x} ${base + (rnd() > 0.5 ? -amp : amp)}`;
      }
      return path;
    }
    const hr = params.hr || 70;
    const spacing = Math.max(22, w / (hr / 6));
    const wide = params.qrsWide ? 1.7 : 1;
    let x = 8;
    let beat = 0;
    if (params.rhythm === 'flutter') {
      for (; x < w; x += 9) {
        path += ` l 4 -14 l 5 28`;
      }
      path += ` M 0 ${base}`;
      x = 8;
    }
    while (x < w - 20) {
      const jitter = params.rhythm === 'irregular' ? (rnd() - 0.5) * spacing * 0.7 : 0;
      const bx = x + (params.rhythm === 'irregular' ? jitter : 0);
      const hasP = params.p && !['thirdDegree'].includes(params.rhythm);
      if (params.rhythm === 'thirdDegree') {
        for (let p = 8; p < w; p += 55) path += ` M ${p} ${base} q 4 -10 8 0`;
        path += ` M ${bx} ${base}`;
      } else if (hasP) {
        const pr = params.prLong ? 42 : 18;
        path += ` M ${bx} ${base} q 5 -11 10 0`;
        path += ` L ${bx + pr} ${base}`;
      }
      const qx = bx + (hasP ? (params.prLong ? 42 : 18) : 4);
      const skip = params.rhythm === 'wenckebach' && beat % 4 === 3;
      if (skip) { path += ` M ${qx + 15} ${base}`; }
      else if (params.rhythm === 'wenckebach' || params.rhythm === 'thirdDegree') {
        path += ` M ${qx} ${base} l ${2 * wide} 5 l ${3 * wide} -16 l ${4 * wide} 34 l ${4 * wide} -23 l ${2 * wide} 0`;
      } else {
        path += ` M ${qx} ${base} l 2 6 l 3 -15 l 4 38 l 5 -29 l 4 0`;
      }
      const stx = qx + (params.rhythm === 'wenckebach' || params.rhythm === 'thirdDegree' ? 16 : 18);
      if (params.st === 'elev') {
        path += ` L ${stx} 96 q 14 0 18 -2`;
      } else if (params.st === 'depress') {
        path += ` L ${stx} 122 q 14 0 18 -2`;
      } else {
        path += ` L ${stx} ${base}`;
      }
      const tw = params.t === 'peaked' ? 32 : 22;
      if (params.t === 'inverted') path += ` q 10 ${tw} 20 0`;
      else path += ` q 10 -${tw} 20 0`;
      path += ` L ${bx + spacing - 4} ${base}`;
      beat += 1;
      x += spacing;
    }
    return path;
  }, [params, seed]);

  return (
    <svg className="ecg-strip" viewBox="0 0 820 190" role="img" aria-label="Traçado de eletrocardiograma em derivação II">
      <defs>
        <pattern id="ecgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(23,106,88,.14)" strokeWidth=".6" />
        </pattern>
        <pattern id="ecgGrid5" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(23,106,88,.28)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="820" height="190" fill="var(--surface-2)" />
      <rect width="820" height="190" fill="url(#ecgGrid)" />
      <rect width="820" height="190" fill="url(#ecgGrid5)" />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M 18 40 v 40 h 24 v -40" fill="none" stroke="var(--muted)" strokeWidth="1.4" opacity=".6" />
      <text x="48" y="58" fontSize="9" fill="var(--muted)">II · 25 mm/s</text>
    </svg>
  );
}
