import React, { useEffect, useMemo, useState } from 'react';
import FeedTile from './FeedTile.jsx';

function shuffleArray(list, seed) {
  const random = (n) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };
  return list
    .map((item, index) => ({ item, sort: random(index) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function FeedsMosaic({ feeds, shuffleSeed, onShuffle }) {
  const [order, setOrder] = useState(() => shuffleArray(feeds, shuffleSeed));

  useEffect(() => {
    setOrder(shuffleArray(feeds, shuffleSeed));
  }, [feeds, shuffleSeed]);

  useEffect(() => {
    let timeout;
    const schedule = () => {
      timeout = setTimeout(() => {
        onShuffle?.();
        schedule();
      }, 2000 + Math.random() * 2000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [onShuffle]);

  const accentColors = useMemo(
    () => ['#0FC6FF', '#7FE8FF', '#FF2B2B', '#0D8FA8', '#FF7A7A'],
    []
  );

  const handleExpand = () => {
    const portal = window.open('', '_blank', 'noopener,noreferrer,width=960,height=600');
    if (!portal) return;
    const doc = portal.document;
    doc.write('<!doctype html><html><head><title>Feeds Expand</title><style>body{margin:0;background:#03060A;color:#0FC6FF;font-family:\'Roboto Condensed\',sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px;}canvas{width:100%;height:auto;border:1px solid rgba(15,198,255,0.3);}span{display:block;margin-top:4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;} .tile{position:relative;}</style></head><body></body></html>');
    const body = doc.body;
    order.slice(0, 12).forEach((feed, index) => {
      const tile = doc.createElement('div');
      tile.className = 'tile';
      const canvas = doc.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      const draw = () => {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 255;
          data[i] = noise;
          data[i + 1] = noise * 0.6;
          data[i + 2] = noise * 0.2;
          data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.strokeStyle = accentColors[index % accentColors.length];
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        requestAnimationFrame(draw);
      };
      draw();
      const label = doc.createElement('span');
      label.textContent = feed.title;
      tile.appendChild(canvas);
      tile.appendChild(label);
      body.appendChild(tile);
    });
  };

  return (
    <aside className="feeds-mosaic" aria-label="Mosaïque de flux simulés">
      <div className="feeds-header">
        <h2>Simulated Feeds</h2>
        <div className="feed-actions">
          <button type="button" onClick={onShuffle} className="action-button">
            Shuffle
          </button>
          <button type="button" onClick={handleExpand} className="action-button">
            Expand
          </button>
        </div>
      </div>
      <div className="feeds-grid">
        {order.slice(0, 24).map((feed, index) => (
          <FeedTile key={feed.id} title={feed.title} accent={accentColors[index % accentColors.length]} />
        ))}
      </div>
    </aside>
  );
}

export default FeedsMosaic;
