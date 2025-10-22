import React, { useEffect, useRef } from 'react';

function FeedTile({ title, accent }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf;

    const render = () => {
      frame += 1;
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255;
        data[i] = noise;
        data[i + 1] = noise * 0.6;
        data[i + 2] = noise * 0.2;
        data[i + 3] = 200;
      }
      ctx.putImageData(imageData, 0, 0);
      ctx.fillStyle = 'rgba(3, 6, 10, 0.5)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, width - 2, height - 2);
      ctx.fillStyle = 'rgba(15, 198, 255, 0.4)';
      for (let i = 0; i < 6; i += 1) {
        const x = (i * width) / 6;
        const lineHeight = Math.abs(Math.sin(frame * 0.02 + i)) * height;
        ctx.fillRect(x, height - lineHeight, width / 12, lineHeight);
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [accent]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;
    let timeout;
    const glitch = () => {
      overlay.dataset.glitch = overlay.dataset.glitch === '1' ? '0' : '1';
      const delay = 2000 + Math.random() * 2000;
      timeout = setTimeout(glitch, delay);
    };
    glitch();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="feed-tile" data-glitch="0">
      <canvas ref={canvasRef} width="160" height="90" aria-hidden="true" />
      <div ref={overlayRef} className="feed-overlay" data-glitch="0">
        <span className="feed-title">{title}</span>
        <div className="feed-bars">
          <span style={{ width: '65%' }} />
          <span style={{ width: '45%' }} />
          <span style={{ width: '88%' }} />
        </div>
      </div>
    </div>
  );
}

export default FeedTile;
