import { useEffect, useState } from "react";
import { X, Bell, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useIdentityStore } from "../stores/IdentityStore";

export function LiveToaster({
  orgId,
  userRole,
}: {
  orgId?: string;
  userRole?: string;
}) {
  const [toasts, setToasts] = useState<any[]>([]);
  const { subscribeToNotifications } = useIdentityStore();

  useEffect(() => {
    const unsub = subscribeToNotifications({ orgId, userRole }, (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    });
    return () => { if (unsub) unsub(); };
  }, [orgId, userRole, subscribeToNotifications]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-80 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-right-8 fade-in text-white relative flex gap-3 items-start overflow-hidden"
        >
          {/* Accent Line */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              t.type === "success"
                ? "bg-emerald-500"
                : t.type === "urgent"
                  ? "bg-rose-500"
                  : t.type === "warning"
                    ? "bg-amber-500"
                    : "bg-indigo-500"
            }`}
          />

          <div className="mt-0.5">
            {t.type === "success" && (
              <CheckCircle className="text-emerald-400" size={16} />
            )}
            {t.type === "urgent" && (
              <AlertTriangle className="text-rose-400" size={16} />
            )}
            {t.type === "warning" && (
              <AlertTriangle className="text-amber-400" size={16} />
            )}
            {(t.type === "info" || !t.type) && (
              <Info className="text-indigo-400" size={16} />
            )}
          </div>
          <div className="flex-1 pr-6">
            <h4 className="font-bold text-sm tracking-wide mb-1">{t.title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.message}
            </p>
          </div>
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
            className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
