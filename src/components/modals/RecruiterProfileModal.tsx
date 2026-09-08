import React, { useState, useEffect } from "react";
import { X, UserCheck, Building2, Plus, Check, Trash2, ShieldCheck, Briefcase, Award } from "lucide-react";
import { Button } from "../../lib/Button";
import { Badge } from "../../lib/Badge";
import { recruiterVendorMappingService, RecruiterVendorMapping } from "../../services/recruiterVendorMappingService";
import { db } from "../../lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

interface Props {
  recruiter: {
    id: string;
    name?: string;
    displayName?: string;
    email?: string;
    role?: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

export const RecruiterProfileModal: React.FC<Props> = ({ recruiter, onClose, onUpdate }) => {
  const [mappings, setMappings] = useState<RecruiterVendorMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [availableVendors, setAvailableVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [isPrimaryCheck, setIsPrimaryCheck] = useState(false);

  const recruiterName = recruiter.displayName || recruiter.name || recruiter.email || "Rahul Sharma";

  const fetchMappings = async () => {
    setLoading(true);
    const vendorList = await recruiterVendorMappingService.getVendorsForRecruiter(recruiter.id);
    setMappings(vendorList);
    setLoading(false);
  };

  useEffect(() => {
    fetchMappings();
  }, [recruiter.id]);

  const handleOpenAddVendorModal = async () => {
    try {
      if (db) {
        const snap = await getDocs(query(collection(db, "organizations")));
        if (!snap.empty) {
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(o => o.orgType === "VENDOR" || o.type?.toLowerCase() === "vendor");
          if (list.length > 0) {
            setAvailableVendors(list);
            setSelectedVendorId(list[0].id);
            setShowAddVendorModal(true);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Firestore error fetching vendors:", err);
    }

    const fallbacks = [
      { id: "vendor-abc", name: "ABC Technologies", vendorType: "Agency / Staffing" },
      { id: "vendor-xyz", name: "XYZ Solutions", vendorType: "Executive Search" },
      { id: "vendor-techsource", name: "TechSource India", vendorType: "Subcontractor" },
      { id: "vendor-cloudstaff", name: "CloudStaff Solutions", vendorType: "Bench Supplier" },
      { id: "vendor-nexus", name: "Nexus Talent Partners", vendorType: "Staffing Agency" }
    ];
    setAvailableVendors(fallbacks);
    setSelectedVendorId(fallbacks[0].id);
    setShowAddVendorModal(true);
  };

  const handleAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    const v = availableVendors.find(item => item.id === selectedVendorId);
    await recruiterVendorMappingService.assignRecruiterToVendor({
      recruiterId: recruiter.id,
      recruiterName,
      recruiterEmail: recruiter.email,
      vendorId: selectedVendorId,
      vendorName: v?.name || "Vendor",
      assignedBy: "HQ Admin",
      isPrimary: isPrimaryCheck
    });

    setShowAddVendorModal(false);
    fetchMappings();
    if (onUpdate) onUpdate();
  };

  const handleRemove = async (vendorId: string) => {
    if (!confirm("Are you sure you want to unmap this vendor from " + recruiterName + "?")) return;
    await recruiterVendorMappingService.removeMapping(recruiter.id, vendorId);
    fetchMappings();
    if (onUpdate) onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black uppercase tracking-tight">{recruiterName}</h2>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                {recruiter.role || "Senior Recruiter"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{recruiter.email || "recruiter@hirenest.ai"}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Recruiter Overview Stats */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Assigned Vendors</span>
              <span className="text-lg font-black text-indigo-600">{mappings.length}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Active Reqs</span>
              <span className="text-lg font-black text-slate-900">28</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Placements</span>
              <span className="text-lg font-black text-emerald-600">8</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">SLA Score</span>
              <span className="text-lg font-black text-amber-500">94%</span>
            </div>
          </div>

          {/* Assigned Vendor Network Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Assigned Vendor Network
                </h3>
                <p className="text-[11px] text-slate-500">
                  Vendors explicitly mapped to this recruiter. Submissions & requirements from these vendors stream to this recruiter.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleOpenAddVendorModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1 px-3 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Vendor
              </Button>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading vendor network...</div>
            ) : mappings.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl text-xs">
                No vendors mapped to this recruiter. Click "+ Add Vendor" to assign vendor network access.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Open Reqs</th>
                      <th className="p-3">Submissions</th>
                      <th className="p-3">Placements</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{m.vendorName}</span>
                          {m.isPrimary && (
                            <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                              PRIMARY VENDOR
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-mono">12</td>
                        <td className="p-3 text-slate-600 font-mono">34</td>
                        <td className="p-3 font-bold text-emerald-600 font-mono">4</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" /> MAPPED
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemove(m.vendorId)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all"
                            title="Unmap Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Scoped Operational Access Controlled
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <Button size="sm" onClick={onClose} className="bg-slate-900 text-white text-xs px-5">
            Done
          </Button>
        </div>
      </div>

      {/* Add Vendor Sub-Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900">
                Map Vendor to {recruiterName}
              </h3>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVendorSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Vendor Partner</label>
                <select
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                >
                  {availableVendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.vendorType || "Vendor"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryVendorCheck"
                  checked={isPrimaryCheck}
                  onChange={e => setIsPrimaryCheck(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="primaryVendorCheck" className="text-xs font-medium text-slate-700">
                  Set as Primary Vendor for this Recruiter
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddVendorModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-indigo-600 text-white text-xs px-4">
                  Add to Network
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
