import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Shared hover-tooltip / hover-card primitive. Renders its children in a
// portal on document.body with fixed positioning, so it can never be clipped
// by an ancestor's `overflow: hidden` (the bug that hid the roster and
// benchmark tooltips). After mount it measures the real card and clamps it to
// stay fully on-screen, flipping to the other side of the anchor when it would
// spill off the bottom. This is the default way to build hover tooltips here.
//
// Two anchor kinds:
//   point — follows a cursor position (viewport coords); sits to the
//           lower-right and flips above the point near the bottom edge.
//   rect  — pinned to an element's bounding rect; sits below it, left-aligned,
//           and flips above the element near the bottom edge.
export type TooltipAnchor =
  | { kind: 'point'; x: number; y: number }
  | { kind: 'rect'; rect: { top: number; bottom: number; left: number } };

const MARGIN = 8;

export function TooltipPortal({ anchor, children }: { anchor: TooltipAnchor; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // useLayoutEffect so the measured position is applied before the browser
  // paints — no one-frame flash at the wrong spot.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left: number;
    let top: number;
    if (anchor.kind === 'point') {
      left = anchor.x + 16;
      top = anchor.y + 14;
      if (top + h > vh - MARGIN) top = anchor.y - h - 14; // flip above the cursor
    } else {
      left = anchor.rect.left;
      top = anchor.rect.bottom + 8;
      if (top + h > vh - MARGIN) top = anchor.rect.top - h - 8; // flip above the element
    }
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    top = Math.max(MARGIN, top);
    setPos({ left, top });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        zIndex: 300,
        pointerEvents: 'none',
        visibility: pos ? 'visible' : 'hidden', // hidden for the measure pass
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
