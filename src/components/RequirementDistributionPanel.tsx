import React, { useState, useEffect } from "react";
import {
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Send,
  ShieldCheck,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";
import {
  requirementVendorService,
  DistributionMode,
  VendorDiagnosticStatus
} from "../services/requirementVendorService";
import { recruiterVendorMappingService } from "../services/recruiterVendorMappingService";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface RequirementDistributionPanelProps {
  job: any;
  isAdmin?: boolean;
  userRole?: string;
  onDistributionUpdated?: () => void;
}

export function RequirementDistributionPanel({
  job,
  isAdmin = true,
  userRole = "admin",
  onDistributionUpdated
}: RequirementDistributionPanelProps) {
  const [distributionMode, setDistributionMode] = useState<DistributionMode>(
    job?.distributionMode || "ALL_MAPPED_VENDORS"
  );
  const [assignedRecruiterId, setAssignedRecruiterId] = useState<string>(
    job?.assignedRecruiterId || job?.recruiterId || "recruiter-rahul"
  );
  const [assignedRecruiterName, setAssignedRecruiterName] = useState<string>(
    job?.assignedRecruiterName || job?.recruiterName || "Rahul Sharma"
  );

  const [availableVendors, setAvailableVendors] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(
    job?.distributedVendorIds || ["vendor-abc", "vendor-xyz"]
  );

  const [diagnostics, setDiagnostics] = useState<VendorDiagnosticStatus[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  // Available HireNest recruiters for dropdown
  const recruiters = [
    { id: "recruiter-rahul", name: "Rahul Sharma", email: "rahul.sharma@hirenest.ai" },
    { id: "recruiter-priya", name: "Priya Kumar", email: "priya.kumar@hirenest.ai" },
    { id: "recruiter-ananya", name: "Ananya Singh", email: "ananya.singh@hirenest.ai" }
  ];

  useEffect(() => {
    fetchSystemVendorsAndDiagnostics();
  }, [job?.id, assignedRecruiterId, distributionMode, selectedVendorIds]);

  const fetchSystemVendorsAndDiagnostics = async () => {
    try {
      // 1. Fetch system vendors
      const vSnap = await getDocs(collection(db, "vendors"));
      let vendors = vSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, status: d.data().status || "ACTIVE" }));

      if (vendors.length === 0) {
        // Fallback default vendors
        vendors = [
          { id: "vendor-abc", name: "ABC Technologies", status: "ACTIVE" },
          { id: "vendor-xyz", name: "XYZ Solutions", status: "ACTIVE" },
          { id: "vendor-techsource", name: "TechSource India", status: "ACTIVE" },
          { id: "vendor-cloudstaff", name: "CloudStaff Solutions", status: "ACTIVE" }
        ];
      }
      setAvailableVendors(vendors);

      // 2. Fetch diagnostic analysis for each vendor
      if (job?.id) {
        const diagList = await requirementVendorService.getVendorDiagnosticsForRequirement(job.id, vendors);
        setDiagnostics(diagList);
      }
    } catch (err) {
      console.warn("[RequirementDistributionPanel] Fetch error:", err);
    }
  };

  const handleToggleVendor = (vendorId: string) => {
    if (selectedVendorIds.includes(vendorId)) {
      setSelectedVendorIds(selectedVendorIds.filter(id => id !== vendorId));
    } else {
      setSelectedVendorIds([...selectedVendorIds, vendorId]);
    }
  };

  const handleRecruiterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = recruiters.find(r => r.id === e.target.value);
    if (selected) {
      setAssignedRecruiterId(selected.id);
      setAssignedRecruiterName(selected.name);
    }
  };

  const handlePublishDistribution = async () => {
    if (!job?.id) return;
    setIsPublishing(true);
    setPublishSuccessMessage(null);

    const res = await requirementVendorService.setRequirementDistribution({
      requirementId: job.id,
      recruiterId: assignedRecruiterId,
      recruiterName: assignedRecruiterName,
      distributionMode,
      selectedVendorIds,
      assignedBy: userRole === 'admin' ? 'HQ Admin' : assignedRecruiterName
    });

    setIsPublishing(false);
    if (res.success) {
      setPublishSuccessMessage(`Requirement published to ${res.count} vendor(s) via ${distributionMode.replace(/_/g, " ")}!`);
      await fetchSystemVendorsAndDiagnostics();
      if (onDistributionUpdated) onDistributionUpdated();
      setTimeout(() => setPublishSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-slate-200">
      
      {/* Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-tight">Requirement Distribution Matrix</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
              ● Status: Active
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control which agency vendors receive this requirement in their live workspaces.
          </p>
        </div>

        <Button
          onClick={handlePublishDistribution}
          disabled={isPublishing}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {isPublishing ? "Publishing Distribution..." : "Publish to Vendors"}
        </Button>
      </div>

      {publishSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {publishSuccessMessage}
        </div>
      )}

      {/* Recruiter & Distribution Mode Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Assigned Recruiter */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
          <label className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-400" /> Assigned HireNest Recruiter
          </label>
          <select
            value={assignedRecruiterId}
            onChange={handleRecruiterChange}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
          >
            {recruiters.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.email})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            All candidate submissions and interview feedback for this requirement route directly to {assignedRecruiterName}.
          </p>
        </div>

        {/* Distribution Mode Options */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
          <label className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-amber-400" /> Distribution Mode
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
              distributionMode === 'ALL_MAPPED_VENDORS'
                ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="distMode"
                checked={distributionMode === 'ALL_MAPPED_VENDORS'}
                onChange={() => setDistributionMode('ALL_MAPPED_VENDORS')}
                className="hidden"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              All Mapped Vendors
            </label>

            <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
              distributionMode === 'SELECTED_VENDORS'
                ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="distMode"
                checked={distributionMode === 'SELECTED_VENDORS'}
                onChange={() => setDistributionMode('SELECTED_VENDORS')}
                className="hidden"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Selected Vendors
            </label>

            <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
              distributionMode === 'MANUAL'
                ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="distMode"
                checked={distributionMode === 'MANUAL'}
                onChange={() => setDistributionMode('MANUAL')}
                className="hidden"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Manual Distribution
            </label>

            <label className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
              distributionMode === 'RECRUITER_ONLY'
                ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
              <input
                type="radio"
                name="distMode"
                checked={distributionMode === 'RECRUITER_ONLY'}
                onChange={() => setDistributionMode('RECRUITER_ONLY')}
                className="hidden"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              Recruiter Only (Private)
            </label>
          </div>
        </div>

      </div>

      {/* Vendors Distribution Checklist */}
      <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
              Vendor Distribution Checklist
            </h4>
            <p className="text-[11px] text-slate-400">
              {distributionMode === 'ALL_MAPPED_VENDORS'
                ? `All vendors mapped to ${assignedRecruiterName} automatically receive this role.`
                : 'Select specific agency vendors authorized to source candidates for this requirement.'}
            </p>
          </div>

          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Why can't I see this? Diagnostic
            {showDiagnostics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableVendors.map(v => {
            const isSelected = selectedVendorIds.includes(v.id) || distributionMode === 'ALL_MAPPED_VENDORS';
            const diag = diagnostics.find(d => d.vendorId === v.id);

            return (
              <div
                key={v.id}
                onClick={() => distributionMode !== 'ALL_MAPPED_VENDORS' && handleToggleVendor(v.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={distributionMode === 'ALL_MAPPED_VENDORS'}
                    onChange={() => {}}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-xs text-white block">{v.name}</span>
                    <span className="text-[10px] text-slate-400">Vendor Partner</span>
                  </div>
                </div>

                {diag && (
                  <Badge className={`text-[10px] font-mono ${diag.badgeColor}`}>
                    {diag.statusText}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* "Why Can't I See This?" Diagnostic Tool */}
      {showDiagnostics && (
        <div className="bg-slate-950 border border-amber-500/30 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono font-bold uppercase text-amber-300">
              Vendor Distribution Access Diagnostics
            </h4>
          </div>

          <div className="space-y-3">
            {diagnostics.map(d => (
              <div key={d.vendorId} className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{d.vendorName}</span>
                    <Badge className={`text-[9px] font-mono ${d.badgeColor}`}>
                      {d.statusText}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">{d.reason}</p>
                </div>

                {d.actionableMessage && (
                  <Button
                    size="sm"
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] whitespace-nowrap"
                    onClick={() => {
                      alert(`${d.actionableMessage}\n\nUpdating distribution matrix...`);
                      handlePublishDistribution();
                    }}
                  >
                    {d.actionableMessage}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
