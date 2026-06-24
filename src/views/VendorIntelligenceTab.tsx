import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Target, Activity, Search, Award, BarChart3, Clock, ArrowUpRight, CheckCircle2, Shield } from "lucide-react";
import { collection, query, limit, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function VendorIntelligenceTab() {
  const [performances, setPerformances] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Read from vendor_performance collection
    const q = query(collection(db, "vendor_performance"), orderBy("trustScore", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPerformances(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  const filteredPerformances = performances.filter(p => 
    !searchTerm || 
    (p.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) || p.vendorId?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-8 py-6 border-b bg-white flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vendor Intelligence Center</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time performance scorecards and SLA intelligence</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-sm text-sm w-64 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-5 border rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Performing Vendor</div>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {performances[0]?.vendorName || "N/A"}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Trust Score: {performances[0]?.trustScore || 0}/100
            </div>
          </div>
          <div className="bg-white p-5 border rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Fill Ratio</div>
              <Target className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {performances.length ? Math.round(performances.reduce((acc, p) => acc + (p.fillRatio || 0), 0) / performances.length) : 0}%
            </div>
            <div className="text-sm text-slate-500 mt-1 flex items-center">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 mr-1" /> +2.4% vs last month
            </div>
          </div>
          <div className="bg-white p-5 border rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Active Vendors</div>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">{performances.length}</div>
            <div className="text-sm text-slate-500 mt-1">With performance data</div>
          </div>
          <div className="bg-white p-5 border rounded-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Placements</div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {performances.reduce((acc, p) => acc + (p.placements || 0), 0)}
            </div>
            <div className="text-sm text-slate-500 mt-1">Across all tracked vendors</div>
          </div>
        </div>

        <div className="bg-white border rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-slate-400" /> Vendor Leaderboard
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trust Score</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reqs Worked</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submissions</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interviews</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Placements</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fill Ratio</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Sub Time</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Revenue Gen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <Activity className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-medium">No vendor performance data yet</p>
                        <p className="text-xs mt-1">Data will appear here as vendors make submissions.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPerformances.map((perf, idx) => (
                    <tr key={perf.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                            {perf.vendorName?.substring(0, 2).toUpperCase() || "VN"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{perf.vendorName || perf.vendorId}</div>
                            <div className="text-xs text-slate-500">ID: {perf.vendorId?.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center">
                          <Shield className={`w-3 h-3 mr-1.5 ${perf.trustScore >= 90 ? 'text-emerald-500' : perf.trustScore >= 75 ? 'text-amber-500' : 'text-rose-500'}`} />
                          <span className={`text-sm font-bold ${perf.trustScore >= 90 ? 'text-emerald-700' : perf.trustScore >= 75 ? 'text-amber-700' : 'text-rose-700'}`}>
                            {perf.trustScore || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-600">{perf.requirementsWorked || 0}</td>
                      <td className="py-3 px-6 text-sm text-slate-600">{perf.submissions || 0}</td>
                      <td className="py-3 px-6 text-sm text-slate-600">{perf.interviews || 0}</td>
                      <td className="py-3 px-6 text-sm font-medium text-slate-800">{perf.placements || 0}</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mr-2 overflow-hidden">
                            <div 
                              className={`h-full ${perf.fillRatio >= 20 ? 'bg-emerald-500' : perf.fillRatio >= 10 ? 'bg-amber-500' : 'bg-slate-400'}`} 
                              style={{ width: `${Math.min(100, perf.fillRatio || 0)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{perf.fillRatio || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-slate-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                        {perf.averageSubmissionTime || 0} hrs
                      </td>
                      <td className="py-3 px-6 text-sm font-bold text-slate-800 text-right">
                        ${(perf.revenueGenerated || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
