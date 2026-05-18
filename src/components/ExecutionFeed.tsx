import React, { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Zap, Clock, MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { cn } from "../lib/utils";

interface ExecutionFeedProps {
  requirementId?: string;
  dealId?: string;
  className?: string;
}

export function ExecutionFeed({ requirementId, dealId, className }: ExecutionFeedProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (dealId) {
      q = query(collection(db, "execution_events"), where("targetId", "==", dealId), orderBy("timestamp", "desc"));
    } else if (requirementId) {
      q = query(collection(db, "execution_events"), where("requirementId", "==", requirementId), orderBy("timestamp", "desc"));
    } else {
      q = query(collection(db, "execution_events"), orderBy("timestamp", "desc"));
    }

    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "execution_events");
    });
  }, [requirementId, dealId]);

  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <Activity size={14} className="text-indigo-500" />
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Execution Timeline</h4>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="relative pl-6 pb-2 group">
            <div className="absolute left-1 top-1 bottom-0 w-[1px] bg-slate-100 group-last:bg-transparent" />
            <div className={cn(
              "absolute left-0 top-1 w-2 h-2 rounded-full border-2 border-white ring-2",
              event.eventType.includes('BREACHED') ? 'bg-rose-500 ring-rose-100' : 'bg-indigo-500 ring-indigo-100'
            )} />
            
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                   "text-[9px] font-black uppercase tracking-tight",
                   event.eventType.includes('BREACHED') ? "text-rose-600" : "text-slate-900"
                )}>
                  {event.eventType.replace('_', ' ')}
                </span>
                <span className="text-[8px] font-mono text-slate-400">
                   {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                {event.metadata?.note || `Action performed by ${event.actorType} on ${event.targetType}.`}
                {event.metadata?.value && <span className="font-bold text-indigo-600 ml-1 italic">{event.metadata.value}</span>}
              </p>
            </div>
          </div>
        ))}

        {events.length === 0 && !loading && (
          <div className="py-8 text-center text-slate-300">
             <Zap size={24} className="mx-auto mb-2 opacity-10" />
             <p className="text-[9px] font-black uppercase tracking-widest">No Events Recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
