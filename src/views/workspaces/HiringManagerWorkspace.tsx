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
                            <div className="bg-slate-900 rounded-2xl p-12 border border-slate-800 text-white shadow-xl text-center flex flex-col items-center justify-center min-h-[300px]">
                                <Briefcase size={48} className="text-slate-700 mb-6" />
                                <h3 className="text-xl font-bold mb-2 text-slate-100">No Active Requisitions</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                                  There are currently no open requisitions published under your account manager profile. Issue a requisition to begin accepting submissions from vendors and internal recruiters.
                                </p>
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

