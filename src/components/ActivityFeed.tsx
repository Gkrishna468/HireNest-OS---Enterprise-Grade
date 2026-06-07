import { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  PlayCircle,
} from "lucide-react";
import { subscribeToEvents } from "../services/eventBus";

export function ActivityFeed({ recipients }: { recipients: string[] }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    let orgId = undefined;
    let role = "vendor";
    if (recipients.includes("GLOBAL_CLIENT")) role = "client";
    if (recipients.includes("GLOBAL_ADMIN")) role = "admin";

    const unsub = subscribeToEvents(
      (evts) => {
        setEvents(evts.slice(0, 20));
      },
      20,
      orgId, 
      role 
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
          events.map((evt, idx) => {
            const mappedType = evt.type === "CandidateEnriched" || evt.type === "CandidateMatched" ? "success" : "info";
            const title = evt.title || (String(evt.type).replace(/([A-Z])/g, ' $1').trim());
            const desc = evt.message || `Action by ${evt.actorRole || 'System'} on ${evt.entityType}`;

            return (
              <div key={evt.id} className="relative pl-6">
                {idx !== events.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-slate-100" />
                )}
                <div className="absolute left-0 top-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${getTypeColor(mappedType)} border-2 border-white`}
                  >
                    {getIcon(mappedType)}
                  </div>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-bold text-slate-700 leading-tight">
                      {title}
                    </h4>
                    <time className="text-[10px] font-bold tracking-widest uppercase text-slate-400 whitespace-nowrap pt-0.5">
                      {evt.timestamp?.seconds
                        ? new Date(
                            evt.timestamp.seconds * 1000,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </time>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
