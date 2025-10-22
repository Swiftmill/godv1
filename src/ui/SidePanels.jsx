import React, { useEffect, useMemo, useRef } from 'react';

function SpectrumWidget() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf;
    const render = () => {
      frame += 1;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < width; i += 4) {
        const value = Math.abs(Math.sin(frame * 0.02 + i * 0.12)) * height * 0.8;
        ctx.fillStyle = `rgba(15, 198, 255, ${0.35 + Math.sin((frame + i) * 0.01) * 0.2})`;
        ctx.fillRect(i, height - value, 3, value);
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="widget-canvas spectrum" width="240" height="90" aria-hidden="true" />;
}

function BioWidget() {
  const lines = useMemo(() => {
    return Array.from({ length: 8 }).map((_, index) => {
      const bpm = 64 + Math.round(Math.sin(index * 1.2) * 10 + Math.random() * 4);
      const stress = (Math.random() * 100).toFixed(1);
      return { id: index, bpm, stress };
    });
  }, []);

  return (
    <div className="bio-widget" role="list">
      {lines.map((line) => (
        <div key={line.id} role="listitem" className="bio-line">
          <span>Bio-{String(line.id).padStart(2, '0')}</span>
          <strong>{line.bpm} BPM</strong>
          <span>{line.stress}% stress</span>
        </div>
      ))}
    </div>
  );
}

function LogStream({ hoverIncident, selectedIncident }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [hoverIncident, selectedIncident]);

  const baseLogs = useMemo(
    () => [
      'Boot sequence validated',
      'Spectrum uplink secured',
      'Thermal noise compensated',
      'Cipher handshake complete'
    ],
    []
  );

  const highlight = hoverIncident?.label || selectedIncident?.label;

  return (
    <div className="log-stream" ref={logRef} aria-live="polite">
      {baseLogs.map((log) => (
        <p key={log}>{log}</p>
      ))}
      {highlight ? <p className="log-highlight">Cluster focus: {highlight}</p> : null}
    </div>
  );
}

function ClusterList({ clusters, onClusterSelect }) {
  return (
    <div className="cluster-list" role="list">
      {clusters.slice(0, 8).map((cluster) => (
        <button
          key={cluster.id}
          type="button"
          className="cluster-chip"
          onClick={() => onClusterSelect(cluster)}
        >
          <span className="chip-label">{cluster.label}</span>
          <span className="chip-count">{cluster.size}</span>
        </button>
      ))}
    </div>
  );
}

function SidePanels({
  hoverIncident,
  selectedIncident,
  clusters,
  onClusterSelect,
  reduceMotion,
  setReduceMotion,
  quality,
  setQuality
}) {
  return (
    <aside className="side-panels" aria-label="Flux analytiques">
      <section className="panel left">
        <div className="panel-block">
          <h2>Spectrum FFT</h2>
          <SpectrumWidget />
        </div>
        <div className="panel-block">
          <h2>Biométrie synthétique</h2>
          <BioWidget />
        </div>
        <div className="panel-block">
          <h2>Flux actifs</h2>
          <LogStream hoverIncident={hoverIncident} selectedIncident={selectedIncident} />
        </div>
      </section>
      <section className="panel right">
        <div className="panel-block">
          <h2>Cluster map</h2>
          <ClusterList clusters={clusters} onClusterSelect={onClusterSelect} />
        </div>
        <div className="panel-block">
          <h2>Contrôles</h2>
          <div className="controls">
            <label>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
              Reduce Motion
            </label>
            <label className="select">
              Qualité
              <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
        </div>
        <div className="panel-block">
          <h2>Coordonnées</h2>
          <div className="geo-grid">
            <div>
              <span>Hover</span>
              <strong>{hoverIncident ? `${hoverIncident.lat.toFixed(2)}, ${hoverIncident.lng.toFixed(2)}` : '--'}</strong>
            </div>
            <div>
              <span>Sélection</span>
              <strong>
                {selectedIncident
                  ? `${selectedIncident.lat.toFixed(2)}, ${selectedIncident.lng.toFixed(2)}`
                  : '--'}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}

export default SidePanels;
