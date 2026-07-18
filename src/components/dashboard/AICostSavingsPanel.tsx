import React from 'react';
import { Bot, Zap } from 'lucide-react';

export function AICostSavingsPanel({ computeCost, valueGenerated, timeSavedHours }: { computeCost: number, valueGenerated: number, timeSavedHours: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-center justify-between relative z-10">
        <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-wider">
          <Bot size={16} className="text-indigo-400 animate-bounce" />
          AI COO Impact
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">Compute Cost (MTD)</span>
          <h4 className="text-xl font-black text-white">${computeCost.toLocaleString()}</h4>
          <span className="text-[9px] font-mono text-slate-400 mt-2">12,450 API Requests</span>
        </div>
        
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex flex-col justify-between shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]">
          <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold block mb-2">Value Generated</span>
          <h4 className="text-xl font-black text-emerald-400">${valueGenerated.toLocaleString()}</h4>
          <span className="text-[9px] font-mono text-indigo-300 mt-2 flex items-center gap-1"><Zap size={10} /> 40x ROI Multiplier</span>
        </div>
      </div>

      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl relative z-10 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-white">Time Saved by AI</span>
          <span className="font-mono text-emerald-400 font-bold">{timeSavedHours} Hours</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
          Equivalent to ~3 full-time sourcers. Largest savings derived from automated JD matching and email drafting.
        </p>
      </div>
    </div>
  );
}
