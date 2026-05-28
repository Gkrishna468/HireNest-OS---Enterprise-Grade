import { useState } from "react";
import { ShieldCheck, Users, Briefcase, Star, Search, Filter, Download, ArrowUpRight, Lock, Activity, Plus, TrendingUp, Target, Crosshair, Award, AlertTriangle } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import CandidateSubmissionModal from "../../components/CandidateSubmissionModal";

export default function VendorPartnerWorkspace({ vendorName }: { vendorName: string }) {
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
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-mono text-[10px] tracking-widest px-2 py-0.5 flex items-center gap-1.5">
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
                                   <p className="text-3xl font-mono font-black text-slate-900">₹4.2M</p>
                                   <Badge className="mt-2 bg-emerald-50 text-emerald-600 border-none font-bold text-[9px] px-1.5 py-0">↑ 18% Pipe</Badge>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Client Reqs</p>
                                   <p className="text-3xl font-mono font-black text-slate-900">14</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Across 3 core clients</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fill Probability</p>
                                   <p className="text-3xl font-mono font-black text-emerald-600">68%</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Based on current pipeline</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 opacity-5"><AlertTriangle size={80}/></div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aging Requisitions</p>
                                   <p className="text-3xl font-mono font-black text-rose-600">3</p>
                                   <p className="text-[10px] text-slate-500 mt-2 font-medium">Stale over 15 days</p>
                               </div>
                           </div>

                           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                               <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2"><Target size={16} className="text-indigo-600"/> Delivery Heatmap & Active Allocations</h2>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors group">
                                         <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[9px] mb-2 px-2 py-0.5">High Priority</Badge>
                                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Senior React Engineer</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Fintech Dashboard Team</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-sm font-bold text-slate-900">4</span>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Submissions</p>
                                            </div>
                                         </div>
                                         <div className="flex items-center gap-3 mt-4">
                                             <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs" onClick={() => setSubmittingReq({ id: 'REQ-1', title: 'Senior React Engineer' })}>Submit Talent</Button>
                                         </div>
                                     </div>

                                     <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 hover:border-indigo-200 transition-colors group">
                                         <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[9px] mb-2 px-2 py-0.5">Stale Pipeline</Badge>
                                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Staff Data Scientist</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">AI Platform Org</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono text-sm font-bold text-slate-900">0</span>
                                                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Submissions</p>
                                            </div>
                                         </div>
                                         <div className="flex items-center gap-3 mt-4">
                                             <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs" onClick={() => setSubmittingReq({ id: 'REQ-2', title: 'Staff Data Scientist' })}>Submit Talent</Button>
                                         </div>
                                     </div>
                               </div>
                           </div>
                       </div>
                    )}

                    {activeTab === 'competition' && (
                        <div className="space-y-6">
                             <div className="bg-indigo-900 text-white rounded-2xl p-8 border border-indigo-800 shadow-xl relative overflow-hidden">
                                  <div className="absolute right-0 top-0 p-8 opacity-10"><Award size={120}/></div>
                                  <div className="relative z-10 max-w-2xl">
                                      <h2 className="text-2xl font-semibold mb-2">Ranked #2 on Enterprise Account</h2>
                                      <p className="text-indigo-200 text-sm mb-6 leading-relaxed">Your agency is currently placing second in interview-to-offer conversions for this client. Apex Group is leading by 8%. Submitting 2 more high-quality profiles this week will secure top tier allocation bonuses.</p>
                                      
                                      <div className="grid grid-cols-3 gap-6 bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/50">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">Win Probability</p>
                                                <p className="text-xl font-mono text-emerald-400">42%</p>
                                            </div>
                                             <div>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">Avg Match Strength</p>
                                                <p className="text-xl font-mono text-white">88%</p>
                                            </div>
                                             <div>
                                                <p className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">Active Competitors</p>
                                                <p className="text-xl font-mono text-rose-300">4</p>
                                            </div>
                                      </div>
                                  </div>
                             </div>

                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                               <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2"><Crosshair size={16} className="text-rose-500"/> Competitor Pressure Index</h2>
                               <div className="space-y-4">
                                     <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                         <div>
                                             <h4 className="font-semibold text-slate-900 text-sm">Senior Go Engineer</h4>
                                             <p className="text-xs text-slate-500">Apex Group submitted 3 profiles scoring 90%+</p>
                                         </div>
                                         <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[10px]">High Pressure</Badge>
                                     </div>
                                     <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                         <div>
                                             <h4 className="font-semibold text-slate-900 text-sm">Frontend Architect</h4>
                                             <p className="text-xs text-slate-500">You are the only agency with profiles scoring &gt;85%</p>
                                         </div>
                                         <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">Dominating</Badge>
                                     </div>
                               </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'recruiters' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200">
                                <h2 className="text-sm font-semibold text-slate-900">Recruiter Productivity Board</h2>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Team Member</th>
                                        <th className="px-6 py-3 font-semibold">Submissions (Week)</th>
                                        <th className="px-6 py-3 font-semibold">Interview Conv.</th>
                                        <th className="px-6 py-3 font-semibold">AI Productivity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">Sarah Jenkins</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">14</td>
                                        <td className="px-6 py-4 text-emerald-600 font-bold">38%</td>
                                        <td className="px-6 py-4"><Badge className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-bold">Excellent</Badge></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">Marcus Chen</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">8</td>
                                        <td className="px-6 py-4 text-amber-600 font-bold">12%</td>
                                        <td className="px-6 py-4"><Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold">Needs Coaching</Badge></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                     {activeTab === 'ai' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
                                <div className="flex items-center gap-2 mb-4 text-indigo-700">
                                    <Bot size={20} />
                                    <h3 className="font-semibold">AI Sourcing Co-Pilot</h3>
                                </div>
                                <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                                    Your candidates for <strong>Senior React Engineer</strong> are missing "Next.js App Router" in their resumes. Editing profiles to detail Next.js experience will boost match rates by 18%.
                                </p>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white">Generate Resume Enhancements</Button>
                            </div>
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

// Ensure Bot icon is imported since it's used in the AI tab
import { Bot, AlertTriangle as AlertTriangleAlias } from "lucide-react";