# God&#39;s Eye Command UI

Interface de contrôle "God&#39;s Eye" construite avec React, Three.js et GSAP. Tout le rendu est procédural (aucune texture externe), incluant globe 3D, flux lumineux, HUD et mosaïque de flux simulés.

## Démarrage

```bash
npm install
npm run dev
```

Lance Vite en mode développement sur http://localhost:5173.

Pour une version optimisée :

```bash
npm run build
npm run preview
```

## Caractéristiques principales

- Globe 3D procédural (fresnel cyan, relief bruité, halo atmosphérique) avec 300+ incidents rendus via `InstancedMesh` et rubans lumineux animés.
- Post-traitements configurables (Bloom, FXAA, Vignette, Chromatic Aberration) et gestion automatique du mode Reduce Motion.
- Interactions riches : hover/clic, zooms caméra GSAP, orbit/pan, minimap cliquable et deep zoom sur clusters.
- HUD complet : barres supérieures, panneaux latéraux dynamiques, widgets FFT/biométrie/logs, contrôles de qualité.
- Mosaïque de 24 flux simulés en canvas avec glitchs périodiques, bouton d’expansion multi-écran et shuffle automatique.
- Panneau d’analyse détaillé (événements, sparkline, timeline), boutons Close/Deep Zoom/Random Site/Pin.
- Board persistant pour les sites épinglés, bouton Random site limité à la whitelist `data/whitelist.json`.
- Mode mobile/fallback : désactive les effets lourds, mise en page responsive.

## Structure

```
├── data/
│   ├── incidents.json
│   ├── feeds.json
│   └── whitelist.json
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── math/
│   │   └── projections.js
│   ├── panels/
│   │   ├── AnalysisPanel.jsx
│   │   └── PinBoard.jsx
│   ├── scene/
│   │   ├── GlobeViewport.jsx
│   │   └── globeScene.js
│   ├── feeds/
│   │   ├── FeedTile.jsx
│   │   └── FeedsMosaic.jsx
│   └── ui/
│       ├── Minimap.jsx
│       ├── SidePanels.jsx
│       └── TopBar.jsx
├── styles/
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```

## Accessibilité & Performance

- `prefers-reduced-motion` détecté automatiquement : désactive glitchs, réduit postprocess et animation.
- Navigation clavier (Tab) et fermeture via `Esc` du panneau Analyse.
- Minimap accessible pour repositionner la caméra.
- Paramètre Qualité (low/medium/high) ajustant pixel ratio & postprocess.

## Sécurité

- Aucune ressource distante hormis import de police via Google Fonts.
- Bouton "Random site" restreint aux URLs de `data/whitelist.json`.
- Pas de cookies ni de tracking, aucune requête réseau dynamique.

## Tests manuels

- `npm run dev` puis vérifier :
  - Intro animée (2.2 s), apparition progressive des incidents.
  - Hover/clic sur incidents → panneau Analyse & zoom caméra.
  - Mosaïque de 12+ tuiles avec shuffle toutes les 2-4s.
  - Minimap cliquable repositionnant la caméra.
  - Mode Reduce Motion (Toggle) : effets réduits.
  - Bouton Random site ouvre un lien whitelist.
