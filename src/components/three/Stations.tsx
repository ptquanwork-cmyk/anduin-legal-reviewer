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
export default function StationsCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      dpr={[1, 2]}
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

function setEmissive(m: THREE.MeshStandardMaterial, v: number) {
  if (m.emissive && m.emissiveIntensity !== undefined) m.emissiveIntensity = v;
}

/** Shared material library (by Blender material name): polished resin, polymer, cream keys and CRT glass. */
function material(name: string): THREE.Material | null {
  const base = name.replace(/\.\d+$/, '');
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  switch (base) {
    case 'blue_resin':
      // No transmission on resin: nine views share one canvas, so the extra transmission pass is reserved for lens glass.
      return phys({ color: '#1d6bff', roughness: 0.22, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
    case 'blue_deep':
      return phys({ color: '#0d47c9', roughness: 0.2, clearcoat: 0.8 });
    case 'mint_resin':
      return phys({ color: '#2fc9b4', roughness: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
    case 'mint_glow':
    case 'screen_mint':
      return phys({ color: '#6ff2df', emissive: new THREE.Color('#6ff2df'), emissiveIntensity: 1, roughness: 0.4 });
    case 'screen_blue':
      return phys({ color: '#4f9bff', emissive: new THREE.Color('#4f9bff'), emissiveIntensity: 1, roughness: 0.4 });
    case 'white':
      return phys({ color: '#f3f6fb', roughness: 0.32, clearcoat: 0.4 });
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
      return phys({ color: '#e6f3ff', roughness: 0.02, transmission: 1, thickness: 0.2, ior: 1.5, transparent: true, opacity: 0.6 });
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
        mesh.material = material(src.name) ?? src.clone();
      }
    });
    return s;
  }, [scene]);
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

  // Frame the model from the shared elevated three-quarter direction so it fills its rectangle.
  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(root);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const cam = camera as THREE.PerspectiveCamera;
    cam.aspect = size.width / Math.max(1, size.height);
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
    const dist = (sphere.radius * 0.8) / Math.sin(Math.min(vfov, hfov) / 2);
    cam.position.copy(sphere.center).add(VIEW_DIR.clone().multiplyScalar(dist));
    cam.near = dist / 20;
    cam.far = dist * 20;
    cam.lookAt(sphere.center);
    cam.updateProjectionMatrix();
  }, [root, camera, size.width, size.height]);

  useEffect(() => onReady?.(), [onReady]);

  useFrame((_, dt) => {
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
        <ambientLight intensity={0.45} />
        <directionalLight position={[-4, 7, 5]} intensity={2.6} />
        <directionalLight position={[5, 3, 3]} intensity={0.9} color="#d6ebff" />
        <Environment resolution={256}>
          <color attach="background" args={['#26324a']} />
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
