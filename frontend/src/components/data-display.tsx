// frontend/src/components/data-display.tsx
// Shared read-only building blocks: stat tiles, the segmented source bar, source
// chips and empty states.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyCompact, percentOf, type MoneyFormat } from "@/lib/money";

// --- Money text --------------------------------------------------------------

interface MoneyTextProps {
  minor: number;
  format: MoneyFormat;
  /** Compact ("5L") for hero numbers and axes only — the exact value goes in `title`. */
  compact?: boolean;
  className?: string;
}

export function MoneyText({ minor, format, compact = false, className }: MoneyTextProps) {
  const exact = formatMoney(minor, format);
  return (
    <span className={cn("tabular", className)} title={exact}>
      {compact ? formatMoneyCompact(minor, format) : exact}
    </span>
  );
}

// --- Stat tile ---------------------------------------------------------------

interface StatTileProps {
  label: string;
  minor: number;
  format: MoneyFormat;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
}

export function StatTile({ label, minor, format, hint, accent, icon }: StatTileProps) {
  return (
    <div className="glass-card glass-card-strong glass-card-hover p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-ink-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {/* Compact on purpose: this is a hero number, and `title` carries the exact value. */}
      <MoneyText
        minor={minor}
        format={format}
        compact
        className="font-serif text-3xl sm:text-4xl leading-tight"
      />
      {hint && (
        <span className="text-xs font-medium text-ink-3" style={accent ? { color: accent } : undefined}>
          {hint}
        </span>
      )}
    </div>
  );
}

// --- Segmented bar -----------------------------------------------------------

export interface BarSegment {
  key: string;
  label: string;
  amount: number;
  colour: string;
  /** Hatched = reserved: claimed by a goal, but still sitting in the source. */
  hatched?: boolean;
}

interface SegmentedBarProps {
  segments: BarSegment[];
  total: number;
  format: MoneyFormat;
  height?: number;
  showLegend?: boolean;
  emptyHint?: string;
}

/**
 * The signature visual: one bar showing WHICH money makes up a total.
 *
 * A legend with amounts is shown by default and is not decorative — four slots in
 * the palette sit below 3:1 against the canvas, so identity must never rest on
 * colour alone.
 */
export function SegmentedBar({
  segments,
  total,
  format,
  height = 12,
  showLegend = true,
  emptyHint,
}: SegmentedBarProps) {
  const visible = segments.filter((segment) => segment.amount > 0);

  return (
    <div className="space-y-2.5">
      <div
        className="w-full rounded-full bg-surface-sunk overflow-hidden flex gap-[2px]"
        style={{ height }}
        role="img"
        aria-label={visible
          .map((s) => `${s.label} ${formatMoney(s.amount, format)}`)
          .join(", ")}
      >
        {visible.map((segment) => (
          <div
            key={segment.key}
            className={cn("h-full shrink-0", segment.hatched && "texture-hatch")}
            style={{
              width: `${percentOf(segment.amount, total)}%`,
              backgroundColor: segment.colour,
              transition: "width var(--motion-slow) var(--ease-out)",
            }}
            title={`${segment.label}: ${formatMoney(segment.amount, format)}`}
          />
        ))}
      </div>

      {showLegend && visible.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {visible.map((segment) => (
            <div key={segment.key} className="flex items-center gap-1.5 text-xs">
              <span
                className={cn("w-2.5 h-2.5 rounded-full shrink-0", segment.hatched && "texture-hatch")}
                style={{ backgroundColor: segment.colour }}
              />
              <span className="font-medium text-ink-2">{segment.label}</span>
              <MoneyText
                minor={segment.amount}
                format={format}
                className="font-semibold text-ink-1"
              />
            </div>
          ))}
        </div>
      )}

      {showLegend && visible.length === 0 && emptyHint && (
        <p className="text-xs font-medium text-ink-3">{emptyHint}</p>
      )}
    </div>
  );
}

// --- Source chip -------------------------------------------------------------

export function SourceChip({
  name,
  colour,
  hatched,
  className,
}: {
  name: string;
  colour: string;
  hatched?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/70 border border-white/80 px-2.5 py-0.5 text-xs font-semibold text-ink-2",
        className,
      )}
    >
      <span
        className={cn("w-2 h-2 rounded-full shrink-0", hatched && "texture-hatch")}
        style={{ backgroundColor: colour }}
      />
      {name}
    </span>
  );
}

// --- Empty state -------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card glass-card-strong py-16 px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-brand/40 mb-4">{icon}</div>
      <h3 className="font-serif text-2xl text-ink-1 mb-2">{title}</h3>
      <p className="text-ink-2 font-medium max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}
