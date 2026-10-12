import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CheckCircle, X } from "@phosphor-icons/react";
import { ToastContext, type ToastItem } from "./ToastContext";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const showToast = useCallback(
    (message: string, kind: ToastItem["kind"] = "success") => {
      const id = crypto.randomUUID();
      setItems((current) => [...current.slice(-2), { id, message, kind }]);
      window.setTimeout(
        () => setItems((current) => current.filter((item) => item.id !== id)),
        4800,
      );
    },
    [],
  );
  const value = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div className={`toast toast--${item.kind}`} key={item.id}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>{item.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() =>
                setItems((current) =>
                  current.filter((toast) => toast.id !== item.id),
                )
              }
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
