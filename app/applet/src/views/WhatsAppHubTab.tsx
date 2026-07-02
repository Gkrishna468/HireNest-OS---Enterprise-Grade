import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, Zap, Activity, Users, CheckCircle, Share2, FileText, 
  ImageIcon, FileAudio, AlertCircle, Bot, Mail, Globe, Settings, Eye, Check
} from 'lucide-react';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';

export default function WhatsAppHubTab() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REVIEW_QUEUE' | 'TIMELINE' | 'BROADCASTS'>('OVERVIEW');
  const [status, setStatus] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch('/api/whatsapp/status').then(res => res.json()).then(setStatus);
    fetch('/api/whatsapp/metrics').then(res => res.json()).then(setMetrics);
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#F8FAFC]">
      <header className="p-6 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <MessageCircle size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">WhatsApp Connector</h1>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  {status ? status.status : 'Connecting...'}
                </span>
                • {status ? status.phone : ''} • Last Sync: {status ? new Date(status.lastSync).toLocaleTimeString() : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 font-bold border-none">
              <Settings size={16} className="mr-2" /> Connection Settings
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-2">
              <Zap size={16} /> Simulate Message
            </Button>
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <MetricCard label="Messages" value={metrics.messagesToday} />
            <MetricCard label="Profiles" value={metrics.profilesParsed} color="blue" />
            <MetricCard label="Requirements" value={metrics.requirementsParsed} color="purple" />
            <MetricCard label="Voice Notes" value={metrics.voiceNotes} color="orange" />
            <MetricCard label="OCR Images" value={metrics.ocrImages} color="indigo" />
            <MetricCard label="Duplicates" value={metrics.duplicates} color="slate" />
            <MetricCard label="Manual Review" value={metrics.manualReview} color="red" />
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Automation</span>
              <span className="text-xl font-black text-emerald-900">{metrics.automationSuccess}%</span>
            </div>
          </div>
        )}
      </header>

      <div className="flex border-b border-slate-200 bg-white px-6">
        {[
          { id: 'OVERVIEW', label: 'Hub Overview' },
          { id: 'REVIEW_QUEUE', label: 'Universal Manual Review' },
          { id: 'TIMELINE', label: 'Live AI Timeline' },
          { id: 'BROADCASTS', label: 'Broadcasts Analytics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-5 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-green-500 text-green-700"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'OVERVIEW' && <HubOverviewView />}
        {activeTab === 'REVIEW_QUEUE' && <UniversalReviewQueue />}
        {activeTab === 'TIMELINE' && <TimelineView />}
        {activeTab === 'BROADCASTS' && <BroadcastsAnalyticsView />}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "slate" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className={cn("p-3 rounded-2xl border flex flex-col justify-center", `bg-${color}-50 border-${color}-100`)}>
      <span className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", `text-${color}-600`)}>{label}</span>
      <span className={cn("text-xl font-black", `text-${color}-900`)}>{value}</span>
    </div>
  );
}

function HubOverviewView() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Attachment Intelligence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col items-center text-center">
            <FileText size={32} className="text-blue-500 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">Documents</h4>
            <p className="text-xs text-slate-500 mb-4">PDF, DOCX mapped to candidates or JDs.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col items-center text-center">
            <ImageIcon size={32} className="text-indigo-500 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">OCR Images</h4>
            <p className="text-xs text-slate-500 mb-4">JD screenshots automatically extracted.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex flex-col items-center text-center">
            <FileAudio size={32} className="text-orange-500 mb-3" />
            <h4 className="font-bold text-slate-800 mb-1">Voice Notes</h4>
            <p className="text-xs text-slate-500 mb-4">Transcribed and matched to intents.</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
        <Globe size={48} className="text-slate-200 mb-4" />
        <h3 className="text-lg font-black text-slate-800 mb-2">Business Graph</h3>
        <p className="text-sm text-slate-500">Every message automatically updates Vendor360, Client360, and Candidate360 without manual data entry.</p>
      </div>
    </div>
  );
}

