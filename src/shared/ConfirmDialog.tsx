import React, { useEffect, useRef } from 'react';

export function ConfirmDialog(props: {
  open: boolean; title: string; message?: string; confirmLabel: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const { open, title, message, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel } = props;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel(); return; }
    if (e.key === 'Tab') {
      const first = cancelRef.current, last = okRef.current;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {message && <p className="mt-1 text-sm text-slate-600">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button ref={cancelRef} data-testid="confirm.cancel" className="px-3 min-h-[48px] rounded-xl border" onClick={onCancel}>{cancelLabel}</button>
          <button ref={okRef} data-testid="confirm.ok" className="px-3 min-h-[48px] rounded-xl text-white bg-gradient-to-r from-purple-600 to-teal-500" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
