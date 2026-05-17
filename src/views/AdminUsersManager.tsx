import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Trash2, Check, Save } from "lucide-react";

export default function AdminUsersManager({ orgData }: { orgData: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<string>("INITIALIZING");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "DEMAND" | "SUPPLY" | "GOVERNANCE">("ALL");
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<any>("client_hm");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const roles = [
    { value: 'admin', label: 'platform authority (hq)', category: 'GOVERNANCE' },
    { value: 'client_hm', label: 'client node (member)', category: 'DEMAND' },
    { value: 'vendor_agency', label: 'staffing agency (vendor)', category: 'SUPPLY' },
    { value: 'independent_vendor', label: 'independent vendor (supply)', category: 'SUPPLY' },
    { value: 'independent_recruiter', label: 'independent recruiter', category: 'SUPPLY' },
    { value: 'freelancer_recruiter', label: 'freelancer recruiter', category: 'SUPPLY' },
  ];

  const getRoleCategory = (r: string) => {
    return roles.find(ro => ro.value === r)?.category || 'DEMAND';
  };

  const getRoleLabel = (r: string) => {
    return roles.find(ro => ro.value === r)?.label || r;
  };

  const VerificationBadge = ({ verification }: { verification: any, role: string }) => {
    const trustScore = verification?.trustScore || 0;
    if (!verification) return <span className="text-[8px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-black tracking-widest lowercase">unverified node</span>;
    
    return (
      <div className="flex items-center gap-1">
        {verification.emailVerified && <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-black lowercase">email</span>}
        {verification.identityVerified && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-black lowercase">identity</span>}
        {verification.businessVerified && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-black lowercase">business</span>}
        {verification.aadhaarVerified && <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded font-black lowercase">aadhaar</span>}
        <span className="text-[10px] font-black text-indigo-600 ml-2 whitespace-nowrap lowercase tracking-tighter">trust: {trustScore}</span>
      </div>
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUsers();
      } else {
        setLoading(false);
        setError("IDENTITY_REQUIRED: Please sign in with an authorized Global HQ node account.");
      }
    });
    return () => unsub();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No active identity found. Access Denied.");
      
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/governance-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const orgs = data.organizations || [];
        const remoteUsers = (data.users || []).filter((u: any) => !u.deleted);
        setSyncMode(data.mode || (data.isMock ? "FALLBACK" : "LIVE"));
        
        setUsers(remoteUsers.map((u: any) => {
          const orgId = u.organizationId || u.orgId || (u.org && u.org.id);
          const org = orgs.find((o: any) => o.id === orgId || o.organizationId === orgId);
          return { ...u, id: u.uid || u.id, uid: u.uid || u.id, org };
        }));
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Governance API returned ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Governance API failed, attempting Firestore fallback", err.message);
      setSyncMode("FS_FALLBACK");
      try {
        const [userSnap, orgSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "organizations"))
        ]);
        const orgs = orgSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
        setUsers(userSnap.docs.map(d => {
          const u = d.data() as any;
          const org = orgs.find(o => o.id === u.organizationId);
          return { id: d.id, uid: d.id, ...u, org };
        }).filter((u: any) => !u.deleted));
      } catch (fErr: any) {
        const identity = auth.currentUser?.email || "Unknown Identity";
        setError(`HANDSHAKE FAILED: Access Denied to [${identity}].`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/onboard-node', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ email, password, role, companyName })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Onboarding failed");
      }

      setEmail("");
      setPassword("");
      setCompanyName("");
      await fetchUsers();
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, organizationId: string) => {
    if (!window.confirm("Terminate this identity and associated organization?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ uid: userId, organizationId })
      });
      await fetchUsers();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredUsers = users.filter(u => {
    if (activeTab === "ALL") return true;
    return getRoleCategory(u.role) === activeTab;
  });

  if (orgData.type !== 'admin') {
    return <div className="p-8 text-red-500 font-bold uppercase tracking-tight">Access Denied. Global HQ Node Only.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight lowercase">identity matrix</h1>
          <p className="text-slate-400 font-bold text-[10px] lowercase tracking-widest mt-1">
            <span className="text-indigo-600">global node authority</span> • platform governance & lifecycle
          </p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl">
          <div className="px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              syncMode === 'LIVE' ? 'bg-emerald-500' : 
              syncMode === 'HYBRID_MOCK' ? 'bg-amber-500' : 'bg-red-500'
            )} />
            Node Sync: {syncMode}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="border-2 border-slate-100 rounded-[32px] p-8 transition-all bg-white shadow-sm">
            <h2 className="text-xs font-black lowercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
               <Save size={14} className="text-indigo-600" />
               onboard new node
            </h2>
            
            {error && <div className="mb-6 text-[10px] font-black lowercase tracking-widest bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100">{error}</div>}
            
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 lowercase tracking-widest mb-2">entity name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none"
                  placeholder="e.g. acme agency"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 lowercase tracking-widest mb-2">node email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none"
                  placeholder="user@example.com"
                />
              </div>
 
              <div>
                <label className="block text-[10px] font-black text-slate-500 lowercase tracking-widest mb-2">initial key</label>
                <input
                  type="text" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none"
                  placeholder="secure key"
                />
              </div>
 
              <div>
                <label className="block text-[10px] font-black text-slate-500 lowercase tracking-widest mb-2">node role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none appearance-none"
                >
                  {roles.filter(r => r.value !== 'admin').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                  <option value="admin">platform authority (hq)</option>
                </select>
              </div>
 
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 font-black lowercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-indigo-100"
              >
                {isSubmitting ? "syncing..." : "onboard identity"}
              </Button>
            </form>
          </div>
 
          <div className="bg-slate-900 rounded-[32px] p-8 text-white">
            <h3 className="text-[10px] font-black lowercase tracking-[0.3em] text-slate-500 mb-6 text-center">node composition</h3>
            <div className="space-y-4">
               {['GOVERNANCE', 'DEMAND', 'SUPPLY'].map(cat => {
                 const count = users.filter(u => getRoleCategory(u.role) === cat).length;
                 return (
                   <div key={cat} className="flex items-center justify-between">
                     <span className="text-[10px] font-black lowercase tracking-widest text-slate-400">{cat.toLowerCase()}</span>
                     <span className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-black">{count}</span>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
            {(["ALL", "GOVERNANCE", "DEMAND", "SUPPLY"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black lowercase tracking-widest transition-all",
                  activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>

          <div className="bg-white border-2 border-slate-50 rounded-[40px] p-10 shadow-sm">
            <div className="space-y-4">
              {loading ? (
                <div className="py-32 text-center text-[10px] font-black lowercase tracking-[0.3em] text-slate-400">syncing matrix...</div>
              ) : (
                <>
                  {filteredUsers.map(u => (
                    <div key={u.id} className="group flex items-center justify-between p-6 bg-white border-2 border-slate-50 rounded-[28px] hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-50 transition-all">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center font-black",
                          getRoleCategory(u.role) === 'GOVERNANCE' ? 'bg-slate-900 text-white' :
                          getRoleCategory(u.role) === 'DEMAND' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                        )}>
                          {u.email.charAt(0).toLowerCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 lowercase tracking-tight flex items-center gap-2">
                            {u.email}
                            {u.role === 'admin' && <Check size={12} className="text-indigo-600" />}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] text-slate-400 font-bold lowercase tracking-widest">
                               {u.org?.companyName?.toLowerCase() || 'unmapped entity'}
                             </span>
                             <span className="h-1 w-1 rounded-full bg-slate-200" />
                             <span className={cn(
                               "text-[10px] font-black lowercase tracking-widest",
                               getRoleCategory(u.role) === 'GOVERNANCE' ? 'text-slate-900' :
                               getRoleCategory(u.role) === 'DEMAND' ? 'text-indigo-600' : 'text-amber-600'
                             )}>
                               {getRoleLabel(u.role).toLowerCase()}
                             </span>
                          </div>
                          <div className="mt-2">
                             <VerificationBadge verification={u.verification} role={u.role} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => handleDeleteUser(u.id, u.organizationId)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero Nodes in Category</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

