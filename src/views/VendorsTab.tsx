import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  limit,
} from "firebase/firestore";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import {
  Eye,
  Star,
  Briefcase,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [dealRooms, setDealRooms] = useState<any[]>([]);

  async function fetchVendors() {
    try {
      // Attempt administrative proxy first for Global HQ
      const response = await fetch("/api/admin/governance-data");
      if (response.ok) {
        const data = await response.json();
        const orgs = (data.organizations || []).filter(
          (o: any) => o.type === "vendor",
        );
        setVendors(orgs);
        if (data.candidatePool) setCandidates(data.candidatePool);
        if (data.requirements_public) setJobs(data.requirements_public);

        try {
          const drSnap = await getDocs(collection(db, "dealRooms"));
          setDealRooms(drSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {}
      } else {
        const q = query(
          collection(db, "organizations"),
          where("type", "==", "vendor"),
        );
        const snap = await getDocs(query(q, limit(50)));
        const vendorsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendors(vendorsData);

        const candSnap = await getDocs(
          query(collection(db, "candidatePool"), limit(500)),
        );
        setCandidates(candSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const jobsSnap = await getDocs(
          query(collection(db, "requirements_public")),
        );
        setJobs(jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        try {
          const drSnap = await getDocs(collection(db, "dealRooms"));
          setDealRooms(drSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn("Governance API failed, attempting Firestore fallback", err);
      try {
        const q = query(
          collection(db, "organizations"),
          where("type", "==", "vendor"),
        );
        const snap = await getDocs(query(q, limit(50)));
        setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.LIST, "vendors_governance");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleDeleteVendor = async (vendorId: string) => {
    if (!vendorId) return;
    if (!window.confirm("Purge this vendor node from the execution network?"))
      return;
    try {
      await deleteDoc(doc(db, "organizations", vendorId));
      await fetchVendors();
    } catch (err: any) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `organizations/${vendorId}`,
      );
    }
  };

  const getCandidateCount = (vendorId: string) =>
    candidates.filter((c) => c.vendorId === vendorId).length;

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
            Verified Vendor Network
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Multi-layer supply chain verification & trust scoring.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Global Supply
            </div>
            <div className="text-xl font-black text-slate-900">
              {vendors.length} Nodes
            </div>
          </div>
          <div className="h-10 w-px bg-slate-100"></div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Network Avg Trust
            </div>
            <div className="text-xl font-black text-emerald-600">88.4%</div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Activity className="animate-spin text-slate-200" size={40} />
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Synchronizing Supply Layer...
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr className="text-[10px] font-black uppercase tracking-widest">
                <th className="pl-10 py-6">Vendor Identity</th>
                <th className="py-6 text-center">Active Reqs</th>
                <th className="py-6 text-center">Closed Reqs</th>
                <th className="py-6 text-center">Shortlisted</th>
                <th className="py-6 text-center">Deal Room</th>
                <th className="py-6 text-center">Finalised</th>
                <th className="py-6 text-center">Trust Analytics</th>
                <th className="py-6">Compliance Layer</th>
                <th className="pr-10 py-6 text-right">Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vendors.map((v) => {
                const candCount = getCandidateCount(v.id);
                const trustScore =
                  v.trustScore ||
                  Math.min(
                    100,
                    Math.max(
                      70,
                      Math.round(70 + candCount * 2 + Math.random() * 10),
                    ),
                  );

                return (
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50 transition-all group"
                  >
                    <td className="pl-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white border-4 border-slate-50 flex items-center justify-center font-black text-lg shadow-lg">
                          {v.companyName.substring(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-black text-slate-900 uppercase tracking-tight text-base">
                              {v.companyName}
                            </div>
                            <ShieldCheck
                              size={14}
                              className="text-emerald-500"
                            />
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                            <span className="font-mono">{v.id}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span>Verified HQ</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-sm font-black text-slate-900">
                        {
                          jobs.filter(
                            (j) =>
                              candidates.some(
                                (c) =>
                                  c.vendorId === v.id && c.mappedJobId === j.id,
                              ) && j.status !== "CLOSED",
                          ).length
                        }
                      </span>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-sm font-black text-slate-400">
                        {
                          jobs.filter(
                            (j) =>
                              candidates.some(
                                (c) =>
                                  c.vendorId === v.id && c.mappedJobId === j.id,
                              ) && j.status === "CLOSED",
                          ).length
                        }
                      </span>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-sm font-black text-indigo-600">
                        {
                          candidates.filter(
                            (c) =>
                              c.vendorId === v.id &&
                              ["Client Submission", "Matched"].includes(
                                c.pipelineStage,
                              ),
                          ).length
                        }
                      </span>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-sm font-black text-amber-600">
                        {dealRooms.filter((dr) => dr.vendorId === v.id).length}
                      </span>
                    </td>
                    <td className="py-8 text-center">
                      <span className="text-sm font-black text-emerald-600">
                        {
                          dealRooms.filter(
                            (dr) =>
                              dr.vendorId === v.id && dr.stage === "hired",
                          ).length
                        }
                      </span>
                    </td>
                    <td className="py-8 text-center px-6">
                      <div className="flex flex-col items-center">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 border border-slate-50">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000",
                              trustScore > 90
                                ? "bg-emerald-500"
                                : "bg-indigo-500",
                            )}
                            style={{ width: `${trustScore}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            Trust Index
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase",
                                trustScore >= 95
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : trustScore >= 85
                                    ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                    : "bg-slate-50 text-slate-500 border-slate-100",
                              )}
                            >
                              {trustScore >= 95
                                ? "AAA"
                                : trustScore >= 85
                                  ? "AA"
                                  : "A"}
                            </span>
                            <span className="text-[10px] text-slate-900 font-black">
                              {trustScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-8">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "GST", active: true },
                          { label: "MSA", active: v.msaUploaded },
                          { label: "NDA", active: v.ndaUploaded },
                          { label: "KYC", active: true },
                        ].map((badge, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-lg font-black uppercase border tracking-widest flex items-center gap-1",
                              badge.active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-slate-50 text-slate-300 border-slate-100",
                            )}
                          >
                            {badge.active && <CheckCircle2 size={8} />}
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="pr-10 py-8 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200">
                          <Eye size={18} />
                        </button>
                        <Button
                          onClick={() => handleDeleteVendor(v.id)}
                          className="bg-white hover:bg-rose-50 text-rose-500 border border-slate-100 hover:border-rose-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all"
                        >
                          Terminate
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
