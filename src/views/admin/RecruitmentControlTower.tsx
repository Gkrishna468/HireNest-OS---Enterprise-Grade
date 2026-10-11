import React, { useState, useEffect } from "react";
import { db, auth } from "../../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  IndianRupee,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertCircle,
  Building2,
  UserCheck,
  Bot
} from "lucide-react";
import { formatINR } from "../../lib/currency";
import { Button } from "../../lib/Button";
import { ChiefRecruiterAI } from "../../api-lib/services/ChiefRecruiterAI";

export function RecruitmentControlTower() {
  const [userRole, setUserRole] = useState<string>("guest");
  const [userOrgId, setUserOrgId] = useState<string>("");
  const [isFinanceAuthorized, setIsFinanceAuthorized] = useState<boolean>(false);

  const [activeReqCount, setActiveReqCount] = useState<number>(0);
  const [pendingFollowUpsCount, setPendingFollowUpsCount] = useState<number>(0);
  const [awaitingFeedbackCount, setAwaitingFeedbackCount] = useState<number>(0);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [aiAdvice, setAiAdvice] = useState<any | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(false);

  // 1. Auth & Permissions Context
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) return;
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const u = await getDoc(doc(db, "users", currentUser.uid));
        if (u.exists()) {
          const role = (u.data().role || "guest").toLowerCase();
          setUserRole(role);
          setUserOrgId(u.data().organizationId || "");
          setIsFinanceAuthorized(["admin", "hq_admin", "super_admin", "finance", "ceo"].includes(role));
        }
      } catch (err) {
        console.error("Failed to load user permissions context:", err);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Real-Time Firestore SSOT Subscriptions
  useEffect(() => {
    // Requirements Subscription
    const unsubReqs = onSnapshot(collection(db, "requirements"), (snap) => {
      const active = snap.docs.filter(d => (d.data() as any).status !== "CLOSED").length;
      setActiveReqCount(active);
    });

    // Follow-ups Subscription
    const unsubFollowUps = onSnapshot(collection(db, "follow_up_queue"), (snap) => {
      const pending = snap.docs.filter(d => (d.data() as any).status === "PENDING").length;
      setPendingFollowUpsCount(pending);
    });

    // Submissions Subscription
    const unsubSubs = onSnapshot(collection(db, "submissions"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setSubmissions(list);
      const awaiting = list.filter(s => ["SUBMITTED", "PENDING_REVIEW", "CLIENT_REVIEW"].includes(s.status)).length;
      setAwaitingFeedbackCount(awaiting);
    });

    // Placements Subscription
    const unsubPlacements = onSnapshot(collection(db, "placements"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setPlacements(list);
    });

    return () => {
      unsubReqs();
      unsubFollowUps();
      unsubSubs();
      unsubPlacements();
    };
  }, []);

  // 3. Financial Margin Calculations
  const expectedGrossMargin = placements
    .filter(p => p.status !== "DROPPED_OUT")
    .reduce((acc, p) => acc + (Number(p.clientBillingRate || p.billingRate || 0) - Number(p.vendorPayoutRate || p.payoutRate || 0)), 0);

  const invoicedGrossMargin = placements
    .filter(p => p.status === "INVOICED")
    .reduce((acc, p) => acc + (Number(p.clientBillingRate || p.billingRate || 0) - Number(p.vendorPayoutRate || p.payoutRate || 0)), 0);

  const realizedGrossMargin = placements
    .filter(p => p.status === "PAID")
    .reduce((acc, p) => acc + (Number(p.clientBillingRate || p.billingRate || 0) - Number(p.vendorPayoutRate || p.payoutRate || 0)), 0);

  const cashPosition = placements
    .filter(p => p.status === "PAID")
    .reduce((acc, p) => acc + Number(p.clientBillingRate || p.billingRate || 0), 0);

  // 4. Filter Rows
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch =
      (sub.candidateName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.requirementTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.requirementId || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === "ALL" || sub.status === stageFilter;
    const matchesSource =
      sourceFilter === "ALL" ||
      (sourceFilter === "VENDOR" && !!sub.vendorId) ||
      (sourceFilter === "DIRECT" && !sub.vendorId);

    return matchesSearch && matchesStage && matchesSource;
  });

  // 5. Fetch Chief Recruiter AI Advice
  const handleSelectSubmission = async (sub: any) => {
    setSelectedSubmission(sub);
    setLoadingAdvice(true);
    try {
      const readiness = await ChiefRecruiterAI.getSubmissionReadiness(
        sub.candidateId || "CAN-001",
        sub.requirementId || "REQ-001"
      );
      setAiAdvice(readiness);
    } catch {
      setAiAdvice({
        nextAction: "Complete screening verification prior to client submission.",
        recommendationTier: "NEEDS_ATTENTION",
        missingMandatory: []
      });
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleExportProjection = () => {
    window.open("/api/admin/reporting-export?format=csv", "_blank");
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900 font-sans p-6 overflow-auto">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recruitment Control Tower</h1>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Firestore SSOT Active
              </span>
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5" /> INR Standard
              </span>
            </div>
            <p className="text-slate-500 mt-1 text-sm font-medium">
              Live operational dashboard coordinating requirements, candidate pipelines, vendor submissions, and commercial margins.
            </p>
          </div>

          <Button
            onClick={handleExportProjection}
            className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Download className="w-4 h-4" /> Export Read-Only Report
          </Button>
        </div>

        {/* Live Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Requirements</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{activeReqCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Follow-ups</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{pendingFollowUpsCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Client Feedback</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{awaitingFeedbackCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Gross Margin</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {isFinanceAuthorized ? formatINR(expectedGrossMargin) : "Restricted (ABAC)"}
              </h3>
            </div>
          </div>
        </div>

        {/* Commercial & Margin Breakdown Bar (Admin / Finance Role Restricted) */}
        {isFinanceAuthorized && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Commercials & Margin Performance Ledger (INR)
              </h3>
              <span className="text-xs text-slate-400 font-medium">Finance ABAC Verified</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium">Expected Margin</p>
                <p className="text-xl font-black text-emerald-400 mt-1">{formatINR(expectedGrossMargin)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Invoiced Margin</p>
                <p className="text-xl font-black text-amber-400 mt-1">{formatINR(invoicedGrossMargin)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Realized Margin</p>
                <p className="text-xl font-black text-indigo-300 mt-1">{formatINR(realizedGrossMargin)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Cash Position</p>
                <p className="text-xl font-black text-cyan-400 mt-1">{formatINR(cashPosition)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Operational Filter Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Candidate Name, Requirement, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Stages</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Sources</option>
              <option value="VENDOR">Vendor Partners</option>
              <option value="DIRECT">Direct Applicants</option>
            </select>
          </div>
        </div>

        {/* Main Operational Table & AI Advice Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Operational Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Active Submissions Tracker ({filteredSubmissions.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                    <th className="py-3 px-4">Requirement</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Stage</th>
                    {isFinanceAuthorized && <th className="py-3 px-4">Margin/hr</th>}
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => {
                    const billing = Number(sub.clientBillingRate || 1000);
                    const payout = Number(sub.vendorPayoutRate || 650);
                    const margin = billing - payout;

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => handleSelectSubmission(sub)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          selectedSubmission?.id === sub.id ? "bg-indigo-50/50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {sub.requirementTitle || sub.requirementId || "Senior Engineer"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {sub.candidateName || "Candidate"}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            sub.vendorId ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {sub.vendorId ? "Vendor" : "Direct"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          {sub.status || "SUBMITTED"}
                        </td>
                        {isFinanceAuthorized && (
                          <td className="py-3 px-4 font-black text-emerald-600">
                            {formatINR(margin)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No active submissions found matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chief Recruiter AI Side Drawer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm">
              <Bot className="w-5 h-5" /> Chief Recruiter AI Insights
            </div>

            {selectedSubmission ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Target Submission</p>
                  <p className="font-extrabold text-slate-900">{selectedSubmission.candidateName}</p>
                  <p className="text-slate-500 font-medium">{selectedSubmission.requirementTitle}</p>
                </div>

                {loadingAdvice ? (
                  <div className="py-6 text-center text-slate-400 font-medium animate-pulse">
                    Analyzing evidence & submission readiness...
                  </div>
                ) : aiAdvice ? (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-xl border font-bold ${
                      aiAdvice.recommendationTier === "PRIMARY_SUBMIT"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-wider">Next Best Action</p>
                      <p className="text-xs font-semibold mt-1">{aiAdvice.nextAction}</p>
                    </div>

                    {aiAdvice.missingMandatory?.length > 0 && (
                      <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider">Skill Gaps</p>
                        <p className="font-medium text-xs">{aiAdvice.missingMandatory.join(", ")}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Select a submission row from the tracker to load Chief Recruiter AI readiness recommendations.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
