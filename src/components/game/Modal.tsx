"use client";

import { useEffect, type ReactNode } from "react";

/**
 * A dialog over the island. Escape and the close button both call onClose. The island pauses
 * while a dialog is open, because the store reports it as open.
 */
export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`eco-panel-paper ink-zone max-h-[92dvh] w-full overflow-y-auto ${wide ? "max-w-3xl" : "max-w-xl"}`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-cream/10 px-5 py-3">
          <h2 className="font-display text-lg text-honey">{title}</h2>
          <button type="button" onClick={onClose} className="eco-btn-ghost" aria-label="Close dialog">
            Close (Esc)
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
