// frontend/src/lib/palette.ts
//
// The categorical palette that carries source identity across the whole app.
// Colour is load-bearing here, not decoration: it is how you tell salary money
// from interest money at a glance in a stacked bar.
//
// Validated against the app canvas (#F4F2ED) with the data-viz six checks:
//   lightness band PASS · chroma floor PASS
//   CVD separation PASS (worst adjacent dE 9.1, protan)
//   normal-vision floor PASS (worst adjacent dE 19.6)
//   contrast WARN on 4 slots -> relief is mandatory, which is why every segmented
//   bar in this app ships a legend with amounts rather than relying on colour alone.
//
// The ORDER is the colourblind-safety mechanism, not a style choice. Do not
// reorder, do not append a ninth hue: past eight, fold into "Other".

export interface SourceColour {
  slot: number;
  name: string;
  hex: string;
}

export const SOURCE_COLOURS: SourceColour[] = [
  { slot: 0, name: "Blue", hex: "#2a78d6" },
  { slot: 1, name: "Orange", hex: "#eb6834" },
  { slot: 2, name: "Aqua", hex: "#1baf7a" },
  { slot: 3, name: "Yellow", hex: "#eda100" },
  { slot: 4, name: "Magenta", hex: "#e87ba4" },
  { slot: 5, name: "Green", hex: "#008300" },
  { slot: 6, name: "Violet", hex: "#4a3aa7" },
  { slot: 7, name: "Red", hex: "#e34948" },
];

export const MAX_COLOUR_SLOT = SOURCE_COLOURS.length - 1;

/** Neutral used for money that is already spent — it should not compete for attention. */
export const SPENT_COLOUR = "#eae7e0";

export function colourForSlot(slot: number | undefined): string {
  if (slot === undefined || slot < 0 || slot > MAX_COLOUR_SLOT) {
    return SOURCE_COLOURS[0].hex;
  }
  return SOURCE_COLOURS[slot].hex;
}

/**
 * Suggests the next unused slot when creating a source, so a new source is
 * distinguishable by default instead of colliding with an existing one.
 */
export function nextFreeSlot(usedSlots: number[]): number {
  const used = new Set(usedSlots);
  for (let slot = 0; slot <= MAX_COLOUR_SLOT; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return 0;
}
