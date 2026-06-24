import { useState } from 'react';
import { useDevNotes } from './DevNotesProvider';
import { resolveStoredCoordinates, isElementVisible } from './utils/bugAnchors';
import type { UserStoryStepDot } from './types';

type DevNotesStepDotProps = {
  dot: UserStoryStepDot;
};

/**
 * A non-interactive marker for a recorded User Story step. The first step is
 * a deep blue; each subsequent step is a progressively lighter blue so the
 * sequence reads as a path. Unlike bug dots, step dots never carry a status
 * and are never "completed" — they're toggled as a group via Show Step Dots.
 */
function stepColor(index: number): string {
  // index is 1-based. Deep blue → lighter blue, capped so it stays legible.
  const lightness = Math.min(42 + (index - 1) * 7, 74);
  return `hsl(214, 84%, ${lightness}%)`;
}

function resolvePosition(dot: UserStoryStepDot): { x: number; y: number } | null {
  if (dot.x_position == null || dot.y_position == null) return null;
  if (typeof document !== 'undefined' && dot.target_selector) {
    let element: HTMLElement | null = null;
    try {
      element = document.querySelector(dot.target_selector) as HTMLElement | null;
    } catch {
      element = null;
    }
    if (element && isElementVisible(element)) {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }
  return resolveStoredCoordinates(dot.x_position, dot.y_position);
}

export default function DevNotesStepDot({ dot }: DevNotesStepDotProps) {
  const { compensate } = useDevNotes();
  const [showTooltip, setShowTooltip] = useState(false);

  const position = resolvePosition(dot);
  if (!position) return null;

  const compensated = compensate(position.x, position.y);
  const color = stepColor(dot.index);

  return (
    <div
      data-devnotes-step-dot
      style={{
        position: 'absolute',
        left: `${compensated.x}px`,
        top: `${compensated.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 9993,
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="flex items-center justify-center rounded-full border-2 border-white font-semibold text-white"
        style={{
          width: 22,
          height: 22,
          backgroundColor: color,
          fontSize: 11,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          cursor: 'default',
        }}
      >
        {dot.index}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[240px] rounded-lg bg-gray-800 p-2.5 text-white shadow-xl pointer-events-none z-[2147483647]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-300">
            {dot.storyTitle} · Step {dot.index}
          </div>
          <div className="mt-1 text-xs text-gray-100">{dot.body}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
