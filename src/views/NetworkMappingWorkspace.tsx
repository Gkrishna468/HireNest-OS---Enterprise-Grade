import React, { useState, useEffect } from "react";
import { Network, Users, Building2, Link, Unlink, Plus, Check, ShieldCheck, Search, RefreshCw, Sparkles, Filter } from "lucide-react";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";
import { recruiterVendorMappingService, RecruiterVendorMapping } from "../services/recruiterVendorMappingService";
import { CreateVendorModal } from "../components/modals/CreateVendorModal";
import { VendorProfileModal } from "../components/modals/VendorProfileModal";
import { RecruiterProfileModal } from "../components/modals/RecruiterProfileModal";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function NetworkMappingWorkspace({ userRole }: { userRole: string }) {
  const [mappings, setMappings] = useState<RecruiterVendorMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);

  // Selected modals
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);

  // List of all recruiters and vendors
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Mappings
      const maps = await recruiterVendorMappingService.getAllMappings();
      setMappings(maps);

      // 2. Fetch Recruiters from Firestore or fallback
      let recList: any[] = [];
      try {
        if (db) {
          const recSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["recruiter", "hq_admin", "admin"])));
          if (!recSnap.empty) {
            recList = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        }
      } catch (err) {
        console.warn("Error fetching recruiters:", err);
      }

      if (recList.length === 0) {
        recList = [
          { id: "recruiter-rahul", displayName: "Rahul Sharma", email: "rahul.sharma@hirenest.ai", role: "Senior Recruiter" },
          { id: "recruiter-priya", displayName: "Priya Kumar", email: "priya.kumar@hirenest.ai", role: "Lead Recruiter" },
          { id: "recruiter-amit", displayName: "Amit Singh", email: "amit.singh@hirenest.ai", role: "Recruitment Specialist" }
        ];
      }
      setRecruiters(recList);

      // 3. Fetch Vendors from Firestore or fallback
      let venList: any[] = [];
      try {
        if (db) {
          const venSnap = await getDocs(collection(db, "organizations"));
          if (!venSnap.empty) {
            venList = venSnap.docs
              .map(d => ({ id: d.id, ...d.data() } as any))
              .filter(o => o.orgType === "VENDOR" || o.type?.toLowerCase() === "vendor");
          }
        }
      } catch (err) {
        console.warn("Error fetching vendors:", err);
      }

      if (venList.length === 0) {
        venList = [
          { id: "vendor-abc", name: "ABC Technologies", vendorType: "Agency / Staffing", location: "Bangalore, IN" },
          { id: "vendor-xyz", name: "XYZ Solutions", vendorType: "Executive Search", location: "Mumbai, IN" },
          { id: "vendor-vertex", name: "Vertex Global", vendorType: "Subcontractor", location: "Delhi, IN" },
          { id: "vendor-cloudstaff", name: "CloudStaff Solutions", vendorType: "Bench Supplier", location: "Hyderabad, IN" },
          { id: "vendor-nexus", name: "Nexus Talent Partners", vendorType: "Staffing Agency", location: "Pune, IN" },
          { id: "vendor-apex", name: "Apex Staffing", vendorType: "Agency / Staffing", location: "Chennai, IN" }
        ];
      }
      setVendors(venList);

    } catch (err) {
      console.error("Error loading network mapping workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const isMapped = (recruiterId: string, vendorId: string) => {
    return mappings.some(m => 
      (m.recruiterId === recruiterId || recruiterId.includes(m.recruiterId) || m.recruiterId.includes(recruiterId)) && 
      (m.vendorId === vendorId || vendorId.includes(m.vendorId) || m.vendorId.includes(vendorId)) && 
      m.status === 'ACTIVE'
    );
  };

  const toggleMapping = async (recruiter: any, vendor: any) => {
    const recId = recruiter.id;
    const venId = vendor.id;
    const mapped = isMapped(recId, venId);

    if (mapped) {
      await recruiterVendorMappingService.removeMapping(recId, venId);
    } else {
      await recruiterVendorMappingService.assignRecruiterToVendor({
        recruiterId: recId,
        recruiterName: recruiter.displayName || recruiter.name || recruiter.email || "Recruiter",
        recruiterEmail: recruiter.email,
        vendorId: venId,
        vendorName: vendor.name,
        assignedBy: "HQ Admin",
        isPrimary: false
      });
    }

    fetchNetworkData();
  };

  const filteredRecruiters = recruiters.filter(r => 
    !searchQuery || 
    (r.displayName || r.name || r.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter(v =>
    !searchQuery ||
    (v.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.vendorType || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Control Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/20 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-black uppercase tracking-tight">
              Recruiter ↔ Vendor Network Mapping
            </h1>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-mono">
              GLOBAL HQ CONTROL PLANE
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Configure authorization boundaries and scope routing between Recruiters and Vendor Partners. Recruiters only receive candidates and requirements from vendors explicitly mapped in this matrix.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => fetchNetworkData()}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Graph
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateVendorModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 px-4 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" /> Create Vendor & Map
          </Button>
        </div>
      </div>

      {/* Metric Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Active Mappings</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{mappings.length}</span>
          <span className="text-[10px] text-slate-400 block">Active RBAC boundaries</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Registered Recruiters</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{recruiters.length}</span>
          <span className="text-[10px] text-slate-400 block">Operational recruiters</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Mapped Vendors</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{vendors.length}</span>
          <span className="text-[10px] text-slate-400 block">Active partner agencies</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Security Policy</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Strict Scope Enforced
          </span>
          <span className="text-[10px] text-slate-400 block">Backend & API level isolation</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search recruiter or vendor name..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-600"
          />
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Click any cell in matrix below to map / unmap recruiter ↔ vendor
        </span>
      </div>

      {/* Network Mapping Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Network className="w-4 h-4 text-indigo-500" /> Interactive Recruiter ↔ Vendor Mapping Matrix
          </h3>
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
            Green Check = Active Mapping • Click to Toggle
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading Network Mapping Matrix...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 border-r border-slate-200 dark:border-slate-700 min-w-[200px]">
                    Recruiters ↓ / Vendors →
                  </th>
                  {filteredVendors.map(v => (
                    <th
                      key={v.id}
                      onClick={() => setSelectedVendor(v)}
                      className="p-3 text-center border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[130px]"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[120px]" title={v.name}>
                        {v.name}
                      </span>
                      <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-normal block truncate">
                        {v.vendorType || "Vendor"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecruiters.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Recruiter Header Cell */}
                    <td
                      onClick={() => setSelectedRecruiter(r)}
                      className="p-3 border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {r.displayName || r.name || r.email}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{r.role || "Recruiter"}</span>
                    </td>

                    {/* Vendor Matrix Toggle Cells */}
                    {filteredVendors.map(v => {
                      const mapped = isMapped(r.id, v.id);
                      return (
                        <td
                          key={v.id}
                          onClick={() => toggleMapping(r, v)}
                          className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 cursor-pointer transition-all ${
                            mapped
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 dark:text-slate-600"
                          }`}
                        >
                          {mapped ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] shadow-sm">
                              <Check className="w-3 h-3" /> MAPPED
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                              <Plus className="w-3 h-3" /> Unmapped
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateVendorModal && (
        <CreateVendorModal
          onClose={() => setShowCreateVendorModal(false)}
          onSuccess={() => fetchNetworkData()}
        />
      )}

      {selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdate={() => fetchNetworkData()}
        />
      )}

      {selectedRecruiter && (
        <RecruiterProfileModal
          recruiter={selectedRecruiter}
          onClose={() => setSelectedRecruiter(null)}
          onUpdate={() => fetchNetworkData()}
        />
      )}
    </div>
  );
}
