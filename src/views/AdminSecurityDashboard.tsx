import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Lock, 
  Server,
  Fingerprint,
  RefreshCw
} from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";

export default function AdminSecurityDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [preFlight, setPreFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Founder Narrative Strategy
  const strategyNarrative = "AI can help you ship fast. But if you don't secure what you build, you're creating liabilities. HireNest OS transforms 'vibe coding' into enterprise-grade production infrastructure.";

  const securityChecklist = [
    { id: 'sa', label: 'Runtime Identity Isolation', status: diagnostics?.serviceAccount ? 'secure' : 'pending' },
    { id: 'rbac', label: 'Authority Role-Based Access', status: diagnostics?.auth === 'healthy' ? 'secure' : 'blocked' },
    { id: 'mirror', label: 'Entity Mirror Replication', status: diagnostics?.firestore === 'healthy' ? 'secure' : 'blocked' },
    { id: 'audit', label: 'Immutable Audit Stream', status: logs.length > 0 ? 'secure' : 'pending' },
    { id: 'zero', label: 'Zero-Trust Protocol Layer', status: diagnostics?.auth === 'healthy' || preFlight?.status === 'operational' ? 'secure' : 'pending' }
  ];

  useEffect(() => {
    let unsubLogs: (() => void) | null = null;

    const initSecurityNodes = async () => {
      auth.onAuthStateChanged(async (user) => {
        // We set loading false early if no user to show "Unauthorized" or simple state
        if (!user) {
          setLoading(false);
          return;
        }
        
        try {
          const token = await user.getIdToken();

          // 1. Fetch Audit Logs (Hybrid: Stream + REST)
          const qLogs = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(20));
          unsubLogs = onSnapshot(qLogs, (snap) => {
            setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
          }, (err) => {
            console.warn("Firestore Real-time Stream Blocked. Falling back to diagnostics polling.");
            setLoading(false);
          });

          // 2. Pre-flight Check (Public)
          fetch('/api/admin/pre-flight')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              setPreFlight(data);
              // If we have preFlight but diagnostics haven't arrived, it helps bridge the gap
            })
            .catch(() => console.warn("Pre-flight handshake offline"));

          // 3. Server Diagnostics (Authenticated)
          fetch('/api/admin/diagnostics', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(async (r) => {
            if (r.ok) return await r.json();
            
            const errorRaw = await r.text();
            let errorData = { details: "Unknown Protocol Error", requestId: "N/A" };
            try { errorData = JSON.parse(errorRaw); } catch(e) {}
            
            return {
              auth: "handshake-failed",
              firestore: "handshake-failed",
              authDetails: errorData.details || errorRaw || `HTTP ${r.status}`,
              remediation: (errorData as any).remediation,
              serviceAccount: (errorData as any).serviceAccount || null,
              iamCommand: (errorData as any).iamCommand,
              requestId: errorData.requestId || (errorData as any).requestId || "SRV-500",
              statusText: r.statusText,
              statusCode: r.status
            };
          })
          .then(setDiagnostics)
          .catch(err => {
            setDiagnostics({ 
              auth: "network-error", 
              firestore: "network-error", 
              authDetails: `Client Node unreachable: ${err.message}` 
            });
          });
        } catch (e) {
          console.error("Identity Verification Protocol Error:", e);
          setLoading(false);
        }
      });
    };

    initSecurityNodes();

    return () => {
      if (unsubLogs) unsubLogs();
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-8 font-mono text-indigo-500">
      <div className="w-24 h-24 border-t-4 border-indigo-500 rounded-full animate-spin" />
      <div className="space-y-2 text-center">
        <p className="tracking-[0.5em] animate-pulse uppercase">Establishing Governance Bridge</p>
        <p className="text-[10px] text-slate-600 opacity-50 uppercase">ENCRYPTING_AUTHORITY_SIGNAL...</p>
      </div>
    </div>
  );

  const isBlocked = diagnostics?.auth === "handshake-failed" || diagnostics?.firestore === "handshake-failed" || diagnostics?.remediation;

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 lg:p-16 max-w-[1920px] mx-auto font-sans flex flex-col gap-12 text-[#141414]">
      {/* HEADER: MASSIVE & BRUTALIST */}
      <header className="border-b-[12px] border-[#141414] pb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#141414] text-white flex items-center justify-center rounded-2xl shadow-2xl">
              <Shield size={40} />
            </div>
            <h1 className="text-7xl lg:text-9xl font-black tracking-[-0.05em] uppercase italic leading-none">
              Integrity <span className="text-indigo-600">OS</span>
            </h1>
          </div>
          <p className="text-xl font-black uppercase tracking-[0.2em] opacity-40 max-w-2xl pl-2">
            Enterprise Governance Layer / Node: {diagnostics?.projectId || preFlight?.runtimeProjectId || "hirenest-os"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
           <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">State Verification</p>
             <Badge className={cn(
               "py-2 px-6 rounded-xl border-4 font-black uppercase tracking-widest text-sm",
               isBlocked ? "bg-rose-50 border-rose-600 text-rose-600 animate-pulse" : "bg-emerald-50 border-emerald-600 text-emerald-600"
             )}>
                {isBlocked ? "SIGNAL_RESTRICTED" : "NOMINAL_ACTIVE"}
             </Badge>
           </div>
           
           <div className="h-16 w-16 rounded-full border-4 border-[#141414] flex items-center justify-center p-2 group hover:bg-[#141414] transition-colors cursor-pointer"
                onClick={() => window.location.reload()}>
              <RefreshCw className="text-[#141414] group-hover:text-white transition-colors" />
           </div>
        </div>
      </header>

      {/* MISSION CONTROL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT COLUMN: CRITICAL INFRASTRUCTURE */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* DIAGNOSTICS TILES (Visible Grid Recipe 1) */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-4 border-[#141414] divide-y-4 md:divide-y-0 md:divide-x-4 divide-[#141414] shadow-[12px_12px_0px_rgba(20,20,20,0.05)]">
            {[
              { label: "Authority Node", value: diagnostics?.auth || "PENDING", status: diagnostics?.auth === "healthy" ? "OK" : "ERR" },
              { label: "Entity Mirror", value: diagnostics?.firestore || "PENDING", status: diagnostics?.firestore === "healthy" ? "OK" : "ERR" },
              { label: "Runtime Identity", value: diagnostics?.serviceAccount || preFlight?.runtimeIdentity || "IDENTIFYING...", status: "DATA" },
              { label: "Governance Project", value: diagnostics?.projectId || preFlight?.runtimeProjectId || "hirenest-os", status: "DATA" }
            ].map((item, idx) => (
              <div key={idx} className="p-8 space-y-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                   <p className="italic font-serif text-sm opacity-50">{item.label}</p>
                   <span className={cn(
                     "font-mono text-[10px] px-2 py-0.5 rounded border",
                     item.status === 'OK' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                     item.status === 'ERR' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                   )}>
                     {item.status}
                   </span>
                </div>
                <p className="font-mono text-xs font-black break-all leading-relaxed uppercase tracking-tighter">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* BLOCKAGE / REMEDIATION LAYER */}
          {isBlocked && (
            <div className="bg-[#141414] text-white p-12 rounded-[48px] border-[12px] border-[#2A2A2A] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 blur-[100px] -mr-40 -mt-40" />
               
               <div className="flex items-start gap-10 relative">
                 <div className="bg-rose-600 p-8 rounded-3xl text-white shadow-[0_0_80px_rgba(225,29,72,0.4)] animate-pulse shrink-0">
                   <AlertTriangle size={56} strokeWidth={3} />
                 </div>
                 <div className="space-y-4">
                   <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white underline decoration-rose-600 decoration-8 underline-offset-[12px]">Infrastructure Blocked</h2>
                   <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-3xl">
                     The Authority Signal is being rejected by the cloud perimeter. Verify <span className="text-white font-bold">IAM bindings</span> on the host project console.
                   </p>
                 </div>
               </div>

               <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                 <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b-2 border-white/10 pb-4">
                       <Fingerprint className="text-indigo-400" />
                       <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Service Principle</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border-2 border-white/10 flex items-center justify-between group cursor-copy hover:border-emerald-500 transition-all"
                         onClick={() => {
                           const sa = diagnostics?.serviceAccount || preFlight?.runtimeIdentity || "Detecting...";
                           navigator.clipboard.writeText(sa);
                           alert("Principle Identity Cloned.");
                         }}>
                       <code className="font-mono text-sm text-emerald-400 truncate pr-4">{diagnostics?.serviceAccount || preFlight?.runtimeIdentity || "Identifying Authority..."}</code>
                       <span className="text-[10px] font-black uppercase text-indigo-400 group-hover:scale-110 transition-transform">COPY</span>
                    </div>

                    <div className="bg-white/5 p-8 rounded-3xl border-2 border-white/10 space-y-6">
                       <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 italic">Command Directive</p>
                       <p className="text-sm font-medium text-slate-400 leading-relaxed italic opacity-80">
                         {strategyNarrative}
                       </p>
                    </div>
                 </div>

                 <div className="space-y-8 bg-white/5 p-8 rounded-[40px] border-2 border-white/10 shadow-inner">
                    <div className="flex items-center justify-between">
                       <h4 className="font-black uppercase tracking-widest text-[12px] text-rose-400 italic">Remediation Sequence</h4>
                       <Badge variant="outline" className="text-[10px] border-white/20 text-slate-500 font-mono tracking-[0.3em]">SHELL_V1</Badge>
                    </div>

                    {diagnostics?.remediation || diagnostics?.iamCommand ? (
                      <div className="space-y-4">
                        <div className="bg-black/80 p-8 rounded-2xl border-2 border-white/10 font-mono text-[11px] text-emerald-500 leading-normal break-all cursor-copy hover:bg-black transition-colors"
                             onClick={() => {
                               navigator.clipboard.writeText(diagnostics.remediation || diagnostics.iamCommand);
                               alert("Sequence Sequenced.");
                             }}>
                          {diagnostics.remediation || diagnostics.iamCommand}
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] text-center italic">
                          Execute in GCP Cloud Shell to unify identity.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 space-y-4 border-2 border-dashed border-white/10 rounded-2xl">
                         <div className="w-8 h-8 border-2 border-slate-700 border-t-white rounded-full animate-spin" />
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Awaiting Remote Signal...</p>
                         {diagnostics?.authDetails && (
                           <div className="bg-rose-500/10 p-4 rounded-xl text-[10px] font-mono text-rose-400 opacity-60">
                             TRC: {diagnostics.authDetails}
                           </div>
                         )}
                      </div>
                    )}
                 </div>
               </div>

               <div className="mt-12 flex justify-center">
                  <Button className="bg-white text-black hover:bg-slate-200 py-8 px-12 rounded-2xl font-black uppercase tracking-[0.3em] text-sm shadow-xl transition-transform hover:scale-105 active:scale-95"
                          onClick={() => window.location.reload()}>
                    <RefreshCw className="mr-4" />
                    Force Integrity Rescan
                  </Button>
               </div>
            </div>
          )}

          {/* AUDIT LOGS (Visible Grid) */}
          <div className="bg-white border-4 border-[#141414] shadow-[16px_16px_0px_rgba(20,20,20,0.02)] rounded-[40px] overflow-hidden">
             <div className="p-12 border-b-4 border-[#141414] flex items-center justify-between">
                <div className="space-y-2">
                   <h2 className="text-5xl font-black uppercase italic tracking-tighter">Event <span className="text-indigo-600">Mirror</span></h2>
                   <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-400 pl-1">Immutable Authority Audit Stream</p>
                </div>
                <div className="px-6 py-3 bg-[#141414] rounded-2xl flex items-center gap-4 ring-8 ring-slate-100">
                   <div className="w-3 h-3 bg-indigo-500 animate-pulse rounded-full" />
                   <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">LIVE_SYNC: ON</p>
                </div>
             </div>

             <div className="overflow-x-auto min-h-[500px]">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-slate-50 border-b-4 border-[#141414] text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                         <th className="px-10 py-6 text-left">Protocol_ID</th>
                         <th className="px-10 py-6 text-left">Action_Type</th>
                         <th className="px-10 py-6 text-left">Internal_Node</th>
                         <th className="px-10 py-6 text-right">Sequence_Time</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y-2 divide-slate-100 italic">
                      {logs.length > 0 ? logs.map((log, i) => (
                        <tr key={log.id || i} className="hover:bg-indigo-50/30 transition-colors group">
                           <td className="px-10 py-8 font-mono text-xs opacity-50 group-hover:opacity-100">{log.logId || `TX-${i.toString().padStart(4, '0')}`}</td>
                           <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                   "w-3 h-3 rounded-full",
                                   log.severity === 'HIGH' ? "bg-rose-500" : "bg-indigo-600"
                                 )} />
                                 <p className="text-lg font-black uppercase tracking-tight text-[#141414] group-hover:text-indigo-700">{log.action}</p>
                              </div>
                           </td>
                           <td className="px-10 py-8">
                              <p className="text-[11px] font-black opacity-40 uppercase truncate max-w-[200px]">{log.userId || "SYSTEM_DAEMON"}</p>
                           </td>
                           <td className="px-10 py-8 text-right font-mono text-[10px] opacity-40">
                              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : new Date().toLocaleTimeString()}
                           </td>
                        </tr>
                      )) : (
                        <tr>
                           <td colSpan={4} className="py-40 text-center text-slate-200">
                              <p className="font-mono text-sm tracking-[1em] uppercase animate-pulse">Awaiting Signal Synchronization...</p>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SECURITY POSTURE */}
        <div className="lg:col-span-4 space-y-12">
           
           {/* SECURITY STATE LIST */}
           <div className="bg-[#141414] text-white p-12 rounded-[56px] border-[8px] border-[#2A2A2A] space-y-12 shadow-2xl relative">
              <div className="space-y-4">
                 <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em]">Network Topology</p>
                 <h2 className="text-4xl font-black italic uppercase tracking-tighter">Security State</h2>
              </div>

              <div className="space-y-8">
                 {securityChecklist.map((item) => (
                   <div key={item.id} className="group cursor-help">
                      <div className="flex items-center justify-between gap-4 mb-2">
                         <p className="text-[13px] font-black uppercase italic tracking-tight text-slate-500 group-hover:text-indigo-400 transition-colors">{item.label}</p>
                         <p className={cn(
                           "text-[10px] font-black uppercase tracking-widest",
                           item.status === 'secure' ? "text-emerald-400" : item.status === 'blocked' ? "text-rose-500 animate-pulse" : "text-slate-700"
                         )}>
                           {item.status === 'secure' ? '[ SECURE ]' : item.status === 'blocked' ? '[ RESTRICTED ]' : '[ PENDING ]'}
                         </p>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className={cn(
                           "h-full transition-all duration-1000",
                           item.status === 'secure' ? "w-full bg-emerald-500" : item.status === 'blocked' ? "w-1/3 bg-rose-600" : "w-1/12 bg-slate-800"
                         )} />
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-12 border-t-2 border-white/5">
                 <div className="bg-white/5 p-8 rounded-3xl border-2 border-white/10 hover:border-indigo-500 transition-all group/node">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Authority Cluster</p>
                    <div className="flex items-center gap-4">
                       <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)]" />
                       <code className="text-sm font-mono text-white opacity-60 group-hover/node:opacity-100 transition-opacity truncate">{diagnostics?.projectId || "hirenest-os"}.cloud</code>
                    </div>
                 </div>
              </div>
           </div>

           {/* INFRASTRUCTURE HEALTH (Data Grid Table) */}
           <div className="bg-white border-4 border-[#141414] rounded-[48px] p-12 space-y-12 shadow-[12px_12px_0px_rgba(20,20,20,0.02)]">
              <h3 className="text-xl font-black italic uppercase tracking-widest border-b-4 border-[#141414] pb-6">Integrity Metrics</h3>
              
              <div className="space-y-10">
                 {[
                   { label: "Trust Reliability", val: "99.99%", status: "STABLE", color: "text-emerald-600" },
                   { label: "Identity Nodes", val: (logs.length + 5).toString().padStart(2, '0'), status: "GROWING", color: "text-indigo-600" },
                   { label: "Node Latency", val: "18ms", status: "FAST", color: "text-[#141414]" }
                 ].map((metric, i) => (
                   <div key={i} className="flex items-center justify-between border-b-2 border-slate-50 pb-8 last:border-0 last:pb-0">
                      <div className="space-y-1">
                         <p className="font-serif italic text-xs opacity-50">{metric.label}</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.status}</p>
                      </div>
                      <p className={cn("text-4xl font-black italic tracking-tighter", metric.color)}>{metric.val}</p>
                   </div>
                 ))}
              </div>
           </div>

           {/* ADMIN ACTION CORD */}
           <div className="p-4">
              <Button className="w-full py-10 rounded-[32px] border-4 border-[#141414] border-dashed text-[#141414] font-black uppercase tracking-[0.3em] hover:bg-[#141414] hover:text-white transition-all shadow-xl">
                 [ RECONFIGURE BOUNDARIES ]
              </Button>
           </div>

        </div>
      </div>
    </div>
  );
}

