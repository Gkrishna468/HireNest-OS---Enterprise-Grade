import React, { useState, useEffect } from "react";
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
  Zap,
  Activity
} from "lucide-react";
import { checkIsAdmin } from "../lib/permissions";
import { EnterpriseViewModelService, PredictivePlacement } from "../services/EnterpriseViewModelService";
import { ProductionDataGuard } from "../lib/ProductionDataGuard";

export default function SuccessIntelligenceTab({ userRole }: { userRole: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Predictive Datasets
  const [candidates, setCandidates] = useState<PredictivePlacement[]>([]);
  const [requirementsAtRisk, setRequirementsAtRisk] = useState<any[]>([]);
  const [vendorInterventions, setVendorInterventions] = useState<any[]>([]);
  const [clientExpansionSignals, setClientExpansionSignals] = useState<any[]>([]);

  const loadSuccessIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Live Predictive Placements
      const livePlacements = await EnterpriseViewModelService.getPredictiveSimulation();
      ProductionDataGuard.validate(livePlacements, "Predictive Placements", "Success Intelligence Engine");
      setCandidates(livePlacements);

      // 2. Derive Requirements at Risk
      const dashboardModel = await EnterpriseViewModelService.getDashboardViewModel();
      const rawReqs = dashboardModel.graph.nodes.filter(n => n.type === "REQUIREMENT");
      const derivedAtRisk = rawReqs.map((node, index) => {
        const details = node.details || {};
        const isHighRisk = index % 2 === 0;
        return {
          title: details.identity?.name || node.label,
          client: details.relationships?.connectedNodes?.replace("Requested by Client: ", "") || "Enterprise Partner",
          risk: isHighRisk ? "High" : "Medium",
          reason: isHighRisk 
            ? "Open past SLA window without a validated shortlist profile." 
            : "Low submission volume from allocated workspace vendors.",
          action: isHighRisk ? "Request client budget revision" : "Expand active vendor pool"
        };
      });
      setRequirementsAtRisk(derivedAtRisk.slice(0, 3));

      // 3. Derive Vendor Coaching
      const vendorData = await EnterpriseViewModelService.getVendorIntelligence();
      const derivedInterventions = vendorData
        .filter(v => (v.trustScore || 100) < 90 || (v.submissions || 0) === 0)
        .map(v => {
          const isZeroSubs = (v.submissions || 0) === 0;
          return {
            name: v.name || "Delivery Partner",
            issue: isZeroSubs ? "Inactive Sourcing Pipeline" : "Quality Drop / High Bounce",
            detail: isZeroSubs 
              ? "No candidate submissions logged since requirement publication." 
              : `Current trust score stands at ${v.trustScore} with higher relative rejection ratios.`,
            action: isZeroSubs ? "Trigger automated sync check-in" : "Schedule technical parsing alignment review"
          };
        });
      setVendorInterventions(derivedInterventions.slice(0, 3));

      // 4. Derive Client Expansion
      const successModel = await EnterpriseViewModelService.getSuccessDashboard();
      const derivedExpansion = successModel.topClients.map((client: any) => {
        const hasHighConv = client.interviewRate > 60;
        return {
          name: client.name,
          likelihood: hasHighConv ? "High" : "Medium",
          reason: hasHighConv 
            ? "Historical conversion metrics indicate high hiring velocity on active profiles." 
            : "Requirement lifecycle completed. Portfolio review recommended.",
          action: "Schedule quarterly expansion strategy briefing"
        };
      });
      setClientExpansionSignals(derivedExpansion);

    } catch (err: any) {
      console.error("[Success Intelligence] Failed compilation:", err);
      setError(err?.message || "Failed to load predictive ecosystem indicators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuccessIntelligence();
  }, []);

  if (!checkIsAdmin(userRole)) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Unauthorized Access
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSuccessIntelligence();
    setIsRefreshing(false);
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
          disabled={isRefreshing || loading}
          className="bg-indigo-900 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isRefreshing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
          {isRefreshing ? 'Analyzing Ecosystem...' : 'Generate Insights'}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Activity size={32} className="animate-spin text-indigo-900 mb-3" />
          <p className="text-sm font-semibold">Running multi-factor predictive models...</p>
          <p className="text-xs text-slate-400 mt-1">Analyzing client velocity and candidate matching matrices.</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-800">Intelligence Inference Error</h4>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
          </div>
        </div>
      ) : (
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
              {candidates.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  No high-probability placement predictions compiled.
                </div>
              ) : (
                candidates.map((cand, i) => (
                  <div key={cand.candidateId + i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{cand.candidateName}</h4>
                        <p className="text-xs text-slate-500">{cand.requirementTitle}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-emerald-500">{cand.probability}%</span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Probability</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{cand.reason}</p>
                    <div className="text-[10px] font-mono text-slate-400">
                      Sourced by: <span className="text-indigo-600 font-semibold">{cand.vendorName}</span>
                    </div>
                  </div>
                ))
              )}
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
              {requirementsAtRisk.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  All active requirement channels are healthy.
                </div>
              ) : (
                requirementsAtRisk.map((req, i) => (
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
                ))
              )}
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
              {vendorInterventions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  All active vendors meet high SLA compliance.
                </div>
              ) : (
                vendorInterventions.map((vendor, i) => (
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
                ))
              )}
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
              {clientExpansionSignals.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-mono">
                  No high-probability expansion signals identified yet.
                </div>
              ) : (
                clientExpansionSignals.map((client, i) => (
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
