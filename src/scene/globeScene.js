import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  FXAAEffect,
  VignetteEffect,
  ChromaticAberrationEffect
} from 'postprocessing';
import { gsap } from 'gsap';
import { latLngToVector3 } from '../math/projections.js';

const INCIDENT_COLOR = new THREE.Color('#FF2B2B');
const INCIDENT_HOVER = new THREE.Color('#FF5757');
const ATMOS_COLOR = new THREE.Color('#0FC6FF');

function createNoiseShader() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#03060A') },
      uFresnel: { value: new THREE.Color('#0FC6FF') },
      uDetail: { value: 2.5 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      float snoise(vec3 v) {
        return fract(sin(dot(v, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        vec3 displaced = position + normal * (snoise(position * 3.5) * 0.04);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uFresnel;
      uniform float uDetail;
      varying vec3 vNormal;
      varying vec3 vPos;

      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        float n = dot(i, vec3(1.0, 57.0, 113.0));
        return mix(mix(mix(fract(sin(n + dot(vec3(0.0, 0.0, 0.0), vec3(1.0))) * 43758.5453),
                             fract(sin(n + dot(vec3(1.0, 0.0, 0.0), vec3(1.0))) * 43758.5453), f.x),
                        mix(fract(sin(n + dot(vec3(0.0, 1.0, 0.0), vec3(1.0))) * 43758.5453),
                             fract(sin(n + dot(vec3(1.0, 1.0, 0.0), vec3(1.0))) * 43758.5453), f.x), f.y),
                   mix(mix(fract(sin(n + dot(vec3(0.0, 0.0, 1.0), vec3(1.0))) * 43758.5453),
                             fract(sin(n + dot(vec3(1.0, 0.0, 1.0), vec3(1.0))) * 43758.5453), f.x),
                        mix(fract(sin(n + dot(vec3(0.0, 1.0, 1.0), vec3(1.0))) * 43758.5453),
                             fract(sin(n + dot(vec3(1.0, 1.0, 1.0), vec3(1.0))) * 43758.5453), f.x), f.y), f.z);
      }

      void main() {
        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        float relief = noise(vPos * uDetail + uTime * 0.05);
        vec3 base = mix(uColor, uFresnel, fresnel * 0.9);
        base += relief * 0.1;
        gl_FragColor = vec4(base, 1.0);
      }
    `,
    transparent: false
  });
}

function createAtmosphere() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uGlowColor: { value: ATMOS_COLOR },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position * 1.06, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uGlowColor;
      uniform float uTime;
      varying vec3 vNormal;
      float rim = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
      float scan = sin((vNormal.y + 1.0) * 12.0 + uTime * 1.8) * 0.1;
      gl_FragColor = vec4(uGlowColor * (rim * 1.5 + scan), 0.4);
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), material);
  return mesh;
}

function createRibbonCurve(from, to) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const up = mid.clone().normalize().multiplyScalar(0.25);
  const control = mid.clone().add(up);
  const curve = new THREE.CubicBezierCurve3(from, control, control, to);
  return curve;
}

export class GlobeScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onHover = options.onHover;
    this.onSelect = options.onSelect;
    this.reduceMotion = options.reduceMotion ?? false;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor('#03060A', 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#010305', 3.5);

    this.camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.5, 3.4);

    this.globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), createNoiseShader());
    this.scene.add(this.globe);

    this.atmosphere = createAtmosphere();
    this.scene.add(this.atmosphere);

    this.incidentMesh = null;
    this.connections = new THREE.Group();
    this.scene.add(this.connections);

    const ambient = new THREE.AmbientLight('#0d1f2f', 1.4);
    const key = new THREE.DirectionalLight('#7FE8FF', 1.1);
    key.position.set(5, 3, 5);
    this.scene.add(ambient, key);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new BloomEffect({ intensity: 1.2, luminanceThreshold: 0.2 });
    this.fxaa = new FXAAEffect();
    this.vignette = new VignetteEffect({ eskil: false, darkness: 0.6, offset: 0.25 });
    this.rgbShift = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0006, 0.0006) });
    this.effectPass = new EffectPass(this.camera, this.bloom, this.fxaa, this.vignette, this.rgbShift);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.effectPass);

    if (this.reduceMotion) {
      this.togglePostProcessing(false);
    }

    this.dummy = new THREE.Object3D();
    this.hoverId = null;
    this.selectedId = null;
    this.incidents = [];
    this.dragDelta = 0;
    this.animationId = null;

    this.boundResize = this.resize.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundClick = this.handlePointerClick.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundPointerDown = this.startOrbit.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.wheelOptions = { passive: true };

    this.setupEvents();
    this.resize();
    this.animate();
    this.introAnimation();
  }

  togglePostProcessing(enabled) {
    this.effectPass.enabled = enabled;
    this.bloom.intensity = enabled ? 1.2 : 0.3;
    this.rgbShift.offset = enabled ? new THREE.Vector2(0.0006, 0.0006) : new THREE.Vector2(0.0, 0.0);
  }

  introAnimation() {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    this.camera.zoom = 0.5;
    this.camera.updateProjectionMatrix();
    tl.to(this.camera, { zoom: 1, duration: 2.2, onUpdate: () => this.camera.updateProjectionMatrix() }, 0);
    tl.fromTo(this.globe.material.uniforms.uDetail, { value: 0.5 }, { value: 2.5, duration: 2.2 }, 0);
  }

  setupEvents() {
    window.addEventListener('resize', this.boundResize);
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('click', this.boundClick);
    this.canvas.addEventListener('wheel', this.boundWheel, this.wheelOptions);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  handleKeyUp(event) {
    if (event.key === 'Escape' && this.selectedId !== null) {
      if (this.incidentMesh?.setColorAt) {
        this.incidentMesh.setColorAt(this.selectedId, INCIDENT_COLOR);
        this.incidentMesh.instanceColor.needsUpdate = true;
      }
      this.selectedId = null;
      this.onSelect?.(null);
      this.highlightConnectionsFor(null);
    }
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    const ratio = clientWidth / clientHeight;
    this.camera.aspect = ratio || 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.composer.setSize(clientWidth, clientHeight);
  }

  updateIncidents(incidents) {
    this.incidents = incidents;
    const geometry = new THREE.SphereGeometry(0.01, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: INCIDENT_COLOR, transparent: true });
    if (this.incidentMesh) {
      this.scene.remove(this.incidentMesh);
    }
    const instanced = new THREE.InstancedMesh(geometry, material, incidents.length);
    incidents.forEach((incident, index) => {
      const position = latLngToVector3(incident.lat, incident.lng, 1.02);
      this.dummy.position.copy(position);
      const scale = 1 + incident.severity * 0.2;
      this.dummy.scale.setScalar(scale);
      this.dummy.lookAt(new THREE.Vector3(0, 0, 0));
      this.dummy.updateMatrix();
      instanced.setMatrixAt(index, this.dummy.matrix);
      instanced.setColorAt(index, INCIDENT_COLOR);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
    this.incidentMesh = instanced;
    this.scene.add(instanced);
    this.highlightConnectionsFor(null);
  }

  updateConnections(connections) {
    this.connections.clear();
    connections.forEach((link) => {
      const from = latLngToVector3(link.from.lat, link.from.lng, 1.02);
      const to = latLngToVector3(link.to.lat, link.to.lng, 1.02);
      const curve = createRibbonCurve(from, to);
      const tubularSegments = 32;
      const radius = 0.0025 + link.intensity * 0.002;
      const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: INCIDENT_COLOR.clone() },
          uDash: { value: Math.random() * Math.PI * 2 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          uniform float uTime;
          varying float vProgress;
          void main() {
            vProgress = uv.x;
            vec3 transformed = position;
            transformed += normal * sin((uTime * 3.0 + uv.x * 30.0));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uDash;
          varying float vProgress;
          void main() {
            float dash = smoothstep(0.1, 0.9, fract(vProgress + uDash));
            gl_FragColor = vec4(uColor * dash, dash);
          }
        `
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { id: link.id, from: link.from, to: link.to };
      this.connections.add(mesh);
    });
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.incidentMesh) return;
    const intersects = this.raycaster.intersectObject(this.incidentMesh);
    if (intersects.length) {
      const { instanceId } = intersects[0];
      if (instanceId !== this.hoverId) {
        if (this.hoverId !== null && this.incidentMesh?.setColorAt) {
          this.incidentMesh.setColorAt(this.hoverId, INCIDENT_COLOR);
        }
        this.hoverId = instanceId;
        if (this.incidentMesh?.setColorAt) {
          this.incidentMesh.setColorAt(instanceId, INCIDENT_HOVER);
          this.incidentMesh.instanceColor.needsUpdate = true;
        }
        this.highlightConnectionsFor(this.incidents[instanceId]?.id);
        const incident = this.incidents[instanceId];
        this.onHover?.(incident);
      }
    } else if (this.hoverId !== null) {
      if (this.incidentMesh?.setColorAt) {
        this.incidentMesh.setColorAt(this.hoverId, INCIDENT_COLOR);
        this.incidentMesh.instanceColor.needsUpdate = true;
      }
      this.highlightConnectionsFor(null);
      this.hoverId = null;
      this.onHover?.(null);
    }
  }

  handlePointerClick(event) {
    if (Math.abs(this.dragDelta) > 6) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObject(this.incidentMesh ?? new THREE.Object3D());
    if (intersections.length) {
      const { instanceId } = intersections[0];
      if (this.selectedId !== null && this.incidentMesh?.setColorAt) {
        this.incidentMesh.setColorAt(this.selectedId, INCIDENT_COLOR);
      }
      this.selectedId = instanceId;
      if (this.incidentMesh?.setColorAt) {
        this.incidentMesh.setColorAt(instanceId, INCIDENT_HOVER);
        this.incidentMesh.instanceColor.needsUpdate = true;
      }
      this.highlightConnectionsFor(this.incidents[instanceId]?.id);
      const incident = this.incidents[instanceId];
      this.focusOnIncident(incident);
      this.onSelect?.(incident);
    } else {
      if (this.selectedId !== null && this.incidentMesh?.setColorAt) {
        this.incidentMesh.setColorAt(this.selectedId, INCIDENT_COLOR);
        this.incidentMesh.instanceColor.needsUpdate = true;
      }
      this.highlightConnectionsFor(null);
      this.onSelect?.(null);
      this.selectedId = null;
    }
  }

  highlightConnectionsFor(incidentId) {
    this.connections.children.forEach((mesh) => {
      const uniforms = mesh.material.uniforms;
      if (!uniforms?.uColor?.value) return;
      const related =
        incidentId && (mesh.userData?.from?.id === incidentId || mesh.userData?.to?.id === incidentId);
      uniforms.uColor.value.copy(related ? INCIDENT_HOVER : INCIDENT_COLOR);
    });
  }

  handleWheel(event) {
    const delta = Math.sign(event.deltaY);
    gsap.to(this.camera.position, {
      duration: 0.6,
      z: THREE.MathUtils.clamp(this.camera.position.z + delta * 0.35, 1.6, 5.8),
      ease: 'power2.out'
    });
  }

  startOrbit(event) {
    const pointer = { x: event.clientX, y: event.clientY };
    let prevX = pointer.x;
    let prevY = pointer.y;
    this.dragDelta = 0;

    const move = (e) => {
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      this.dragDelta += Math.abs(dx) + Math.abs(dy);
      if (event.shiftKey || e.shiftKey) {
        this.camera.position.x -= dx * 0.003;
        this.camera.position.y += dy * 0.003;
      } else {
        const rotY = dx * 0.005;
        const rotX = dy * 0.005;
        this.scene.rotation.y += rotY;
        this.scene.rotation.x = THREE.MathUtils.clamp(this.scene.rotation.x + rotX, -0.6, 0.6);
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  focusOnIncident(incident) {
    if (!incident) return;
    const target = latLngToVector3(incident.lat, incident.lng, 2.8);
    gsap.to(this.camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.6,
      ease: 'cubic.out'
    });
  }

  focusCluster(cluster) {
    if (!cluster) return;
    const center = latLngToVector3(cluster.lat, cluster.lng, 2.8);
    gsap.to(this.camera.position, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  deepZoom(cluster) {
    if (!cluster) return;
    const origin = latLngToVector3(cluster.lat, cluster.lng, 1.1);
    const target = origin.clone().multiplyScalar(2.2);
    gsap.to(this.camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 2.2,
      ease: 'power3.inOut'
    });
    gsap.to(this.scene.rotation, { y: '+=' + Math.PI / 2, duration: 2.2, ease: 'power2.inOut' });

    cluster.nodes.forEach((node, index) => {
      const phi = (index / cluster.nodes.length) * Math.PI * 2;
      const radius = 0.12 + index * 0.01;
      const offset = new THREE.Vector3(Math.cos(phi) * radius, Math.sin(phi) * radius, 0);
      const pos = origin.clone().add(offset);
      gsap.to(offset, {
        duration: 1.6,
        delay: index * 0.03,
        onUpdate: () => {
          const matrix = new THREE.Matrix4();
          const scale = 1 + node.severity * 0.2;
          matrix.setPosition(origin.clone().add(offset));
          matrix.scale(new THREE.Vector3(scale, scale, scale));
          this.incidentMesh?.setMatrixAt(this.incidents.indexOf(node), matrix);
          this.incidentMesh.instanceMatrix.needsUpdate = true;
        }
      });
    });
  }

  minimapJump(lat, lng) {
    const target = latLngToVector3(lat, lng, 2.4);
    gsap.to(this.camera.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.1,
      ease: 'power2.inOut'
    });
  }

  setQuality(level) {
    if (level === 'low') {
      this.togglePostProcessing(false);
      this.renderer.setPixelRatio(1);
    } else if (level === 'medium') {
      this.togglePostProcessing(!this.reduceMotion);
      this.renderer.setPixelRatio(1.5);
    } else {
      this.togglePostProcessing(!this.reduceMotion);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }

  setReduceMotion(value) {
    this.reduceMotion = value;
    this.togglePostProcessing(!value);
  }

  animate = () => {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    this.animationId = requestAnimationFrame(this.animate);
    if (this.globe?.material?.uniforms?.uTime) {
      this.globe.material.uniforms.uTime.value = elapsed;
    }
    if (this.atmosphere?.material?.uniforms?.uTime) {
      this.atmosphere.material.uniforms.uTime.value = elapsed;
    }
    this.connections.children.forEach((mesh) => {
      if (mesh.material.uniforms?.uTime) {
        mesh.material.uniforms.uTime.value += delta;
      }
    });
    this.scene.rotation.y += delta * 0.02;

    if (this.effectPass.enabled) {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  dispose() {
    window.removeEventListener('resize', this.boundResize);
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    this.canvas.removeEventListener('click', this.boundClick);
    this.canvas.removeEventListener('wheel', this.boundWheel, this.wheelOptions);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.composer?.dispose();
  }
}
