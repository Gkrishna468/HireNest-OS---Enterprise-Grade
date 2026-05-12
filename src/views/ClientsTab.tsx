import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";

export default function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchClients() {
      const q = query(collection(db, "organizations"), where("type", "==", "client"));
      const snap = await getDocs(q);
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm("Are you sure you want to permanently remove this client?")) return;
    try {
      await deleteDoc(doc(db, "organizations", clientId));
      await fetchClients();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete client: " + err.message);
    }
  };

  const getReminderStatus = (org: any) => {
    if (org.msaUploaded && org.ndaUploaded) return "Signed";
    const createdAt = new Date(org.createdAt).getTime();
    const now = Date.now();
    const daysSince = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    
    if (daysSince >= 15) return "Reminder Sent (Final)";
    if (daysSince >= 5) return "Reminder Sent (2nd)";
    if (daysSince >= 2) return "Reminder Sent (1st)";
    return "Reminders Pending";
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Clients</h1>
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="pb-3">Company</th>
              <th className="pb-3">MSA</th>
              <th className="pb-3">NDA</th>
              <th className="pb-3">Reminder Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td className="py-3">{c.companyName}</td>
                <td className="py-3">{c.msaUploaded ? "✅" : "❌"}</td>
                <td className="py-3">{c.ndaUploaded ? "✅" : "❌"}</td>
                <td className="py-3">{getReminderStatus(c)}</td>
                <td className="py-3 text-right">
                  <Button onClick={() => handleDeleteClient(c.id)} className="bg-red-500 hover:bg-red-600 px-2 py-1 text-[10px]">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
