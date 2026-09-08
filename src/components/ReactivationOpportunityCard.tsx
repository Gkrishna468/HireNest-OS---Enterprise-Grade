import React, { useState } from 'react';
import { Sparkles, Send, Trash2, User, Briefcase, Zap, ShieldCheck, Mail, MessageSquare, PhoneCall, CheckCircle, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { ReactivationOpportunity } from '../types';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { cn } from '../lib/utils';

interface Props {
  opportunity: ReactivationOpportunity;
  onApprove: (oppId: string, customMessage?: string, channel?: 'EMAIL' | 'WHATSAPP' | 'SMS') => Promise<void>;
  onDiscard: (oppId: string) => Promise<void>;
  onOpenCandidate360?: (candidateId: string) => void;
  compact?: boolean;
}

export const ReactivationOpportunityCard: React.FC<Props> = ({
  opportunity,
  onApprove,
  onDiscard,
  onOpenCandidate360,
  compact = false
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'EMAIL' | 'WHATSAPP' | 'SMS'>(
    opportunity.recommendedChannel || 'EMAIL'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [customMessage, setCustomMessage] = useState(opportunity.messageDraft?.body || '');
  const [isSending, setIsSending] = useState(false);
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);

  const handleApprove = async () => {
    setIsSending(true);
    try {
      await onApprove(opportunity.id, customMessage, selectedChannel);
    } catch (e: any) {
      alert("Dispatch error: " + (e.message || "Failed to send outreach"));
    } finally {
      setIsSending(false);
    }
  };

  const scoreColor =
    opportunity.opportunityScore >= 80
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : opportunity.opportunityScore >= 65
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              onClick={() => onOpenCandidate360 && onOpenCandidate360(opportunity.candidateId)}
              className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-4 h-4 text-indigo-500" />
              {opportunity.candidateName || 'Candidate'}
            </span>
            <span className="text-xs text-slate-400">• Inactive {opportunity.dormantDays} days</span>
            <Badge className={cn("text-xs font-semibold px-2 py-0.5 border", scoreColor)}>
              🔥 {opportunity.opportunityScore}% Opportunity Score
            </Badge>
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            Target Role: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{opportunity.requirementTitle}</span>
            {opportunity.clientName && <span className="text-slate-400">at {opportunity.clientName}</span>}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenCandidate360 && onOpenCandidate360(opportunity.candidateId)}
          className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        >
          View 360
        </Button>
      </div>

      {/* Converging Signals Evidence Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Converging Signals ({opportunity.signals?.length || 0} Evidence Points)
          </div>
          <button
            onClick={() => setShowEvidenceDetails(!showEvidenceDetails)}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5"
          >
            {showEvidenceDetails ? "Hide" : "Details"}
            {showEvidenceDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {opportunity.signals?.map((sig, idx) => (
            <span key={idx}>
              <Badge
                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700 px-2 py-0.5"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">+{sig.weight}</span>
                {sig.type.replace(/_/g, ' ')}
              </Badge>
            </span>
          ))}
        </div>

        {showEvidenceDetails && (
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
            {opportunity.signals?.map((sig, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>• {sig.description}</span>
                <span className="text-indigo-600 font-semibold">+{sig.weight} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Outreach Draft Preview */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AI Personalised Draft ({selectedChannel})
          </span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            {isEditing ? "Save Text" : "Edit Message"}
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full text-xs p-2 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[70px]"
          />
        ) : (
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
            "{customMessage || opportunity.messageDraft?.body}"
          </p>
        )}
      </div>

      {/* Action Bar: Channel Selector & Approve / Discard */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
        {/* Channel Picker */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setSelectedChannel('EMAIL')}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all",
              selectedChannel === 'EMAIL'
                ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Mail className="w-3 h-3" /> Email
          </button>
          <button
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all",
              selectedChannel === 'WHATSAPP'
                ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <MessageSquare className="w-3 h-3" /> WhatsApp
          </button>
          <button
            onClick={() => setSelectedChannel('SMS')}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all",
              selectedChannel === 'SMS'
                ? "bg-white dark:bg-slate-900 text-sky-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <PhoneCall className="w-3 h-3" /> SMS
          </button>
        </div>

        {/* Dispatch Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDiscard(opportunity.id)}
            className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Discard
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleApprove}
            disabled={isSending}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm flex items-center gap-1.5"
          >
            {isSending ? (
              <span>Dispatching...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Approve & Dispatch
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        Protected by Communication Guard (Consent checked & Rate limited)
      </div>
    </div>
  );
};
