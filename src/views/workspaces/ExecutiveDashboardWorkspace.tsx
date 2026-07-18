import React, { useState, useEffect } from "react";
import { getDynamicGreeting } from "../../lib/greetings";
import { Activity, Loader2 } from "lucide-react";
import { RevenuePipelinePanel } from "../../components/dashboard/RevenuePipelinePanel";
import { RecruiterProductivityPanel } from "../../components/dashboard/RecruiterProductivityPanel";
import { VendorIntelligencePanel } from "../../components/dashboard/VendorIntelligencePanel";
import { AICostSavingsPanel } from "../../components/dashboard/AICostSavingsPanel";
import { ExecutiveRiskRadar } from "../../components/dashboard/ExecutiveRiskRadar";
import { fetchExecutiveDashboardMetrics, DashboardMetrics } from "../../services/dashboardService";

export default function ExecutiveDashboardWorkspace({ userName }: { userName: string }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchExecutiveDashboardMetrics();
        setMetrics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto text-slate-100 font-sans pb-16">
      
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-8 py-8 relative overflow-hidden shrink-0 border-b border-slate-800">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">AI COO Dashboard (HN-009)</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              {getDynamicGreeting()}, {userName}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" />
              Executive Intelligence Layer active: Live Firestore Sync
            </p>
          </div>
        </div>
      </div>

      {/* Flagship Dashboard Grid */}
      <div className="flex-1 p-8">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-indigo-400 gap-3 animate-pulse">
              <Loader2 size={32} className="animate-spin" />
              <span className="text-xs font-mono uppercase tracking-widest">Aggregating Enterprise State...</span>
            </div>
          ) : !metrics ? (
            <div className="flex flex-col items-center justify-center h-64 text-rose-400 gap-3">
              <span className="text-xs font-mono uppercase tracking-widest">Failed to load live data</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              <div className="lg:col-span-4">
                <RevenuePipelinePanel 
                  revenueToday={metrics.revenueToday} 
                  pipelineValue={metrics.pipelineValue}
                  targetProgress={metrics.revenueTargetProgress} 
                />
              </div>
              
              <div className="lg:col-span-4">
                <AICostSavingsPanel 
                  computeCost={metrics.computeCostMTD}
                  valueGenerated={metrics.valueGenerated}
                  timeSavedHours={metrics.timeSavedHours}
                />
              </div>

              <div className="lg:col-span-4">
                <ExecutiveRiskRadar risks={metrics.risks} />
              </div>

              <div className="lg:col-span-7 mt-2">
                <RecruiterProductivityPanel 
                  velocity={metrics.avgHiringVelocityDays}
                  totalPlacements={metrics.totalPlacementsMonth}
                  recruiters={metrics.topRecruiters}
                />
              </div>

              <div className="lg:col-span-5 mt-2">
                <VendorIntelligencePanel vendors={metrics.vendors} />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
