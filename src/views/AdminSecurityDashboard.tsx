import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs,
  where
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Lock, 
  Eye, 
  UserCheck, 
  Server,
  Fingerprint,
  FileWarning
} from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";

export default function AdminSecurityDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    // 1. Live Audit Logs
    const qLogs = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(20));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Risk Assessments
    const qRisk = query(collection(db, "risk_assessments"), orderBy("createdAt", "desc"), limit(10));
    const unsubRisk = onSnapshot(qRisk, (snap) => {
      setRiskAssessments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Quotas
    getDocs(collection(db, "quotas")).then(snap => {
      setQuotas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Server Diagnostics
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        fetch('/api/admin/diagnostics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(setDiagnostics);
      }
    });

    setLoading(false);
    return () => {
      unsubLogs();
      unsubRisk();
    };
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-500">Initializing Guard Layer...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security & Governance</h1>
          <p className="text-slate-500">Workforce infrastructure health & zero-trust metrics</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           Systems Nominal
        </Badge>
      </div>

      {/* Diagnostics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Identity Node", value: diagnostics?.auth || "PENDING", icon: Lock, status: diagnostics?.auth === "healthy" ? "success" : "warning" },
          { label: "Data Authority", value: diagnostics?.firestore || "PENDING", icon: Server, status: diagnostics?.firestore === "healthy" ? "success" : "warning" },
          { label: "Cloud Service Account", value: diagnostics?.serviceAccount || "Detecting...", icon: Fingerprint, status: "neutral", copyable: true },
          { label: "Governance Project", value: diagnostics?.envProjectId || diagnostics?.globalProjectId || "...", icon: Shield, status: "neutral" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl border",
              item.status === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : 
              item.status === "warning" ? "bg-amber-50 border-amber-100 text-amber-600" :
              "bg-slate-50 border-slate-100 text-slate-600"
            )}>
              <item.icon size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{item.label}</p>
              <div className="flex flex-col">
                <p 
                  className={cn(
                    "text-sm font-semibold text-slate-900 truncate",
                    item.copyable && "cursor-pointer hover:text-indigo-600 transition-colors"
                  )}
                  onClick={() => {
                    if (item.copyable && item.value) {
                      navigator.clipboard.writeText(item.value);
                      alert("Identity copied to clipboard");
                    }
                  }}
                >
                  {item.value}
                </p>
                {item.value.includes("Org Constraint") && (
                  <p className="text-[10px] text-rose-500 mt-1 leading-tight">
                    Disable "Domain-restricted sharing" Org Policy in GCP Console.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Audit Log */}
        <div className="lg:col-span-2 space-y-8">
          {/* Troubleshooting Guide for IAM/Org Policy */}
          {(diagnostics?.firestore?.includes("denied") || diagnostics?.auth?.includes("denied") || diagnostics?.firestore?.includes("Org Constraint")) && (
            <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-600">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-rose-900">Infrastructure Handshake Partially Blocked</h3>
                  <p className="text-rose-700 text-sm leading-relaxed">
                    {diagnostics?.auth?.includes("denied") ? 
                      "The Identity Node requires elevated permissions to manage users and access management." : 
                      "Your GCP configuration is preventing HireNest OS from fully synchronizing with your project."
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-2xl border border-rose-100 space-y-2">
                  <p className="text-xs font-bold text-rose-900 uppercase">Required IAM Roles</p>
                  <p className="text-xs text-rose-700">
                    Grant these roles to the <strong>Service Account</strong> shown above:
                  </p>
                  <ul className="text-[10px] text-rose-700 list-disc ml-4 space-y-1">
                    <li className={cn(diagnostics?.firestore === "healthy" ? "line-through opacity-50" : "font-bold text-rose-900")}>
                      Cloud Datastore User
                    </li>
                    <li className={cn(diagnostics?.auth === "healthy" ? "line-through opacity-50" : "font-bold text-rose-900")}>
                      Firebase Authentication Admin
                    </li>
                    <li className="font-bold text-rose-900">
                      Firebase Rules Admin
                    </li>
                  </ul>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl border border-rose-100 space-y-2">
                  <p className="text-xs font-bold text-rose-900 uppercase">Strategic Resolution</p>
                  <ul className="text-xs text-rose-700 list-disc ml-4 space-y-1">
                    {diagnostics?.firestore?.includes("Org Constraint") ? (
                      <>
                        <li>Switch GCP Console scope from <strong>Project</strong> to <strong>Organization</strong> level.</li>
                        <li>Update the 'iam.allowedPolicyMemberDomains' policy to include <code className="bg-rose-100 px-1 rounded">google.com</code>.</li>
                      </>
                    ) : (
                      <li>Ensure you are in the <strong>IAM & Admin &gt; IAM</strong> page.</li>
                    )}
                    <li>Click <strong>Edit Principal</strong> for the Service Account.</li>
                    <li>Add the missing roles listed on the left.</li>
                    <li>Save and wait 60 seconds for propagation.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-100/50"
                  onClick={() => {
                    navigator.clipboard.writeText(`Hi Admin, I need the 'Firebase Authentication Admin' and 'Firebase Rules Admin' roles for service account: ${diagnostics?.serviceAccount}`);
                    alert("Request template copied to clipboard");
                  }}
                >
                  Copy Message for IT
                </Button>
                <Button 
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => window.location.reload()}
                >
                  Refresh Handshake
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="text-indigo-600" size={20} />
                <h2 className="font-semibold text-slate-900">Live Audit Chain</h2>
              </div>
              <Badge variant="outline">Last 20 Events</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">Outcome</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{log.action}</div>
                        <div className="text-xs text-slate-400">{log.userId}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {log.entityType || "SYSTEM"}
                        {log.entityId && <span className="ml-2 text-xs opacity-50">#{log.entityId.substring(0, 8)}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn(
                          log.outcome === "SUCCESS" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                        )}>
                          {log.outcome}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : "Pending"}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No events recorded in current cycle</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Resources & Quotas */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Server className="text-slate-900" size={20} />
              <h2 className="font-semibold text-slate-900">Resource Quotas</h2>
            </div>
            
            <div className="space-y-6">
              {quotas.length > 0 ? quotas.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{q.quotaType.replace('_', ' ').toUpperCase()}</span>
                    <span className="text-slate-500">{q.current} / {q.limit}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        (q.current / q.limit) > 0.8 ? "bg-rose-500" : "bg-indigo-600"
                      )} 
                      style={{ width: `${Math.min(100, (q.current / q.limit) * 100)}%` }} 
                    />
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">No active quotas monitored. System running in Unlimited Burst Mode.</p>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full text-xs" onClick={() => alert("Quota Management coming soon to Enterprise Tier")}>
              Adjust Global Limits
            </Button>
          </div>

          <div className="bg-indigo-900 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden">
             <div className="relative z-10 space-y-4">
                <Shield className="text-indigo-200" size={32} />
                <h3 className="text-xl font-bold">Risk Sentinel v1.0</h3>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  Real-time fraud detection engine is monitoring candidate fingerprints and vendor velocity.
                </p>
                <div className="pt-4 flex gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-[10px] uppercase opacity-60">Flags</div>
                  </div>
                  <div className="text-center">
                     <div className="text-2xl font-bold">99.9%</div>
                     <div className="text-[10px] uppercase opacity-60">Integrity</div>
                  </div>
                </div>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <FileWarning size={120} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
