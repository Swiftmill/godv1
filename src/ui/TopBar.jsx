import React, { useEffect, useState } from 'react';

function TopBar({ processing }) {
  const [timestamp, setTimestamp] = useState(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="top-bar" aria-label="En-tête système">
      <div className="brand">
        <span className="logo">GOD&#39;S EYE</span>
        <span className="sub">NEURAL OBSERVATORY</span>
      </div>
      <div className="status-group" role="status" aria-live="polite">
        <span className="timestamp">UTC {timestamp.replace('T', ' ').replace('Z', '')}Z</span>
        <span className={`badge ${processing ? 'pulse' : ''}`}>PROCESSING DATA</span>
      </div>
    </header>
  );
}

export default TopBar;
