'use client';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerspectiveCamera, useGLTF, View } from '@react-three/drei';
import * as THREE from 'three';

// Same elevated three-quarter direction as the Blender reference camera (Blender -Y forward → three +Z).
const VIEW_DIR = new THREE.Vector3(-2.4, 2.9, 5.6).normalize();

const MODULE: Record<string, string> = {
  intake: '01',
  source: '02',
  map: '03',
  review: '04',
  report: '05',
  annotation: '06',
  form: '07',
  responses: '08',
  export: '09',
};

export const modelUrl = (id: string) => `/3d/module-${MODULE[id]}.glb`;

/** One shared WebGL canvas behind the UI; each station renders into its own tracked DOM rectangle. */
export default function StationsCanvas({ onLost }: { onLost?: () => void }) {
  return (
    <Canvas
      className="stations-canvas"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      dpr={[1, 1.5]}
      // If the GPU drops the context (driver reset, memory pressure), the page falls back to the stills instead of blinking.
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => onLost?.(), { once: true })}
    >
      <View.Port />
    </Canvas>
  );
}

/** Hover cue per module (offsets from the rest pose), applied to the named PROP_* node exported from Blender. */
interface Cue {
  move?: [number, number, number];
  tiltZ?: number;
  scale?: number;
  glow?: number;
}
const CUES: Record<string, Cue> = {
  '01': { move: [0, 0.16, 0] }, // lift the top sheet
  '02': { move: [-0.28, 0, 0] }, // slide the lens across the pair
  '03': { scale: 0.18 }, // highlight one node
  '04': { glow: 2.2 }, // brighten the quote on the screen
  '05': { tiltZ: 10 }, // tilt the stamp
  '06': { move: [-0.12, -0.05, 0] }, // move the stylus over the source
  '07': { move: [0, 0, 0.12] }, // lift one input well
  '08': { move: [0, -0.045, 0] }, // press one key
  '09': { move: [0, 0.16, 0] }, // lift the arrow
};

/** Camera distance in bounding-sphere radii (sets the perspective strength) and the share of the slot a model fills. */
const DIST = 2.4;
const FILL = 0.94;

function setEmissive(m: THREE.MeshStandardMaterial, v: number) {
  if (m.emissive && m.emissiveIntensity !== undefined) m.emissiveIntensity = v;
}

