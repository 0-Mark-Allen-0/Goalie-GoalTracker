// frontend/src/lib/money.ts
//
// Money is an integer number of hundredths (paise / cents) everywhere — in the
// database, on the wire, and in React state. Floats only ever exist inside Intl.
//
// Compact notation is LOCALE-driven, not currency-driven: "5L" is what en-IN does
// with 500000, and en-US would render the same number "500K". So the user setting
// is a pair, currency + locale, and both are passed through to Intl.

export const MINOR_UNITS_PER_MAJOR = 100;

export interface MoneyFormat {
  currency: string;
  locale: string;
}

export const DEFAULT_MONEY_FORMAT: MoneyFormat = {
  currency: "INR",
  locale: "en-IN",
};

const cache = new Map<string, Intl.NumberFormat>();

function formatter(key: string, build: () => Intl.NumberFormat): Intl.NumberFormat {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = build();
  cache.set(key, made);
  return made;
}

function safe<T>(build: () => T, fallback: () => T): T {
  // An invalid currency or locale from settings must degrade, never blank the page.
  try {
    return build();
  } catch {
    return fallback();
  }
}

/** Decimal places this currency actually uses (JPY 0, INR 2, KWD 3). */
export function currencyDigits({ currency, locale }: MoneyFormat): number {
  return safe(
    () =>
      new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2,
    () => 2,
  );
}

/**
 * Full precision, for tables, inputs, totals and tooltips — anywhere the exact
 * number matters. Pair with the `.tabular` class so columns line up.
 */
export function formatMoney(minor: number, fmt: MoneyFormat = DEFAULT_MONEY_FORMAT): string {
  const value = minor / MINOR_UNITS_PER_MAJOR;
  return safe(
    () =>
      formatter(`full:${fmt.locale}:${fmt.currency}`, () =>
        new Intl.NumberFormat(fmt.locale, { style: "currency", currency: fmt.currency }),
      ).format(value),
    () => `${fmt.currency} ${value.toFixed(2)}`,
  );
}

/**
 * Abbreviated, for hero stats and chart axes only.
 *
 * NEVER use this where exactness matters — "5L" hides whether the number is
 * 500,000 or 512,000. Always expose the full value alongside it (a `title`
 * attribute or a tooltip); `MoneyText` below does that for you.
 */
export function formatMoneyCompact(
  minor: number,
  fmt: MoneyFormat = DEFAULT_MONEY_FORMAT,
): string {
  const value = minor / MINOR_UNITS_PER_MAJOR;
  return safe(
    () =>
      formatter(`compact:${fmt.locale}:${fmt.currency}`, () =>
        new Intl.NumberFormat(fmt.locale, {
          style: "currency",
          currency: fmt.currency,
          notation: "compact",
          compactDisplay: "short",
          maximumFractionDigits: 1,
        }),
      ).format(value),
    () => formatMoney(minor, fmt),
  );
}

/** Bare number, no currency symbol — for axis ticks and dense table cells. */
export function formatAmount(minor: number, fmt: MoneyFormat = DEFAULT_MONEY_FORMAT): string {
  const digits = currencyDigits(fmt);
  return safe(
    () =>
      formatter(`plain:${fmt.locale}:${digits}`, () =>
        new Intl.NumberFormat(fmt.locale, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }),
      ).format(minor / MINOR_UNITS_PER_MAJOR),
    () => (minor / MINOR_UNITS_PER_MAJOR).toFixed(digits),
  );
}

function decimalSeparator(locale: string): string {
  return safe(
    () =>
      new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === "decimal")
        ?.value ?? ".",
    () => ".",
  );
}

/**
 * Parses what the user typed in a money field into minor units.
 *
 * Accepts plain digits and locale group separators ("5,00,000", "500.000" in de-DE).
 * Deliberately does NOT accept "5L" — the abbreviation is ambiguous as input, so the
 * form shows a live formatted preview underneath the field instead.
 *
 * Returns null when the text is not a usable number.
 */
export function parseMoneyInput(
  text: string,
  fmt: MoneyFormat = DEFAULT_MONEY_FORMAT,
): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const decimal = decimalSeparator(fmt.locale);
  // Strip everything that is not a digit or the locale's decimal mark; that removes
  // group separators, currency symbols and stray spaces in one pass.
  const cleaned = trimmed
    .replace(new RegExp(`[^0-9${decimal === "." ? "\\." : decimal}]`, "g"), "")
    .replace(decimal, ".");
  if (!cleaned || cleaned === ".") return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * MINOR_UNITS_PER_MAJOR);
}

/** Minor units back into an editable major-unit string (for populating edit forms). */
export function minorToInput(minor: number): string {
  if (minor % MINOR_UNITS_PER_MAJOR === 0) return String(minor / MINOR_UNITS_PER_MAJOR);
  return (minor / MINOR_UNITS_PER_MAJOR).toFixed(2);
}

/** Percentage of `total` that `part` represents, clamped to 0–100. */
export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}
