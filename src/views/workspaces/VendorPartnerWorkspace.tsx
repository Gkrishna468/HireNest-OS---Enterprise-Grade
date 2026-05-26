import { useState } from "react";
import { ShieldCheck, Users, Briefcase, Star, Search, Filter, Download, ArrowUpRight, Lock, Activity, Plus } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import CandidateSubmissionModal from "../../components/CandidateSubmissionModal";

export default function VendorPartnerWorkspace({ vendorName }: { vendorName: string }) {
    // Mock Data based on the provided Vendora Screenshots + AI Upgrades
    const [visScore] = useState(4.2); // Vendor Intelligence Score
    const [submittingReq, setSubmittingReq] = useState<{ id: string, title: string } | null>(null);

    return (
        <div className="flex-1 bg-slate-50 flex flex-col min-h-screen">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-8 border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-[10px] tracking-widest px-2 py-0.5 flex items-center gap-1.5">
                                <ShieldCheck size={12} className="text-emerald-400" />
                                PRIVACY SHIELD ENABLED
                            </Badge>
                            <span className="text-slate-400 font-mono text-[10px] tracking-widest uppercase">Secured Tenant Node</span>
                        </div>
                        <h1 className="text-3xl font-medium tracking-tight text-white mb-1">Sourcing Partner Workspace</h1>
                        <p className="text-sm text-slate-400">Authorized Agency Portal: <strong className="text-indigo-400">{vendorName}</strong></p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">AI Vendor Intelligence Score</p>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-mono font-black text-amber-400">{visScore}</span>
                                <Star className="text-amber-400 fill-amber-400" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Metrics & Trust */}
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="bg-indigo-50 text-indigo-600 h-14 w-14 rounded-xl flex items-center justify-center shrink-0">
                                <Briefcase size={24} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Requisitions</h3>
                                <p className="text-3xl font-mono font-black text-slate-900">4</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="bg-emerald-50 text-emerald-600 h-14 w-14 rounded-xl flex items-center justify-center shrink-0">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">My Sourced Talents</h3>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-mono font-black text-slate-900">12</p>
                                    <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mb-1">3 Selected</span>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Shield Info */}
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-slate-300">
                            <div className="flex items-center gap-2 mb-3 text-white">
                                <Lock size={18} className="text-indigo-400" />
                                <h3 className="font-semibold text-sm">Tenant Isolation Active</h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                By enterprise contract rules, other sourcing agencies cannot audit your candidates, metrics trackers, phone logs, or extracted resumes. You are operating inside an isolated tenant node.
                            </p>
                        </div>

                        {/* VIS Breakdown */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <Activity size={14} className="text-indigo-500" />
                                Vendor Intelligence Diagnostics
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                        <span>Submission Quality</span>
                                        <span className="text-emerald-600">High (92%)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[92%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                        <span>Interview-to-Offer Ratio</span>
                                        <span className="text-indigo-600">Solid (45%)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[45%]" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1 font-medium text-slate-700">
                                        <span>Candidate Authenticity</span>
                                        <span className="text-emerald-600">Verified (100%)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-full" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-4 italic border-t border-slate-100 pt-3">
                                VIS controls pipeline allocation priority. Maintain quality submissions to unlock more premium requisitions.
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Open Assignments */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block">Active Allocations</h2>
                            <Button variant="outline" size="sm" className="h-8 text-xs"><Filter size={14} className="mr-2" />Filter</Button>
                        </div>

                        {/* Requisition Card */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all hover:border-indigo-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 text-slate-600 border-none">REQ: HNOS-001</Badge>
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">ACTIVE</Badge>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Staff Backend Developer (Node.js/Go)</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Submitted: <span className="font-bold text-slate-900">4 profiles</span></p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-2">
                                Build high-throughput JSON and gRPC application APIs. Optimize PostgreSQL and Cloud Spanner databases, design robust event-driven infrastructures using Temporal and Pub/Sub.
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Salary:</span> ₹22 - 35 LPA</div>
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Location:</span> Pune (Hybrid)</div>
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Exp:</span> 7 - 10 Years</div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button 
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl font-medium"
                                    onClick={() => setSubmittingReq({ id: 'HNOS-001', title: 'Staff Backend Developer (Node.js/Go)' })}
                                >
                                    <Plus size={16} className="mr-2"/> Submit Candidate Profile
                                </Button>
                                <Button variant="outline" className="h-10 rounded-xl px-4 text-slate-600"><ArrowUpRight size={18} /></Button>
                            </div>
                        </div>

                        {/* Another Req Card */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all hover:border-indigo-300 group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 text-slate-600 border-none">REQ: HNOS-004</Badge>
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">ACTIVE</Badge>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">AI Engineer (LLMs & RAG)</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Submitted: <span className="font-bold text-slate-900">2 profiles</span></p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-2">
                                Develop fine-tuning pipelines for LLMs. Implement RAG patterns using pgVector and generative agents.
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Salary:</span> ₹30 - 45 LPA</div>
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Location:</span> Remote</div>
                                <div className="flex items-center gap-1.5"><span className="text-slate-400">Exp:</span> 4 - 8 Years</div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button 
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl font-medium"
                                    onClick={() => setSubmittingReq({ id: 'HNOS-004', title: 'AI Engineer (LLMs & RAG)' })}
                                >
                                    <Plus size={16} className="mr-2"/> Submit Candidate Profile
                                </Button>
                                <Button variant="outline" className="h-10 rounded-xl px-4 text-slate-600"><ArrowUpRight size={18} /></Button>
                            </div>

                        </div>

                    </div>
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
