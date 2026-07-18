import React from 'react';
import { Briefcase, BarChart2 } from 'lucide-react';
import { Badge } from '../../lib/Badge';

export function VendorIntelligencePanel({ vendors }: { vendors: any[] }) {

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-wider">
          <Briefcase size={16} className="text-amber-400" />
          Vendor Intelligence
        </h3>
      </div>

      <div className="space-y-3">
        {vendors.map((v, i) => (
          <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">{v.name}</span>
              <Badge className={`text-[9px] font-mono border ${
                v.trust === 'High' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                v.trust === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                Trust: {v.trust}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/50">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Placement Rate</span>
                <span className="text-xs font-bold text-slate-200">{v.placementRate}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Active Submits</span>
                <span className="text-xs font-bold text-indigo-400">{v.active} Candidates</span>
              </div>
            </div>

            {v.aiInsight && (
              <div className="mt-3 pt-3 border-t border-slate-800/50">
                <span className="text-[9px] font-mono text-indigo-400 uppercase block mb-1 flex items-center gap-1">
                  <BarChart2 size={10} /> AI Insight
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">{v.aiInsight}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
