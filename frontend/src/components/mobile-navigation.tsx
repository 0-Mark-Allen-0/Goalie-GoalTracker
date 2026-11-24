import { useEffect, useState } from "react";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { Ellipsis } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { MORE_NAV, PRIMARY_NAV } from "@/lib/navigation";

const DOCK_LINKS = PRIMARY_NAV.map((item) => ({
  ...item,
  label: item.to === "/expenses" ? "Expense" : item.label,
}));

export function MobileNavigation() {
  const { pathname, key } = useLocation();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === key;
  const moreActive = MORE_NAV.some(({ to }) => matchPath(to, pathname));

  useEffect(() => {
    // Match the desktop navigation's md breakpoint. Release the modal if resized.
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => { if (desktop.matches) setOpenFor(null); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    // Browser back/forward shouldn't resurrect a sheet that used to be open there.
    setOpenFor(null);
  }, [key]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => setOpenFor(next ? key : null)}>
      <nav aria-label="Primary navigation" className="mobile-dock glass-panel md:hidden" data-sheet-open={open}>
        {DOCK_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className="dock-item">
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <Dialog.Trigger type="button" className="dock-item" data-active={moreActive} aria-current={moreActive ? "location" : undefined}>
          <Ellipsis aria-hidden="true" />
          <span>More</span>
        </Dialog.Trigger>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="mobile-more-backdrop md:hidden" />
        <Dialog.Content aria-describedby={undefined} className="mobile-more-dialog md:hidden">
          <div className="mobile-more-panel glass-panel">
            <Dialog.Title className="section-heading font-serif text-ink-1 px-2 pb-2">More</Dialog.Title>
            <nav aria-label="More destinations" className="grid gap-1">
              {MORE_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={() => setOpenFor(null)}
                  className="more-link"
                >
                  <span className="more-link-icon"><Icon aria-hidden="true" /></span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          {/* Keep the dock visible while the rest of the app is inert. Only More
              is interactive here; Radix traps focus and restores it on dismissal. */}
          <div className="mobile-dock mobile-dock-modal glass-panel">
            {DOCK_LINKS.map(({ to, label, icon: Icon }) => (
              <span key={to} aria-hidden="true" className="dock-item" data-active={Boolean(matchPath(to, pathname))}>
                <Icon />
                <span>{label}</span>
              </span>
            ))}
            <Dialog.Close
              type="button"
              aria-label="Close More navigation"
              className="dock-item mobile-more-close"
              data-active
            >
              <Ellipsis aria-hidden="true" />
              <span>More</span>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
