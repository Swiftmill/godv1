import React from 'react';

function PinBoard({ pinned, onRandomSite }) {
  return (
    <section className="pin-board" aria-label="Pin board">
      <div className="pin-header">
        <h2>Mission Board</h2>
        <button type="button" onClick={onRandomSite} className="action-button">
          Random site
        </button>
      </div>
      <div className="pin-grid">
        {pinned.length === 0 ? <p className="placeholder">Pin nodes to monitor them here.</p> : null}
        {pinned.map((card) => (
          <article key={card.id} className="pin-card">
            <header>
              <h3>{card.title}</h3>
              <span className={`severity sev-${card.severity}`}>Severity {card.severity}</span>
            </header>
            <dl>
              <div>
                <dt>Captured</dt>
                <dd>{card.timestamp.replace('T', ' ').split('.')[0]}Z</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>
                  {card.lat.toFixed(2)}°, {card.lng.toFixed(2)}°
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PinBoard;