function UniversalReviewQueue() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" /> Action Required (12)
        </h3>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <ReviewItem 
          source="GMAIL" 
          sourceIcon={<Mail size={16}/>} 
          title="Potential Client Requirement" 
          desc="Email from unknown domain containing JD attachment." 
          issue="Confidence 81% - Needs verification." 
          action="Approve & Create REQ" 
        />
        <ReviewItem 
          source="WHATSAPP" 
          sourceIcon={<MessageCircle size={16}/>} 
          title="Unregistered Number" 
          desc="Sent 3 React profiles. Content looks like a Vendor submission." 
          issue="Vendor Unknown in Business Graph." 
          action="Merge with Vendor360" 
          color="green"
        />
        <ReviewItem 
          source="WEBSITE" 
          sourceIcon={<Globe size={16}/>} 
          title="Inbound Lead: ACME Corp" 
          desc="Submitted contact form." 
          issue="Duplicate Client Detected (ACME LLC)." 
          action="Resolve Duplicate" 
          color="blue"
        />
        <ReviewItem 
          source="WHATSAPP" 
          sourceIcon={<MessageCircle size={16}/>} 
          title="Voice Note Transcription" 
          desc="'We need three data engineers with Databricks experience immediately'" 
          issue="Missing salary/location data to create Requirement." 
          action="Request Details via Broadcast" 
          color="green"
        />
        <ReviewItem 
          source="CSV" 
          sourceIcon={<FileText size={16}/>} 
          title="Bulk Candidate Upload" 
          desc="Row 42: John Doe" 
          issue="Missing Email Address." 
          action="Fix Manually" 
          color="slate"
        />
      </div>
    </div>
  );
}

function ReviewItem({ source, sourceIcon, title, desc, issue, action, color="slate" }: any) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between bg-white hover:border-slate-300 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", `bg-${color}-100 text-${color}-700`)}>
          {sourceIcon}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900">{title}</span>
            <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] uppercase font-black tracking-widest">{source}</Badge>
          </div>
          <p className="text-sm text-slate-600 mb-1">{desc}</p>
          <p className="text-xs font-bold text-red-500">{issue}</p>
        </div>
      </div>
      <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 font-bold shadow-sm whitespace-nowrap">
        {action}
      </Button>
    </div>
  );
}

function TimelineView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-[600px] overflow-y-auto">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">AI Execution Path</h3>
      <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
        {[
          { time: '10:45 AM', title: 'Recruiter Queue Updated', desc: 'Candidates prioritized in active pipeline view.', icon: Eye, color: 'text-indigo-500', bg: 'bg-indigo-100' },
          { time: '10:44 AM', title: 'Matching Started', desc: 'Triggered global requirement matching for 3 profiles.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100' },
          { time: '10:44 AM', title: 'Business Graph Updated', desc: 'Vendor credibility score recalculated.', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-100' },
          { time: '10:43 AM', title: 'Vendor360 Updated', desc: 'Logged interaction and submission volume.', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-100' },
          { time: '10:43 AM', title: '3 Resumes Parsed', desc: 'Universal Intake extracted candidate profiles from PDFs.', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-100' },
          { time: '10:42 AM', title: 'Vendor Identified', desc: 'Number +919876543210 matched to TechCorp Partners.', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
          { time: '10:42 AM', title: 'WhatsApp Message Received', desc: 'Incoming text with 3 document attachments.', icon: MessageCircle, color: 'text-slate-500', bg: 'bg-slate-200' },
        ].map((event, i) => (
          <div key={i} className="relative pl-8">
            <div className={cn("absolute -left-[17px] top-0 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center", event.bg, event.color)}>
              <event.icon size={12} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400">{event.time}</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1">{event.title}</h4>
              <p className="text-xs text-slate-600 mt-1">{event.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BroadcastsAnalyticsView() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Broadcast Engine Funnel</h3>
        <p className="text-sm text-slate-500">Track end-to-end performance of WhatsApp requirement broadcasts.</p>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
            <th className="p-4 font-bold">Requirement</th>
            <th className="p-4 font-bold">Sent</th>
            <th className="p-4 font-bold">Delivered</th>
            <th className="p-4 font-bold">Read</th>
            <th className="p-4 font-bold">Replied</th>
            <th className="p-4 font-bold">Submissions</th>
            <th className="p-4 font-bold">Placements</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {[
            { req: 'REQ-887 Senior React', sent: 45, deliv: 44, read: 38, rep: 12, sub: 8, place: 1 },
            { req: 'REQ-888 Data Eng', sent: 120, deliv: 118, read: 89, rep: 34, sub: 22, place: 0 },
            { req: 'REQ-889 VP Sales', sent: 15, deliv: 15, read: 14, rep: 8, sub: 3, place: 0 },
          ].map((row, i) => (
            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-800">{row.req}</td>
              <td className="p-4 font-medium text-slate-600">{row.sent}</td>
              <td className="p-4 font-medium text-slate-600">{row.deliv}</td>
              <td className="p-4 font-medium text-slate-600">{row.read}</td>
              <td className="p-4 font-medium text-blue-600">{row.rep}</td>
              <td className="p-4 font-bold text-emerald-600">{row.sub}</td>
              <td className="p-4 font-black text-indigo-600">{row.place}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
