import { createContext } from "react";

export interface ToastItem {
  id: string;
  message: string;
  kind: "success" | "error";
}
export interface ToastValue {
  showToast: (message: string, kind?: ToastItem["kind"]) => void;
}
export const ToastContext = createContext<ToastValue | null>(null);
