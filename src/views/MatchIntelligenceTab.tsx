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

  const [scanProgress, setScanProgress] = useState<string>("");

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!userData) return;
      setLoading(true);
      try {
        const role = userData?.role || "";
        const isAdmin = role === "admin" || role === "hq" || role === "super_admin" || role === "ops_admin";
        const isClient = role === "client" || role === "client_admin" || role === "client_hm" || role === "client_finance" || role === "client_recruiter";
        const isVendor = role === "vendor" || role === "vendor_admin" || role === "vendor_recruiter";
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

  const role = userData?.role || "";
  const isAdmin = role === "admin" || role === "hq" || role === "super_admin" || role === "ops_admin";

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex justify-center items-center h-64">
        <div className="text-center text-slate-400">
          <Zap
            className="mx-auto mb-3 animate-pulse text-indigo-400"
            size={32}
          />
          <p className="font-bold tracking-widest uppercase text-[10px]">
            {scanProgress || "Evaluating match intel..."}
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
            <button
              onClick={async () => {
                setLoading(true);
                setScanProgress("Job Queued. Running AI...");
                try {
                  const response = await fetch("/api/admin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "rescan-matches" }),
                  });
                  const data = await response.json();
                  if (data.success) {
                    setScanProgress(`${data.matchUpdatesCount} Matches Updated... reloading.`);
                    setTimeout(() => window.location.reload(), 1500);
                  } else {
                    setScanProgress(`Error: ${data.error || 'Failed'}`);
                    setLoading(false);
                  }
                } catch (err) {
                  console.error(err);
                  setScanProgress("Failed to run match scan.");
                  setLoading(false);
                }
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors uppercase tracking-wider"
            >
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
                Active Opportunities
              </p>
              <p className="text-3xl font-black text-slate-900 mt-2">
                {matches.length}
              </p>
            </div>
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
              <TrendingUp
                className="absolute -right-4 -bottom-4 text-emerald-500/10"
                size={80}
              />
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                Expected Value
              </p>
              <p className="text-3xl font-black text-slate-900 mt-2">
                ₹
                {matches
                  .reduce((acc, m) => acc + (m.expectedRevenue || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Opportunity Pipeline (
                {viewMode === "requirements"
                  ? "By Requirement"
                  : "By Candidate"}
                )
              </h3>
            </div>
            <div className="overflow-x-auto">
              {viewMode === "requirements"
                ? Object.entries(
                    matches.reduce(
                      (acc, match) => {
                        if (!acc[match.requirementId])
                          acc[match.requirementId] = [];
                        acc[match.requirementId].push(match);
                        return acc;
                      },
                      {} as Record<string, any[]>,
                    ),
                  ).map(([reqId, groupMatches]: [string, any[]]) => {
                    const req = requirements[reqId];
                    return (
                      <div
                        key={reqId}
                        className="border-b border-slate-200 last:border-0"
                      >
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 mr-2">
                              Requirement
                            </span>
                            <span className="font-bold text-slate-900">
                              {req?.title || reqId}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {groupMatches.length} Matches
                          </div>
                        </div>
                        <table className="w-full">
                          <tbody className="divide-y divide-slate-50">
                            {groupMatches
                              .sort(
                                (a, b) =>
                                  (b.placementProbability || 0) -
                                  (a.placementProbability || 0),
                              )
                              .map((match) => {
                                const cand =
                                  candidates[match.candidateId] || match;
                                let revenueStr = "--";
                                let expectedRevStr = "--";
                                let marginVal =
                                  (req?.financials?.clientBilling || 0) *
                                  ((req?.financials?.commissionPercent || 0) /
                                    100);
                                if (isAdmin || userData?.role === "hq") {
                                  revenueStr = req?.financials
                                    ? `₹${marginVal.toLocaleString()}`
                                    : "--";
                                  expectedRevStr = match.expectedRevenue
                                    ? `₹${match.expectedRevenue.toLocaleString()}`
                                    : req?.financials
                                      ? `₹${Math.round(marginVal * ((match.placementProbability || 0) / 100)).toLocaleString()}`
                                      : "--";
                                } else if (userData?.role === "vendor") {
                                  let vendorBudget =
                                    (req?.financials?.clientBilling || 0) -
                                    marginVal;
                                  revenueStr = req?.financials
                                    ? `₹${vendorBudget.toLocaleString()}`
                                    : "--";
                                  expectedRevStr = match.expectedRevenue
                                    ? `₹${match.expectedRevenue.toLocaleString()}`
                                    : req?.financials
                                      ? `₹${Math.round(vendorBudget * ((match.placementProbability || 0) / 100)).toLocaleString()}`
                                      : "--";
                                }
                                return (
                                  <tr
                                    key={match.id}
                                    className="hover:bg-slate-50/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 w-28">
                                      <span className="inline-flex items-center font-bold px-2 py-1 rounded-md text-[10px] tracking-widest uppercase border bg-slate-100 text-slate-600 border-slate-200">
                                        {match.status || "DISCOVERED"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-bold text-slate-900 text-sm">
                                        {cand?.name || cand?.candidateName || match.candidateId}
                                      </p>
                                      <span className="inline-flex items-center gap-1 font-black text-indigo-600 px-1 py-0.5 rounded-sm text-[10px] uppercase">
                                        MATCH: {match.score || match.matchScore}%
                                      </span>
                                      <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">
                                        VEND: {cand?.vendorId || match.vendorId || "DIRECT"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-left w-40">
                                      <div className="flex items-center gap-2">
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[60px]">
                                          <div
                                            className="bg-emerald-500 h-1.5 rounded-full"
                                            style={{
                                              width: `${match.placementProbability || Math.min(95, (match.score || match.matchScore || 0) * 0.5)}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">
                                          {match.placementProbability || Math.round(Math.min(95, (match.score || match.matchScore || 0) * 0.5))}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right w-48">
                                      <p className="font-mono text-sm font-black text-slate-900">
                                        {expectedRevStr}
                                      </p>
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Mgn: {revenueStr}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                : Object.entries(
                    matches.reduce(
                      (acc, match) => {
                        if (!acc[match.candidateId])
                          acc[match.candidateId] = [];
                        acc[match.candidateId].push(match);
                        return acc;
                      },
                      {} as Record<string, any[]>,
                    ),
                  ).map(([candId, groupMatches]: [string, any[]]) => {
                    const cand = candidates[candId] || groupMatches[0];
                    return (
                      <div
                        key={candId}
                        className="border-b border-slate-200 last:border-0"
                      >
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 mr-2">
                              Candidate
                            </span>
                            <span className="font-bold text-slate-900">
                              {cand?.name || cand?.candidateName || candId}
                            </span>
                            <span className="ml-2 text-xs text-slate-500 font-medium">
                              ({cand.vendorId || "Direct"})
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {groupMatches.length} Opportunities
                          </div>
                        </div>
                        <table className="w-full">
                          <tbody className="divide-y divide-slate-50">
                            {groupMatches
                              .sort(
                                (a, b) =>
                                  (b.placementProbability || 0) -
                                  (a.placementProbability || 0),
                              )
                              .map((match) => {
                                const req = requirements[match.requirementId];
                                let revenueStr = "--";
                                let expectedRevStr = "--";
                                let marginVal =
                                  (req?.financials?.clientBilling || 0) *
                                  ((req?.financials?.commissionPercent || 0) /
                                    100);
                                if (isAdmin || userData?.role === "hq") {
                                  revenueStr = req?.financials
                                    ? `₹${marginVal.toLocaleString()}`
                                    : "--";
                                  expectedRevStr = match.expectedRevenue
                                    ? `₹${match.expectedRevenue.toLocaleString()}`
                                    : req?.financials
                                      ? `₹${Math.round(marginVal * ((match.placementProbability || 0) / 100)).toLocaleString()}`
                                      : "--";
                                } else if (userData?.role === "vendor") {
                                  let vendorBudget =
                                    (req?.financials?.clientBilling || 0) -
                                    marginVal;
                                  revenueStr = req?.financials
                                    ? `₹${vendorBudget.toLocaleString()}`
                                    : "--";
                                  expectedRevStr = match.expectedRevenue
                                    ? `₹${match.expectedRevenue.toLocaleString()}`
                                    : req?.financials
                                      ? `₹${Math.round(vendorBudget * ((match.placementProbability || 0) / 100)).toLocaleString()}`
                                      : "--";
                                }
                                return (
                                  <tr
                                    key={match.id}
                                    className="hover:bg-slate-50/50 transition-colors"
                                  >
                                    <td className="px-4 py-3 w-28">
                                      <span className="inline-flex items-center font-bold px-2 py-1 rounded-md text-[10px] tracking-widest uppercase border bg-slate-100 text-slate-600 border-slate-200">
                                        {match.status || "DISCOVERED"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-bold text-slate-900 text-sm">
                                        {req?.title || match.requirementId}
                                      </p>
                                      <span className="inline-flex items-center gap-1 font-black text-indigo-600 px-1 py-0.5 rounded-sm text-[10px] uppercase">
                                        MATCH: {match.score || match.matchScore}%
                                      </span>
                                      {req?.priority && (
                                        <span className="ml-2 text-[10px] font-bold text-rose-500 uppercase">
                                          {req.priority} PRIORITY
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-left w-40">
                                      <div className="flex items-center gap-2">
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[60px]">
                                          <div
                                            className="bg-emerald-500 h-1.5 rounded-full"
                                            style={{
                                              width: `${match.placementProbability || Math.min(95, (match.score || match.matchScore || 0) * 0.5)}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">
                                          {match.placementProbability || Math.round(Math.min(95, (match.score || match.matchScore || 0) * 0.5))}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right w-48">
                                      <p className="font-mono text-sm font-black text-slate-900">
                                        {expectedRevStr}
                                      </p>
                                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Mgn: {revenueStr}
                                      </p>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
