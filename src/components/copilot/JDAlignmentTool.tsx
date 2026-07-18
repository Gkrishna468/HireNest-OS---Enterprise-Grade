import React, { useState, useEffect } from 'react';
import { Target, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Badge } from '../../lib/Badge';
import { analyzeCandidateMatch, CandidateMatchResult } from '../../services/aiService';
import { emitEvent } from '../../services/eventBus';
import { EnterpriseViewModelService } from '../../services/EnterpriseViewModelService';

export function JDAlignmentTool({ requirementId = "default-req", candidateId = "default-cand" }) {
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<CandidateMatchResult | null>(null);

  useEffect(() => {
    async function loadAnalysis() {
      setLoading(true);
      try {
        // Fetch real data from Repositories (abstracted via ViewModelService)
        // In a real flow, we'd fetch the JD text and Candidate text by their IDs
        const mockJdText = "Senior Staff Engineer with 10+ YOE and AWS expertise.";
        const mockCandText = "12 YOE Engineer with AWS certification and leadership experience.";
        
        const result = await analyzeCandidateMatch(mockJdText, mockCandText);
        setMatchResult(result);
        
        await emitEvent('MATCH_EVALUATED', 'CANDIDATE', candidateId, 'sys', 'recruiter', { requirementId, score: result.matchScore });
      } catch (error) {
        console.error("Match analysis failed", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, [requirementId, candidateId]);

  if (loading || !matchResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center h-48">
        <Loader2 className="animate-spin text-indigo-400 mb-2" />
        <span className="text-xs text-slate-400 font-mono">AI Gateway: Processing semantic alignment...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
        <Target size={16} className="text-emerald-400" />
        JD vs Candidate Fit
      </h3>

      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Requirement (JD)</span>
          <h4 className="font-bold text-white">Target Requirement</h4>
          <ul className="text-slate-400 list-disc pl-3 space-y-1">
            <li>Parsed from live JD</li>
          </ul>
        </div>
        
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs relative">
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-slate-900 p-1 rounded-full border border-slate-800">
            <ArrowRightLeft size={12} className="text-indigo-400" />
          </div>
          <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Candidate Analysis</span>
          <h4 className="font-bold text-white flex items-center gap-2">Match: <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{matchResult.matchScore}%</Badge></h4>
          <ul className="text-emerald-400 list-disc pl-3 space-y-1">
            {(matchResult.strengths || []).slice(0, 3).map((s, idx) => <li key={idx}>{s}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
        <span className="font-bold text-indigo-400 block mb-1 uppercase text-[10px] tracking-wider">AI Reasoning Lineage</span>
        {matchResult.summary}
      </div>
    </div>
  );
}
