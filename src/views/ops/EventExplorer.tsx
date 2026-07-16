import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  Box, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  ArrowRight,
  Database,
  Terminal,
  Info
} from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function EventExplorer() {
  const [activeSubTab, setActiveSubTab] = useState<"stream" | "subscriptions">("stream");
  const [events, setEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Form state for creating a new subscription
  const [showAddSub, setShowAddSub] = useState(false);
  const [newSub, setNewSub] = useState({
    id: "",
    eventType: "",
    subscriber: "",
    priority: 10,
    enabled: true
  });

  // 1. Subscribe to Live Business Events
  useEffect(() => {
    if (activeSubTab !== "stream") return;
    
    const colRef = collection(db, "business_events");
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort chronologically desc
        list.sort((a: any, b: any) => {
          return new Date(b.createdAt || b.publishedAt || 0).getTime() - new Date(a.createdAt || a.publishedAt || 0).getTime();
        });
        setEvents(list);
        setLoadingEvents(false);
      },
      (error) => {
        console.error("Error subscribing to business_events:", error);
        setLoadingEvents(false);
      }
    );

    return () => unsubscribe();
  }, [activeSubTab]);

  // 2. Subscribe to Event Subscriptions Registry
  useEffect(() => {
    if (activeSubTab !== "subscriptions") return;

    const colRef = collection(db, "event_subscriptions");
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        list.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
        setSubscriptions(list);
        setLoadingSubs(false);
      },
      (error) => {
        console.error("Error subscribing to event_subscriptions:", error);
        setLoadingSubs(false);
      }
    );

    return () => unsubscribe();
  }, [activeSubTab]);

  const handleToggleSub = async (subId: string, currentEnabled: boolean) => {
    try {
      const docRef = doc(db, "event_subscriptions", subId);
      await updateDoc(docRef, { enabled: !currentEnabled });
    } catch (error) {
      console.error(`Failed to toggle subscription ${subId}:`, error);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!window.confirm("Are you sure you want to remove this subscription routing?")) return;
    try {
      const docRef = doc(db, "event_subscriptions", subId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Failed to delete subscription ${subId}:`, error);
    }
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.eventType || !newSub.subscriber) {
      alert("Please specify Event Type and Subscriber name.");
      return;
    }

    const subId = newSub.id || `sub-custom-${Date.now()}`;
    try {
      const docRef = doc(db, "event_subscriptions", subId);
      await setDoc(docRef, {
        id: subId,
        eventType: newSub.eventType,
        subscriber: newSub.subscriber,
        priority: Number(newSub.priority) || 10,
        enabled: newSub.enabled
      });
      // Reset form
      setShowAddSub(false);
      setNewSub({
        id: "",
        eventType: "",
        subscriber: "",
        priority: 10,
        enabled: true
      });
    } catch (error) {
      console.error("Failed to create subscription:", error);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      const defaultSubs = [
        { id: 'sub-coo-all', eventType: '*', subscriber: 'AICOORuntime', priority: 100, enabled: true },
        { id: 'sub-graph-all', eventType: '*', subscriber: 'GraphProjectionWorker', priority: 90, enabled: true },
        { id: 'sub-email-resume', eventType: 'EMAIL_RECEIVED', subscriber: 'ResumeParserSkill', priority: 10, enabled: true },
        { id: 'sub-email-requirement', eventType: 'EMAIL_RECEIVED', subscriber: 'RequirementParserSkill', priority: 10, enabled: true },
        { id: 'sub-email-recruitment', eventType: 'EMAIL_RECEIVED', subscriber: 'RecruitmentOffice', priority: 8, enabled: true },
        { id: 'sub-req-recruitment', eventType: 'REQUIREMENT_CREATED', subscriber: 'RecruitmentOffice', priority: 10, enabled: true },
        { id: 'sub-req-matching', eventType: 'REQUIREMENT_CREATED', subscriber: 'MatchingEngine', priority: 10, enabled: true },
        { id: 'sub-req-vendor', eventType: 'REQUIREMENT_CREATED', subscriber: 'VendorOffice', priority: 8, enabled: true },
        { id: 'sub-cand-vendor', eventType: 'CANDIDATE_CREATED', subscriber: 'VendorOffice', priority: 10, enabled: true },
        { id: 'sub-cand-recruitment', eventType: 'CANDIDATE_CREATED', subscriber: 'RecruitmentOffice', priority: 8, enabled: true },
        { id: 'sub-match-recruitment', eventType: 'MATCH_COMPLETED', subscriber: 'RecruitmentOffice', priority: 10, enabled: true },
        { id: 'sub-match-client', eventType: 'MATCH_COMPLETED', subscriber: 'ClientOffice', priority: 8, enabled: true }
      ];

      for (const sub of defaultSubs) {
        await setDoc(doc(db, "event_subscriptions", sub.id), sub);
      }
      alert("Successfully synchronized standard subscription matrix.");
    } catch (error) {
      console.error("Failed to seed subscriptions:", error);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const query = searchQuery.toLowerCase();
    return (
      evt.eventId?.toLowerCase().includes(query) ||
      evt.eventType?.toLowerCase().includes(query) ||
      evt.tenantId?.toLowerCase().includes(query) ||
      evt.source?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col space-y-6 h-full">
      {/* Sub-navigation Controls */}
      <div className="flex justify-between items-center bg-white p-3 border rounded-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("stream")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm border transition-all ${
              activeSubTab === "stream"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Activity className="w-3.5 h-3.5 inline mr-1.5" /> Live Event Stream
          </button>
          <button
            onClick={() => setActiveSubTab("subscriptions")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-sm border transition-all ${
              activeSubTab === "subscriptions"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1.5" /> Subscription Registry
          </button>
        </div>

        {activeSubTab === "subscriptions" && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddSub(!showAddSub)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Subscriber
            </button>
            <button
              onClick={handleSeedDefaults}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" /> Reset Matrix
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: LIVE EVENT STREAM */}
      {activeSubTab === "stream" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-sm text-xs text-slate-800"
                placeholder="Search live stream by ID, type, tenant or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white border rounded-sm flex flex-col min-h-[400px]">
              <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
                  <Terminal className="w-4 h-4 mr-2 text-indigo-600" /> Event Ledger
                </h2>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-sm font-bold animate-pulse">
                  REAL-TIME DISPATCH ACTIVE
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-50">
                {loadingEvents ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">Syncing Ledger...</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    No matching events found in the live ledger.
                  </div>
                ) : (
                  filteredEvents.map((evt) => (
                    <div 
                      key={evt.id} 
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-4 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        selectedEvent?.eventId === evt.eventId ? "bg-indigo-50/30 border-l-4 border-indigo-600 pl-3" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-black text-slate-800 truncate">{evt.eventType || evt.type}</span>
                          {evt.metadata?.isReplay && (
                            <span className="text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded-sm">
                              REPLAYED
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <span className="text-slate-500">{new Date(evt.createdAt || evt.publishedAt).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 text-slate-600 px-1 rounded-sm">ID: {evt.eventId || evt.id}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-indigo-600 font-mono"><Box className="w-3 h-3" /> {evt.tenantId || "GLOBAL"}</span>
                          <span>•</span>
                          <span className="text-slate-500">Source: {evt.source || "SYSTEM"}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payloads Inspector Sidebar */}
          <div className="bg-white border rounded-sm p-4 flex flex-col min-h-[400px]">
            <div className="border-b pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
                <Info className="w-4 h-4 mr-2 text-indigo-600" /> Payloads Inspector
              </h3>
            </div>

            {selectedEvent ? (
              <div className="flex-1 flex flex-col space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Event Type</div>
                  <div className="text-sm font-black text-slate-800">{selectedEvent.eventType || selectedEvent.type}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="font-bold text-slate-400 uppercase tracking-wider">Correlation ID</div>
                    <div className="font-mono text-slate-700 truncate">{selectedEvent.correlationId || "N/A"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-400 uppercase tracking-wider">Trace ID</div>
                    <div className="font-mono text-slate-700 truncate">{selectedEvent.traceId || "N/A"}</div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Facts JSON Payload</div>
                  <pre className="flex-1 p-3 bg-slate-900 text-slate-200 font-mono text-[10px] rounded-sm overflow-auto max-h-[350px]">
                    {JSON.stringify(selectedEvent.payload || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <Box className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-xs">Select an event from the ledger to inspect its schema and facts.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SUBSCRIPTION REGISTRY */}
      {activeSubTab === "subscriptions" && (
        <div className="flex flex-col space-y-6">
          {/* New Subscriber Form Overlay or Form */}
          {showAddSub && (
            <form onSubmit={handleCreateSub} className="bg-slate-50 border border-slate-200 p-4 rounded-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subscription ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. sub-email-router"
                  className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white"
                  value={newSub.id}
                  onChange={(e) => setNewSub({ ...newSub, id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Event Type Fact</label>
                <input
                  type="text"
                  placeholder="e.g. CANDIDATE_CREATED or *"
                  className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white font-mono"
                  value={newSub.eventType}
                  onChange={(e) => setNewSub({ ...newSub, eventType: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subscriber Office / Capability</label>
                <input
                  type="text"
                  placeholder="e.g. AICOORuntime or RecruitmentOffice"
                  className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white"
                  value={newSub.subscriber}
                  onChange={(e) => setNewSub({ ...newSub, subscriber: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-sm"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSub(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Subscriptions Grid */}
          <div className="bg-white border rounded-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-indigo-600" /> Decoupled Subscription matrix
              </h2>
              <span className="text-[10px] font-mono text-slate-400">event_subscriptions collection</span>
            </div>

            <div className="p-4 overflow-x-auto">
              {loadingSubs ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs flex flex-col items-center">
                  <span>No registered subscribers found in the Dynamic subscription registry.</span>
                  <button 
                    onClick={handleSeedDefaults} 
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-sm"
                  >
                    Seed Standard Matrix
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3 px-2 font-bold">Subscription ID</th>
                      <th className="pb-3 px-2 font-bold">Event Type Filter</th>
                      <th className="pb-3 px-2 font-bold">Target Subscriber</th>
                      <th className="pb-3 px-2 font-bold">Priority</th>
                      <th className="pb-3 px-2 font-bold">State</th>
                      <th className="pb-3 px-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                        <td className="py-3 px-2 font-mono text-slate-800">{sub.id}</td>
                        <td className="py-3 px-2">
                          <span className={`px-1.5 py-0.5 rounded-sm font-mono font-bold ${
                            sub.eventType === "*" ? "bg-amber-50 text-amber-700 border border-amber-200 text-[10px]" : "bg-indigo-50 text-indigo-700 text-[10px]"
                          }`}>
                            {sub.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-semibold text-slate-800">{sub.subscriber}</td>
                        <td className="py-3 px-2 font-mono">{sub.priority || 10}</td>
                        <td className="py-3 px-2">
                          {sub.enabled ? (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-sm">
                              MUTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleToggleSub(sub.id, sub.enabled)}
                              className="focus:outline-none"
                              title={sub.enabled ? "Deactivate subscriber" : "Activate subscriber"}
                            >
                              {sub.enabled ? (
                                <ToggleRight className="w-10 h-6 text-indigo-600 cursor-pointer" />
                              ) : (
                                <ToggleLeft className="w-10 h-6 text-slate-400 cursor-pointer" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteSub(sub.id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-sm"
                              title="Delete subscription"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}
    </div>
  );
}
