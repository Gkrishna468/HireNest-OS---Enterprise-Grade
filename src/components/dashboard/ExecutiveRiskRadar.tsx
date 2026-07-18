import React from "react"; 
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '../../lib/Button';

export function ExecutiveRiskRadar({ risks }: { risks: any[] }) {

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-rose-400 flex items-center gap-2 uppercase tracking-wider">
          <ShieldAlert size={16} />
          Executive Risk Radar
        </h3>
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {risks.map((r, i) => (
          <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
            <div className={`mt-1 ${r.severity === 'Critical' ? 'text-rose-500' : r.severity === 'High' ? 'text-amber-500' : 'text-slate-400'}`}>
              <AlertTriangle size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white">{r.entity}</span>
                <span className="text-[8px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">{r.type}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full text-[10px] font-mono uppercase tracking-widest border-rose-500/20 text-rose-400 hover:bg-rose-500/10 h-10 mt-4">
        Run Automated Mitigation
      </Button>
    </div>
  );
}
