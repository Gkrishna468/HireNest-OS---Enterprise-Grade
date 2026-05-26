import { useState } from "react";
import { Bot, Briefcase, Zap, Users, ShieldCheck, CheckCircle2, MapPin, AlertTriangle } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";

export default function RecruiterWorkspace({ userName }: { userName: string }) {
    const [aiCopilotActive, setAiCopilotActive] = useState(true);

    return (
        <div className="flex-1 bg-slate-50 flex flex-col min-h-screen">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-8 border-b border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap size={120} />
                </div>
                <div className="max-w-7xl mx-auto flex justify-between items-end relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[10px] tracking-widest px-2 py-0.5 flex items-center gap-1.5">
                                <Bot size={12} className="text-emerald-400" />
                                AI COPILOT ACTIVE
                            </Badge>
                            <span className="text-slate-400 font-mono text-[10px] tracking-widest uppercase">Internal Node</span>
                        </div>
                        <h1 className="text-3xl font-medium tracking-tight text-white mb-1">Recruiter Intelligence Hub</h1>
                        <p className="text-sm text-slate-400">Operator: <strong className="text-emerald-400">{userName}</strong></p>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Copilot & Stats */}
                    <div className="space-y-6">
                        {/* Copilot Action Center */}
                        <div className="bg-indigo-900 rounded-2xl p-6 border border-indigo-800 text-white shadow-xl relative overflow-hidden">
                             <div className="absolute bottom-0 right-0 p-4 opacity-10">
                                <Bot size={100} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                                    <Bot size={14} className="text-emerald-400" /> AI Sourcing Copilot
                                </h3>
                                <p className="text-sm text-indigo-100/80 mb-6 leading-relaxed">
                                    I have analyzed the new requisition for "Staff Backend Developer". I found <strong className="text-white">3 matching profiles</strong> in our internal database and have drafted outreach emails.
                                </p>
                                <div className="space-y-3">
                                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium justify-between group">
                                        Review Matches
                                        <Badge className="bg-indigo-500 text-white border-none shrink-0 group-hover:bg-indigo-400">3</Badge>
                                    </Button>
                                    <Button variant="outline" className="w-full border-indigo-500/50 text-indigo-200 hover:bg-indigo-800 hover:text-white">
                                        Activate Vendor Sourcing
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Operator Performance Diagnostics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Time to Submit</div>
                                        <div className="text-2xl font-black text-slate-900 font-mono">2.4<span className="text-sm text-slate-500 font-bold">days</span></div>
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-xs">-14% better</Badge>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sub/Interview Ratio</div>
                                        <div className="text-2xl font-black text-slate-900 font-mono">68<span className="text-sm text-slate-500 font-bold">%</span></div>
                                    </div>
                                    <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-xs">Top Quartile</Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Work Queue */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block">Priority Requisitions</h2>
                        </div>

                         {/* Requisition Card */}
                         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all shadow-md group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 text-slate-600 border-none">REQ: HNOS-001</Badge>
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">SOURCING</Badge>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Staff Backend Developer (Node.js/Go)</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium">Pipeline: <span className="font-bold text-slate-900">12 Total</span></p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                                <div className="text-center px-4">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Internal</div>
                                    <div className="text-lg font-black text-indigo-600 font-mono">3</div>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-center px-4">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Vendors</div>
                                    <div className="text-lg font-black text-emerald-600 font-mono">9</div>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-center px-4">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Action Required</div>
                                    <div className="text-lg font-black text-amber-600 font-mono text-center flex justify-center"><AlertTriangle size={18} className="text-amber-500" /></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button className="flex-1 bg-slate-900 hover:bg-slate-800 h-10 rounded-xl font-medium">Review Funnel</Button>
                                <Button variant="outline" className="h-10 rounded-xl px-4 text-slate-600">Broadcast to Vendors</Button>
                            </div>
                        </div>

                        {/* Recent Candidates */}
                        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block mt-4">AI Candidate Screenings</h2>
                        
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">AJ</div>
                                <div>
                                    <p className="font-semibold text-sm text-slate-900">Arjun Joshi</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Staff Backend Developer</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">92% AI Fit Match</Badge>
                                <Button variant="outline" size="sm">Evaluate</Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// Dummy AlertTriangle since it wasn't imported from lucide-react initially. Let's add it.
