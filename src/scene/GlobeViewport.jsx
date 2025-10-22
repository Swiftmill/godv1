import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { GlobeScene } from './globeScene.js';

const GlobeViewport = forwardRef(function GlobeViewport(
  { incidents, connections, onHover, onSelect, reduceMotion, quality },
  ref
) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusCluster: (cluster) => sceneRef.current?.focusCluster(cluster),
    deepZoom: (cluster) => sceneRef.current?.deepZoom(cluster),
    minimapJump: (lat, lng) => sceneRef.current?.minimapJump(lat, lng),
    setQuality: (level) => sceneRef.current?.setQuality(level)
  }));

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const scene = new GlobeScene(canvasRef.current, { onHover, onSelect, reduceMotion });
    sceneRef.current = scene;
    if (quality) {
      scene.setQuality(quality);
    }
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !incidents?.length) return;
    sceneRef.current.updateIncidents(incidents);
  }, [incidents]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.updateConnections(connections ?? []);
  }, [connections]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setReduceMotion(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (!sceneRef.current || !quality) return;
    sceneRef.current.setQuality(quality);
  }, [quality]);

  return <canvas ref={canvasRef} className="globe-canvas" role="presentation" aria-hidden="true" />;
});

export default GlobeViewport;
