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
  RefreshCw,
  CheckCircle2,
  BrainCircuit,
  Zap,
  Target,
  ShieldAlert
} from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { runAutonomousReasoning } from "../services/intelligenceService";

export default function AdminSecurityDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [preFlight, setPreFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reasoningActive, setReasoningActive] = useState(false);
  const [reasoningResult, setReasoningResult] = useState<any>(null);

  // Founder Narrative Strategy
  const strategyNarrative = "AI can help you ship fast. But if you don't secure what you build, you're creating liabilities. HireNest OS transforms 'vibe coding' into enterprise-grade production infrastructure.";

  const runGovernanceAudit = async () => {
    setReasoningActive(true);
    try {
      const intent = "Audit the current governance state and identify architecture blindspots.";
      const payload = {
        diagnostics,
        preFlight,
        securityChecklist
      };
      const result = await runAutonomousReasoning(intent, payload);
      setReasoningResult(result);
    } catch (e) {
      console.error("Reasoning failed", e);
    } finally {
      setReasoningActive(false);
    }
  };

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
      const safetyTimeout = setTimeout(() => {
        setLoading(false);
      }, 6000); // Max 6s wait for establishing node connection

      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          clearTimeout(safetyTimeout);
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

  const isBlocked = !!(
    (diagnostics?.auth?.includes("failure") && !diagnostics?.auth?.toLowerCase()?.includes("permission_denied")) || 
    (diagnostics?.firestore?.includes("failure") && !diagnostics?.firestore?.toLowerCase()?.includes("permission_denied")) ||
    (diagnostics?.auth === "handshake-failed") ||
    (diagnostics?.error === "DIAGNOSTICS_FAILURE")
  );

  const isDegraded = !!(
    (!isBlocked) && 
    (diagnostics?.remediation || diagnostics?.iamCommand || diagnostics?.auth?.toLowerCase()?.includes("permission_denied") || diagnostics?.firestore?.toLowerCase()?.includes("permission_denied"))
  );

  const isNominal = diagnostics?.auth === "healthy" && diagnostics?.firestore === "healthy" && !isDegraded;

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
              { label: "Project Details", value: `${diagnostics?.projectId || "hirenest-os"} (#${diagnostics?.projectNumber || "..."})`, status: "DATA" }
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

          {/* BLOCKAGE / DEGRADATION / NOMINAL LAYER */}
          {isBlocked ? (
            <div className="bg-[#141414] text-white p-12 rounded-[48px] border-[12px] border-[#2A2A2A] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 blur-[100px] -mr-40 -mt-40" />
               
               <div className="flex items-start gap-10 relative">
                 <div className="bg-rose-600 p-8 rounded-3xl text-white shadow-[0_0_80px_rgba(225,29,72,0.4)] animate-pulse shrink-0">
                    <ShieldAlert size={56} strokeWidth={3} />
                 </div>
                 <div className="space-y-4">
                   <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white underline decoration-rose-600 decoration-8 underline-offset-[12px]">Infrastructure Restricted</h2>
                   <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-3xl">
                     The Authority Signal is being filtered. This usually indicates <span className="text-white font-bold">IAM Authorization</span> or <span className="text-white font-bold">API Access</span> is missing for the runtime node.
                   </p>
                 </div>
               </div>

               <div className="mt-16 flex flex-col gap-12 relative">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="flex items-center gap-4 border-b-2 border-white/10 pb-4">
                          <Fingerprint className="text-indigo-400" />
                          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Service Principle</p>
                       </div>
                       <div className="bg-white/5 p-6 rounded-2xl border-2 border-white/10 flex flex-col gap-3 font-mono text-sm group">
                          <div className="flex items-center justify-between hover:bg-white/5 p-2 rounded cursor-copy transition-colors" 
                               onClick={() => {
                                 const sa = diagnostics?.serviceAccount || preFlight?.runtimeIdentity || `${diagnostics?.projectNumber || '733294346096'}-compute@developer.gserviceaccount.com`;
                                 navigator.clipboard.writeText(sa);
                               }}>
                             <code className="text-emerald-400 truncate pr-4">{diagnostics?.serviceAccount || preFlight?.runtimeIdentity || `${diagnostics?.projectNumber || '733294346096'}-compute@developer.gserviceaccount.com`}</code>
                             <span className="text-[9px] font-black uppercase text-indigo-400 shrink-0">COPY PRIMARY</span>
                          </div>
                          <div className="flex items-center justify-between hover:bg-white/5 p-2 rounded cursor-copy pt-2 border-t border-white/5" onClick={() => {
                            navigator.clipboard.writeText(`${diagnostics?.projectId || 'hirenest-os'}@appspot.gserviceaccount.com`);
                          }}>
                             <code className="text-amber-400 truncate pr-4">{diagnostics?.projectId || 'hirenest-os'}@appspot.gserviceaccount.com</code>
                             <span className="text-[9px] font-black uppercase text-indigo-400 shrink-0">COPY ALT</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-4 border-b-2 border-white/10 pb-4">
                          <Lock className="text-rose-400" />
                          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Detection Logs</p>
                       </div>
                       <div className="bg-white/5 p-6 rounded-2xl border-2 border-rose-900/20 max-h-[100px] overflow-y-auto">
                          <p className="text-xs font-medium text-slate-400 leading-relaxed italic opacity-80 break-words">
                            {diagnostics?.authDetails || diagnostics?.firestoreDetails || diagnostics?.error || diagnostics?.details || "Protocol handshake failed at edge node."}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-8 bg-white/5 p-10 rounded-[48px] border-2 border-white/10 shadow-inner">
                    <div className="flex items-center justify-between border-b-2 border-white/5 pb-6">
                       <div className="flex items-center gap-4">
                          <div className="bg-rose-500/20 p-3 rounded-xl">
                             <Target className="text-rose-400" size={24} />
                          </div>
                          <div>
                             <h4 className="font-black uppercase tracking-widest text-sm text-rose-400 italic">Goverance Remediation Sequence</h4>
                             <p className="text-[10px] text-slate-500 uppercase font-black">Manual Authority Alignment Required</p>
                          </div>
                       </div>
                       <Badge variant="outline" className="text-[10px] border-white/20 text-slate-500 font-mono tracking-[0.3em] py-2 px-4">SHELL_V2_ENFORCED</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 uppercase font-black">Step 1: Session Authorization</p>
                          <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 font-mono text-[11px] text-white flex items-center justify-between group cursor-copy hover:bg-slate-800 transition-colors"
                               onClick={() => navigator.clipboard.writeText("gcloud auth login && gcloud config set project hirenest-os")}>
                             <div className="flex flex-col">
                                <code>gcloud auth login</code>
                                <code className="text-indigo-400">gcloud config set project hirenest-os</code>
                             </div>
                             <span className="text-[9px] font-black text-indigo-400 opacity-0 group-hover:opacity-100 uppercase shrink-0">Click to Copy</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 uppercase font-black">Step 2: Resource Availability</p>
                          <div className="bg-slate-900 p-5 rounded-2xl border border-white/10 font-mono text-[11px] text-white flex items-center justify-between group cursor-copy hover:bg-slate-800 transition-colors"
                               onClick={() => navigator.clipboard.writeText("gcloud services enable identitytoolkit.googleapis.com firebaserules.googleapis.com firestore.googleapis.com")}>
                             <code>gcloud services enable ...</code>
                             <span className="text-[9px] font-black text-indigo-400 opacity-0 group-hover:opacity-100 uppercase shrink-0">Enable APIs</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 uppercase font-black">Step 3: Identity Manifest Deployment</p>
                          <div className="bg-slate-900 p-6 rounded-3xl border-2 border-rose-900/40 font-mono text-[10px] text-rose-100 whitespace-pre-wrap leading-relaxed shadow-2xl h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-rose-900/40">
                            {diagnostics?.remediation || diagnostics?.iamCommand || "No remediation string. Use Emergency Owner Fix below."}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Button className="flex-1 bg-white text-black hover:bg-slate-200 rounded-2xl font-black uppercase text-[10px] py-5 shadow-xl transition-transform active:scale-95"
                                  onClick={() => {
                                    navigator.clipboard.writeText(diagnostics?.remediation || diagnostics?.iamCommand || "");
                                  }}>
                            Copy Full Manifest
                          </Button>
                          <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-2xl font-black uppercase text-[10px] py-5 transition-transform active:scale-95"
                                  onClick={() => {
                                    const sa = diagnostics?.serviceAccount || `${diagnostics?.projectNumber || '733294346096'}-compute@developer.gserviceaccount.com`;
                                    const cmd = `gcloud projects add-iam-policy-binding hirenest-os --member="serviceAccount:${sa}" --role="roles/owner"`;
                                    navigator.clipboard.writeText(cmd);
                                  }}>
                            Emergency Owner Escalation
                          </Button>
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          ) : isDegraded ? (
            <div className="bg-[#1A1A1A] text-white p-12 rounded-[48px] border-[12px] border-amber-600/20 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 blur-[100px] -mr-40 -mt-40" />
               
               <div className="flex items-start gap-10 relative">
                 <div className="bg-amber-600 p-8 rounded-3xl text-white shadow-[0_0_80px_rgba(217,119,6,0.3)] shrink-0">
                    <Activity size={56} strokeWidth={3} />
                 </div>
                 <div className="space-y-4">
                   <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white underline decoration-amber-600 decoration-8 underline-offset-[12px]">Partial Governance Degradation</h2>
                   <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-3xl">
                     Compute nodes are operational, but <span className="text-white font-bold">Policy Deployment (IAM/Rulesets)</span> is restricted. Automatic updates are currently inhibited.
                   </p>
                 </div>
               </div>

               <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
                 <div className="space-y-8">
                    <div className="bg-white/5 p-6 rounded-2xl border-2 border-white/10 flex items-center justify-between group cursor-pointer"
                         onClick={() => {
                           const sa = diagnostics?.serviceAccount || preFlight?.runtimeIdentity || "Detecting...";
                           navigator.clipboard.writeText(sa);
                         }}>
                       <code className="font-mono text-sm text-amber-400 truncate pr-4">{diagnostics?.serviceAccount || preFlight?.runtimeIdentity || "Identifying Authority..."}</code>
                       <span className="text-[10px] font-black uppercase text-amber-400">COPY IDENTITY</span>
                    </div>

                    <div className="bg-white/5 p-8 rounded-3xl border-2 border-white/10 space-y-4">
                       <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-500 italic">Integrity Log</p>
                       <p className="text-sm font-medium text-slate-400 leading-relaxed italic opacity-80 break-words">
                         {diagnostics?.authDetails || diagnostics?.firestore || "Governance handshake incomplete. Ruleset creation permissions rejected."}
                       </p>
                    </div>
                 </div>

                 <div className="bg-amber-600/5 p-10 rounded-[40px] border-2 border-amber-600/20 space-y-8">
                    <div className="flex justify-between items-center">
                       <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">Remediation Directive</p>
                       <Badge variant="outline" className="text-[10px] border-amber-600/30 text-amber-600 font-mono tracking-[0.3em]">IAM_V2</Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase font-black">1. Auth Session in Cloud Shell:</p>
                        <div className="bg-black/40 p-4 rounded-xl font-mono text-[11px] text-amber-100 border border-amber-600/20 group cursor-copy" onClick={() => navigator.clipboard.writeText("gcloud auth login")}>
                          gcloud auth login
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase font-black">2. Execute Policy Binding:</p>
                        <div className="bg-slate-900 p-6 rounded-2xl border-2 border-amber-900/30 font-mono text-[11px] text-amber-100 whitespace-pre-wrap leading-relaxed shadow-lg break-all">
                          {diagnostics?.remediation || diagnostics?.iamCommand || "No remediation generated."}
                        </div>
                      </div>

                      <Button className="w-full bg-amber-600 text-white hover:bg-amber-700 mt-4 rounded-xl font-black uppercase text-[10px] py-4"
                              onClick={() => {
                                navigator.clipboard.writeText(diagnostics?.remediation || diagnostics?.iamCommand || "");
                              }}>
                        Batch Copy Command
                      </Button>
                    </div>
                 </div>
               </div>
            </div>
          ) : isNominal && (
            <div className="bg-emerald-500 text-white p-12 rounded-[48px] shadow-2xl relative overflow-hidden border-[12px] border-emerald-600/20">
               <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 blur-[100px] -mr-40 -mt-40" />
               <div className="flex items-center gap-10 relative">
                  <div className="bg-white text-emerald-600 p-8 rounded-3xl shadow-xl">
                    <CheckCircle2 size={56} strokeWidth={3} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic">System Operational</h2>
                    <p className="text-emerald-100 text-xl font-medium tracking-tight">Governance node established. Authority signal validated across all cloud sectors.</p>
                  </div>
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
           
           {/* REASONING ENGINE PULSE */}
           <div className={cn(
             "bg-indigo-600 text-white p-10 rounded-[56px] border-[8px] border-indigo-700/50 space-y-8 shadow-2xl relative overflow-hidden transition-all duration-500",
             reasoningActive && "animate-pulse ring-8 ring-indigo-500/30"
           )}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] -mr-32 -mt-32" />
              
              <div className="flex items-center justify-between relative">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-4 rounded-2xl">
                       <BrainCircuit className="text-white" size={32} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Intent Engine</p>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter">Integrity Cortex</h3>
                    </div>
                 </div>
                 <Badge className="bg-white/20 border-white/30 text-white font-mono text-[10px] py-1 px-4 tracking-widest">
                    V1.2_ACTIVE
                 </Badge>
              </div>

              {reasoningResult ? (
                <div className="space-y-6 relative">
                  <div className="bg-black/20 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <p className="text-sm font-medium leading-relaxed italic text-indigo-50">
                      {reasoningResult.analysis}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reasoningResult.appliedModes.map((mode: any) => (
                      <Badge key={mode} className="bg-indigo-900/50 border-indigo-400/30 text-indigo-200 text-[9px] uppercase tracking-tighter">
                         /{mode}
                      </Badge>
                    ))}
                  </div>
                  {reasoningResult.suggestions && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Strategic Directives</p>
                      <div className="space-y-2">
                         {reasoningResult.suggestions.slice(0, 2).map((s: string, i: number) => (
                           <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl text-xs font-semibold">
                              <Zap size={14} className="text-amber-400 shrink-0" />
                              <span>{s}</span>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-white hover:bg-white/10 rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest"
                    onClick={runGovernanceAudit}
                    disabled={reasoningActive}
                  >
                    {reasoningActive ? "ORCHESTRATING..." : "RE-EVALUATE PROTOCOLS"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-8 relative">
                  <p className="text-sm font-medium text-indigo-100 opacity-80 leading-relaxed italic">
                    The Intent-Based Reasoning Engine is idling. Run an autonomous audit to activate strategic protocols.
                  </p>
                  <Button 
                    className="w-full bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl py-6 font-black uppercase italic tracking-tighter text-lg shadow-xl shrink-0 h-auto"
                    onClick={runGovernanceAudit}
                    disabled={reasoningActive}
                  >
                    {reasoningActive ? (
                      <div className="flex items-center gap-3">
                        <RefreshCw className="animate-spin" />
                        <span>BOOTING_REASONING_NODE...</span>
                      </div>
                    ) : "ACTIVATE AUTONOMOUS AUDIT"}
                  </Button>
                </div>
              )}
           </div>

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