/** Shared material library (by Blender material name): polished resin, polymer, cream keys and CRT glass. */
function material(name: string): THREE.Material | null {
  const base = name.replace(/\.\d+$/, '');
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  switch (base) {
    case 'blue_resin':
      // No transmission anywhere: nine views share one canvas and each transmission pass re-renders it.
      return phys({ color: '#2a7bff', emissive: new THREE.Color('#0a46e0'), emissiveIntensity: 0.06, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 });
    case 'blue_deep':
      return phys({ color: '#1456e6', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 });
    case 'mint_resin':
      return phys({ color: '#3fd6c0', emissive: new THREE.Color('#13a894'), emissiveIntensity: 0.05, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
    case 'mint_glow':
    case 'screen_mint':
      return phys({ color: '#6ff2df', emissive: new THREE.Color('#6ff2df'), emissiveIntensity: 1, roughness: 0.4 });
    case 'screen_blue':
      return phys({ color: '#4f9bff', emissive: new THREE.Color('#4f9bff'), emissiveIntensity: 1, roughness: 0.4 });
    case 'white':
      return phys({ color: '#f7f9fd', roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    case 'paper':
      return phys({ color: '#fbfcff', roughness: 0.55 });
    case 'line_gray':
      return phys({ color: '#c7cfda', roughness: 0.6 });
    case 'line_blue':
      return phys({ color: '#4f9bff', roughness: 0.45 });
    case 'line_mint':
      return phys({ color: '#5fd9bf', roughness: 0.45 });
    case 'cream':
      return phys({ color: '#efe7d7', roughness: 0.45, clearcoat: 0.3 });
    case 'screen':
      return phys({ color: '#0b1220', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
    case 'glass':
      // Plain transparent glass: a transmission pass re-renders the full canvas with mipmaps every frame per lens, which
      // was enough GPU load on laptops to reset the driver (the page blinked, then crashed).
      return phys({ color: '#e6f3ff', roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.38, depthWrite: false });
    case 'red':
      return phys({ color: '#ef3b3f', roughness: 0.25, clearcoat: 0.6 });
    case 'navy':
      return phys({ color: '#0a2a8f', roughness: 0.12, clearcoat: 1 });
    case 'gray':
      return phys({ color: '#9aa6b6', roughness: 0.35, metalness: 0.2 });
    default:
      return null;
  }
}

function Model({ id, lifted, onReady }: { id: string; lifted: boolean; onReady?: () => void }) {
  const { scene } = useGLTF(modelUrl(id), '/draco/');
  const n = MODULE[id];
  const root = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        // Each instance gets its own materials so a hover cue on one station never leaks to another.
        const src = mesh.material as THREE.Material;
        const m = (mesh.material = material(src.name) ?? src.clone()) as THREE.MeshPhysicalMaterial;
        if (m.transmission > 0) Object.assign(m, { transmission: 0, transparent: true, opacity: Math.min(m.opacity, 0.45), depthWrite: false });
      }
    });
    return s;
  }, [scene]);
  // Materials are per instance; free them when the station unmounts (geometry stays shared with the cached model).
  useEffect(
    () => () =>
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
      }),
    [root],
  );
  const prop = useMemo(() => {
    let found: THREE.Object3D | undefined;
    root.traverse((o) => {
      if (!found && o.name.startsWith('PROP_')) found = o;
    });
    return found;
  }, [root]);
  const base = useMemo(() => (prop ? { p: prop.position.clone(), r: prop.rotation.clone(), s: prop.scale.clone() } : null), [prop]);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const { camera, size } = useThree();

  // Camera pose from the shared elevated three-quarter direction, and the model's extent as seen from it (view tangents).
  const pose = useMemo(() => {
    root.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
    const dist = sphere.radius * DIST;
    const eye = new THREE.PerspectiveCamera();
    eye.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist);
    eye.lookAt(sphere.center);
    eye.updateMatrixWorld();
    const ext = new THREE.Box2();
    const v = new THREE.Vector3();
    const p = new THREE.Vector2();
    root.traverse((o) => {
      const pos = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry.attributes.position : undefined;
      for (let i = 0; pos && i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(eye.matrixWorldInverse);
        ext.expandByPoint(p.set(v.x / -v.z, v.y / -v.z));
      }
    });
    return { position: eye.position, center: sphere.center, dist, ext };
  }, [root]);

  // Contain the model in its rectangle and rest it on the bottom edge, as the stills are (object-contain, object-bottom).
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { position, center, dist, ext } = pose;
    cam.position.copy(position);
    cam.lookAt(center);
    cam.near = dist / 20;
    cam.far = dist * 20;
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    cam.aspect = w / h;
    const ty = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const tx = ty * cam.aspect;
    // Share of the full frame (in normalised device units) that the cropped view keeps.
    const k = Math.max((ext.max.x - ext.min.x) / 2 / tx, (ext.max.y - ext.min.y) / 2 / ty) / FILL;
    const cx = (ext.max.x + ext.min.x) / 2 / tx;
    const bottom = ext.min.y / ty;
    cam.setViewOffset(w, h, ((cx - k + 1) / 2) * w, ((1 - bottom - 2 * k) / 2) * h, k * w, k * h);
    cam.updateProjectionMatrix();
  }, [pose, camera, size.width, size.height]);

  // Report ready only after the model has been drawn a couple of times, so the still never hides over an empty slot.
  const frames = useRef(0);
  useFrame((_, dt) => {
    if (frames.current < 3 && ++frames.current === 3) onReady?.();
    // ~220 ms ease towards the hover pose: lift about 2% of height, rotate under 3 degrees.
    const target = lifted ? 1 : 0;
    t.current += (target - t.current) * Math.min(1, dt * 11);
    const k = t.current;
    if (group.current) {
      group.current.position.y = 0.05 * k;
      group.current.rotation.y = THREE.MathUtils.degToRad(2.5) * k;
    }
    const cue = CUES[n];
    if (prop && base && cue) {
      const [dx, dy, dz] = cue.move ?? [0, 0, 0];
      prop.position.set(base.p.x + dx * k, base.p.y + dy * k, base.p.z + dz * k);
      prop.rotation.set(base.r.x, base.r.y, base.r.z + THREE.MathUtils.degToRad(cue.tiltZ ?? 0) * k);
      prop.scale.copy(base.s).multiplyScalar(1 + (cue.scale ?? 0) * k);
      if (cue.glow) prop.traverse((m) => (m as THREE.Mesh).isMesh && setEmissive((m as THREE.Mesh).material as THREE.MeshStandardMaterial, 1 + cue.glow! * k));
    }
  });

  return (
    <group ref={group}>
      <primitive object={root} />
    </group>
  );
}

export function StationView({ id, lifted, onReady }: { id: string; lifted: boolean; onReady?: () => void }) {
  const track = useRef<HTMLDivElement>(null!);
  return (
    <div ref={track} className="absolute inset-0">
      <View track={track} className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[-2.4, 3.1, 5.8]} fov={32} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[-4, 7, 5]} intensity={3} />
        <directionalLight position={[5, 3, 3]} intensity={0.9} color="#d6ebff" />
        <Environment resolution={256}>
          <color attach="background" args={['#3a4d6b']} />
          <Lightformer form="rect" intensity={1.4} position={[-3, 4, 5]} scale={[7, 5, 1]} />
          <Lightformer form="rect" intensity={0.7} color="#cfe6ff" position={[5, 2, 3]} scale={[5, 4, 1]} />
          <Lightformer form="rect" intensity={0.9} position={[0, 6, -3]} scale={[8, 2, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#9fd0ff" position={[-5, 1, -2]} scale={2.5} />
        </Environment>
        <Suspense fallback={null}>
          <Model id={id} lifted={lifted} onReady={onReady} />
        </Suspense>
      </View>
    </div>
  );
}

export function preloadModels() {
  for (const id of Object.keys(MODULE)) useGLTF.preload(modelUrl(id), '/draco/');
}
