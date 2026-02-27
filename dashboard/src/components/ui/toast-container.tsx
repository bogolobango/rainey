"use client";

import type { Toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

interface ToastContainerProps {
  toasts: Toast[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 fade-in-0 duration-200 ${
            toast.type === "success"
              ? "bg-highlight-green/10 border-highlight-green/30 text-highlight-green"
              : toast.type === "error"
              ? "bg-highlight-coral/10 border-highlight-coral/30 text-highlight-coral"
              : "bg-background border-border text-foreground"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {toast.type === "error" && <XCircle className="h-4 w-4 flex-shrink-0" />}
          {toast.type === "info" && <Info className="h-4 w-4 flex-shrink-0" />}
          <p className="text-sm font-sans flex-1">{toast.message}</p>
          <button onClick={() => dismiss(toast.id)} className="flex-shrink-0 opacity-70 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
