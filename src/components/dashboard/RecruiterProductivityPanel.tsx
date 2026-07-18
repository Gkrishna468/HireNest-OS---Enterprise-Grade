import React from 'react';
import { Users, Target, Clock } from 'lucide-react';
import { Badge } from '../../lib/Badge';

export function RecruiterProductivityPanel({ velocity, totalPlacements, recruiters }: { velocity: number, totalPlacements: number, recruiters: any[] }) {

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-wider">
          <Users size={16} className="text-indigo-400" />
          Productivity & Velocity
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
          <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold block">Avg Hiring Velocity</span>
          <h4 className="text-lg font-black text-white mt-1">{velocity} Days</h4>
        </div>
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Total Placements</span>
          <h4 className="text-lg font-black text-white mt-1">{totalPlacements} This Month</h4>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Top Performers</span>
        {recruiters.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <div>
              <span className="text-xs font-bold text-white block">{r.name}</span>
              <span className="text-[9px] font-mono text-slate-400">{r.placements} Placements • Avg {r.velocity}</span>
            </div>
            <Badge className="bg-slate-800 border-slate-700 text-amber-400 text-[10px] font-mono font-bold">
              {r.score} KPI
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
