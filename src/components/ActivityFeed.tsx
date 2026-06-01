import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  PlayCircle,
} from "lucide-react";

export function ActivityFeed({ recipients }: { recipients: string[] }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (recipients.length === 0) return;

    const q = query(
      collection(db, "event_ledger"),
      where("recipients", "array-contains-any", recipients),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const evts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(evts);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "event_ledger");
      },
    );

    return () => unsub();
  }, [recipients]);

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "success":
        return "text-emerald-500 bg-emerald-50";
      case "urgent":
        return "text-rose-500 bg-rose-50";
      case "warning":
        return "text-amber-500 bg-amber-50";
      default:
        return "text-indigo-500 bg-indigo-50";
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={14} />;
      case "urgent":
        return <AlertTriangle size={14} />;
      case "warning":
        return <Clock size={14} />;
      default:
        return <Info size={14} />;
    }
  };

  return (
    <div className="bg-white border text-left border-slate-200 rounded-2xl shadow-sm flex flex-col h-[400px]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 rounded-t-2xl backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <PlayCircle className="text-slate-400" size={16} />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
            Global Event Ledger
          </h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Clock size={16} className="text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              No Events Logged
            </p>
          </div>
        ) : (
          events.map((evt, idx) => (
            <div key={evt.id} className="relative pl-6">
              {idx !== events.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-slate-100" />
              )}
              <div className="absolute left-0 top-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${getTypeColor(evt.type)} border-2 border-white`}
                >
                  {getIcon(evt.type)}
                </div>
              </div>
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-sm font-bold text-slate-700 leading-tight">
                    {evt.title}
                  </h4>
                  <time className="text-[10px] font-bold tracking-widest uppercase text-slate-400 whitespace-nowrap pt-0.5">
                    {evt.createdAt
                      ? new Date(
                          evt.createdAt.seconds * 1000,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Just now"}
                  </time>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {evt.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
