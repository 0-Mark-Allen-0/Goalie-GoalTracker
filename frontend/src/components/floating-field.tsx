import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { SelectTrigger, SelectValue } from "@/components/ui/select";

export function RequiredMark() {
  return <span aria-hidden="true" className="required-mark"> *</span>;
}

interface FloatingControlProps {
  id: string;
  label: string;
  filled: boolean;
  required?: boolean;
  multiline?: boolean;
  children: ReactNode;
}

function FloatingControl({ id, label, filled, required, multiline, children }: FloatingControlProps) {
  return (
    <div className="floating-control" data-filled={filled} data-multiline={multiline}>
      <label id={`${id}-label`} htmlFor={id} className="floating-label">
        {label}{required && <RequiredMark />}
      </label>
      {children}
    </div>
  );
}

type FloatingInputProps = Omit<ComponentProps<"input">, "value"> & {
  label: string;
  value: string;
};

export function FloatingInput({ id, label, value, required, className, ...props }: FloatingInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FloatingControl id={fieldId} label={label} filled={value !== ""} required={required}>
      <input {...props} id={fieldId} value={value} required={required} className={cn("floating-value", className)} />
    </FloatingControl>
  );
}

type FloatingTextareaProps = Omit<ComponentProps<"textarea">, "value"> & {
  label: string;
  value: string;
};

export function FloatingTextarea({ id, label, value, required, className, ...props }: FloatingTextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FloatingControl id={fieldId} label={label} filled={value !== ""} required={required} multiline>
      <textarea {...props} id={fieldId} value={value} required={required} className={cn("floating-value", className)} />
    </FloatingControl>
  );
}

export function FloatingSelectTrigger({
  label,
  filled,
  required,
}: {
  label: string;
  filled: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <FloatingControl id={id} label={label} filled={filled} required={required}>
      <SelectTrigger
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={filled ? `${id}-value` : undefined}
        aria-required={required}
        className="floating-value floating-select"
      >
        <SelectValue id={`${id}-value`} />
      </SelectTrigger>
    </FloatingControl>
  );
}
