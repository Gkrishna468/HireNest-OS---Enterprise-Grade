import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  FileText,
  DollarSign,
  History,
  Bot
} from "lucide-react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { checkIsAdmin } from "../lib/permissions";

export default function HumanApprovalCenterTab({ userRole }: { userRole: string }) {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingApprovals = [
      { id: 'app-1', type: 'OFFER', title: 'Offer Release: Jane Doe', desc: 'SDE II at Google - $145k Base', requester: 'Autonomous Ops', time: '10 mins ago', risk: 'low' },
      { id: 'app-2', type: 'INVOICE', title: 'Invoice Generation: PL-882', desc: '$25,000 Placement Fee for TechSource', requester: 'Finance Agent', time: '1 hour ago', risk: 'low' },
      { id: 'app-3', type: 'VENDOR', title: 'Vendor Onboarding: Nova Staffing', desc: 'Compliance checks passed, awaiting final sign-off', requester: 'Compliance Checker', time: '2 hours ago', risk: 'medium' },
      { id: 'app-4', type: 'ESCALATION', title: 'Requirement Escalation: Senior PM', desc: 'Open > 30 days, requesting 20% margin increase', requester: 'Ops Agent', time: '5 hours ago', risk: 'high' }
  ];

  if (!checkIsAdmin(userRole)) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Unauthorized Access
      </div>
    );
  }

  const getIcon = (type: string) => {
      switch (type) {
          case 'OFFER': return <UserCheck className="text-emerald-500" />;
          case 'INVOICE': return <DollarSign className="text-indigo-500" />;
          case 'VENDOR': return <ShieldCheck className="text-amber-500" />;
          case 'ESCALATION': return <AlertTriangle className="text-rose-500" />;
          default: return <FileText className="text-slate-500" />;
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-900 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(30,58,138,1)]">
            Approval Center
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-indigo-900" /> Human-in-the-Loop Governance
          </p>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('pending')}
            className={cn("px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2", activeTab === 'pending' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
            Pending (4)
        </button>
        <button 
            onClick={() => setActiveTab('history')}
            className={cn("px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2", activeTab === 'history' ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
            History
        </button>
      </div>

      {activeTab === 'pending' && (
          <div className="grid grid-cols-1 gap-4">
              {pendingApprovals.map(app => (
                  <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                              {getIcon(app.type)}
                          </div>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm font-bold text-slate-800">{app.title}</h3>
                                  {app.risk === 'high' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">High Risk</span>}
                              </div>
                              <p className="text-sm text-slate-500 mb-2">{app.desc}</p>
                              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><Bot size={12} /> {app.requester}</span>
                                  <span className="flex items-center gap-1"><Clock size={12} /> {app.time}</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors">
                              <XCircle size={16} /> Reject
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-sm transition-colors">
                              <CheckCircle2 size={16} /> Approve
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <History size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="font-bold">No recent history</p>
          </div>
      )}

    </div>
  );
}
