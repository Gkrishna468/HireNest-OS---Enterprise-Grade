import { useState } from "react";
import { Bot, Briefcase, Zap, Users, ShieldCheck, CheckCircle2, MapPin, AlertTriangle, Calendar, Phone, Mail, FileText } from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";

export default function RecruiterWorkspace({ userName }: { userName: string }) {
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

                                {/* Requisition Card */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all hover:border-emerald-300 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 text-slate-600 border-none font-bold">REQ: HNOS-001</Badge>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">SOURCING</Badge>
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">Staff Backend Developer (Node.js/Go)</h3>
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
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Pending Review</div>
                                            <div className="text-lg font-black text-amber-500 font-mono text-center flex justify-center"><AlertTriangle size={18}/></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-xl font-medium">Review Funnel</Button>
                                        <Button variant="outline" className="h-10 rounded-xl px-4 text-slate-600 border-slate-200">Broadcast to Vendors</Button>
                                    </div>
                                </div>

                                {/* Urgent Actions */}
                                <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-900 pb-1 inline-block mt-4">Immediate Actions (SLA &lt; 2H)</h2>
                                
                                <div className="space-y-3">
                                    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-emerald-300 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center font-bold">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900">Schedule HM Screen for Arjun Joshi</p>
                                                <p className="text-[10px] text-slate-500 font-bold">STAFF BACKEND DEVELOPER • VENDOR: APEX</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button size="sm" className="bg-white text-slate-900 border border-slate-200 group-hover:bg-slate-50">Action</Button>
                                        </div>
                                    </div>
                                     <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-emerald-300 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                                <AlertTriangle size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900">Accept/Reject 3 Vendor Submissions</p>
                                                <p className="text-[10px] text-slate-500 font-bold">AI ENGINEER • VENDOR: GLOBAL TECH</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-none group-hover:bg-indigo-700">Review</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             {/* Right Column - Today's Schedule */}
                             <div className="space-y-6">
                                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                          <Calendar size={14} className="text-emerald-500" />
                                          Today's Interviews
                                      </h3>
                                      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-emerald-50 text-slate-500 group-[.is-active]:text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                    <Phone size={14}/>
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="font-bold text-slate-900 text-xs">Priya K.</div>
                                                        <time className="font-mono text-[9px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">10:30 AM</time>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">Recruiter Screen (Frontend)</div>
                                                </div>
                                            </div>
                                             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                    <FileText size={14}/>
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm opacity-60">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="font-bold text-slate-500 text-xs text-left">Rahul M.</div>
                                                        <time className="font-mono text-[9px] text-slate-400 font-bold">02:00 PM</time>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 text-left">Tech Assessment Review</div>
                                                </div>
                                            </div>
                                      </div>
                                  </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'kpi' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Operator Performance Diagnostics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="border border-slate-100 bg-slate-50 p-5 rounded-xl text-center">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest">Time to Submit</div>
                                        <div className="text-4xl font-black text-slate-900 font-mono mb-2">2.4<span className="text-sm text-slate-500 font-bold">d</span></div>
                                        <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px]">-14% vs org avg</Badge>
                                    </div>
                                    <div className="border border-slate-100 bg-slate-50 p-5 rounded-xl text-center">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest">Sub/Interview Ratio</div>
                                        <div className="text-4xl font-black text-slate-900 font-mono mb-2">68<span className="text-sm text-slate-500 font-bold">%</span></div>
                                        <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[9px]">Top Quartile Rank</Badge>
                                    </div>
                                     <div className="border border-slate-100 bg-slate-50 p-5 rounded-xl text-center">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest">AI Assisted Actions</div>
                                        <div className="text-4xl font-black text-slate-900 font-mono mb-2">142</div>
                                        <Badge className="bg-slate-200 text-slate-600 border-none font-bold text-[9px]">This month</Badge>
                                    </div>
                                </div>
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
                                    
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-6 backdrop-blur-sm">
                                        <h4 className="text-sm font-semibold text-white mb-2">Pipeline Alert: Backend Developer</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                                            I have analyzed the new requisition for "Staff Backend Developer". I found <strong className="text-white">3 matching profiles</strong> in our internal database and have drafted personalized outreach emails.
                                        </p>
                                        <div className="flex gap-3">
                                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium border-none shadow-none">
                                                Review Internal Matches
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
                                        <h4 className="text-sm font-semibold text-white mb-2">Vendor Optimization</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                                            Apex Group typically sources React talent 40% faster than other vendors. Would you like me to prioritize allocating the new Frontend Architect role to them?
                                        </p>
                                        <div className="flex gap-3">
                                            <Button className="bg-white text-slate-900 hover:bg-slate-100 font-medium border-none shadow-none">
                                                Allocate to Apex
                                            </Button>
                                             <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                                                View Vendor Compare
                                            </Button>
                                        </div>
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
