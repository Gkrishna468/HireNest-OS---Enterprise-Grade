import React from 'react';
import { DollarSign, TrendingUp, Activity } from 'lucide-react';
import { Badge } from '../../lib/Badge';

export function RevenuePipelinePanel({ revenueToday, pipelineValue, targetProgress }: { revenueToday: number, pipelineValue: number, targetProgress: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-wider">
          <DollarSign size={16} className="text-emerald-400" />
          Financial & Pipeline
        </h3>
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">LIVE</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">Revenue Today</span>
          <div className="flex items-end gap-2">
            <h4 className="text-2xl font-black text-white">${revenueToday.toLocaleString()}</h4>
            <span className="text-xs text-emerald-400 font-bold flex items-center mb-1"><TrendingUp size={12} className="mr-0.5" /> +12%</span>
          </div>
        </div>
        
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-1">Pipeline Value</span>
          <div className="flex items-end gap-2">
            <h4 className="text-2xl font-black text-white">${pipelineValue.toLocaleString()}</h4>
            <span className="text-xs text-indigo-400 font-bold flex items-center mb-1"><Activity size={12} className="mr-0.5" /> Active</span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
          <span>Target Progress ($2M)</span>
          <span className="text-white">{Math.round(targetProgress)}%</span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${targetProgress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
