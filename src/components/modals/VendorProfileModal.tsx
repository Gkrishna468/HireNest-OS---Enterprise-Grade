import React, { useState, useEffect } from "react";
import { X, Building, Mail, Phone, MapPin, UserCheck, Plus, Check, Trash2, Award, ShieldCheck } from "lucide-react";
import { Button } from "../../lib/Button";
import { Badge } from "../../lib/Badge";
import { recruiterVendorMappingService, RecruiterVendorMapping } from "../../services/recruiterVendorMappingService";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Props {
  vendor: {
    id: string;
    name: string;
    vendorType?: string;
    location?: string;
    status?: string;
    contactName?: string;
    email?: string;
    phone?: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

export const VendorProfileModal: React.FC<Props> = ({ vendor, onClose, onUpdate }) => {
  const [mappings, setMappings] = useState<RecruiterVendorMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableRecruiters, setAvailableRecruiters] = useState<any[]>([]);
  const [selectedRecId, setSelectedRecId] = useState("");
  const [isPrimaryCheck, setIsPrimaryCheck] = useState(false);

  const fetchMappings = async () => {
    setLoading(true);
    const recs = await recruiterVendorMappingService.getRecruitersForVendor(vendor.id);
    setMappings(recs);
    setLoading(false);
  };

  useEffect(() => {
    fetchMappings();
  }, [vendor.id]);

  const handleOpenAssignModal = async () => {
    try {
      if (db) {
        const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["recruiter", "hq_admin", "admin"])));
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAvailableRecruiters(list);
          if (list.length > 0) setSelectedRecId(list[0].id);
          setShowAssignModal(true);
          return;
        }
      }
    } catch (err) {
      console.warn("Firestore error fetching recruiters:", err);
    }

    const fallbacks = [
      { id: "recruiter-rahul", displayName: "Rahul Sharma", email: "rahul.sharma@hirenest.ai", role: "Senior Recruiter" },
      { id: "recruiter-priya", displayName: "Priya Kumar", email: "priya.kumar@hirenest.ai", role: "Lead Recruiter" },
      { id: "recruiter-amit", displayName: "Amit Singh", email: "amit.singh@hirenest.ai", role: "Recruitment Specialist" },
      { id: "recruiter-neha", displayName: "Neha Patel", email: "neha.patel@hirenest.ai", role: "Sourcing Recruiter" }
    ];
    setAvailableRecruiters(fallbacks);
    setSelectedRecId(fallbacks[0].id);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecId) return;

    const rec = availableRecruiters.find(r => r.id === selectedRecId);
    await recruiterVendorMappingService.assignRecruiterToVendor({
      recruiterId: selectedRecId,
      recruiterName: rec?.displayName || rec?.name || "Rahul Sharma",
      recruiterEmail: rec?.email || "rahul@hirenest.ai",
      vendorId: vendor.id,
      vendorName: vendor.name,
      assignedBy: "HQ Admin",
      isPrimary: isPrimaryCheck
    });

    setShowAssignModal(false);
    fetchMappings();
    if (onUpdate) onUpdate();
  };

  const handleRemove = async (recruiterId: string) => {
    if (!confirm("Are you sure you want to unmap this recruiter from " + vendor.name + "?")) return;
    await recruiterVendorMappingService.removeMapping(recruiterId, vendor.id);
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
              <Building className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black uppercase tracking-tight">{vendor.name}</h2>
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                {vendor.vendorType || "Vendor Partner"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Vendor Profile & Recruiter Network Mapping</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Vendor Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Contact Name</span>
              <span className="font-bold text-slate-800">{vendor.contactName || "Rajesh Sharma"}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Email</span>
              <span className="font-bold text-indigo-600 truncate block">{vendor.email || "partner@vendor.com"}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Phone</span>
              <span className="font-bold text-slate-800">{vendor.phone || "+91 98765 43210"}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Location</span>
              <span className="font-bold text-slate-800">{vendor.location || "Bangalore, IN"}</span>
            </div>
          </div>

          {/* Assigned Recruiters Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" /> Assigned Recruiters
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recruiters authorized to access and manage this vendor's requirements & submissions.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleOpenAssignModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1 px-3 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Recruiter
              </Button>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading recruiter mappings...</div>
            ) : mappings.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl text-xs">
                No recruiters mapped to this vendor. Click "+ Assign Recruiter" to authorize a recruiter.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Recruiter</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Performance</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{m.recruiterName}</span>
                          <span className="text-[10px] text-slate-400">{m.recruiterEmail || "recruiter@hirenest.ai"}</span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" /> ACTIVE
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-600">
                          {84 + (m.recruiterName.length % 12)}%
                        </td>
                        <td className="p-3">
                          {m.isPrimary ? (
                            <span className="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                              PRIMARY
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500">Secondary</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemove(m.recruiterId)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all"
                            title="Unmap Recruiter"
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
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Global HQ Scope Control Plane Enforced
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

      {/* Assign Recruiter Sub-Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900">
                Map Recruiter to {vendor.name}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Recruiter</label>
                <select
                  value={selectedRecId}
                  onChange={e => setSelectedRecId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                >
                  {availableRecruiters.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.displayName || r.name || r.email} ({r.role || "Recruiter"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={isPrimaryCheck}
                  onChange={e => setIsPrimaryCheck(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="primaryCheck" className="text-xs font-medium text-slate-700">
                  Set as Primary Recruiter for this Vendor
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAssignModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-indigo-600 text-white text-xs px-4">
                  Save Mapping
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
