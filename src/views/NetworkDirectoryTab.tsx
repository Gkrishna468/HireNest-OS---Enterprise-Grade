import React, { useState, useEffect } from "react";
import { collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Network, Users, Building2, Fingerprint, Activity, ActivityIcon, FileText, ShieldCheck, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { subscribeToEvents } from "../services/eventBus";

type FilterType = 'organizations' | 'people' | 'candidates' | 'activity';

export default function NetworkDirectoryTab() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('organizations');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribeToEvents((evts) => {
      setEvents(evts);
    }, 100);
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let q;
        if (activeFilter === 'organizations') {
          q = query(collection(db, "organizations"), limit(50));
        } else if (activeFilter === 'people') {
          q = query(collection(db, "users"), limit(50));
        } else if (activeFilter === 'candidates') {
          q = query(collection(db, "candidatePool"), limit(50));
        } else if (activeFilter === 'activity') {
          // Just use the events we already have subscription for
          setData(events);
          setLoading(false);
          return;
        }
        
        if (q) {
          const snap = await getDocs(q);
          setData(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        }
      } catch (err) {
        console.error("Failed to load network data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [activeFilter, events]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4">
            <Activity className="h-8 w-8 animate-bounce text-indigo-600" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Syncing Network Graph...
            </p>
          </div>
        </div>
      );
    }

    if (activeFilter === 'organizations') {
      return (
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map(org => {
               // Calculate stats for this org from events
               const orgEvents = events.filter(e => e.actorRole === org.type || e.metadata?.vendorId === org.id || e.metadata?.clientId === org.id);
               const profilesUploads = orgEvents.filter(e => e.type === 'CandidateUploaded').length;
               
               const matches = orgEvents.filter(e => e.type === 'CandidateMatched').length;
               const submissions = orgEvents.filter(e => e.type === 'SubmissionCreated' || e.type === 'Submission').length;
               const interviews = orgEvents.filter(e => e.type?.includes('Interview')).length;
               const offers = orgEvents.filter(e => e.type?.includes('Offer')).length;
               const placements = orgEvents.filter(e => e.type === 'PlacementCompleted' || e.type === 'DealRoomOpened').length;
               
               return (
                <div key={org.id} className="p-6 rounded-[24px] border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                      {org.name?.charAt(0) || org.id.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight text-lg">{org.name || org.id}</h3>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1 mt-1">
                        <Building2 size={12}/> {org.type || 'Organization'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                     <h4 className="text-[9px] uppercase font-black text-indigo-500 tracking-widest mb-3 flex items-center gap-1">
                        <Activity size={12} /> Organizational Opportunity Graph
                     </h4>
                     <div className="grid grid-cols-5 gap-2">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-slate-800">{matches}</span>
                           <span className="text-[7px] uppercase font-bold tracking-widest text-slate-400 mt-1">Matches</span>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-indigo-800">{submissions}</span>
                           <span className="text-[7px] uppercase font-bold tracking-widest text-indigo-400 mt-1">Submissions</span>
                        </div>
                        <div className="bg-sky-50 border border-sky-100 rounded-lg p-2 flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-sky-800">{interviews}</span>
                           <span className="text-[7px] uppercase font-bold tracking-widest text-sky-400 mt-1">Interviews</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-emerald-800">{offers}</span>
                           <span className="text-[7px] uppercase font-bold tracking-widest text-emerald-400 mt-1">Offers</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-amber-800">{placements}</span>
                           <span className="text-[7px] uppercase font-bold tracking-widest text-amber-400 mt-1">Placements</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 mb-4">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Profiles Added</p>
                      <p className="text-sm font-black text-slate-700 mt-0.5">{profilesUploads}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Events</p>
                      <p className="text-sm font-black text-slate-700 mt-0.5">{orgEvents.length}</p>
                    </div>
                  </div>
                  
                  {/* Trust & Verification Matrix */}
                  <div className="pt-4 border-t border-slate-100">
                     <h4 className="text-[9px] uppercase font-black text-indigo-500 tracking-widest mb-3 flex items-center gap-1">
                        <ShieldCheck size={12} /> Trust & Verification Matrix
                     </h4>
                     <div className="space-y-2">
                        {/* Level 1 */}
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded p-2">
                           <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle size={10} />
                              </span>
                              <div>
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Level 1: Basic</p>
                                <p className="text-[8px] text-slate-500">Name, Email, Phone</p>
                              </div>
                           </div>
                           <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                        </div>
                        {/* Level 2 */}
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded p-2">
                           <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <CheckCircle size={10} />
                              </span>
                              <div>
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Level 2: Business</p>
                                <p className="text-[8px] text-slate-500">GST, PAN, CIN, Wallet</p>
                              </div>
                           </div>
                           {org.trustScore && org.trustScore >= 50 ? (
                             <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                           ) : (
                             <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">Pending Audit</span>
                           )}
                        </div>
                        {/* Level 3 */}
                        <div className="flex items-center justify-between bg-white border border-slate-100 rounded p-2">
                           <div className="flex items-center gap-2">
                              {orgEvents.length > 5 ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle size={10} />
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                </span>
                              )}
                              <div>
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Level 3: Operational</p>
                                <p className="text-[8px] text-slate-500">Website, LinkedIn, Activity</p>
                              </div>
                           </div>
                           {orgEvents.length > 5 ? (
                             <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                           ) : (
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded">Incomplete</span>
                           )}
                        </div>
                        {/* Level 4 */}
                        <div className="flex items-center justify-between bg-white border border-slate-100 rounded p-2">
                           <div className="flex items-center gap-2">
                              {placements > 0 ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle size={10} />
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                </span>
                              )}
                              <div>
                                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">Level 4: Performance</p>
                                <p className="text-[8px] text-slate-500">Placements, Retention, SLAs</p>
                              </div>
                           </div>
                           {placements > 0 ? (
                             <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>
                           ) : (
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded">Locked</span>
                           )}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
          {data.length === 0 && <p className="text-center text-slate-500 py-10 font-bold uppercase tracking-widest">No organizations found.</p>}
        </div>
      );
    }

    if (activeFilter === 'people') {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.map(person => {
             const userEvents = events.filter(e => e.actorId === person.id);
             
             let activityLabel = "Activity Count";
             let activityValue = userEvents.length;

             if (person.role?.includes('CLIENT')) {
                 activityLabel = "Requirements Posted";
                 activityValue = userEvents.filter(e => e.type === 'JobPublished').length;
             } else if (person.role?.includes('VENDOR')) {
                 activityLabel = "Profiles Uploaded";
                 activityValue = userEvents.filter(e => e.type === 'CandidateUploaded').length;
             }

             return (
               <div key={person.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Users size={20}/>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{person.email || person.id}</h4>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{person.role || 'Unknown'}</span>
                        {person.organizationId && <span className="text-[10px] text-slate-400 font-mono tracking-tighter">ORG: {person.organizationId}</span>}
                      </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activityLabel}</p>
                    <p className="text-xl font-black text-indigo-600">{activityValue}</p>
                 </div>
               </div>
             )
          })}
          {data.length === 0 && <p className="text-center text-slate-500 col-span-2">No people found.</p>}
        </div>
      );
    }

    if (activeFilter === 'candidates') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {data.map(cand => {
              const displayName = cand.fullName || cand.name || cand.candidateName || 
                (cand.firstName && cand.lastName ? `${cand.firstName} ${cand.lastName}` : null) ||
                `Candidate ${cand.id.substring(0,8).toUpperCase()}`;
                
              return (
                <div key={cand.id} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex items-start gap-4">
                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Fingerprint size={24} />
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{displayName}</h4>
                      <p className="text-xs text-slate-500 mb-2">{cand.primaryEmail || cand.email || 'No email provided'}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                         {cand.skills?.slice(0,4).map((sk: string) => (
                            <span key={sk} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{sk}</span>
                         ))}
                      </div>
                   </div>
                   <div className="text-right">
                       <p className="text-[9px] font-mono text-slate-400">ID: {cand.id.substring(0,6)}</p>
                       {cand.vendorId && (
                           <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 mt-1 inline-block rounded font-bold uppercase">
                               From: {cand.vendorId.replace('ORG-','')}
                           </span>
                       )}
                   </div>
                </div>
              );
           })}
           {data.length === 0 && <p className="text-center text-slate-500 col-span-2">No candidates found.</p>}
        </div>
      )
    }

    if (activeFilter === 'activity') {
      return (
        <div className="space-y-4">
          {events.map(ev => (
            <div key={ev.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                <div className="flex justify-between items-start">
                   <div className="flex gap-3">
                      <ActivityIcon size={16} className="text-indigo-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-800">{ev.type}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Role: {ev.actorRole} | Entity: {ev.entityType} ({ev.entityId})
                        </p>
                        <div className="mt-2 text-xs text-slate-600 font-mono">
                           {JSON.stringify(ev.metadata)}
                        </div>
                      </div>
                   </div>
                   <div className="text-[10px] text-slate-400 font-mono">
                      {ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleString() : 'Just now'}
                   </div>
                </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-center text-slate-500">No recent activity.</p>}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Network Directory</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Global Operational Graph</p>
        </div>
      </div>

      {/* Unified Visibility Nav */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        {[
          { id: 'organizations', label: 'Organizations', icon: Building2 },
          { id: 'people', label: 'People & Recruiters', icon: Users },
          { id: 'candidates', label: 'Global Candidates', icon: Fingerprint },
          { id: 'activity', label: 'Activity Logs', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as FilterType)}
            className={cn(
              "px-4 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors",
              activeFilter === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 min-h-[400px]">
         {renderContent()}
      </div>
    </div>
  );
}
