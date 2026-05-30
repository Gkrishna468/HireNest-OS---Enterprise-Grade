import React, { useEffect, useState } from "react";
import { Activity, ShieldAlert, Zap, TrendingUp, AlertTriangle, Layers } from "lucide-react";
import { cn } from "../lib/utils";

export default function OperationalHealthTab({ userRole, orgId, userId }: { userRole: string, orgId: string, userId: string }) {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    // Only load if HQ admin
    if (userRole !== 'admin' && userRole !== 'hq_admin' && userRole !== 'super_admin' && userRole !== 'ops_admin') {
      setLoading(false);
      return;
    }

    fetch(`/api/analytics/hq-health?orgId=${orgId}&userId=${userId}&role=${userRole}`)
      .then(r => r.json())
      .then(data => {
        setHealthData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Health fetch error:", err);
        setLoading(false);
      });
  }, [userRole, orgId, userId]);

  const isAdmin = ['admin', 'super_admin', 'hq_admin', 'ops_admin'].includes(userRole);

  if (!isAdmin) {
    return (
       <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
         Restricted. HQ Clearance Required.
       </div>
    );
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Loading Platform Health...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-500 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(99,102,241,1)]">
            HQ Platform Health
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Zap size={14} className="text-indigo-500" /> Control Tower Dashboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HealthCard 
          title="Event Throughput" 
          value={healthData?.eventThroughput || 0} 
          subtitle="Events Processed (last 500)"
          icon={<Activity />}
          trend="optimal"
        />
        <HealthCard 
          title="Submission Velocity" 
          value={healthData?.submissionVelocity || 0} 
          subtitle="Active Submissions In Flight"
          icon={<TrendingUp />}
          trend="optimal"
        />
        <HealthCard 
          title="Deal Room Growth" 
          value={healthData?.dealRoomGrowth || 0} 
          subtitle="Active Deal Rooms Launched"
          icon={<Layers />}
          trend="optimal"
        />
        
        {/* Warning Metrics */}
        <HealthCard 
          title="Failed AI Parses" 
          value={healthData?.failedAIParses || 0} 
          subtitle="Resume extraction errors"
          icon={<ShieldAlert />}
          trend={healthData?.failedAIParses > 0 ? "warning" : "optimal"}
        />
        <HealthCard 
          title="Failed Matches" 
          value={healthData?.failedMatches || 0} 
          subtitle="Vector matching failures"
          icon={<AlertTriangle />}
          trend={healthData?.failedMatches > 0 ? "warning" : "optimal"}
        />
        <HealthCard 
          title="System Errors" 
          value={healthData?.systemErrors || 0} 
          subtitle="General operational exceptions"
          icon={<Zap />}
          trend={healthData?.systemErrors > 0 ? "critical" : "optimal"}
        />
      </div>

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Event Retention Strategy & Architecture</h3>
        <p className="text-sm text-slate-600 mb-2"><strong>Architecture:</strong> Operational Event Bus</p>
        <p className="text-sm text-slate-600 mb-2"><strong>Schema Versioning:</strong> v1 Active (all events support `eventVersion` property)</p>
        <p className="text-sm text-slate-600 mb-2"><strong>Correlation IDs:</strong> Enforced at emit source.</p>
        <p className="text-sm text-slate-600 mb-2"><strong>Immutability Constraints:</strong> Append-Only Policy applied via Firestore Rules.</p>
        <p className="text-sm text-slate-600"><strong>Scale Plan:</strong> Ready to migrate to partition-based BigQuery archival upon reaching 1M events.</p>
      </div>

    </div>
  );
}

function HealthCard({ title, value, subtitle, icon, trend }: { title: string, value: number, subtitle: string, icon: React.ReactNode, trend: 'optimal' | 'warning' | 'critical' }) {
  const trendColor = trend === 'optimal' ? 'text-emerald-500' : (trend === 'warning' ? 'text-amber-500' : 'text-rose-500');
  const bgColor = trend === 'optimal' ? 'bg-emerald-50' : (trend === 'warning' ? 'bg-amber-50' : 'bg-rose-50');
  const borderColor = trend === 'optimal' ? 'border-emerald-100' : (trend === 'warning' ? 'border-amber-100' : 'border-rose-100');

  return (
    <div className={cn("p-6 rounded-2xl border shadow-sm transition-all", bgColor, borderColor)}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", trendColor, "bg-white shadow-sm")}>
           {icon}
        </div>
        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white shadow-sm", trendColor)}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="text-3xl font-black text-slate-800 my-1">{value}</div>
        <p className="text-xs font-medium text-slate-500 max-w-[200px]">{subtitle}</p>
      </div>
    </div>
  );
}
