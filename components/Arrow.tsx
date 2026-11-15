/**
 * The highlighted arrow that marks where to go. Drawn rather than typed so its stroke
 * can match the headline's weight. The caller sets its size, padding and direction.
 * It nudges the way it points when a `group` around it is hovered.
 *
 * `angle` turns the arrow clockwise from pointing right while its highlight stays square:
 * use it for diagonals, where rotating the whole arrow would tip the highlight into a diamond.
 */
export function Arrow({ className, angle = 0 }: { className: string; angle?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.25"
      strokeLinecap="square"
      className={`pointer-events-none shrink-0 overflow-visible bg-highlight text-on-highlight ${className}`}
    >
      <g transform={angle ? `rotate(${angle} 12 12)` : undefined}>
        <path
          d="M2 12h18M13.2 3.5l8.5 8.5-8.5 8.5"
          className="group-hover:translate-x-[1.5px] motion-safe:transition-transform motion-safe:duration-150"
        />
      </g>
    </svg>
  );
}
