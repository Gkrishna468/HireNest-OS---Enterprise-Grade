import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Briefcase,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  User,
} from "lucide-react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { formatINR } from "../lib/currency";
import { getCandidateFitmentScore } from "../lib/utils";

export interface SubmissionRecord {
  id: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  requirementId?: string;
  requirementTitle?: string;
  title?: string;
  clientId?: string;
  clientName?: string;
  vendorId?: string;
  vendorName?: string;
  status?: string;
  matchScore?: number;
  dealValue?: number;
  financials?: {
    clientBudget?: number;
    vendorPayout?: number;
    adminMargin?: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

interface SubmissionsLedgerExportProps {
  role: "admin" | "recruiter" | "vendor" | "client";
  orgId?: string;
  initialSubmissions?: SubmissionRecord[];
  title?: string;
  subtitle?: string;
}

interface CandidateGroup {
  candidateKey: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  submissions: SubmissionRecord[];
  matchedRolesCount: number;
  vendors: string[];
  clients: string[];
  bestStatus: string;
  bestMatchScore: number;
}

export const SubmissionsLedgerExport: React.FC<SubmissionsLedgerExportProps> = ({
  role,
  orgId,
  initialSubmissions = [],
  title = "Executive Submissions & Pipeline Ledger",
  subtitle = "One canonical candidate profile with grouped job submissions and pipeline tracking",
}) => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(initialSubmissions);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"date" | "matchScore" | "revenue" | "name">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedCandidates, setExpandedCandidates] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Edit modal state
  const [editingSubmission, setEditingSubmission] = useState<SubmissionRecord | null>(null);
  const [editStatus, setEditStatus] = useState("SUBMITTED");
  const [editDealValue, setEditDealValue] = useState<number>(150000);

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);
    let qRef = collection(db, "submissions");

    const unsubscribe = onSnapshot(
      qRef,
      (snap) => {
        let docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SubmissionRecord[];

        // Apply ABAC filtering
        if (role === "vendor" && orgId) {
          docs = docs.filter(
            (s) =>
              s.vendorId === orgId ||
              s.vendorId === "local" ||
              s.vendorName?.toLowerCase().includes(orgId.toLowerCase()),
          );
        } else if (role === "client" && orgId) {
          docs = docs.filter(
            (s) =>
              s.clientId === orgId ||
              s.clientId === "HQ" ||
              s.clientName?.toLowerCase().includes(orgId.toLowerCase()),
          );
        }

        if (docs.length > 0 || initialSubmissions.length === 0) {
          setSubmissions(docs);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("[SubmissionsLedger] Firestore subscription note:", err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [role, orgId]);

  // Status mapping and normalization
  const getNormalizedStatus = (status?: string) => {
    const s = (status || "PENDING_REVIEW").toUpperCase();
    if (s.includes("PLACE") || s.includes("HIRED") || s.includes("OFFER_ACCEPT"))
      return "PLACED";
    if (s.includes("INTERVIEW")) return "INTERVIEWING";
    if (s.includes("SHORTLIST")) return "SHORTLISTED";
    if (s.includes("REJECT")) return "REJECTED";
    if (s.includes("OFFER")) return "OFFER_RELEASED";
    return "SUBMITTED";
  };

  const getStatusBadge = (status?: string) => {
    const norm = getNormalizedStatus(status);
    switch (norm) {
      case "PLACED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Closed / Placed
          </span>
        );
      case "INTERVIEWING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3 text-blue-400" />
            Interviewing
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-3 h-3 text-indigo-400" />
            Shortlisted
          </span>
        );
      case "OFFER_RELEASED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-3 h-3 text-amber-400" />
            Offer Released
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-400" />
            Submitted
          </span>
        );
    }
  };

  // Filtered individual submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const query = searchTerm.toLowerCase();
      const cand = (sub.candidateName || "").toLowerCase();
      const req = (sub.requirementTitle || sub.title || "").toLowerCase();
      const client = (sub.clientName || "").toLowerCase();
      const vendor = (sub.vendorName || "").toLowerCase();
      const email = (sub.candidateEmail || "").toLowerCase();
      const matchesSearch =
        cand.includes(query) ||
        req.includes(query) ||
        client.includes(query) ||
        vendor.includes(query) ||
        email.includes(query);

      if (!matchesSearch) return false;
      if (statusFilter === "ALL") return true;
      return getNormalizedStatus(sub.status) === statusFilter;
    });
  }, [submissions, searchTerm, statusFilter]);

  // Group by Canonical Candidate Profile
  const candidateGroups: CandidateGroup[] = useMemo(() => {
    const map = new Map<string, CandidateGroup>();

    filteredSubmissions.forEach((sub) => {
      const key = sub.candidateId || sub.candidateEmail || sub.candidateName || sub.id;
      if (!map.has(key)) {
        map.set(key, {
          candidateKey: key,
          candidateName: sub.candidateName || "Candidate Profile",
          candidateEmail: sub.candidateEmail || "verified@hirenest.os",
          candidatePhone: sub.candidatePhone || "+91 98765 43210",
          submissions: [],
          matchedRolesCount: 0,
          vendors: [],
          clients: [],
          bestStatus: "SUBMITTED",
          bestMatchScore: 0,
        });
      }

      const group = map.get(key)!;
      group.submissions.push(sub);
      group.matchedRolesCount = group.submissions.length;

      if (sub.vendorName && !group.vendors.includes(sub.vendorName)) {
        group.vendors.push(sub.vendorName);
      }
      if (sub.clientName && !group.clients.includes(sub.clientName)) {
        group.clients.push(sub.clientName);
      }

      const score = getCandidateFitmentScore(sub);
      if (score > group.bestMatchScore) {
        group.bestMatchScore = score;
      }

      // Prioritize best status
      const norm = getNormalizedStatus(sub.status);
      if (norm === "PLACED") group.bestStatus = "PLACED";
      else if (norm === "OFFER_RELEASED" && group.bestStatus !== "PLACED") group.bestStatus = "OFFER_RELEASED";
      else if (norm === "INTERVIEWING" && !["PLACED", "OFFER_RELEASED"].includes(group.bestStatus)) group.bestStatus = "INTERVIEWING";
      else if (norm === "SHORTLISTED" && !["PLACED", "OFFER_RELEASED", "INTERVIEWING"].includes(group.bestStatus)) group.bestStatus = "SHORTLISTED";
    });

    let groups = Array.from(map.values());

    // Sorting groups
    groups.sort((a, b) => {
      if (sortField === "matchScore") {
        return sortDirection === "asc" ? a.bestMatchScore - b.bestMatchScore : b.bestMatchScore - a.bestMatchScore;
      }
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.candidateName.localeCompare(b.candidateName)
          : b.candidateName.localeCompare(a.candidateName);
      }
      if (sortField === "revenue") {
        const revA = a.submissions.reduce((acc, s) => acc + (s.dealValue || s.financials?.clientBudget || 15000), 0);
        const revB = b.submissions.reduce((acc, s) => acc + (s.dealValue || s.financials?.clientBudget || 15000), 0);
        return sortDirection === "asc" ? revA - revB : revB - revA;
      }
      // Date (latest submission date in group)
      const timeA = Math.max(...a.submissions.map(s => new Date(s.createdAt?.seconds ? s.createdAt.seconds * 1000 : s.createdAt || 0).getTime() || 0));
      const timeB = Math.max(...b.submissions.map(s => new Date(s.createdAt?.seconds ? s.createdAt.seconds * 1000 : s.createdAt || 0).getTime() || 0));
      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });

    return groups;
  }, [filteredSubmissions, sortField, sortDirection]);

  // Paginated candidate groups
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return candidateGroups.slice(start, start + pageSize);
  }, [candidateGroups, currentPage, pageSize]);

  const totalPages = Math.ceil(candidateGroups.length / pageSize) || 1;

  // Aggregate Metrics
  const stats = useMemo(() => {
    let placed = 0;
    let interviewing = 0;
    let shortlisted = 0;
    let confirmedRev = 0;
    let pipelineRev = 0;

    submissions.forEach((s) => {
      const norm = getNormalizedStatus(s.status);
      const val = Number(s.dealValue || s.financials?.clientBudget || 15000);

      if (norm === "PLACED") {
        placed++;
        confirmedRev += val;
      } else if (norm === "INTERVIEWING" || norm === "OFFER_RELEASED") {
        interviewing++;
        pipelineRev += val;
      } else if (norm === "SHORTLISTED" || norm === "SUBMITTED") {
        shortlisted++;
        pipelineRev += val * 0.4;
      }
    });

    // Unique candidates count
    const uniqueCandidatesCount = new Set(submissions.map(s => s.candidateId || s.candidateEmail || s.candidateName)).size;

    return {
      uniqueCandidates: uniqueCandidatesCount,
      totalSubmissions: submissions.length,
      placed,
      interviewing,
      confirmedRev,
      pipelineRev: Math.round(pipelineRev),
    };
  }, [submissions]);

  // Delete individual submission record
  const handleDeleteSubmission = async (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this job submission? The candidate's master profile will be preserved.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "submissions", subId));
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
    } catch (err: any) {
      alert("Failed to delete submission: " + err.message);
    }
  };

  // Save edited submission
  const handleSaveEdit = async () => {
    if (!editingSubmission) return;
    try {
      const ref = doc(db, "submissions", editingSubmission.id);
      await updateDoc(ref, {
        status: editStatus,
        dealValue: Number(editDealValue),
        updatedAt: new Date(),
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === editingSubmission.id ? { ...s, status: editStatus, dealValue: Number(editDealValue) } : s))
      );
      setEditingSubmission(null);
    } catch (err: any) {
      alert("Failed to update submission: " + err.message);
    }
  };

  // Excel (CSV) Export
  const handleExportExcel = () => {
    const headers = [
      "Submission ID",
      "Candidate Name",
      "Candidate Email",
      "Candidate Phone",
      "Requirement Title",
      "Requirement ID",
      "Client Name",
      "Vendor Partner",
      "Status / Stage",
      "Match Score (%)",
      "Deal Value / Fee (₹ INR)",
      "Created Date",
    ];

    const rows = filteredSubmissions.map((s) => {
      const dateStr = s.createdAt
        ? new Date(
            s.createdAt?.seconds ? s.createdAt.seconds * 1000 : s.createdAt,
          ).toLocaleDateString()
        : "N/A";
      const val = s.dealValue || s.financials?.clientBudget || 150000;

      return [
        `"${(s.id || "").replace(/"/g, '""')}"`,
        `"${(s.candidateName || "Candidate").replace(/"/g, '""')}"`,
        `"${(s.candidateEmail || "").replace(/"/g, '""')}"`,
        `"${(s.candidatePhone || "").replace(/"/g, '""')}"`,
        `"${(s.requirementTitle || s.title || "Role").replace(/"/g, '""')}"`,
        `"${(s.requirementId || "").replace(/"/g, '""')}"`,
        `"${(s.clientName || "Enterprise Client").replace(/"/g, '""')}"`,
        `"${(s.vendorName || "HireNest Partner").replace(/"/g, '""')}"`,
        `"${getNormalizedStatus(s.status)}"`,
        getCandidateFitmentScore(s),
        val,
        `"${dateStr}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `HireNestOS_Executive_Pipeline_${role.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (key: string) => {
    setExpandedCandidates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            {title}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-900/30 active:scale-95"
            title="Export mapped submissions to Excel / CSV"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
          <div className="text-xs font-medium text-slate-400">Unique Candidates</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {stats.uniqueCandidates} <span className="text-xs font-normal text-slate-500">({stats.totalSubmissions} submissions)</span>
          </div>
        </div>
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3">
          <div className="text-xs font-medium text-emerald-400">
            Closed / Placed
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {stats.placed}
          </div>
        </div>
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3">
          <div className="text-xs font-medium text-blue-400">Active Pipeline</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">
            {stats.interviewing}
          </div>
        </div>
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3">
          <div className="text-xs font-medium text-amber-400">
            Confirmed Revenue
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {formatINR(stats.confirmedRev)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate profile, role, client, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Stage:
          </span>
          {[
            { id: "ALL", label: "All" },
            { id: "SUBMITTED", label: "Submitted" },
            { id: "SHORTLISTED", label: "Shortlisted" },
            { id: "INTERVIEWING", label: "Interviewing" },
            { id: "PLACED", label: "Placed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Grouped by Canonical Candidate Profile) */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Candidate Profile</th>
              <th className="py-3 px-4">Matched Roles</th>
              <th className="py-3 px-4">Vendor Partner</th>
              <th className="py-3 px-4">Client / Placement</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedGroups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="w-8 h-8 text-slate-600" />
                    <span>No candidate profiles or submissions matching criteria found</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedGroups.map((group) => {
                const isExpanded = !!expandedCandidates[group.candidateKey];
                const primaryVendor = group.vendors[0] || "HireNest Partner";
                const primaryClient = group.clients[0] || "Enterprise Client";

                return (
                  <React.Fragment key={group.candidateKey}>
                    {/* Candidate Master Row */}
                    <tr
                      onClick={() => toggleExpand(group.candidateKey)}
                      className="hover:bg-slate-800/40 transition cursor-pointer bg-slate-900/30"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-lg bg-slate-800 text-indigo-400 hover:bg-slate-700 transition">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-indigo-400" />
                              {group.candidateName}
                            </div>
                            <div className="text-xs text-slate-400">{group.candidateEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <Briefcase className="w-3 h-3 text-indigo-400" />
                          {group.matchedRolesCount} {group.matchedRolesCount === 1 ? "Requirement" : "Requirements"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                          {primaryVendor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-300 truncate max-w-[140px]">{primaryClient}</span>
                          {getStatusBadge(group.bestStatus)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xs text-indigo-400 hover:underline font-medium">
                          {isExpanded ? "Hide Submissions" : "View Submissions"}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Submissions Sub-Table */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-slate-950/90 p-4 border-t border-b border-indigo-500/20">
                          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                            Job Submissions for {group.candidateName} ({group.submissions.length})
                          </div>

                          <div className="space-y-2">
                            {group.submissions.map((sub) => {
                              const reqTitle = sub.requirementTitle || sub.title || "Software Engineer";
                              const clientName = sub.clientName || "Enterprise Client";
                              const vendorName = sub.vendorName || "HireNest Partner";
                              const val = sub.dealValue || sub.financials?.clientBudget || 150000;
                              const score = getCandidateFitmentScore(sub);

                              return (
                                <div
                                  key={sub.id}
                                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl"
                                >
                                  <div className="space-y-1">
                                    <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                                      <span>{reqTitle}</span>
                                      <span className="text-xs text-slate-500 font-mono">ID: {sub.id.slice(0, 8)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-slate-500" /> {clientName}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                        Vendor: {vendorName}
                                      </span>
                                      <span className="text-indigo-300 font-semibold">
                                        Match: {score}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {getStatusBadge(sub.status)}
                                    <span className="text-xs font-bold text-slate-200">{formatINR(val)}</span>

                                    <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSubmission(sub);
                                          setEditStatus(sub.status || "SUBMITTED");
                                          setEditDealValue(val);
                                        }}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                        title="Edit Submission"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteSubmission(sub.id, e)}
                                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg transition border border-rose-800/40"
                                        title="Delete Submission (Preserves Candidate Profile)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <div>
            Showing page {currentPage} of {totalPages} ({candidateGroups.length} unique candidates)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Submission Modal */}
      {editingSubmission && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              Edit Job Submission
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Candidate</label>
                <input
                  type="text"
                  disabled
                  value={editingSubmission.candidateName || "Candidate"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Requirement Role</label>
                <input
                  type="text"
                  disabled
                  value={editingSubmission.requirementTitle || editingSubmission.title || "Role"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Status / Stage</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEWING">Interviewing</option>
                  <option value="OFFER_RELEASED">Offer Released</option>
                  <option value="PLACED">Closed / Placed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Deal Value / Estimated Fee (₹ INR)</label>
                <input
                  type="number"
                  value={editDealValue}
                  onChange={(e) => setEditDealValue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingSubmission(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-900/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsLedgerExport;
