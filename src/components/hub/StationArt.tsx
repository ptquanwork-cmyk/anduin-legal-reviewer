'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Stage } from '../../lib/stages';

/** While an object is flying between hub and header, the destination copy stays hidden. */
export const FlyingCtx = createContext<string | null>(null);
/** True when real-time 3D is used (desktop, WebGL available, no reduced-motion preference). */
export const ThreeCtx = createContext(false);

const StationView = dynamic(() => import('../three/Stations').then((m) => m.StationView), { ssr: false });

export function StationArt({
  stage,
  role,
  className = '',
  style,
  lifted = false,
}: {
  stage: Stage;
  role: 'hub' | 'header' | 'fly';
  className?: string;
  style?: React.CSSProperties;
  lifted?: boolean;
}) {
  const flying = useContext(FlyingCtx);
  const three = useContext(ThreeCtx);
  const [ready, setReady] = useState(false);
  const hidden = role !== 'fly' && flying === stage.id;
  // The 3D view unmounts while its copy flies; show the still again until the remounted view has drawn.
  useEffect(() => {
    if (hidden) setReady(false);
  }, [hidden]);
  return (
    <div data-art={role === 'fly' ? undefined : stage.id} data-art-role={role} className={`pointer-events-none ${className}`} style={{ ...style, opacity: hidden ? 0 : 1 }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/3d/png/${stage.img}.webp`}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-bottom transition-[transform,filter,opacity] duration-[220ms] ease-out"
        style={{
          opacity: three && ready ? 0 : 1,
          transform: lifted ? 'translateY(-2%) rotate(-2deg) scale(1.02)' : 'none',
          filter: lifted ? 'drop-shadow(0 0 14px rgba(72,175,240,.55)) drop-shadow(0 18px 18px rgba(20,70,150,.22))' : 'drop-shadow(0 14px 14px rgba(20,70,150,.16))',
        }}
      />
      {three && !hidden && (
        <StationView id={stage.id} lifted={lifted} onReady={() => setReady(true)} />
      )}
    </div>
  );
}
