import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Activity, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Sparkles,
  Layers,
  Heart
} from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function CapabilitiesRegistryView() {
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    const colRef = collection(db, "system_capabilities");
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCapabilities(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to system_capabilities:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggle = async (capId: string, currentEnabled: boolean) => {
    try {
      const docRef = doc(db, "system_capabilities", capId);
      await updateDoc(docRef, {
        enabled: !currentEnabled,
        lastHeartbeat: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to toggle capability ${capId}:`, error);
    }
  };

  const handleTriggerTest = async (capId: string) => {
    setRefreshingId(capId);
    try {
      // Trigger a direct test heartbeat request to backend
      const response = await fetch("/api/ops/capabilities/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: capId, latencyMs: Math.round(1500 + Math.random() * 1000) }),
      });
      if (!response.ok) {
        throw new Error("Failed to post heartbeat");
      }
    } catch (error) {
      console.error(`Failed to trigger capability test for ${capId}:`, error);
    } finally {
      setTimeout(() => setRefreshingId(null), 800);
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Healthy
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Degraded
          </span>
        );
      case "unhealthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Unhealthy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
            Unknown
          </span>
        );
    }
  };

  const enabledCount = capabilities.filter((c) => c.enabled).length;
  const degradedCount = capabilities.filter((c) => c.healthStatus !== "healthy").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mr-3" />
        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Synchronizing Registry...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Dynamic Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Layers className="w-3 h-3 mr-1 text-slate-400" /> Registered Capabilities
          </div>
          <div className="text-3xl font-black text-slate-800">
            {capabilities.length}
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Active Service Mesh
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {enabledCount} <span className="text-xs font-normal text-slate-400">/ {capabilities.length} online</span>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" /> Degraded / Faulty
          </div>
          <div className="text-3xl font-black text-amber-600">
            {degradedCount} <span className="text-xs font-normal text-slate-400">failing</span>
          </div>
        </div>

        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Sparkles className="w-3 h-3 mr-1 text-indigo-500" /> Gateway Enforcement
          </div>
          <div className="text-sm font-bold uppercase text-indigo-700 tracking-wider bg-indigo-50 px-2 py-1.5 rounded-sm border border-indigo-100 mt-1 w-max">
            Decoupled (100% Proxied)
          </div>
        </div>
      </div>

      {/* Main Service Catalog Table */}
      <div className="bg-white border rounded-sm flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-indigo-600" /> Service Catalog
          </h2>
          <span className="text-[10px] font-mono text-slate-400">system_capabilities collection</span>
        </div>

        <div className="p-4 overflow-x-auto">
          {capabilities.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-sm">
              No registered capabilities found in the registry.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 px-2 font-bold">Capability Name & Details</th>
                  <th className="pb-3 px-2 font-bold">Health</th>
                  <th className="pb-3 px-2 font-bold">Version</th>
                  <th className="pb-3 px-2 font-bold">SLA (Latency & Cost)</th>
                  <th className="pb-3 px-2 font-bold">Fallback Heuristic</th>
                  <th className="pb-3 px-2 font-bold text-right">Status / Actions</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((cap) => (
                  <tr key={cap.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    {/* ID, Description, Tags */}
                    <td className="py-4 px-2 max-w-sm">
                      <div className="font-bold text-slate-800 text-sm">{cap.name}</div>
                      <div className="text-[10px] font-mono text-indigo-500 font-semibold mb-1">{cap.id}</div>
                      <div className="text-xs text-slate-500 leading-relaxed mb-2">{cap.description}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {cap.tags?.map((tag: string) => (
                          <span key={tag} className="text-[9px] bg-slate-100 font-semibold text-slate-600 px-1.5 py-0.5 rounded-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Health Status */}
                    <td className="py-4 px-2 vertical-align-top">
                      <div className="mb-1.5">{getHealthBadge(cap.healthStatus)}</div>
                      {cap.lastHeartbeat && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span>Last: {new Date(cap.lastHeartbeat).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {cap.errorCount > 0 && (
                        <div className="text-[9px] text-rose-500 font-bold mt-1 bg-rose-50 px-1.5 py-0.5 rounded-sm border border-rose-100">
                          Errors: {cap.errorCount}
                        </div>
                      )}
                    </td>

                    {/* Version */}
                    <td className="py-4 px-2 font-mono text-xs font-bold text-slate-600">
                      v{cap.version}
                    </td>

                    {/* SLA (Latency & Cost) */}
                    <td className="py-4 px-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Avg: {cap.averageLatencyMs}ms</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>Est: ${cap.estimatedCostUsd?.toFixed(4)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Min Conf: {(cap.expectedConfidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </td>

                    {/* Fallback Heuristic */}
                    <td className="py-4 px-2">
                      <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-sm max-w-max">
                        {cap.fallbackAction}
                      </div>
                    </td>

                    {/* Status & Toggle / Test Trigger */}
                    <td className="py-4 px-2 text-right">
                      <div className="flex flex-col items-end space-y-2">
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggle(cap.id, cap.enabled)}
                          className="focus:outline-none transition-transform active:scale-95"
                          title={cap.enabled ? "Disable Capability" : "Enable Capability"}
                        >
                          {cap.enabled ? (
                            <ToggleRight className="w-12 h-7 text-indigo-600 cursor-pointer" />
                          ) : (
                            <ToggleLeft className="w-12 h-7 text-slate-400 cursor-pointer" />
                          )}
                        </button>

                        {/* Test Button */}
                        <button
                          onClick={() => handleTriggerTest(cap.id)}
                          disabled={refreshingId === cap.id}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors px-2.5 py-1 rounded-sm focus:outline-none"
                        >
                          <Activity className={`w-3.5 h-3.5 ${refreshingId === cap.id ? "animate-pulse" : ""}`} />
                          <span>Test Route</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
