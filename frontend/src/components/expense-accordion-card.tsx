import type { Entry, Income, Label } from "@/api/types";
import { EntryActions } from "@/components/entry-actions";
import { MoneyText } from "@/components/data-display";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { incomeColour, incomeTitle, longDate } from "@/lib/income";
import type { MoneyFormat } from "@/lib/money";
import { staggerStyle } from "@/lib/motion";

export function ExpenseAccordionCard({
  entry,
  incomes,
  labels,
  format,
  index,
  expanded,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  incomes: Map<string, Income>;
  labels: Map<string, Label>;
  format: MoneyFormat;
  index: number;
  expanded: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry, trigger: HTMLButtonElement) => void;
}) {
  const category = entry.categoryId ? labels.get(entry.categoryId)?.name : undefined;
  const account = entry.accountId ? labels.get(entry.accountId)?.name : undefined;

  return (
    <AccordionItem
      value={entry.id}
      className="glass-card glass-card-strong transaction-glass expense-card border last:border-b md:hidden animate-in fade-in duration-(--motion-base) fill-mode-both"
      data-tone="expense"
      style={staggerStyle(index)}
    >
      <AccordionTrigger className="expense-trigger items-center gap-2.5 px-4 py-3.5 hover:no-underline">
        <span className="expense-summary">
          <span className="expense-title">{entry.description}</span>
          <MoneyText minor={entry.total} format={format} className="expense-total" />
          <time dateTime={entry.date.slice(0, 10)} className="expense-date">
            {longDate(entry.date, format.locale)}
          </time>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4" inert={!expanded}>
        <div className="space-y-3.5 border-t border-hairline pt-3.5">
          {entry.splits.length > 0 && (
            <div className="space-y-2">
              <p className="meta-label">Spent from</p>
              <ul className="space-y-1.5">
                {entry.splits.map((split) => {
                  const income = incomes.get(split.incomeId);
                  return (
                    <li key={split.incomeId} className="expense-source transaction-glass" data-tone="income">
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: incomeColour(income, labels) }}
                      />
                      <span className="min-w-0 flex-1 wrap-anywhere">{incomeTitle(income, format.locale)}</span>
                      <MoneyText minor={split.amount} format={format} className="min-w-0 max-w-[48%] wrap-anywhere text-right text-ink-1" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <dl className="space-y-2.5">
              <div>
                <dt className="meta-label">Category</dt>
                <dd className="font-semibold wrap-anywhere">{category ?? "No category"}</dd>
              </div>
              <div>
                <dt className="meta-label">Account</dt>
                <dd className="font-semibold wrap-anywhere">{account ?? "No account"}</dd>
              </div>
            </dl>
            <EntryActions mobileExpense onEdit={() => onEdit(entry)} onDelete={(trigger) => onDelete(entry, trigger)} />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
