import React, { useState, useEffect } from "react";
import { X, Building, User, Mail, Phone, MapPin, ShieldCheck, CheckSquare, Plus, UserCheck } from "lucide-react";
import { Button } from "../../lib/Button";
import { db } from "../../lib/firebase";
import { collection, getDocs, setDoc, doc, query, where } from "firebase/firestore";
import { recruiterVendorMappingService } from "../../services/recruiterVendorMappingService";

interface Props {
  onClose: () => void;
  onSuccess?: (vendorId: string) => void;
}

export const CreateVendorModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [availableRecruiters, setAvailableRecruiters] = useState<any[]>([]);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [vendorType, setVendorType] = useState("Agency / Staffing");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Bangalore, India");
  const [status, setStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE");

  // Recruiter Mapping Selection
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);
  const [primaryRecruiterId, setPrimaryRecruiterId] = useState<string>("");

  useEffect(() => {
    const fetchRecruiters = async () => {
      try {
        if (db) {
          const snap = await getDocs(query(collection(db, "users"), where("role", "in", ["recruiter", "hq_admin", "admin"])));
          if (!snap.empty) {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAvailableRecruiters(list);
            if (list.length > 0) {
              setSelectedRecruiterIds([list[0].id]);
              setPrimaryRecruiterId(list[0].id);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch recruiters from Firestore:", err);
      }

      // Fallback recruiters list
      const fallbacks = [
        { id: "recruiter-rahul", displayName: "Rahul Sharma", email: "rahul.sharma@hirenest.ai", role: "Senior Recruiter" },
        { id: "recruiter-priya", displayName: "Priya Kumar", email: "priya.kumar@hirenest.ai", role: "Lead Recruiter" },
        { id: "recruiter-amit", displayName: "Amit Singh", email: "amit.singh@hirenest.ai", role: "Recruitment Specialist" },
        { id: "recruiter-neha", displayName: "Neha Patel", email: "neha.patel@hirenest.ai", role: "Sourcing Recruiter" }
      ];
      setAvailableRecruiters(fallbacks);
      setSelectedRecruiterIds([fallbacks[0].id]);
      setPrimaryRecruiterId(fallbacks[0].id);
    };

    fetchRecruiters();
  }, []);

  const toggleRecruiter = (recId: string) => {
    if (selectedRecruiterIds.includes(recId)) {
      const next = selectedRecruiterIds.filter(id => id !== recId);
      setSelectedRecruiterIds(next);
      if (primaryRecruiterId === recId) {
        setPrimaryRecruiterId(next[0] || "");
      }
    } else {
      const next = [...selectedRecruiterIds, recId];
      setSelectedRecruiterIds(next);
      if (!primaryRecruiterId) {
        setPrimaryRecruiterId(recId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email) {
      alert("Please provide Vendor Company Name and Contact Email.");
      return;
    }

    setLoading(true);
    try {
      const vendorId = "vendor-" + Date.now().toString(36);
      const newOrg = {
        id: vendorId,
        name: companyName,
        orgType: "VENDOR",
        vendorType,
        contactName,
        email,
        phone,
        location,
        status,
        createdAt: new Date().toISOString(),
        verified: true,
        trustScore: 88
      };

      // 1. Create Organization doc in Firestore
      if (db) {
        await setDoc(doc(db, "organizations", vendorId), newOrg);
      }

      // 2. Create Recruiter ↔ Vendor Mappings
      for (const recId of selectedRecruiterIds) {
        const recruiter = availableRecruiters.find(r => r.id === recId);
        await recruiterVendorMappingService.assignRecruiterToVendor({
          recruiterId: recId,
          recruiterName: recruiter?.displayName || recruiter?.name || "Rahul Sharma",
          recruiterEmail: recruiter?.email || "rahul@hirenest.ai",
          vendorId,
          vendorName: companyName,
          assignedBy: "HQ Admin",
          isPrimary: recId === primaryRecruiterId
        });
      }

      alert(`Vendor "${companyName}" created and assigned to ${selectedRecruiterIds.length} recruiter(s)!`);
      if (onSuccess) onSuccess(vendorId);
      onClose();
    } catch (err: any) {
      console.error("Error creating vendor:", err);
      alert("Failed to create vendor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black uppercase tracking-tight">Create Vendor & Map Recruiters</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Global HQ Control Plane • Vendor Onboarding</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendor Credentials</h3>
            
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Staffing Solutions"
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor Type</label>
                <select
                  value={vendorType}
                  onChange={e => setVendorType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                >
                  <option value="Agency / Staffing">Agency / Staffing</option>
                  <option value="Subcontractor">Subcontractor</option>
                  <option value="Independent Bench">Independent Bench</option>
                  <option value="Executive Search">Executive Search</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Bangalore, India"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@apexstaffing.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* Assign Recruiters Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-indigo-600" /> Assign Recruiters
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedRecruiterIds.length} Selected
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {availableRecruiters.map(rec => {
                const isSelected = selectedRecruiterIds.includes(rec.id);
                return (
                  <div
                    key={rec.id}
                    onClick={() => toggleRecruiter(rec.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-xs font-bold block">{rec.displayName || rec.name || rec.email}</span>
                        <span className="text-[10px] text-slate-400">{rec.role || "Recruiter"}</span>
                      </div>
                    </div>
                    {isSelected && primaryRecruiterId === rec.id && (
                      <span className="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                        PRIMARY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedRecruiterIds.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Recruiter</label>
                <select
                  value={primaryRecruiterId}
                  onChange={e => setPrimaryRecruiterId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
                >
                  {selectedRecruiterIds.map(id => {
                    const rec = availableRecruiters.find(r => r.id === id);
                    return (
                      <option key={id} value={id}>
                        {rec?.displayName || rec?.name || id}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={onClose} size="sm" className="text-xs text-slate-600">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 shadow-lg shadow-indigo-200"
            >
              {loading ? "Creating..." : "Create & Activate Vendor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
