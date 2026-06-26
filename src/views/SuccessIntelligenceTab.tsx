import React, { useState } from "react";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  UserCheck, 
  Building2, 
  Briefcase, 
  Target,
  ArrowRight,
  RefreshCw,
  Zap
} from "lucide-react";
import { cn } from "../lib/utils";

export default function SuccessIntelligenceTab({ userRole }: { userRole: string }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const predictions = {
      candidates: [
          { name: 'Sarah Jenkins', role: 'Sr. Backend Engineer', probability: 92, reason: 'Strong interview feedback on system design; client urgently hiring.', action: 'Schedule final round' },
          { name: 'Michael Chen', role: 'React Developer', probability: 88, reason: 'Matched 100% of required skills; vendor has 95% offer rate with this client.', action: 'Push for fast-track interview' }
      ],
      vendors: [
          { name: 'TechSource Staffing', issue: 'Submission Quality Drop', detail: 'Last 5 submissions rejected at resume screening.', action: 'Send coaching on JD parsing' },
          { name: 'GlobalTalent Inc', issue: 'SLA Breach Risk', detail: 'Average response time increased to 48hrs.', action: 'Automated check-in email' }
      ],
      clients: [
          { name: 'Fintech Solutions', likelihood: 'High', reason: 'Historical trend: Q3 hiring spike; just closed Series B.', action: 'Proactive account management call' },
          { name: 'HealthCorp', likelihood: 'Medium', reason: '3 consecutive requirements filled quickly.', action: 'Send market insights report' }
      ],
      requirements: [
          { title: 'Principal Data Scientist', client: 'RetailGenius', risk: 'High', reason: 'Open > 30 days, salary band below market average.', action: 'Request margin increase or renegotiate' },
          { title: 'DevOps Lead', client: 'CloudNative', risk: 'Medium', reason: 'Low vendor submission volume.', action: 'Expand vendor broadcast pool' }
      ]
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Unauthorized Access
      </div>
    );
  }

  const handleRefresh = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-900 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(30,58,138,1)]">
            Success Intelligence
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Brain size={14} className="text-indigo-900" /> Predictive Outcomes & Recommendations
          </p>
        </div>
        <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-indigo-900 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
            {isRefreshing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            {isRefreshing ? 'Analyzing Ecosystem...' : 'Generate Insights'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidates & Placements */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-emerald-500" />
                      High Probability Placements
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-black">AI PREDICTION</span>
              </h3>
              <div className="space-y-4 flex-1">
                  {predictions.candidates.map((cand, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{cand.name}</h4>
                                  <p className="text-xs text-slate-500">{cand.role}</p>
                              </div>
                              <div className="flex flex-col items-end">
                                  <span className="text-lg font-black text-emerald-500">{cand.probability}%</span>
                                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Probability</span>
                              </div>
                          </div>
                          <p className="text-xs text-slate-600 mb-3">{cand.reason}</p>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2">
                              {cand.action} <ArrowRight size={14} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Requirements at Risk */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-rose-500" />
                      Requirements at Risk
                  </div>
                  <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-black">ACTION NEEDED</span>
              </h3>
              <div className="space-y-4 flex-1">
                  {predictions.requirements.map((req, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl border-l-4 border-l-rose-500">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{req.title}</h4>
                                  <p className="text-xs text-slate-500">{req.client}</p>
                              </div>
                              <span className="text-[10px] uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                                  {req.risk} Risk
                              </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-3">{req.reason}</p>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors flex items-center justify-center gap-2">
                              {req.action} <ArrowRight size={14} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Vendor Coaching */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Target size={16} className="text-amber-500" />
                      Vendor Coaching Opportunities
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-black">INTERVENTION</span>
              </h3>
              <div className="space-y-4 flex-1">
                  {predictions.vendors.map((vendor, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <h4 className="font-bold text-slate-800 text-sm mb-1">{vendor.name}</h4>
                          <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle size={14} className="text-amber-500" />
                              <span className="text-xs font-bold text-amber-600">{vendor.issue}</span>
                          </div>
                          <p className="text-xs text-slate-600 mb-3">{vendor.detail}</p>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                              {vendor.action} <ArrowRight size={14} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Client Expansion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-blue-500" />
                      Client Expansion Signals
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black">GROWTH</span>
              </h3>
              <div className="space-y-4 flex-1">
                  {predictions.clients.map((client, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800 text-sm">{client.name}</h4>
                              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  <TrendingUp size={12} /> {client.likelihood} Likelihood
                              </div>
                          </div>
                          <p className="text-xs text-slate-600 mb-3">{client.reason}</p>
                          <button className="w-full py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center gap-2">
                              {client.action} <ArrowRight size={14} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}
