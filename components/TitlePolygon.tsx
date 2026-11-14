"use client";

import { useEffect, useRef } from "react";

const SIDES = 12;

/** How far the outline drifts toward the pointer at the edge of the screen, in pixels. */
const DRIFT_PX = 18;

/** How far it turns as the pointer crosses the screen, in degrees either way. */
const TURN_DEG = 3;

const POINTS = Array.from({ length: SIDES }, (_, i) => {
  const angle = (i / SIDES) * Math.PI * 2 - Math.PI / 2;
  return `${(50 + 49 * Math.cos(angle)).toFixed(2)},${(50 + 49 * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/**
 * The outline behind the name on the Title panel: a 12-sided polygon that turns
 * slowly and leans a little toward the mouse. It holds still for reduced motion.
 */
export function TitlePolygon() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // Pointer position from -1 to 1 across the screen, 0 at the center.
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      svg.style.transform = `translate(${x * DRIFT_PX}px, ${y * DRIFT_PX}px) rotate(${x * TURN_DEG}deg)`;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="pointer-events-none absolute inset-0 m-auto size-[min(94vw,94vh)] text-mute/40 transition-transform duration-500 ease-out"
    >
      <polygon
        points={POINTS}
        vectorEffect="non-scaling-stroke"
        className="origin-center [transform-box:fill-box] motion-safe:animate-turn"
      />
    </svg>
  );
}
