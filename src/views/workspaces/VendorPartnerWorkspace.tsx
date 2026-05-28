import { useState } from "react";
import { ShieldCheck, Users, Briefcase, Star, Search, Filter, Download, ArrowUpRight, Lock, Activity, Plus, TrendingUp, Target, Crosshair, Award, AlertTriangle } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import CandidateSubmissionModal from "../../components/CandidateSubmissionModal";

export default function VendorPartnerWorkspace({ vendorName, metrics }: { vendorName: string, metrics?: any }) {
    const [visScore] = useState(92);
    const [activeTab, setActiveTab] = useState<'revenue' | 'competition' | 'recruiters' | 'ai'>('revenue');
    const [submittingReq, setSubmittingReq] = useState<{ id: string, title: string } | null>(null);

    return (
        <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900">
            {/* Header / Revenue Center */}
            <div className="bg-white px-6 py-8 border-b border-slate-200">
                <div className="max-w-7xl mx-auto flex justify-between items-end mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-mono text-[10px] tracking-widest px-2 py-0.5 flex items-center gap-1.5 font-bold">
                                <ShieldCheck size={12} className="text-indigo-600" />
                                AUTHORIZED AGENCY NODE
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-medium tracking-tight text-slate-900 mb-1">Staffing Revenue Operations</h1>
                        <p className="text-sm text-slate-500">Agency Portal: <strong className="text-indigo-600">{vendorName}</strong></p>
                    </div>
                </div>

                 {/* Navigation Tabs */}
                 <div className="max-w-7xl mx-auto flex items-center gap-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('revenue')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'revenue' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Revenue Pipeline
                    </button>
                    <button
                        onClick={() => setActiveTab('competition')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'competition' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Competitive Intelligence
                    </button>
                    <button
                        onClick={() => setActiveTab('recruiters')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'recruiters' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Recruiter Performance
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        AI Submission Co-Pilot
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'revenue' && (
                       <div className="space-y-6">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                   <div className="absolute right-0 bottom-0 opacity-5"><TrendingUp size={80}/></div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Potential Revenue</p>
                                   <p className="text-3xl font-mono font-black text-slate-900">₹{((metrics?.revenue || 0) / 1000).toFixed(1)}K</p>
                                   <Badge className="mt-2 bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] px-1.5 py-0">LIVE SYNC</Badge>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Client Reqs</p>
                                   <p className="text-3xl font-mono font-black text-slate-900">{metrics?.totalJobs || 0}</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Mapped to your agency</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Candidate Pool</p>
                                   <p className="text-3xl font-mono font-black text-emerald-600">{metrics?.totalCandidates || 0}</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Available for submission</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 opacity-5"><Target size={80}/></div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Placements</p>
                                   <p className="text-3xl font-mono font-black text-indigo-600">{metrics?.placements || 0}</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Hired through your agency</p>
                               </div>
                           </div>

                           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                               <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2"><Target size={16} className="text-indigo-600"/> Delivery Heatmap & Active Allocations</h2>
                               
                               {(!metrics || metrics.totalJobs === 0) ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center min-h-[200px]">
                                        <AlertTriangle size={36} className="text-amber-400 mb-4" />
                                        <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[11px] mb-2">No Pipeline Data Available</h4>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                                          Actionable allocations will appear here once clients map active requisitions to your organization.
                                        </p>
                                    </div>
                               ) : (
                                   <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                                       <Activity size={32} className="text-slate-300 mx-auto mb-3" />
                                       <h3 className="text-sm font-bold text-slate-800 mb-1">Pipeline Active</h3>
                                       <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                          Navigate to the Jobs tab to begin matching your {metrics?.totalCandidates || 0} candidates to the {metrics?.totalJobs || 0} available requisitions.
                                       </p>
                                   </div>
                               )}
                           </div>
                       </div>
                    )}

                    {activeTab === 'competition' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                          <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2"><Crosshair size={16} className="text-rose-500"/> Competitor Pressure Index</h2>
                          <div className="space-y-4">
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center min-h-[100px]">
                                   <AlertTriangle size={36} className="text-amber-400 mb-4" />
                                   <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[11px] mb-2">Insufficient Competition Data</h4>
                                   <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                                     Your agency requires at least 5 active client submissions to unlock relative performance benchmarks against the wider organizational vendor network.
                                   </p>
                               </div>
                          </div>
                        </div>
                    )}

                    {activeTab === 'recruiters' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-12 text-center flex flex-col items-center">
                            <Users size={32} className="text-slate-300 mb-3" />
                            <h2 className="text-sm font-semibold text-slate-900 mb-1">No Active Child Nodes</h2>
                            <p className="text-xs text-slate-500 max-w-sm">
                              You have not onboarded any recruiter delegates to this vendor agency node. Assign recruiters to track individualized placement performance.
                            </p>
                            <Button className="mt-6 bg-slate-100 text-slate-600 hover:bg-slate-200 border-none shadow-none"><Plus size={14} className="mr-2" /> Invite Recruiters</Button>
                        </div>
                    )}

                     {activeTab === 'ai' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-12 text-center flex flex-col items-center">
                            <Search size={32} className="text-indigo-300 mb-3" />
                            <h2 className="text-sm font-semibold text-slate-900 mb-1">AI Co-Pilot Offline</h2>
                            <p className="text-xs text-slate-500 max-w-sm">
                              The AI Co-pilot requires an active resume database linked to the vendor node to suggest actionable capability enhancements and match corrections.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {submittingReq && (
                <CandidateSubmissionModal 
                    reqId={submittingReq.id}
                    reqTitle={submittingReq.title}
                    onClose={() => setSubmittingReq(null)}
                />
            )}
        </div>
    );
}