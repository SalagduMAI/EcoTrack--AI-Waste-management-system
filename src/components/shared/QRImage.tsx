import React from 'react';

interface QRImageProps {
  text: string;
  className?: string;
}

export const QRImage = ({ text, className = "w-16 h-16" }: QRImageProps) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const gridSize = 15;
  const pixels = [];
  
  const isFinder = (r: number, c: number) => {
    if (r < 5 && c < 5) return true;
    if (r < 5 && c >= gridSize - 5) return true;
    if (r >= gridSize - 5 && c < 5) return true;
    return false;
  };

  const isFinderFilled = (r: number, c: number) => {
    if (r < 5 && c < 5) {
      if (r === 0 || r === 4 || c === 0 || c === 4) return true;
      if (r === 2 && c === 2) return true;
      return false;
    }
    if (r < 5 && c >= gridSize - 5) {
      const nc = c - (gridSize - 5);
      if (r === 0 || r === 4 || nc === 0 || nc === 4) return true;
      if (r === 2 && nc === 2) return true;
      return false;
    }
    if (r >= gridSize - 5 && c < 5) {
      const nr = r - (gridSize - 5);
      if (nr === 0 || nr === 4 || c === 0 || c === 4) return true;
      if (nr === 2 && c === 2) return true;
      return false;
    }
    return false;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isFinder(r, c)) {
        pixels.push({ r, c, active: isFinderFilled(r, c) });
      } else {
        const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
        pixels.push({ r, c, active: val > 0.43 });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${gridSize} ${gridSize}`} className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {pixels.map((p, idx) => p.active && (
        <rect
          key={idx}
          x={p.c}
          y={p.r}
          width="0.88"
          height="0.88"
          rx="0.15"
          fill="#1E562F"
        />
      ))}
    </svg>
  );
};
