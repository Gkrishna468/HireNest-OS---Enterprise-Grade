import React, { useState, useEffect } from "react";
import { collection, query, getDocs, limit, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Star,
  Building2,
  Users,
  Briefcase,
  Zap,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useSystemStore } from "../stores/SystemStore";

export default function MatchIntelligenceTab() {
  const { userData } = useSystemStore();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"requirements" | "candidates">(
    "requirements",
  );
  const [matches, setMatches] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<Record<string, any>>({});
  const [candidates, setCandidates] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!userData) return;
      setLoading(true);
      try {
        const isAdmin = userData?.role === "admin" || userData?.role === "hq";
        const isClient = userData?.role === "client";
        const isVendor = userData?.role === "vendor";
        const orgId = userData?.organizationId;

        let q;
        if (isAdmin || isClient) {
          q = query(collection(db, "candidate_matches"), limit(100));
        } else if (isVendor && orgId) {
          q = query(
            collection(db, "candidate_matches"),
            where("vendorId", "==", orgId),
            limit(100),
          );
        } else {
          q = query(collection(db, "candidate_matches"), limit(1));
        }

        const snapshot = await getDocs(q);
        const fetchedMatches = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as object),
        }));

        // Fetch requirements
        const reqQ = query(collection(db, "requirements_public"));
        const reqSnap = await getDocs(reqQ);
        const reqMap: Record<string, any> = {};
        reqSnap.docs.forEach((d) => {
          reqMap[d.id] = d.data();
        });

        // Fetch candidates (for names if available)
        // Optimization: In real world, maybe fetch only matching IDs
        const candQ = query(collection(db, "candidatePool"), limit(200));
        const candSnap = await getDocs(candQ);
        const candMap: Record<string, any> = {};
        candSnap.docs.forEach((d) => {
          candMap[d.id] = d.data();
        });

        if (active) {
          setMatches(fetchedMatches);
          setRequirements(reqMap);
          setCandidates(candMap);
        }
      } catch (err) {
        console.error("Match engine list error", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [userData]);

  const isAdmin = userData?.role === "admin" || userData?.role === "hq";

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex justify-center items-center h-64">
        <div className="text-center text-slate-400">
          <Zap
            className="mx-auto mb-3 animate-pulse text-indigo-400"
            size={32}
          />
          <p className="font-bold tracking-widest uppercase text-[10px]">
            Evaluating match intel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-amber-500" size={24} />
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
              Match Opportunities
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-xl text-sm">
            AI-driven opportunity discovery. This engine automatically matches
            candidates with requirements to forecast revenue.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setViewMode("requirements")}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "requirements" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            By Requirement
          </button>
          <button
            onClick={() => setViewMode("candidates")}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${viewMode === "candidates" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            By Candidate
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white border text-center py-24 rounded-2xl border-slate-200">
          <Zap className="mx-auto mb-4 text-slate-300" size={48} />
          <h2 className="text-xl font-black text-slate-800 mb-2">
            No Match Intelligence Available Yet
          </h2>
          <p className="text-sm font-medium text-slate-500 mb-6 max-w-md mx-auto">
            The Match Engine runs automatically when new candidates are added or
            new requirements are published. Check back soon for AI-generated
            opportunities.
          </p>
          {isAdmin && (
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
              Run Match Scan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
              <Zap
                className="absolute -right-4 -bottom-4 text-amber-500/10"
                size={80}
              />
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Total Matches
              </p>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {matches.length}
              </p>
            </div>
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
              <Briefcase
                className="absolute -right-4 -bottom-4 text-indigo-500/10"
                size={80}
              />
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Avg Match Score
              </p>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {Math.round(
                  matches.reduce(
                    (acc, m) => acc + (m.score || m.matchScore || 0),
                    0,
                  ) / matches.length,
                )}
                %
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Real-time Opportunities
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black tracking-widest text-slate-500 uppercase">
                      Requirement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black tracking-widest text-slate-500 uppercase">
                      Candidate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black tracking-widest text-slate-500 uppercase">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black tracking-widest text-slate-500 uppercase">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-black tracking-widest text-slate-500 uppercase">
                      Forecast Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matches.map((match) => {
                    const req = requirements[match.requirementId];
                    const cand = candidates[match.candidateId] || match;

                    let revenueStr = "--";
                    let marginVal =
                      (req?.financials?.clientBilling || 0) *
                      ((req?.financials?.commissionPercent || 0) / 100);

                    if (isAdmin || userData?.role === "hq") {
                      revenueStr = req?.financials
                        ? `₹${marginVal.toLocaleString()}`
                        : "--";
                    } else if (userData?.role === "vendor") {
                      let vendorBudget =
                        (req?.financials?.clientBilling || 0) - marginVal;
                      revenueStr = req?.financials
                        ? `₹${vendorBudget.toLocaleString()}`
                        : "--";
                    }

                    return (
                      <tr
                        key={match.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 text-sm">
                            {req?.title || match.requirementId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700 text-sm">
                            {cand?.name ||
                              cand?.candidateName ||
                              match.candidateId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs border border-emerald-100">
                            {match.score || match.matchScore}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-500 font-medium">
                            {match.vendorId || cand?.vendorId || "--"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {revenueStr}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
