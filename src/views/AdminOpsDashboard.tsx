import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import {
  Activity,
  Server,
  AlertTriangle,
  ShieldCheck,
  Database,
  Zap,
  Clock,
  Code,
  ActivityIcon,
} from "lucide-react";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";
import { cn } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminOpsDashboard() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [dlqEvents, setDlqEvents] = useState<any[]>([]);

  useEffect(() => {
    // Top 50 newest workflows
    const qWorkflows = query(
      collection(db, "workflowEvents"),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsubW = onSnapshot(qWorkflows, (snap) => {
      setWorkflows(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Recent Dead Letter events (client-side sorted to avoid composite index requirement)
    const qDlq = query(
      collection(db, "workflowEvents"),
      where("status", "==", "DEAD_LETTER"),
      limit(50),
    );
    const unsubDlq = onSnapshot(qDlq, (snap) => {
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      docs.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      setDlqEvents(docs.slice(0, 20));
    });

    return () => {
      unsubW();
      unsubDlq();
    };
  }, []);

  const queueCount = workflows.filter((w) => w.status === "QUEUED").length;
  const leasedCount = workflows.filter((w) => w.status === "LEASED").length;
  const failedCount = dlqEvents.length;

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col">
      <div className="h-14 border-b flex items-center px-6 justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-5 h-5 text-indigo-600" />
          <h1 className="text-sm font-black tracking-widest uppercase text-slate-800">
            Platform Operations
          </h1>
          <Badge
            variant="outline"
            className="ml-2 bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px]"
          >
            DISTRIBUTED MODE
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 border rounded-sm">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Backlog (Queued)
            </div>
            <div className="text-3xl font-black text-slate-800">
              {queueCount}
            </div>
          </div>
          <div className="bg-white p-4 border rounded-sm">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
              Workers (Leased)
            </div>
            <div className="text-3xl font-black text-blue-600">
              {leasedCount}
            </div>
          </div>
          <div className="bg-white p-4 border rounded-sm border-rose-200 bg-rose-50/30">
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">
              Dead Letters (DLQ)
            </div>
            <div className="text-3xl font-black text-rose-600">
              {failedCount}
            </div>
          </div>
          <div className="bg-white p-4 border rounded-sm">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">
              System Health
            </div>
            <div className="text-sm font-bold text-emerald-600 flex items-center mt-2">
              <ShieldCheck className="w-4 h-4 mr-1" /> OPERATIONAL
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-sm">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <Database className="w-4 h-4 mr-2 text-indigo-600" /> Async
              Distributed Queue
            </h2>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="text-[10px] border-slate-200 bg-white"
              >
                Polling Enabled
              </Badge>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {workflows.slice(0, 15).map((job) => (
              <div
                key={job.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    {job.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : job.status === "DEAD_LETTER" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-800">
                        {job.eventType}
                      </div>
                      <Badge
                        className={cn(
                          "text-[8px] uppercase font-mono px-1.5 py-0",
                          job.status === "QUEUED"
                            ? "bg-slate-200 text-slate-700"
                            : job.status === "LEASED"
                              ? "bg-blue-100 text-blue-700"
                              : job.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      ID: {job.id} • Tries: {job.retryCount || 0}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent workflow tasks found in distributed queue.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
