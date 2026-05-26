import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import {
  Cpu,
  Zap,
  Activity,
  Clock,
  Server,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "../lib/Badge";
import { cn } from "../lib/utils";

export default function TenantUsageDashboard({ orgData }: { orgData: any }) {
  const [usage, setUsage] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!orgData?.organizationId) return;

    const billingCycle = new Date().toISOString().substring(0, 7);

    // Usage Rollup
    const qUsage = query(
      collection(db, "tenant_usage"),
      where("orgId", "==", orgData.organizationId),
      where("billingCycle", "==", billingCycle),
    );

    const unsubUsage = onSnapshot(qUsage, (snap) => {
      if (!snap.empty) {
        setUsage({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setUsage(null);
      }
    });

    // Recent AI Operations (client-side sorting to avoid composite index)
    const qLogs = query(
      collection(db, "ai_usage_logs"),
      where("orgId", "==", orgData.organizationId),
      limit(50),
    );

    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const logsDocs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      logsDocs.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      setLogs(logsDocs.slice(0, 20));
    });

    return () => {
      unsubUsage();
      unsubLogs();
    };
  }, [orgData?.organizationId]);

  const maxTokens = usage?.monthlyTokenLimit || 5000000;
  const usedTokens = usage?.usedTokens || 0;
  const pct = Math.min((usedTokens / maxTokens) * 100, 100);

  return (
    <div className="flex-1 bg-white h-screen overflow-hidden flex flex-col">
      <div className="h-14 border-b flex items-center px-6 justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-600" />
          <h1 className="text-sm font-black tracking-widest uppercase text-slate-800">
            AI Operations Center
          </h1>
          <Badge
            variant="outline"
            className="ml-2 bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px]"
          >
            {orgData?.organizationId}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 border rounded-sm md:col-span-2">
            <div className="flex justify-between items-end mb-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Monthly AI Credits
              </div>
              <div className="text-xs font-bold text-slate-700">
                {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()}
              </div>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  pct > 90
                    ? "bg-rose-500"
                    : pct > 75
                      ? "bg-amber-500"
                      : "bg-indigo-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct > 80 && (
              <div className="mt-2 text-[10px] text-rose-500 font-bold flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" /> Approaching monthly
                limit
              </div>
            )}
          </div>

          <div className="bg-white p-4 border rounded-sm">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
              Total Operations
            </div>
            <div className="text-3xl font-black text-slate-800">
              {usage?.aiRequests || 0}
            </div>
          </div>

          <div className="bg-white p-4 border rounded-sm">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">
              Resume Parses
            </div>
            <div className="text-3xl font-black text-slate-800">
              {usage?.resumeParses || 0}
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-sm">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" /> Append-Only
              AI Audit Log
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-800">
                        {log.operation}
                      </div>
                      <Badge className="text-[8px] uppercase font-mono px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200">
                        {log.model}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                      <span>TRC: {log.traceId}</span>
                      <span>•</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700">
                      {log.tokensUsed.toLocaleString()} tokens
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ${(log.costEstimate || 0).toFixed(5)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No AI usage recorded in this billing cycle.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
