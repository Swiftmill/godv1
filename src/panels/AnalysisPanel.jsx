import React, { useEffect, useMemo } from 'react';

function generateEvents(incident) {
  if (!incident) return [];
  return Array.from({ length: 5 }).map((_, index) => ({
    id: `${incident.id}-evt-${index}`,
    label: `Event ${index + 1}`,
    time: new Date(Date.now() - index * 32000).toISOString().split('T')[1].replace('Z', ''),
    status: ['FLAGGED', 'TRACED', 'ANALYZED'][index % 3]
  }));
}

function generateSparkline() {
  return Array.from({ length: 24 }).map((_, index) => 20 + Math.sin(index * 0.6) * 10 + Math.random() * 4);
}

function generateTimeline() {
  return Array.from({ length: 6 }).map((_, index) => ({
    id: index,
    label: `T+${index * 6}m`,
    value: Math.random()
  }));
}

function AnalysisPanel({ open, incident, cluster, onClose, onDeepZoom, onRandomSite, onPin }) {
  const events = useMemo(() => generateEvents(incident || cluster?.nodes?.[0]), [incident, cluster]);
  const sparkline = useMemo(() => generateSparkline(), [incident, cluster]);
  const timeline = useMemo(() => generateTimeline(), [incident, cluster]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const subject = incident || cluster;
  const title = subject?.label || 'No node selected';

  return (
    <div className={`analysis-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="analysis-container" role="dialog" aria-modal="true">
        <header>
          <h2>{title}</h2>
          <div className="controls">
            <button type="button" onClick={onDeepZoom} className="action-button">
              Deep zoom
            </button>
            <button type="button" onClick={onRandomSite} className="action-button">
              Random site
            </button>
            <button type="button" onClick={onPin} className="action-button">
              Pin to board
            </button>
            <button type="button" onClick={onClose} className="action-button ghost">
              Close
            </button>
          </div>
        </header>
        <section className="identity-card">
          <div>
            <span className="label">IDENT</span>
            <strong>{subject?.label || '---'}</strong>
          </div>
          <div>
            <span className="label">SEVERITY</span>
            <strong>{subject?.severity || subject?.size || '-'}</strong>
          </div>
          <div>
            <span className="label">COORDS</span>
            <strong>
              {subject ? `${subject.lat.toFixed(2)}° / ${subject.lng.toFixed(2)}°` : '--'}
            </strong>
          </div>
          <div>
            <span className="label">NODES</span>
            <strong>{cluster ? cluster.size : 1}</strong>
          </div>
        </section>
        <section className="events-table" aria-label="Historique d&#39;évènements">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.label}</td>
                  <td>{event.time}</td>
                  <td>{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="sparkline" aria-label="Activity sparkline">
          <svg viewBox="0 0 240 60" preserveAspectRatio="none">
            <polyline
              points={sparkline.map((value, index) => `${(index / (sparkline.length - 1)) * 240},${60 - value}`).join(' ')}
              fill="none"
              stroke="#0FC6FF"
              strokeWidth="2"
            />
          </svg>
        </section>
        <section className="timeline" aria-label="Timeline">
          <svg viewBox="0 0 320 60" preserveAspectRatio="none">
            {timeline.map((mark, index) => (
              <g key={mark.id} transform={`translate(${(index / (timeline.length - 1)) * 300 + 10}, 10)`}>
                <line x1="0" y1="0" x2="0" y2="30" stroke="rgba(127, 232, 255, 0.5)" />
                <circle cx="0" cy={35 - mark.value * 20} r="4" fill="#FF2B2B" />
                <text x="0" y="45" textAnchor="middle">
                  {mark.label}
                </text>
              </g>
            ))}
          </svg>
        </section>
      </div>
    </div>
  );
}

export default AnalysisPanel;
