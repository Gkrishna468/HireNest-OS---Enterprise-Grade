import { useState } from "react";
import { Bot, Briefcase, Zap, Users, ShieldCheck, CheckCircle2, MapPin, AlertTriangle, Calendar, Phone, Mail, FileText } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";

export default function RecruiterWorkspace({ userName, metrics }: { userName: string, metrics?: any }) {
    const [activeTab, setActiveTab] = useState<'action' | 'kpi' | 'assistant'>('action');

    return (
        <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-6 font-sans relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap size={120} />
                </div>
                <div className="max-w-7xl mx-auto flex justify-between items-end relative z-10 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-mono text-[10px] tracking-widest px-2 py-0.5 flex items-center gap-1.5 font-bold">
                                <Bot size={12} className="text-emerald-500" />
                                AI COPILOT ACTIVE
                            </Badge>
                            <span className="text-slate-400 font-mono text-[10px] tracking-widest uppercase font-bold">Internal Node</span>
                        </div>
                        <h1 className="text-3xl font-medium tracking-tight text-slate-900 mb-1">AI Recruiting Workbench</h1>
                        <p className="text-sm text-slate-500">Operator: <strong className="text-emerald-600">{userName}</strong></p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-7xl mx-auto flex items-center gap-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('action')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'action' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Daily Action OS
                    </button>
                    <button
                        onClick={() => setActiveTab('kpi')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'kpi' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Performance Metrics
                    </button>
                    <button
                        onClick={() => setActiveTab('assistant')}
                        className={`pb-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'assistant' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        AI Recruiter Assistant
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'action' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             {/* Left Column - Work Queue */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block">Priority Requisitions</h2>
                                </div>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                                    <Briefcase size={32} className="text-slate-300 mb-3" />
                                    <h3 className="text-sm font-bold text-slate-800 mb-1">No Active Requisitions</h3>
                                    <p className="text-xs text-slate-500 max-w-sm">
                                      You are not currently assigned as the Primary Recruiter for any active jobs. All assignments will appear here securely.
                                    </p>
                                </div>

                                {/* Urgent Actions */}
                                <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block mt-4">Immediate Actions (SLA &lt; 2H)</h2>
                                
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                                    <CheckCircle2 size={32} className="text-emerald-300 mb-3" />
                                    <h3 className="text-sm font-bold text-slate-800 mb-1">Inbox Zero</h3>
                                    <p className="text-xs text-slate-500 max-w-sm">
                                      No urgent candidate reviews or vendor submissions require your immediate attention.
                                    </p>
                                </div>
                            </div>
                             {/* Right Column - Today's Schedule */}
                             <div className="space-y-6">
                                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                          <Calendar size={14} className="text-emerald-500" />
                                          Today's Interviews
                                      </h3>
                                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                          <Calendar size={24} className="text-slate-300 mx-auto mb-2" />
                                          <p className="text-xs font-medium text-slate-500">No interviews scheduled today</p>
                                      </div>
                                  </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'kpi' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                                  Operator Performance Diagnostics
                                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">LIVE SYNC</Badge>
                                </h3>
                                
                                {(!metrics || (metrics.activeCandidates === 0 && metrics.actionQueue === 0 && metrics.placements === 0)) ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center min-h-[200px]">
                                        <AlertTriangle size={36} className="text-amber-400 mb-4" />
                                        <h4 className="font-bold text-slate-800 uppercase tracking-widest text-[11px] mb-2">Insufficient Activity Data</h4>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                                          Heatmaps and performance diagnostics will activate automatically after you upload candidates, make submissions, or facilitate interviews. 
                                        </p>
                                        <div className="mt-6 flex gap-3 text-[10px] uppercase font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><Users size={12} /> Candidate Uploads: {metrics?.activeCandidates || 0}</span>
                                            <span className="flex items-center gap-1"><Briefcase size={12} /> Active Subs: {metrics?.actionQueue || 0}</span>
                                        </div>
                                    </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div className="border border-emerald-100 bg-emerald-50/50 p-5 rounded-xl text-center shadow-sm">
                                          <div className="text-[10px] text-emerald-600 font-black uppercase mb-2 tracking-widest">Active Pipeline</div>
                                          <div className="text-4xl font-black text-slate-900 font-mono mb-2">{metrics?.activeCandidates || 0}</div>
                                          <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[9px]">Sourced Candidates</Badge>
                                      </div>
                                      <div className="border border-indigo-100 bg-indigo-50/50 p-5 rounded-xl text-center shadow-sm">
                                          <div className="text-[10px] text-indigo-600 font-black uppercase mb-2 tracking-widest">Submissions</div>
                                          <div className="text-4xl font-black text-slate-900 font-mono mb-2">{metrics?.actionQueue || 0}</div>
                                          <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold text-[9px]">Across active jobs</Badge>
                                      </div>
                                      <div className="border border-amber-100 bg-amber-50/50 p-5 rounded-xl text-center shadow-sm">
                                          <div className="text-[10px] text-amber-600 font-black uppercase mb-2 tracking-widest">Placements</div>
                                          <div className="text-4xl font-black text-slate-900 font-mono mb-2">{metrics?.placements || 0}</div>
                                          <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[9px]">Hired success rate</Badge>
                                      </div>
                                  </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'assistant' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                             {/* Copilot Action Center */}
                            <div className="bg-[#0f172a] rounded-2xl p-8 border border-slate-800 text-white shadow-xl relative overflow-hidden">
                                 <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Bot size={150} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2">
                                        <Bot size={14} /> Intelligence Engine
                                    </h3>
                                    
                                     <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[100px]">
                                        <Search size={36} className="text-slate-500 mb-4" />
                                        <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[11px] mb-2">AI Copilot Offline</h4>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                                          The intelligence engine requires an active candidate database linked to the vendor node to suggest actionable capability enhancements and match corrections.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// Dummy AlertTriangle since it wasn't imported from lucide-react initially. Let's add it.
