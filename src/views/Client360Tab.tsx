import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Target,
  Briefcase,
  Star,
  FileText,
  CalendarDays,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { collection, query, getDocs, where } from "firebase/firestore";

export default function Client360Tab({ userRole }: { userRole: string }) {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientData, setClientData] = useState<any>(null);

  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(
    userRole,
  );

  useEffect(() => {
    let active = true;
    const fetchClients = async () => {
      try {
        const orgsSnap = await getDocs(
          query(collection(db, "organizations"), where("type", "==", "client")),
        );
        const orgs = orgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!active) return;
        setClients(orgs);
        if (orgs.length > 0) {
          setSelectedClientId(orgs[0].id);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchClients();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedClientId) return;

    setLoading(true);
    const fetchClient360 = async () => {
      try {
        // 1. Account Info
        const clientObj = clients.find((c) => c.id === selectedClientId);

        // 2. Fetch Requirements
        const reqsSnap = await getDocs(
          query(
            collection(db, "requirements_public"),
            where("clientId", "==", selectedClientId),
          ),
        );
        const reqs = reqsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const reqIds = reqs.map((r) => r.id);

        // 3. Fetch Matches (if reqs exist, we might lookup matches by requirementId)
        let opps: any[] = [];
        if (reqIds.length > 0) {
          const oppQ = query(
            collection(db, "match_opportunities"),
            where("clientId", "==", selectedClientId),
          );
          // But Wait match_opportunities might only have requirementId, not clientId. We will fetch all and filter client side.
          const oppSnap = await getDocs(collection(db, "match_opportunities"));
          opps = oppSnap.docs
            .filter((d) => reqIds.includes(d.data().requirementId))
            .map((d) => ({ id: d.id, ...d.data() }));
        }

        // 4. Fetch Submissions
        let subs: any[] = [];
        if (reqIds.length > 0) {
          const subSnap = await getDocs(collection(db, "submissions"));
          subs = subSnap.docs
            .filter((d) => reqIds.includes(d.data().requirementId))
            .map((d) => ({ id: d.id, ...d.data() }));
        }

        // 5. Fetch Placements / DealRooms
        const dealSnap = await getDocs(
          query(
            collection(db, "dealRooms"),
            where("clientId", "==", selectedClientId),
          ),
        );
        const deals = dealSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (!active) return;

        let interviews = 0;
        let placements = 0;
        deals.forEach((d) => {
          if (d.currentStage === "Interview" || d.currentStage === "Offer")
            interviews++;
          if (d.currentStage === "Hired" || d.status === "WON") placements++;
        });
        subs.forEach((s: any) => {
          if (s.status === "INTERVIEWING") interviews++;
          if (s.status === "HIRED" || s.status === "SELECTED") placements++;
        });

        setClientData({
          account: clientObj,
          opportunities: reqs.length, // Placeholder for CRM Opps
          requirements: reqs.length,
          matches: opps.length,
          submissions: subs.length,
          interviews: interviews,
          placements: placements,
          invoices: placements > 0 ? placements : 0, // placeholder
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchClient360();
    return () => {
      active = false;
    };
  }, [selectedClientId, clients]);

  if (!isAdmin && userRole !== "hq") {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto w-full">
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-[1400px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="text-sky-600" size={28} />
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                Client 360
              </h1>
            </div>
            <p className="text-slate-500 font-medium text-sm">
              Enterprise account management and lifecycle tracing.
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <Search className="absolute left-3 text-slate-400" size={16} />
            <select
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-sky-500"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed Client"}
                </option>
              ))}
              {clients.length === 0 && (
                <option value="">No Clients Found</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1400px] mx-auto w-full">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-slate-200 rounded-2xl w-full"></div>
            <div className="h-64 bg-slate-200 rounded-2xl w-full"></div>
          </div>
        ) : clientData ? (
          <div className="space-y-8">
            {/* Account Header */}
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-3xl font-black">
                  {clientData.account?.name || "Unknown"}
                </h2>
                <p className="text-slate-400 font-medium mt-1">
                  Global Client Account
                </p>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-1">
                  Account Health
                </p>
                <p className="text-xl font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/20 inline-block">
                  EXCELLENT
                </p>
              </div>
            </div>

            {/* Lifecycle Pipeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
                End-to-End Delivery Pipeline
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 justify-between relative z-10">
                <MetricCard
                  icon={<Target size={16} />}
                  label="Opportunities"
                  value={clientData.opportunities}
                  color="text-slate-600"
                />
                <MetricCard
                  icon={<Briefcase size={16} />}
                  label="Requirements"
                  value={clientData.requirements}
                  color="text-indigo-600"
                />
                <MetricCard
                  icon={<Star size={16} />}
                  label="Matches"
                  value={clientData.matches}
                  color="text-amber-500"
                />
                <MetricCard
                  icon={<FileText size={16} />}
                  label="Submissions"
                  value={clientData.submissions}
                  color="text-sky-500"
                />
                <MetricCard
                  icon={<CalendarDays size={16} />}
                  label="Interviews"
                  value={clientData.interviews}
                  color="text-purple-500"
                />
                <MetricCard
                  icon={<CheckCircle2 size={16} />}
                  label="Placements"
                  value={clientData.placements}
                  color="text-emerald-500"
                />
                <MetricCard
                  icon={<Receipt size={16} />}
                  label="Invoices"
                  value={clientData.invoices}
                  color="text-rose-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-12 text-slate-400 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-slate-200 rounded-2xl">
            No Client Data Available
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: any) {
  return (
    <div className="flex flex-col items-center p-4 bg-slate-50 border border-slate-100 rounded-xl relative">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm mb-3",
          color,
        )}
      >
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mt-1 text-center leading-tight">
        {label}
      </p>
    </div>
  );
}
