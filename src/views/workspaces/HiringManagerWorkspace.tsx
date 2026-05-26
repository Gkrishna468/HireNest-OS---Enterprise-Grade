import { useState } from "react";
import { Plus, Users, LayoutDashboard, Settings, MapPin, IndianRupee, Clock, Briefcase } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";

export default function HiringManagerWorkspace({ userName }: { userName: string }) {
    const [activeTab, setActiveTab] = useState<'reqs' | 'funnel' | 'eval'>('reqs');

    return (
        <div className="flex-1 bg-slate-50 flex flex-col min-h-screen">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 pt-8 pb-0 border-b border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Hiring Manager Portal</h1>
                    <p className="text-sm text-slate-400 mb-8 max-w-2xl">
                        Release requisition budgets, monitor candidate sourcing progress, and schedule interview cycles securely via AI-assisted workflows.
                    </p>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('reqs')}
                            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'reqs' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            Open Requisitions
                        </button>
                        <button
                            onClick={() => setActiveTab('funnel')}
                            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'funnel' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            Recruitment Funnel
                        </button>
                        <button
                            onClick={() => setActiveTab('eval')}
                            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${activeTab === 'eval' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        >
                            AI Evaluation Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Action Banner */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
                        <p className="text-sm text-slate-500 max-w-xl">
                            Add skills matrices, configure vendor allocation permission checks, and utilize AI auto-drafts to publish postings.
                        </p>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-medium shadow-md shadow-indigo-500/20">
                            <Plus size={18} className="mr-2" /> Issue Requisition
                        </Button>
                    </div>

                    {activeTab === 'reqs' && (
                        <div className="space-y-6">
                            {/* Requisition Card 1 */}
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Briefcase size={120} />
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="font-mono text-[9px] border-indigo-500/30 text-indigo-300 bg-indigo-500/10">REQ-ID: HNOS-001</Badge>
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[9px]">OPEN</Badge>
                                        </div>
                                        <h3 className="text-xl font-semibold">Senior Frontend Engineer (React/TypeScript)</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl relative z-10">
                                    We are seeking a talented Senior Frontend Engineer with expert level knowledge in React, 
                                    TypeScript, and Tailwind CSS. You will build and optimize user interfaces with AI-integrations.
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-300 mb-6 relative z-10">
                                    <div className="flex items-center gap-2"><MapPin size={16} className="text-indigo-400" /> Bengaluru (Hybrid)</div>
                                    <div className="flex items-center gap-2"><IndianRupee size={16} className="text-indigo-400" /> 18 - 25 LPA</div>
                                    <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-400" /> 5 - 8 Years</div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                                    {['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Redux'].map(skill => (
                                        <Badge key={skill} variant="secondary" className="bg-white/10 text-slate-200 border-none font-medium px-3 py-1">{skill}</Badge>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-800 pt-6 relative z-10 mt-2">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Sourced Applicants</div>
                                        <p className="text-lg font-semibold text-white">5 Active Subm. <span className="text-emerald-400 text-sm">(0 selected)</span></p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-10 px-6">Close Job</Button>
                                        <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-10 px-6 font-medium shadow-none"><Settings size={16} className="mr-2"/> Parameters</Button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Requisition Card 2 */}
                             <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-xl relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="font-mono text-[9px] border-indigo-500/30 text-indigo-300 bg-indigo-500/10">REQ-ID: HNOS-002</Badge>
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[9px]">OPEN</Badge>
                                        </div>
                                        <h3 className="text-xl font-semibold">DevOps & Cloud Architect</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl relative z-10">
                                    Lead the design, implementation, and maintenance of our multi-cloud deployment pipelines. Strong knowledge of container orchestration.
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-300 mb-6 relative z-10">
                                    <div className="flex items-center gap-2"><MapPin size={16} className="text-indigo-400" /> Remote (India)</div>
                                    <div className="flex items-center gap-2"><IndianRupee size={16} className="text-indigo-400" /> 28 - 42 LPA</div>
                                    <div className="flex items-center gap-2"><Clock size={16} className="text-indigo-400" /> 8 - 12 Years</div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                                    {['Kubernetes', 'Docker', 'Terraform', 'GCP', 'AWS', 'GitHub Actions'].map(skill => (
                                        <Badge key={skill} variant="secondary" className="bg-white/10 text-slate-200 border-none font-medium px-3 py-1">{skill}</Badge>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-800 pt-6 relative z-10 mt-2">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Sourced Applicants</div>
                                        <p className="text-lg font-semibold text-white">3 Active Subm. <span className="text-emerald-400 text-sm">(2 selected)</span></p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-10 px-6">Close Job</Button>
                                        <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-10 px-6 font-medium shadow-none"><Settings size={16} className="mr-2"/> Parameters</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'funnel' && (
                        <div className="h-96 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <div className="text-center text-slate-500">
                                <LayoutDashboard size={48} className="mx-auto mb-4 text-slate-300" />
                                <p className="font-medium text-slate-900">Kanban Recruiter Funnel Active</p>
                                <p className="text-sm mt-1">Select a requisition to view the candidate pipeline.</p>
                                <Button variant="outline" className="mt-4" onClick={()=>setActiveTab('reqs')}>Go to Reqs</Button>
                            </div>
                        </div>
                    )}
                     {activeTab === 'eval' && (
                        <div className="h-96 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <div className="text-center text-slate-500">
                                <Users size={48} className="mx-auto mb-4 text-indigo-300" />
                                <p className="font-medium text-slate-900">AI Candidates Diagnostics</p>
                                <p className="text-sm mt-1">Wait for submissions to unlock resume parse explanations.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

