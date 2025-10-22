import React, { useEffect, useRef } from 'react';
import { latLngFromMinimap } from '../math/projections.js';

function toPoint(lat, lng, width, height) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

function Minimap({ incidents, onNavigate }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(3, 6, 10, 0.85)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(15, 198, 255, 0.6)';
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    incidents.slice(0, 400).forEach((incident) => {
      const [x, y] = toPoint(incident.lat, incident.lng, width, height);
      ctx.fillStyle = incident.severity > 3 ? 'rgba(255, 43, 43, 0.9)' : 'rgba(127, 232, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + incident.severity * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [incidents]);

  const handleClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const coords = latLngFromMinimap(x, y);
    onNavigate?.(coords);
  };

  return (
    <div className="minimap" aria-label="Minimap navigation">
      <canvas ref={canvasRef} width="220" height="220" onClick={handleClick} />
      <span className="legend">Click to reposition</span>
    </div>
  );
}

export default Minimap;
