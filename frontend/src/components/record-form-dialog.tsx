import { useEffect, useRef, type ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function RecordFormDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;
    const syncViewport = () => {
      const node = content.current;
      if (!node) return;
      // In browsers where the keyboard overlays the layout viewport, keep the
      // scrollable form in the visible area. Leave pinch zoom under user control.
      if (viewport.scale === 1 && viewport.height < window.innerHeight - 80) {
        node.style.setProperty("--record-viewport-height", `${viewport.height}px`);
        node.style.setProperty("--record-viewport-top", `${viewport.offsetTop}px`);
      } else {
        node.style.removeProperty("--record-viewport-height");
        node.style.removeProperty("--record-viewport-top");
      }
    };
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    syncViewport();
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={content}
        aria-describedby={undefined}
        className="record-dialog glass-panel no-scrollbar"
        onOpenAutoFocus={(event) => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          // Start at the heading instead of immediately opening the mobile keyboard.
          event.preventDefault();
          heading.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="text-left pr-10">
          <DialogTitle ref={heading} tabIndex={-1} className="form-heading font-serif font-normal text-ink-1 outline-none">
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
