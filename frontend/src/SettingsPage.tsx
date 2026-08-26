// frontend/src/SettingsPage.tsx
// Currency + locale, and the editable label lists behind every picker in the app.
import { useEffect, useState } from "react";
import { Check, Palette, Pencil, Tag, Trash2, Wallet, X } from "lucide-react";

import { deleteLabel, updateLabel, updateSettings } from "@/api";
import type { Label as LabelModel, LabelKind } from "@/api/types";
import { qk, useLabels, useSession, useSimpleMutation } from "@/hooks/queries";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { colourForSlot } from "@/lib/palette";
import { AppShell, LoadingScreen, PageHeader } from "@/components/AppShell";
import { ColourPicker } from "@/components/form-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
];

// Compact notation belongs to the LOCALE, not the currency: en-IN turns 500000 into
// "5L", en-US into "500K", de-DE leaves it as "500.000".
const LOCALES = [
  { code: "en-IN", name: "English (India) — lakh / crore" },
  { code: "en-US", name: "English (US) — K / M / B" },
  { code: "en-GB", name: "English (UK)" },
  { code: "de-DE", name: "German" },
  { code: "fr-FR", name: "French" },
  { code: "ja-JP", name: "Japanese" },
];

const SAMPLES = [500000, 5000000, 125000];

const MANAGER_META: Record<LabelKind, { title: string; blurb: string; icon: typeof Tag }> = {
  income_category: {
    title: "Income categories",
    blurb:
      "How you group earnings — and the only thing that carries colour. There are far too many individual earnings to give each its own hue, so the category tints them.",
    icon: Palette,
  },
  expense_category: {
    title: "Expense categories",
    blurb: "What an expense was for. Add new ones straight from any expense form.",
    icon: Tag,
  },
  account: {
    title: "Accounts",
    blurb:
      "Where cash landed — HDFC, wallet, cash. A note on the entry, not a balance Goalie tracks.",
    icon: Wallet,
  },
};

function LabelManager({ kind }: { kind: LabelKind }) {
  const { data: labels = [] } = useLabels(kind);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [colourFor, setColourFor] = useState<LabelModel | null>(null);

  const meta = MANAGER_META[kind];
  const Icon = meta.icon;
  const coloured = kind === "income_category";
  const keys = [qk.labels(kind), qk.labels()];

  const renameMutation = useSimpleMutation(
    async (label: LabelModel) => (await updateLabel(label.id, { name: draft.trim() })).data,
    keys,
    { successMessage: "Renamed.", onSuccess: () => setEditingId(null) },
  );

  const colourMutation = useSimpleMutation(
    async ({ label, slot }: { label: LabelModel; slot: number }) =>
      (await updateLabel(label.id, { colourSlot: slot })).data,
    [...keys, ["incomes"], ["entries"]],
    { successMessage: "Colour updated.", onSuccess: () => setColourFor(null) },
  );

  const removeMutation = useSimpleMutation(
    async (label: LabelModel) => (await deleteLabel(label.id)).data,
    [...keys, ["entries"], ["incomes"]],
  );

  return (
    <section className="glass-card glass-card-strong p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-5 h-5 text-brand" />
        <h2 className="font-serif text-2xl text-ink-1">{meta.title}</h2>
      </div>
      <p className="text-sm font-medium text-ink-2 mb-4">{meta.blurb}</p>

      {labels.length === 0 ? (
        <p className="text-sm text-ink-3 font-medium">
          None yet — they appear here once you create one from an entry form.
        </p>
      ) : (
        <ul className="space-y-2">
          {labels.map((label) => (
            <li
              key={label.id}
              className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white/80 px-3 py-2"
            >
              {editingId === label.id ? (
                <>
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="field h-9 flex-1"
                  />
                  <button
                    aria-label="Save name"
                    onClick={() => draft.trim() && renameMutation.mutate(label)}
                    className="w-8 h-8 rounded-full grid place-items-center text-good hover:bg-white"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Cancel rename"
                    onClick={() => setEditingId(null)}
                    className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {coloured && (
                    <button
                      aria-label={`Change colour for ${label.name}`}
                      onClick={() => setColourFor(label)}
                      className="w-5 h-5 rounded-full shrink-0 hover:scale-110 transition-transform duration-[--motion-fast]"
                      style={{ backgroundColor: colourForSlot(label.colourSlot) }}
                    />
                  )}
                  <span className="flex-1 font-semibold text-ink-1 truncate">{label.name}</span>
                  <button
                    aria-label={`Rename ${label.name}`}
                    onClick={() => {
                      setEditingId(label.id);
                      setDraft(label.name);
                    }}
                    className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink-1 hover:bg-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    aria-label={`Delete ${label.name}`}
                    onClick={() => removeMutation.mutate(label)}
                    className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-critical hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(colourFor)} onOpenChange={(next) => !next && setColourFor(null)}>
        <DialogContent className="sm:max-w-sm rounded-[32px] bg-canvas border-hairline p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-ink-1">
              Colour for {colourFor?.name}
            </DialogTitle>
          </DialogHeader>
          {colourFor && (
            <div className="pt-2">
              <ColourPicker
                value={colourFor.colourSlot}
                onChange={(slot) => colourMutation.mutate({ label: colourFor, slot })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function SettingsPage() {
  const { data: user, isLoading } = useSession();
  const [currency, setCurrency] = useState("INR");
  const [locale, setLocale] = useState("en-IN");

  useEffect(() => {
    if (user?.settings) {
      setCurrency(user.settings.currency);
      setLocale(user.settings.locale);
    }
  }, [user]);

  const mutation = useSimpleMutation(
    async () => (await updateSettings({ currency, locale })).data,
    [qk.session],
    { successMessage: "Settings saved." },
  );

  const dirty = user?.settings.currency !== currency || user?.settings.locale !== locale;

  if (isLoading) {
    return (
      <AppShell>
        <LoadingScreen />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle={user?.email ?? undefined} />

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-card glass-card-strong p-6">
          <h2 className="font-serif text-2xl text-ink-1 mb-1">Currency &amp; format</h2>
          <p className="text-sm font-medium text-ink-2 mb-4">
            Display only. Changing these never converts a single stored amount — ₹5,000
            simply becomes $5,000.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="field w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-hairline bg-white">
                  {CURRENCIES.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.code} · {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-ink-2">Number format</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger className="field w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-hairline bg-white">
                  {LOCALES.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl bg-white/70 border border-white/80 p-4 mt-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Preview</p>
            {SAMPLES.map((sample) => (
              <p key={sample} className="text-sm font-semibold text-ink-1 tabular">
                {formatMoney(sample * 100, { currency, locale })}
                <span className="text-ink-3 font-medium">
                  {" · "}
                  {formatMoneyCompact(sample * 100, { currency, locale })}
                </span>
              </p>
            ))}
          </div>

          <button
            onClick={() => mutation.mutate(undefined as void)}
            disabled={!dirty || mutation.isPending}
            className="btn-primary w-full h-11 mt-4"
          >
            {mutation.isPending ? "Saving…" : "Save settings"}
          </button>
        </section>

        <div className="space-y-6">
          <LabelManager kind="income_category" />
          <LabelManager kind="expense_category" />
          <LabelManager kind="account" />
        </div>
      </div>
    </AppShell>
  );
}
