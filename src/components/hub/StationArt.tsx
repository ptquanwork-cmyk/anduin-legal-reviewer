'use client';
import { createContext, useContext } from 'react';
import type { Stage } from '../../lib/stages';

/** While an object is flying between hub and header, the destination copy stays hidden. */
export const FlyingCtx = createContext<string | null>(null);

export function StationArt({
  stage,
  role,
  className = '',
  style,
  lifted = false,
}: {
  stage: Stage;
  role: 'hub' | 'header';
  className?: string;
  style?: React.CSSProperties;
  lifted?: boolean;
}) {
  const flying = useContext(FlyingCtx);
  return (
    <div
      data-art={stage.id}
      data-art-role={role}
      className={`pointer-events-none ${className}`}
      style={{ ...style, opacity: flying === stage.id ? 0 : 1 }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/3d/png/${stage.img}.webp`}
        alt=""
        draggable={false}
        className="h-full w-full object-contain object-bottom transition-[transform,filter] duration-[220ms] ease-out"
        style={{
          transform: lifted ? 'translateY(-2%) rotate(-2deg) scale(1.02)' : 'none',
          filter: lifted ? 'drop-shadow(0 0 14px rgba(72,175,240,.55)) drop-shadow(0 18px 18px rgba(20,70,150,.22))' : 'drop-shadow(0 14px 14px rgba(20,70,150,.16))',
        }}
      />
    </div>
  );
}
