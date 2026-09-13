import React, { useState, useEffect } from "react";
import {
  X,
  Link,
  Copy,
  Check,
  Share2,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Users,
  Briefcase,
  MapPin,
  Clock
} from "lucide-react";
import { Button } from "../../lib/Button";
import { Badge } from "../../lib/Badge";
import { CandidateJobFeedService } from "../../services/candidateJobFeedService";
import { auth } from "../../lib/firebase";

interface ShareDirectCandidateModalProps {
  job: any;
  onClose: () => void;
  userRole?: string;
}

export default function ShareDirectCandidateModal({
  job,
  onClose,
  userRole = "recruiter"
}: ShareDirectCandidateModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const createInvite = async () => {
      try {
        setIsGenerating(true);
        const user = auth.currentUser;
        const res = await CandidateJobFeedService.generateDirectCandidateInvite({
          requirementId: job.id || job.requirementId,
          requirementTitle: job.title || job.role || "Open Requirement",
          createdByUserId: user?.uid || "hq-recruiter",
          createdByRole: userRole
        });
        if (isMounted) {
          setInviteUrl(res.inviteUrl);
          setToken(res.token);
        }
      } catch (err) {
        console.error("Failed to generate direct candidate invite link:", err);
        // Fallback direct URL format
        const origin = typeof window !== "undefined" ? window.location.origin : "https://hirenestos.com";
        const fallbackUrl = `${origin}/candidate/apply/${job.id || job.requirementId}`;
        if (isMounted) {
          setInviteUrl(fallbackUrl);
        }
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    createInvite();
    return () => {
      isMounted = false;
    };
  }, [job, userRole]);

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const emailSubject = `Job Opportunity: ${job.title || job.role} (${job.location || "Onsite, India"})`;
  const emailBody = `Hi,

You are invited to apply for the following opportunity at HireNest:

Role: ${job.title || job.role}
Location: ${job.location || "Onsite"}
Type: Full-Time (FTE) • Onsite
Required Skills: ${Array.isArray(job.skills) ? job.skills.join(", ") : job.skills || "Relevant domain skills"}

Click the link below to review details and submit your application:
${inviteUrl}

Best regards,
HireNest Talent Acquisition Team`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hi! You have been invited to apply for *${job.title || job.role}* at *${job.location || "Onsite"}* (FTE • Onsite).\n\nApply directly here: ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Share with Direct Candidate</h3>
              <p className="text-xs text-indigo-200/80">Generate secure candidate direct application link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target Job Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">{job.title || job.role}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.location || "Onsite, India"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    FTE • Onsite
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs shrink-0">
                Direct Apply
              </Badge>
            </div>
          </div>

          {/* Access Model Callout */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 leading-relaxed">
              <strong>Direct Link Access:</strong> This private link allows a candidate to apply for this specific role even if public candidate feed visibility is turned off. Internal CRM vendor and client commercial data remain strictly hidden.
            </p>
          </div>

          {/* Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Candidate Direct Apply Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 truncate select-all">
                {isGenerating ? "Generating secure token..." : inviteUrl}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                disabled={isGenerating || !inviteUrl}
                className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Fast Sharing Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              disabled={isGenerating || !inviteUrl}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Share on WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyEmail}
              disabled={isGenerating || !inviteUrl}
              className="flex-1 flex items-center justify-center gap-2 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Email Copied!
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-slate-500" />
                  Copy Email Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Token valid for 30 days</span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
