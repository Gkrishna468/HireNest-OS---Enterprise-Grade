import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User as UserIcon, Building, Bell, Shield, LogOut, Moon, Sun, Monitor, AlertTriangle, FileSpreadsheet, HardDrive, RefreshCw, FileText, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SettingsTab() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [workspaceDetails, setWorkspaceDetails] = useState<any>(null);
  const [rufloHealth, setRufloHealth] = useState<any>(null);

  // Google Drive & Sheets Sync state
  const [sheetUrlInput, setSheetUrlInput] = useState<string>('');
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncGoogleSheets = async (overrideUrl?: string) => {
    setIsSyncingSheets(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync-requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overrideUrl: overrideUrl || sheetUrlInput || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(data);
      } else {
        setSyncError(data.message || data.error || 'Sync failed');
      }
    } catch (err: any) {
      setSyncError(err.message || 'An error occurred while syncing Google Sheets requirements');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/workspace/status', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let data: any = {};
        if (res.ok) {
          try {
            data = await res.json();
          } catch {
            data = { connected: false };
          }
        } else {
          data = { connected: false };
        }

        setIsGoogleConnected(!!data.connected);
        if (data.connected) {
          setWorkspaceDetails(data);
          try {
            const rufloRes = await fetch("/api/ruflo/health", {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (rufloRes.ok) {
              const rData = await rufloRes.json().catch(() => null);
              if (rData) setRufloHealth(rData);
            }
          } catch (e) {
            console.warn("Ruflo health fetch failed", e);
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
          <div className="w-8 h-8 rounded-full border-t-2 border-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your account preferences and operational settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6 md:col-span-1">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="h-20 w-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                 <UserIcon size={32} />
               </div>
               <div className="text-center">
                 <h2 className="text-lg font-bold text-slate-900">{userData?.name || auth.currentUser?.email?.split('@')[0] || "User Profile"}</h2>
                 <p className="text-sm text-slate-500">{auth.currentUser?.email}</p>
                 <div className="mt-4 flex justify-center">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">{userData?.role || "GUEST"}</span>
                 </div>
               </div>
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-rose-600 font-bold group">
                 <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                   <LogOut size={16} />
                 </div>
                 Sign Out
               </button>
             </div>
          </div>

          <div className="space-y-6 md:col-span-2">
            
            {/* Context & Organization */}
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <Building className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Organization Profile</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Company Name</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700">{userData?.companyName || "N/A"}</div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Organization ID</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-500">{userData?.organizationId || "N/A"}</div>
                 </div>
                 <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Workspace Type</label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 capitalize">{userData?.type || userData?.role || "Standard"}</div>
                 </div>
              </div>
            </section>

            {/* Integrations */}
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Integrations</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                       <div>
                          <p className="font-bold text-sm text-slate-800">Google Workspace (Drive & Sheets)</p>
                          <p className="text-xs text-slate-500 mt-1">Connect your Google account to enable Google Drive file access, Excel/Google Sheets requirements synchronization, email sync, and calendar scheduling.</p>
                       </div>
                       <div className="mt-4 sm:mt-0">
                         {isGoogleConnected ? (
                           <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Connected
                           </span>
                         ) : (
                           <span className="px-2 py-1 bg-slate-200 text-slate-600 border border-slate-300 rounded text-[10px] font-bold uppercase tracking-widest w-max">
                              Not Connected
                           </span>
                         )}
                       </div>
                    </div>

                    {isGoogleConnected && workspaceDetails && (
                      <div className="bg-white border border-slate-200 rounded-lg p-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Account</p>
                            <p className="text-sm font-mono text-slate-700">{workspaceDetails.emailAddress || 'Unknown'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Services</p>
                            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                               <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Gmail</span>
                               <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Google Drive</span>
                               <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Google Sheets</span>
                               {workspaceDetails.calendar && <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Calendar</span>}
                               {workspaceDetails.watchStatus && <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> Pub/Sub</span>}
                               <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> MailOS</span>
                            </div>
                         </div>
                         <div className="sm:col-span-2 flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                            <p className="text-[10px] text-slate-500">
                               Watch expires: {workspaceDetails.watchStatus && workspaceDetails.watchExpiration ? new Date(workspaceDetails.watchExpiration).toLocaleString() : 'N/A'}
                            </p>
                            {workspaceDetails.watchStatus === false && workspaceDetails.watchError && (
                               <p className="text-[10px] text-rose-500 max-w-sm truncate" title={typeof workspaceDetails.watchError === 'object' ? JSON.stringify(workspaceDetails.watchError) : workspaceDetails.watchError}>
                                  Watch Error: {typeof workspaceDetails.watchError === 'object' ? 'Permission Denied or Config Error' : workspaceDetails.watchError}
                               </p>
                            )}
                            <p className="text-[10px] text-slate-500">
                               Last Sync: {workspaceDetails.lastRefresh ? new Date(workspaceDetails.lastRefresh._seconds ? workspaceDetails.lastRefresh._seconds * 1000 : workspaceDetails.lastRefresh).toLocaleTimeString() : 'N/A'}
                            </p>
                         </div>
                      </div>
                    )}

                    <div className="flex gap-3 justify-end mt-2">
                      {isGoogleConnected && (
                         <button 
                            onClick={async () => {
                              try {
                                const token = await auth.currentUser?.getIdToken();
                                const res = await fetch(`/api/oauth/url?uid=${auth.currentUser?.uid}&redirectTo=/app`, {
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                let data: any = {};
                                try { data = await res.json(); } catch { data = {}; }
                                if (data.url) window.location.href = data.url;
                                else if (data.error) alert(typeof data.error === 'string' ? data.error : (data.error.message || data.error.code || 'Unable to reconnect Google account.'));
                                else alert("Google OAuth is not configured in this environment.");
                              } catch (e) { console.error(e); }
                            }}
                            className="px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                         >
                            Reconnect
                         </button>
                      )}
                      <button 
                         onClick={async () => {
                           try {
                             const token = await auth.currentUser?.getIdToken();
                             const uid = auth.currentUser?.uid;
                             if (isGoogleConnected) {
                                await fetch('/api/oauth/disconnect', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                setIsGoogleConnected(false);
                                setWorkspaceDetails(null);
                                return;
                             }
                             const res = await fetch(`/api/oauth/url?uid=${uid}&redirectTo=/app`, {
                               headers: { 'Authorization': `Bearer ${token}` }
                             });
                             let data: any = {};
                             try { data = await res.json(); } catch { data = {}; }
                             if (data.url) {
                               window.location.href = data.url;
                             } else if (data.error) {
                               alert(typeof data.error === 'string' ? data.error : (data.error.message || data.error.code || 'Google OAuth is not configured in this environment.'));
                             } else {
                               alert("Google OAuth is not configured in this environment.");
                             }
                           } catch (e) {
                             console.error(e);
                           }
                         }}
                         className={cn(
                           "px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg whitespace-nowrap shrink-0 transition-colors",
                           isGoogleConnected 
                             ? "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100"
                             : "bg-indigo-600 border border-indigo-700 text-white hover:bg-indigo-700"
                         )}
                      >
                         {isGoogleConnected ? "Disconnect" : "Connect Google"}
                      </button>
                    </div>
                 </div>

                 {/* Google Drive & Excel / Google Sheets Requirements Sync */}
                 <div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl border border-indigo-800/50 mt-4 shadow-md">
                    <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                             <FileSpreadsheet size={22} />
                          </div>
                          <div>
                             <h4 className="font-black text-sm tracking-tight text-slate-100 flex items-center gap-2">
                                Google Drive & Sheets Requirements Sync
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase rounded-full">
                                   Live Integration
                                </span>
                             </h4>
                             <p className="text-xs text-indigo-200/80 mt-0.5">
                                Connect Excel & Google Sheets from your Google Drive to automatically ingest all client job requirements.
                             </p>
                          </div>
                       </div>
                       <HardDrive className="text-indigo-400 shrink-0" size={20} />
                    </div>

                    <div className="space-y-3 pt-2">
                       <label className="block text-[10px] font-black uppercase text-indigo-300 tracking-wider">
                          Google Sheet or Excel Web Published CSV / Drive URL
                       </label>
                       <div className="flex gap-2">
                          <input 
                             type="text" 
                             value={sheetUrlInput}
                             onChange={(e) => setSheetUrlInput(e.target.value)}
                             placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv (Leave blank for default sheet)"
                             className="flex-1 bg-slate-950/80 border border-indigo-800/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                          />
                          <button
                             onClick={() => handleSyncGoogleSheets()}
                             disabled={isSyncingSheets}
                             className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
                          >
                             {isSyncingSheets ? (
                                <>
                                   <RefreshCw size={14} className="animate-spin" />
                                   Syncing...
                                </>
                             ) : (
                                <>
                                   <Sparkles size={14} />
                                   Sync Requirements Now
                                </>
                             )}
                          </button>
                       </div>

                       {syncError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                             <AlertTriangle size={15} className="shrink-0" />
                             <span>{syncError}</span>
                          </div>
                       )}

                       {syncResult && (
                          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs space-y-2">
                             <div className="flex items-center justify-between text-emerald-300 font-bold">
                                <span className="flex items-center gap-1.5">
                                   <CheckCircle2 size={16} /> Sync Completed Successfully
                                </span>
                                <span className="text-[10px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200">
                                   Status: {syncResult.syncStatus}
                                </span>
                             </div>
                             <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                   <span className="block text-slate-400 text-[10px] uppercase font-bold">Total Processed</span>
                                   <span className="text-sm font-black text-slate-100">{syncResult.syncedCount || 0}</span>
                                </div>
                                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                   <span className="block text-emerald-400 text-[10px] uppercase font-bold">New Created</span>
                                   <span className="text-sm font-black text-emerald-300">{syncResult.createdCount || 0}</span>
                                </div>
                                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                                   <span className="block text-indigo-400 text-[10px] uppercase font-bold">Updated</span>
                                   <span className="text-sm font-black text-indigo-300">{syncResult.updatedCount || 0}</span>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Ruflo Integration */}
                 <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                       <div>
                          <p className="font-bold text-sm text-slate-800">Ruflo Agent Harness</p>
                          <p className="text-xs text-slate-500 mt-1">Enterprise AI agent orchestration platform (L1 Capability).</p>
                       </div>
                       <div className="mt-4 sm:mt-0">
                         {rufloHealth && rufloHealth.status === 'OK' ? (
                           <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Online (L1)
                           </span>
                         ) : (
                           <span className="px-2 py-1 bg-slate-200 text-slate-600 border border-slate-300 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span> Offline
                           </span>
                         )}
                       </div>
                    </div>
                    
                    {rufloHealth && rufloHealth.status === 'OK' && (
                       <div className="bg-white border border-slate-200 rounded-lg p-4 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Latency</p>
                             <p className="text-sm font-mono text-slate-700">{rufloHealth.latency}ms</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Provider</p>
                             <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                <span className="flex items-center gap-1"><span className="text-emerald-500">✓</span> @claude-flow/cli</span>
                             </div>
                          </div>
                       </div>
                    )}
                    
                    <div className="flex gap-3 justify-end mt-2">
                       <button
                          onClick={async () => {
                             try {
                               const token = await auth.currentUser?.getIdToken();
                               const res = await fetch('/api/ruflo/init', {
                                 method: 'POST',
                                 headers: { 'Authorization': `Bearer ${token}` }
                               });
                               if (res.ok) {
                                  const hRes = await fetch('/api/ruflo/health', {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  setRufloHealth(await hRes.json());
                               } else {
                                  alert("Failed to initialize Ruflo Integration.");
                               }
                             } catch (e) {
                               console.error(e);
                             }
                          }}
                          className={cn(
                             "px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg whitespace-nowrap shrink-0 transition-colors",
                             rufloHealth && rufloHealth.status === 'OK'
                               ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                               : "bg-indigo-600 border border-indigo-700 text-white hover:bg-indigo-700"
                          )}
                       >
                          {rufloHealth && rufloHealth.status === 'OK' ? 'Re-Initialize' : 'Initialize Ruflo'}
                       </button>
                    </div>
                 </div>

              </div>
            </section>

            {/* Notification Preferences */}
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <Bell className="text-indigo-600" size={20} />
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Notification Preferences</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                       <p className="font-bold text-sm text-slate-800">Email Notifications</p>
                       <p className="text-xs text-slate-500 mt-1">Receive daily pipeline digests and placement alerts.</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                       <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                    </div>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                       <p className="font-bold text-sm text-slate-800">In-App Alerts</p>
                       <p className="text-xs text-slate-500 mt-1">Real-time alerts for workflow changes and interview actions.</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                       <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                    </div>
                 </div>
              </div>
            </section>

            {/* Security & Data Erasure */}
            <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="text-slate-600" size={20} />
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Data & Security</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center p-4 border border-rose-100 bg-rose-50/30 rounded-xl">
                    <div className="flex gap-3">
                       <div className="mt-0.5">
                         <AlertTriangle className="text-rose-500" size={16} />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-slate-800">Data Erasure Request</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm">Initiate a formal request to purge all associated operational data from the global matrix.</p>
                       </div>
                    </div>
                    <button className="px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-rose-50 whitespace-nowrap shrink-0 transition-colors">
                       Request Erasure
                    </button>
                 </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
