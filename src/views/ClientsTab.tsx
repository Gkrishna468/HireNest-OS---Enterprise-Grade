import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      const q = query(collection(db, "organizations"), where("type", "==", "client"));
      const snap = await getDocs(q);
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    fetchClients();
  }, []);

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
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td className="py-3">{c.companyName}</td>
                <td className="py-3">{c.msaUploaded ? "✅" : "❌"}</td>
                <td className="py-3">{c.ndaUploaded ? "✅" : "❌"}</td>
                <td className="py-3">{getReminderStatus(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
