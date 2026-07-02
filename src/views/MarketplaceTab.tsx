import React, { useState } from "react";
import { Store, Briefcase, Users, Bot, Search, Filter, TrendingUp, Zap, Clock, ShieldCheck, ArrowRight, Building2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function MarketplaceTab() {
    const [activeTab, setActiveTab] = useState<'CLIENTS' | 'VENDORS' | 'AI_AGENTS'>('CLIENTS');

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-600 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(79,70,229,1)]">
                        HireNestOS Marketplace
                    </h1>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Store size={14} className="text-indigo-600" /> Global Ecosystem Matching
                    </p>
                </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('CLIENTS')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                        activeTab === 'CLIENTS' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Briefcase size={16} /> Client Requirements
                </button>
                <button 
                    onClick={() => setActiveTab('VENDORS')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                        activeTab === 'VENDORS' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Users size={16} /> Vendor Benches
                </button>
                <button 
                    onClick={() => setActiveTab('AI_AGENTS')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                        activeTab === 'AI_AGENTS' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Bot size={16} /> AI Micro-Services
                </button>
            </div>

            {activeTab === 'CLIENTS' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-96">
                            <Search size={16} className="text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search client requirements..." 
                                className="bg-transparent border-none focus:outline-none text-sm w-full font-medium"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                            <Filter size={16} /> Filter
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "Senior Java Backend Engineer", client: "FinTech Corp", location: "Bangalore", rate: "₹25-35 LPA", match: "82%", urgency: "High" },
                            { title: "React Frontend Developer", client: "Retail Giant", location: "Remote", rate: "₹18-24 LPA", match: "64%", urgency: "Medium" },
                            { title: "Data Scientist (NLP)", client: "AI Startup", location: "Hyderabad", rate: "₹30-40 LPA", match: "91%", urgency: "Critical" },
                            { title: "DevOps Engineer", client: "Cloud Services", location: "Pune", rate: "₹20-28 LPA", match: "45%", urgency: "Low" },
                        ].map((job, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                        <Zap size={12} /> AI Match {job.match}
                                    </div>
                                    <div className={cn(
                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                        job.urgency === 'Critical' ? "bg-rose-100 text-rose-700" :
                                        job.urgency === 'High' ? "bg-orange-100 text-orange-700" :
                                        job.urgency === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                                    )}>
                                        {job.urgency}
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                                <p className="text-slate-500 text-sm font-medium mb-4 flex items-center gap-2">
                                    <Building2 size={14} /> {job.client}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mb-6">
                                    <span className="bg-slate-100 px-2 py-1 rounded">{job.location}</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded">{job.rate}</span>
                                </div>
                                <button className="w-full bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-colors py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                    Propose Candidate <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'VENDORS' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: "TechStaffers India", domain: "Backend Engineering", size: "150+ Resources", trust: "A+", verified: true },
                            { name: "CloudWorks Partners", domain: "Cloud & DevOps", size: "45 Resources", trust: "A", verified: true },
                            { name: "DataForce Analytics", domain: "Data Science & AI", size: "80 Resources", trust: "B+", verified: false },
                        ].map((vendor, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{vendor.name}</h3>
                                    {vendor.verified && (
                                        <div className="text-emerald-500" title="Verified Partner">
                                            <ShieldCheck size={20} />
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-indigo-600 mb-2">{vendor.domain}</p>
                                <div className="flex gap-4 text-xs font-bold text-slate-600 mb-6">
                                    <span>{vendor.size}</span>
                                    <span>Trust: {vendor.trust}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-xs font-bold transition-colors">
                                        View Bench
                                    </button>
                                    <button className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold transition-colors">
                                        Partner Request
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'AI_AGENTS' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                        <div className="relative z-10 max-w-2xl">
                            <h2 className="text-2xl font-black mb-2">AI Micro-Services Marketplace</h2>
                            <p className="text-indigo-200 text-sm font-medium leading-relaxed mb-6">
                                License specialized AI agents to handle discrete recruitment workflows. Only pay for the intelligence you consume.
                            </p>
                        </div>
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { name: "Match Office", desc: "Proprietary semantic candidate matching.", price: "₹2 / match" },
                                { name: "Compliance Office", desc: "Automated document verification & checks.", price: "₹15 / verify" },
                                { name: "Intake Office", desc: "Extract requirements from unstructured emails.", price: "₹1 / req" },
                            ].map((agent, i) => (
                                <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5">
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Bot size={16} className="text-indigo-300" /> {agent.name}</h3>
                                    <p className="text-xs text-indigo-200 mb-4">{agent.desc}</p>
                                    <div className="flex justify-between items-center mt-auto">
                                        <span className="text-sm font-black text-emerald-400">{agent.price}</span>
                                        <button className="bg-white text-indigo-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors">License</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
