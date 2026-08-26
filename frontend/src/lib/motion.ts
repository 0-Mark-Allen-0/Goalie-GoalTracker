// frontend/src/lib/motion.ts
// Motion is defined once in index.css (--motion-fast/base/slow/stagger) and consumed
// through these helpers, so the app keeps a single tight rhythm rather than a spread
// of hand-picked durations.
import type { CSSProperties } from "react";

/**
 * Staggered entrance delay for a list of cards or rows.
 *
 * Capped so a long list still finishes quickly — an eight-item cap keeps the tail
 * under a quarter of a second instead of cascading down the page.
 */
export function staggerStyle(index: number, max = 8): CSSProperties {
  return { animationDelay: `calc(var(--motion-stagger) * ${Math.min(index, max)})` };
}
