import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import incidentsSeed from '../data/incidents.json';
import feedsData from '../data/feeds.json';
import whitelistData from '../data/whitelist.json';
import GlobeViewport from './scene/GlobeViewport.jsx';
import TopBar from './ui/TopBar.jsx';
import SidePanels from './ui/SidePanels.jsx';
import FeedsMosaic from './feeds/FeedsMosaic.jsx';
import AnalysisPanel from './panels/AnalysisPanel.jsx';
import PinBoard from './panels/PinBoard.jsx';
import Minimap from './ui/Minimap.jsx';
import { computeConnections, projectCluster } from './math/projections.js';

const INCIDENT_MULTIPLIER = 30;

function generateIncidents(seed) {
  const generated = [...seed];
  let counter = seed.length;
  seed.forEach((incident) => {
    for (let i = 0; i < INCIDENT_MULTIPLIER; i += 1) {
      counter += 1;
      const jitterLat = incident.lat + (Math.random() - 0.5) * 3.5;
      const jitterLng = incident.lng + (Math.random() - 0.5) * 3.5;
      generated.push({
        ...incident,
        id: `${incident.id}-${counter}`,
        lat: Math.max(Math.min(jitterLat, 88), -88),
        lng: ((jitterLng + 540) % 360) - 180,
        severity: Math.max(1, Math.min(5, incident.severity + Math.round((Math.random() - 0.5) * 2)))
      });
    }
  });
  return generated;
}

const reduceMotionPreference = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function App() {
  const [incidents] = useState(() => generateIncidents(incidentsSeed));
  const [hoverIncident, setHoverIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [quality, setQuality] = useState('high');
  const [reduceMotion, setReduceMotion] = useState(reduceMotionPreference);
  const [pinned, setPinned] = useState([]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [activeCluster, setActiveCluster] = useState(null);
  const [processing, setProcessing] = useState(true);
  const globeRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setProcessing(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const watcher = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = (event) => setReduceMotion(event.matches);
    if (watcher) {
      setReduceMotion(watcher.matches);
      watcher.addEventListener('change', onChange);
    }
    return () => watcher?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setQuality('low');
    } else {
      setQuality('high');
    }
  }, [reduceMotion]);

  useEffect(() => {
    globeRef.current?.setQuality(quality);
  }, [quality]);

  const connections = useMemo(() => computeConnections(incidents.slice(0, 120)), [incidents]);
  const clusters = useMemo(() => projectCluster(incidents, 8, 10), [incidents]);

  const feeds = useMemo(() => {
    const expanded = [...feedsData];
    while (expanded.length < 18) {
      expanded.push({
        id: `synthetic-${expanded.length}`,
        title: `SENSOR ${expanded.length}`,
        type: 'simulated'
      });
    }
    return expanded.slice(0, 24);
  }, []);

  const handleHover = useCallback((incident) => {
    setHoverIncident(incident);
  }, []);

  const handleSelect = useCallback((incident) => {
    setSelectedIncident(incident);
    setAnalysisOpen(Boolean(incident));
    if (!incident) {
      setActiveCluster(null);
    }
  }, []);

  const handleClusterSelect = useCallback(
    (cluster) => {
      setActiveCluster(cluster);
      setSelectedIncident(cluster.nodes?.[0] || null);
      globeRef.current?.focusCluster(cluster);
      setAnalysisOpen(true);
    },
    []
  );

  const handleDeepZoom = useCallback(() => {
    if (activeCluster) {
      globeRef.current?.deepZoom(activeCluster);
    } else if (selectedIncident) {
      globeRef.current?.focusCluster({ lat: selectedIncident.lat, lng: selectedIncident.lng });
    }
  }, [activeCluster, selectedIncident]);

  const handleRandomSite = useCallback(() => {
    const url = whitelistData[Math.floor(Math.random() * whitelistData.length)];
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handlePin = useCallback(() => {
    if (!selectedIncident) return;
    setPinned((prev) => {
      if (prev.find((card) => card.id === selectedIncident.id)) return prev;
      const card = {
        id: selectedIncident.id,
        title: selectedIncident.label,
        severity: selectedIncident.severity,
        timestamp: new Date().toISOString(),
        lat: selectedIncident.lat,
        lng: selectedIncident.lng
      };
      const updated = [card, ...prev];
      return updated.slice(0, 5);
    });
  }, [selectedIncident]);

  const handleShuffle = useCallback(() => {
    setShuffleSeed((seed) => seed + 1);
  }, []);

  const handleMinimapNavigate = useCallback((coords) => {
    globeRef.current?.minimapJump(coords.lat, coords.lng);
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisOpen(false);
    setSelectedIncident(null);
    setActiveCluster(null);
  }, []);

  return (
    <div className={`app-shell ${reduceMotion ? 'reduce-motion' : ''}`}>
      <TopBar processing={processing} />
      <div className="layout">
        <SidePanels
          hoverIncident={hoverIncident}
          selectedIncident={selectedIncident}
          clusters={clusters}
          onClusterSelect={handleClusterSelect}
          reduceMotion={reduceMotion}
          setReduceMotion={setReduceMotion}
          quality={quality}
          setQuality={setQuality}
        />
        <main className="viewport" aria-label="Monde connecté">
          <GlobeViewport
            ref={globeRef}
            incidents={incidents}
            connections={connections}
            onHover={handleHover}
            onSelect={handleSelect}
            reduceMotion={reduceMotion}
            quality={quality}
          />
          <Minimap incidents={incidents} onNavigate={handleMinimapNavigate} />
        </main>
        <FeedsMosaic feeds={feeds} shuffleSeed={shuffleSeed} onShuffle={handleShuffle} />
      </div>
      <PinBoard pinned={pinned} onRandomSite={handleRandomSite} />
      <AnalysisPanel
        open={analysisOpen}
        incident={selectedIncident}
        cluster={activeCluster}
        onClose={clearAnalysis}
        onDeepZoom={handleDeepZoom}
        onRandomSite={handleRandomSite}
        onPin={handlePin}
      />
    </div>
  );
}

export default App;
