import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Button } from "../lib/Button";

export default function AdminUsersManager({ orgData }: { orgData: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"client" | "vendor" | "admin">("client");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      const inviteSnap = await getDocs(collection(db, "pending_invites"));
      setInvites(inviteSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch users");
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const emailLower = email.toLowerCase().trim();

      // Create Organization
      const orgId = "ORG-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newOrgData = {
        organizationId: orgId,
        type: role === "client" ? "client" : role === "vendor" ? "vendor" : "admin",
        companyName: companyName,
        status: "approved",
        ndaUploaded: false,
        msaUploaded: false,
        createdBy: orgData.ownerId,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "organizations", orgId), newOrgData);

      // Create Pending Invite
      const inviteData = {
        email: emailLower,
        role: role,
        organizationId: orgId,
        companyName: companyName,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, "pending_invites", emailLower), inviteData);

      // Reset form and reload list
      setEmail("");
      setCompanyName("");
      await fetchUsers();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to provision user context.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orgData.type !== 'admin') {
    return <div className="p-8 text-red-500">Access Denied. Global HQ only.</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Access Management</h1>
        <p className="text-slate-500 mt-1">Global HQ Admin portal to invite and provision tenants (vendors/clients).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm p-6 self-start">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Provision New Tenant</h2>
          {error && <div className="mb-4 text-xs bg-red-50 text-red-600 p-3 rounded">{error}</div>}
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Acme Corp"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Platform Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="client">Client (Hiring)</option>
                <option value="vendor">Vendor (Recruiting)</option>
                <option value="admin">Global HQ Admin</option>
              </select>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? "Provisioning..." : "Provision Access"}
            </Button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Pending Invites</h2>
            
            <div className="overflow-auto max-h-[300px]">
              {loading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Company</th>
                      <th className="pb-3 font-medium text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invites.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-slate-800">{i.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${
                            i.role === 'admin' ? 'bg-indigo-100 border border-indigo-200 text-indigo-700' 
                            : i.role === 'client' ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' 
                            : 'bg-amber-100 border border-amber-200 text-amber-800'
                          }`}>
                            {i.role}
                          </span>
                        </td>
                        <td className="py-3 text-slate-800">{i.companyName}</td>
                        <td className="py-3 text-right text-slate-400">
                          {new Date(i.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {invites.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 bg-slate-50 rounded-lg italic">
                          No pending invites.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Active Users</h2>
            
            <div className="overflow-auto max-h-[300px]">
              {loading ? (
                <div className="text-sm text-slate-500">Loading users...</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Org ID</th>
                      <th className="pb-3 font-medium text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-slate-800">{u.email}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider ${
                            u.role === 'admin' ? 'bg-indigo-100 border border-indigo-200 text-indigo-700' 
                            : u.role === 'client' ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' 
                            : 'bg-amber-100 border border-amber-200 text-amber-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 font-mono text-xs">{u.organizationId}</td>
                        <td className="py-3 text-right text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 bg-slate-50 rounded-lg italic">
                          No active users.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
