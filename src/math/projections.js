import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

export function latLngToVector3(lat, lng, radius = 1) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function projectCluster(incidents, threshold = 3, cell = 18) {
  const grid = new Map();
  incidents.forEach((incident) => {
    const gx = Math.floor((incident.lat + 90) / cell);
    const gy = Math.floor((incident.lng + 180) / cell);
    const key = `${gx}:${gy}`;
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(incident);
  });
  const clusters = [];
  grid.forEach((nodes) => {
    if (nodes.length >= threshold) {
      const avgLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
      const avgLng = nodes.reduce((s, n) => s + n.lng, 0) / nodes.length;
      clusters.push({
        id: nodes.map((n) => n.id).join('-'),
        size: nodes.length,
        lat: avgLat,
        lng: avgLng,
        label: nodes[0].label,
        nodes
      });
    }
  });
  return clusters;
}

export function computeConnections(incidents) {
  const connections = [];
  for (let i = 0; i < incidents.length; i += 1) {
    const source = incidents[i];
    const target = incidents[(i + 3) % incidents.length];
    if (!target || source.id === target.id) continue;
    connections.push({
      id: `${source.id}-${target.id}`,
      from: source,
      to: target,
      intensity: (source.severity + target.severity) / 6
    });
  }
  return connections;
}

export function latLngFromMinimap(x, y) {
  const lat = (0.5 - y) * 180;
  const lng = (x - 0.5) * 360;
  return { lat, lng };
}
