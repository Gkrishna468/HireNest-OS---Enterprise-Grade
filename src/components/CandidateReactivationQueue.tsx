import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Zap, ShieldCheck, Filter, ArrowUpRight } from 'lucide-react';
import { useReactivationStore } from '../stores/ReactivationStore';
import { ReactivationOpportunityCard } from './ReactivationOpportunityCard';
import { Button } from '../lib/Button';
import { Badge } from '../lib/Badge';

interface Props {
  role?: 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'ADMIN';
  orgId?: string;
  onOpenCandidate360?: (candidateId: string) => void;
  title?: string;
}

export const CandidateReactivationQueue: React.FC<Props> = ({
  role = 'RECRUITER',
  orgId = '',
  onOpenCandidate360,
  title = 'Candidate Reactivation Opportunities'
}) => {
  const {
    opportunities,
    loading,
    error,
    fetchOpportunities,
    runScan,
    approveOpportunity,
    discardOpportunity
  } = useReactivationStore();

  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchOpportunities(role as 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'ADMIN', orgId);
  }, [role, orgId, fetchOpportunities]);

  const filtered = opportunities.filter((o) => {
    if ((o.opportunityScore || 0) < minScoreFilter) return false;
    if (channelFilter !== 'ALL' && o.recommendedChannel !== channelFilter) return false;
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
      {/* Queue Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              {title}
            </span>
            <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[10px]">
              {filtered.length} Qualified
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Turning dormant candidate database records into active revenue pipelines using 8-signal converging evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runScan()}
            disabled={loading}
            className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Scan Database
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-xs text-slate-400 font-medium mr-1">Min Score:</span>
          {[50, 65, 80].map((score) => (
            <button
              key={score}
              onClick={() => setMinScoreFilter(score)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-semibold ${
                minScoreFilter === score
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {score}%+
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {['ALL', 'WHATSAPP', 'EMAIL', 'SMS'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`text-[11px] px-2 py-0.5 rounded font-mono transition-all ${
                channelFilter === ch
                  ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Evaluating 8-signal evidence across database records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          <Zap className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-400">No active reactivation opportunities matching filter.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Click "Scan Database" to execute 8-signal intelligence check across candidates & live requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map((opp) => (
            <ReactivationOpportunityCard
              key={opp.id}
              opportunity={opp}
              onApprove={approveOpportunity}
              onDiscard={discardOpportunity}
              onOpenCandidate360={onOpenCandidate360}
            />
          ))}
        </div>
      )}
    </div>
  );
};
