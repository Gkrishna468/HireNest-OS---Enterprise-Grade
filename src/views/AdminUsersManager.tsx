import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Edit, Trash2, X, Check, Save } from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

export default function AdminUsersManager({ orgData }: { orgData: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<string>("INITIALIZING");
  const [error, setError] = useState("");
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "vendor" | "admin">("client");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Use administrative proxy for Global HQ
      const response = await fetch('/api/admin/governance-data');
      if (response.ok) {
        const data = await response.json();
        const orgs = data.organizations || [];
        const remoteUsers = data.users || [];
        setSyncMode(data.mode || (data.isMock ? "FALLBACK" : "LIVE"));
        
        setUsers(remoteUsers.map((u: any) => {
          const orgId = u.organizationId || u.orgId || (u.org && u.org.id);
          const org = orgs.find((o: any) => o.id === orgId || o.organizationId === orgId);
          return { ...u, id: u.uid || u.id, uid: u.uid || u.id, org };
        }).filter((u: any) => !u.deleted));
      } else {
        throw new Error(`Governance API returned ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Governance API failed, attempting Firestore fallback", err);
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
        console.error("Firestore fallback also failed", fErr);
        setError("Network desync: Could not establish secure handshake with nodes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const startEditUser = (u: any) => {
    setEditingUser(u);
    setEmail(u.email);
    setPassword(""); // Keep blank to not change password unless typed
    setRole(u.role);
    setCompanyName(u.org?.companyName || "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEmail("");
    setPassword("");
    setRole("client");
    setCompanyName("");
    setError("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingUser.uid || editingUser.id,
          email,
          password: password || undefined,
          role,
          companyName,
          organizationId: editingUser.organizationId
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Update failed");
      }

      await fetchUsers();
      cancelEdit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch('/api/admin/onboard-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          companyName
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Onboarding failed");
      }

      // Reset form and reload list
      setEmail("");
      setPassword("");
      setCompanyName("");
      await fetchUsers();
      
    } catch (err: any) {
       setError(err.message || "An unexpected error occurred during onboarding.");
       console.error("Onboarding logic failure:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, organizationId: string) => {
    if (!userId) {
      alert("Error: No user ID found for deletion.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently remove this user and their organization? This will also remove their Firebase Auth identity.")) return;
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, organizationId })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Deletion failed");
      }
      
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (orgData.type !== 'admin') {
    return <div className="p-8 text-red-500 font-bold uppercase tracking-tight">Access Denied. Global HQ Node Only.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Identity Matrix</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
            <span className="text-indigo-600">Global Node Authority</span> • Platform Governance & Lifecycle
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
           <button 
             onClick={() => fetchUsers()}
             className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
           >
             Manual Resync
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <div className={`border-2 rounded-[32px] p-8 transition-all ${editingUser ? 'border-amber-500 shadow-2xl shadow-amber-50 bg-white' : 'border-slate-100 bg-white'}`}>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
               {editingUser ? <Edit size={14} className="text-amber-500" /> : <Save size={14} className="text-indigo-600" />}
               {editingUser ? 'Update Protocol' : 'Onboard New Identity'}
            </h2>
            
            {error && <div className="mb-6 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100">{error}</div>}
            
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Entity Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Identity Email</label>
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
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {editingUser ? 'Change Access Key (Optional)' : 'Initial Access Key'}
                </label>
                <input
                  type="text" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none"
                  placeholder={editingUser ? "Leave blank to ignore" : "Secure key"}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Core Component Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-4 text-sm font-bold focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="client">Client Node</option>
                  <option value="vendor">Vendor Node</option>
                  <option value="admin">Platform Authority</option>
                </select>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={cn(
                    "w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl",
                    editingUser ? "bg-amber-500 hover:bg-slate-900 shadow-amber-100" : "bg-indigo-600 hover:bg-slate-900 shadow-indigo-100"
                  )}
                >
                  {isSubmitting ? "Syncing..." : (editingUser ? "Update Identity" : "Onboard Identity")}
                </Button>
                
                {editingUser && (
                   <Button 
                    type="button" 
                    onClick={cancelEdit}
                    className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-sm"
                   >
                     Cancel Edit
                   </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-50 rounded-[40px] p-10 shadow-sm border-t-8 border-t-slate-100">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-900 mb-10">Active Node Inventory</h2>
            
            <div className="overflow-auto custom-scrollbar pr-2">
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <div className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Synapsing Network Nodes...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map(u => (
                    <div key={u.id || u.uid} className={cn(
                        "group flex items-center justify-between p-6 bg-white border-2 rounded-[28px] transition-all hover:shadow-xl hover:shadow-slate-50",
                        editingUser?.id === u.id ? 'border-amber-200 bg-amber-50/20' : 'border-slate-50 hover:border-indigo-100'
                    )}>
                      <div className="flex items-center gap-6">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-colors",
                            u.role === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' :
                            u.role === 'client' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' :
                            'bg-amber-600 text-white shadow-lg shadow-amber-100'
                        )}>
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            {u.email}
                            {u.role === 'admin' && <Check size={12} className="text-indigo-600" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                             {u.org?.companyName || 'Unmapped Entity'} • Created {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-4 pr-6 border-r border-slate-50">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${u.org?.msaUploaded ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : 'bg-slate-200'}`} />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MSA</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${u.org?.ndaUploaded ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : 'bg-slate-200'}`} />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NDA</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => startEditUser(u)}
                                className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm group/btn"
                            >
                                <Edit size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Configure</span>
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(u.id, u.organizationId)}
                                className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                            >
                                <Trash2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Terminate</span>
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {users.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                      <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero Provisioned Nodes</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
