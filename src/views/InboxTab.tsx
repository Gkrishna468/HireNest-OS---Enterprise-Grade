import React, { useEffect, useState } from 'react';
import { 
  Mail, Inbox, Send, RefreshCw, AlertCircle, FileText, 
  LayoutDashboard, Zap, Shield, CheckCircle, TrendingUp, 
  Clock, DollarSign, Users, Check, FileCheck, Activity, Award, Briefcase 
} from 'lucide-react';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { EmptyState } from '../components/EmptyState';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';

import { ErrorBoundary } from '../components/ErrorBoundary';

export default function InboxTab() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = [
    'ALL', 'REQUIREMENT', 'RESUME', 'VENDOR_RESPONSE', 'INTERVIEW', 
    'INVOICE', 'OFFER', 'VENDOR_PARTNERSHIP', 'SALES_INQUIRY', 'COMPLAINT', 'OTHER'
  ];

  const displayNames: Record<string, string> = {
    'ALL': 'All Messages',
    'REQUIREMENT': 'Requirements',
    'RESUME': 'Candidates',
    'VENDOR_RESPONSE': 'Vendors',
    'INTERVIEW': 'Interviews',
    'INVOICE': 'Invoices',
    'OFFER': 'Offers',
    'VENDOR_PARTNERSHIP': 'Partnerships',
    'SALES_INQUIRY': 'Sales / GTM',
    'COMPLAINT': 'Complaints',
    'OTHER': 'Other'
  };

  const filteredEmails = emails.filter(email => {
    if (activeCategory === 'ALL') return true;
    const type = email.classification?.type || 'OTHER';
    
    // Normalize type aliases
    const normType = type.toUpperCase().replace(' ', '_');
    const normCategory = activeCategory.toUpperCase();

    if (normCategory === 'RESUME' && (normType === 'CANDIDATE' || normType === 'CANDIDATE_SUBMISSION' || normType === 'RESUME')) return true;
    return normType === normCategory;
  });

  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
       if (!user) {
         if (active) setIsConnected(false);
         return;
       }
       try {
          const token = await user.getIdToken();
          const res = await fetch('/api/workspace/status', {
             headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (active) {
            setIsConnected(data.connected);
            if (data.connected) {
               fetchEmails(token);
            }
          }
       } catch (e) {
          console.error(e);
       }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const fetchEmails = async (providedToken?: string) => {
    setLoading(true);
    setError('');
    try {
      const token = providedToken || await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      let shouldSync = true;
      try {
        const res = await fetch('/api/workspace/status', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const statusData = await res.json();
          setIsConnected(statusData.connected);
          if (statusData.connected) {
             const lastSyncStr = statusData.mailSync?.lastSync;
             if (lastSyncStr) {
                const lastSyncTime = new Date(lastSyncStr).getTime();
                const diffMs = Date.now() - lastSyncTime;
                if (diffMs < 2 * 60 * 1000) {
                   shouldSync = false;
                   console.log(`[InboxTab] Synced ${Math.floor(diffMs / 1000)}s ago. Skipping sync.`);
                }
             }
          } else {
             shouldSync = false;
          }
        }
      } catch (statusErr) {
        console.warn("[InboxTab] Status check failed:", statusErr);
      }

      if (shouldSync) {
        try {
          await fetch('/api/workspace/mailos/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
        } catch (syncErr) {
          console.error("[InboxTab] Sync error:", syncErr);
        }
      }

      const response = await fetch(`/api/google/gmail/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails via proxy.');
      }

      const data = await response.json();
      setEmails(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEmail = async (emailId: string) => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/workspace/mailos/analyze/${emailId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to analyze email.');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAction = async (action: string) => {
    console.log(`Executing action: ${action}`);
  };

  // Helper for rendering Stage badges
  const getStageBadge = (stage: string) => {
    const s = (stage || 'NEW').toUpperCase();
    const colors: Record<string, string> = {
      'NEW': 'bg-blue-50 text-blue-700 border-blue-200',
      'IDENTIFIED': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'CLASSIFIED': 'bg-purple-50 text-purple-700 border-purple-200',
      'ENTITY_LINKED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'ACTION_CREATED': 'bg-amber-50 text-amber-700 border-amber-200',
      'OFFICE_ROUTED': 'bg-rose-50 text-rose-700 border-rose-200',
      'PROCESSING': 'bg-orange-50 text-orange-700 border-orange-200',
      'COMPLETED': 'bg-teal-50 text-teal-700 border-teal-200',
      'ARCHIVED': 'bg-slate-50 text-slate-700 border-slate-200'
    };
    return colors[s] || colors['NEW'];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F8FAFC] overflow-hidden">
      <header className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Mail size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">MailOS v2</h1>
                <p className="text-xs text-slate-500 font-medium">Enterprise Communication Intelligence Layer</p>
             </div>
         </div>
         {isConnected && (
            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-4 text-xs font-medium text-slate-500">
                    <div className="flex flex-col"><span className="text-slate-800 font-bold">{emails.length}</span> Ingested</div>
                    <div className="flex flex-col"><span className="text-slate-800 font-bold">{emails.filter(e => e.classification?.type?.toUpperCase() === 'REQUIREMENT').length}</span> Requirements</div>
                    <div className="flex flex-col"><span className="text-slate-800 font-bold">{emails.filter(e => ['RESUME', 'CANDIDATE', 'CANDIDATE_SUBMISSION'].includes(e.classification?.type?.toUpperCase())).length}</span> Candidates</div>
                    <div className="flex flex-col"><span className="text-slate-800 font-bold">{emails.filter(e => e.classification?.type?.toUpperCase() === 'INVOICE').length}</span> Invoices</div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                       Intelligence Core Online
                   </div>
                   <div className="text-[10px] text-slate-400 font-medium">Synced {loading ? 'just now' : 'Synced'}</div>
                </div>
                <Button onClick={() => fetchEmails()} variant="outline" className="gap-2 h-9 text-xs ml-2" disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>
         )}
      </header>

      <div className="flex-1 overflow-hidden">
        {!isConnected ? (
           <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-12 space-y-4">
              <Mail className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-800">No Email Integration connected</h2>
              <p className="text-sm text-slate-500">Connect your Google Workspace in the Integrations settings to enable inbox synchronization.</p>
           </div>
        ) : error ? (
           <div className="max-w-md mx-auto bg-red-50 p-6 rounded-2xl border border-red-200 text-center mt-12 space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
              <h2 className="text-sm font-bold text-red-800">Connection Error</h2>
              <p className="text-xs text-red-600">{error}</p>
           </div>
        ) : (
            <div className="flex h-full w-full">
                {/* Column 1: Mailboxes */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
                  <div className="p-4">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mb-6">+ Compose</Button>
                      
                      <div className="space-y-1 mb-6">
                          <button onClick={() => setActiveCategory('ALL')} className={cn("w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors", activeCategory === 'ALL' ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <Inbox size={16} className="mr-3" /> All Inbox
                          </button>
                      </div>

                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Triage Intents</h4>
                      <div className="space-y-1">
                          {categories.filter(c => c !== 'ALL').map(cat => (
                              <button key={cat} onClick={() => setActiveCategory(cat)} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-left truncate", activeCategory === cat ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                                  <span className={cn("w-2 h-2 rounded-full mr-3", 
                                      cat === 'REQUIREMENT' ? 'bg-blue-400' :
                                      cat === 'RESUME' ? 'bg-emerald-400' :
                                      cat === 'VENDOR_RESPONSE' ? 'bg-purple-400' :
                                      cat === 'INVOICE' ? 'bg-amber-400' :
                                      cat === 'INTERVIEW' ? 'bg-orange-400' :
                                      cat === 'OFFER' ? 'bg-rose-400' :
                                      cat === 'VENDOR_PARTNERSHIP' ? 'bg-pink-400' :
                                      cat === 'SALES_INQUIRY' ? 'bg-teal-400' :
                                      cat === 'COMPLAINT' ? 'bg-red-400' : 'bg-slate-400'
                                  )}></span> 
                                  {displayNames[cat]}
                              </button>
                          ))}
                      </div>
                  </div>
                </div>
                
                {/* Column 2: Conversation List */}
                <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0">
                  <div className="p-3 border-b border-slate-100 bg-white shadow-sm z-10 shrink-0">
                      <input 
                         type="text" 
                         placeholder="Search conversations..." 
                         className="w-full bg-slate-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                     {loading && emails.length === 0 ? (
                        <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-slate-300" /></div>
                     ) : filteredEmails.length === 0 ? (
                        <EmptyState icon={Mail} title="No Conversations" description={`No threads classified under ${displayNames[activeCategory]}.`} />
                     ) : (
                        filteredEmails.map(email => (
                           <div key={email.id} 
                                onClick={() => { setSelectedEmail(email); analyzeEmail(email.id); }}
                                className={cn("p-4 border-b border-slate-100 cursor-pointer transition-colors relative", selectedEmail?.id === email.id ? "bg-indigo-50/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-600" : "bg-white hover:bg-slate-50")}>
                              <div className="flex justify-between items-baseline mb-1">
                                  <div className="text-sm font-bold text-slate-900 truncate pr-2">{email.from?.split('<')[0]?.trim()}</div>
                                  <div className="text-[10px] font-medium text-slate-400 shrink-0">Today</div>
                              </div>
                              <div className="text-[13px] font-bold text-slate-700 truncate mb-1">{email.subject}</div>
                              <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{email.snippet}</div>
                              
                              <div className="flex items-center gap-2">
                                  <Badge className="bg-slate-100 text-slate-700 text-[9px] py-0 px-1.5 uppercase font-black">
                                      {email.classification?.type || 'Other'}
                                  </Badge>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                </div>
                
                {/* Column 3: Full Email Viewer */}
                <div className="flex-1 bg-white flex flex-col min-w-0">
                   {!selectedEmail ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC]">
                         <Mail className="h-16 w-16 text-slate-200 mb-4" />
                         <h3 className="text-xl font-bold text-slate-400">Select a Conversation Thread</h3>
                         <p className="text-sm text-slate-400 mt-2">Activate the identity resolver & intent engine by selecting any stream item.</p>
                      </div>
                   ) : (
                      <div className="flex-1 flex flex-col overflow-hidden relative">
                          <div className="p-6 border-b border-slate-100 shrink-0 bg-white">
                              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">{selectedEmail.subject}</h2>
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center">
                                          {selectedEmail.from?.charAt(0)?.toUpperCase()}
                                      </div>
                                      <div>
                                          <div className="font-bold text-sm text-slate-900">{selectedEmail.from}</div>
                                          <div className="text-xs text-slate-500">Thread ID: {selectedEmail.id}</div>
                                      </div>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-400">
                                      Today
                                  </div>
                              </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 bg-white">
                              <div className="prose prose-sm max-w-none text-slate-700">
                                  {analyzing ? (
                                       <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                           <RefreshCw className="animate-spin h-8 w-8 text-indigo-500" />
                                           <div className="text-xs font-medium">Extracting business entities and resolving graph credentials...</div>
                                       </div>
                                   ) : analysis?.html ? (
                                       <div 
                                           className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6 overflow-x-auto max-w-full"
                                           dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(analysis.html) }}
                                       />
                                   ) : (
                                       <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6 whitespace-pre-wrap leading-relaxed text-sm">
                                           {analysis?.plainText || analysis?.body || selectedEmail.snippet || "No body content available."}
                                       </div>
                                   )}
                              </div>
                              
                              {analysis?.attachments?.length > 0 && (
                                 <div className="mt-8 border-t border-slate-100 pt-6">
                                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Attachments ({analysis.attachments.length})</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         {analysis.attachments.map((att: any, idx: number) => (
                                             <div key={idx} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 group hover:border-indigo-300 hover:bg-slate-50 transition-colors">
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
                                                         <FileText size={20} />
                                                     </div>
                                                     <div className="min-w-0">
                                                         <div className="text-sm font-bold text-slate-700 truncate">{typeof att === 'object' ? att.filename : att}</div>
                                                         <div className="text-[10px] text-slate-400">{typeof att === 'object' ? (att.mimeType || 'Document') : 'Document'}</div>
                                                     </div>
                                                 </div>
                                                 <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <Button className="h-7 text-[10px] px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm">Preview</Button>
                                                     <Button className="h-7 text-[10px] px-3 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 shadow-sm">✨ AI Summary</Button>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                              )}
                          </div>
                          <div className="p-6 border-t border-slate-200 bg-white shrink-0">
                              <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-all">
                                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex gap-2">
                                      <Button onClick={() => handleAction('Open Templates')} variant="outline" className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Templates</Button>
                                      <Button onClick={() => handleAction('Insert Variables')} variant="outline" className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Variables</Button>
                                      <Button onClick={() => handleAction('Generate AI Draft')} variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-sm gap-1">✨ AI Draft</Button>
                                  </div>
                                  <textarea 
                                     className="w-full h-24 p-4 text-sm resize-none outline-none text-slate-700" 
                                     placeholder="Write your email... (or click AI Draft)"
                                  ></textarea>
                                  <div className="px-4 py-3 bg-white flex justify-between items-center border-t border-slate-100">
                                      <Button onClick={() => handleAction('Attach Document')} variant="outline" className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 border-none shadow-none gap-2">
                                          <FileText size={14} /> Attach File
                                      </Button>
                                      <div className="flex gap-2">
                                          <Button onClick={() => handleAction('Discard Draft')} variant="outline" className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Discard</Button>
                                          <Button onClick={() => handleAction('Send Email')} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6">Send</Button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                   )}
                </div>

                {/* Column 4: AI Workspace */}
                {selectedEmail && (
                <div className="w-[360px] lg:w-[400px] bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
                    {analyzing ? (
                         <div className="flex-1 flex flex-col items-center justify-center gap-4">
                             <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
                             <span className="text-sm font-bold text-slate-600">Resolving Conversation...</span>
                         </div>
                    ) : analysis ? (
                         <div className="p-5 flex flex-col gap-6">
                             
                             {/* 1. Conversation Stage & Office Routing Banner (Refinement 4 & 6) */}
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                 <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry Stage</span>
                                     <Badge className={cn("uppercase tracking-wider text-[10px] font-bold border", getStageBadge(analysis.conversation?.currentStage))}>
                                         {analysis.conversation?.currentStage || 'CLASSIFIED'}
                                     </Badge>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                         <Zap size={18} />
                                     </div>
                                     <div>
                                         <h4 className="text-xs font-black text-slate-800">Routed Owner Office</h4>
                                         <p className="text-[11px] text-slate-500 font-bold">{analysis.conversation?.ownerOffice || 'GTM Office'}</p>
                                     </div>
                                 </div>
                             </div>

                             {/* 2. Confidence-Based Identity Meter (Refinement 3) */}
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                 <div className="flex items-center justify-between">
                                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Resolution</h4>
                                     <Badge className={cn("text-[10px] font-bold border", 
                                        (analysis.classification?.confidence || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                     )}>
                                         {analysis.classification?.confidence || 0}% Confidence
                                     </Badge>
                                 </div>
                                 
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                     <div className="flex items-center gap-2">
                                         <Shield size={14} className="text-indigo-600" />
                                         <span className="text-xs font-black text-slate-800 truncate">
                                             {analysis.conversation?.summary?.vendor !== 'Not Applicable' ? analysis.conversation?.summary?.vendor : selectedEmail.from?.split('<')[0]?.trim()}
                                         </span>
                                     </div>
                                     <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">
                                         "{analysis.classification?.confidenceReason || 'Domain match only. Needs HQ Review.'}"
                                     </p>
                                 </div>
                             </div>

                             {/* 3. Continuously Updated Thread Summary (Refinement 10) */}
                             <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden">
                                 <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                                     <Activity size={120} />
                                 </div>
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Thread Summary Snapshot</h4>
                                 <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                                     <div>
                                         <span className="text-[10px] text-indigo-200 block font-bold">Vendor</span>
                                         <span className="font-bold truncate block">{analysis.conversation?.summary?.vendor || 'None'}</span>
                                     </div>
                                     <div>
                                         <span className="text-[10px] text-indigo-200 block font-bold">Requirement</span>
                                         <span className="font-bold truncate block">{analysis.conversation?.summary?.requirement || 'None'}</span>
                                     </div>
                                     <div className="col-span-2 border-t border-indigo-800 pt-2">
                                         <span className="text-[10px] text-indigo-200 block font-bold">Matched Candidate</span>
                                         <span className="font-bold truncate block">{analysis.conversation?.summary?.candidate || 'None'}</span>
                                     </div>
                                     <div className="col-span-2 border-t border-indigo-800 pt-2">
                                         <span className="text-[10px] text-indigo-200 block font-bold">Next Recommended Action</span>
                                         <span className="font-bold text-amber-300 flex items-center gap-1">
                                             <Zap size={11} /> {analysis.conversation?.summary?.nextAction || 'Triage Thread'}
                                         </span>
                                     </div>
                                 </div>
                             </div>

                             {/* 4. Business Document Intelligence checklist (Refinement 5) */}
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Intelligence Matrix</h4>
                                 <div className="grid grid-cols-2 gap-2 text-xs">
                                     {[
                                         { name: 'Resume / CV', key: 'Resume' },
                                         { name: 'Job Description', key: 'JD' },
                                         { name: 'Vendor Agreement', key: 'Vendor Agreement' },
                                         { name: 'NDA', key: 'NDA' },
                                         { name: 'Rate Card', key: 'Rate Card' },
                                         { name: 'MSA', key: 'MSA' }
                                     ].map(docType => {
                                         const detected = analysis.classification?.detectedDocuments?.some((d: any) => d.type === docType.key);
                                         return (
                                             <div key={docType.key} className={cn("p-2 rounded-lg border flex items-center justify-between", 
                                                detected ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-slate-50 border-slate-100 text-slate-500"
                                             )}>
                                                 <span className="font-bold truncate max-w-[120px]">{docType.name}</span>
                                                 {detected ? <CheckCircle size={14} className="text-emerald-600 shrink-0" /> : <Clock size={12} className="text-slate-400 shrink-0" />}
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>

                             {/* 5. Live Vendor Snapshot Metrics (Refinement 12) */}
                             {analysis.metricsSnapshot && (
                                 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                     <div className="flex items-center justify-between">
                                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Performance Snapshot</h4>
                                         <Badge className="bg-emerald-100 text-emerald-800 border-none text-[9px] font-black">LIVE</Badge>
                                     </div>
                                     <div className="grid grid-cols-3 gap-2 text-center">
                                         <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                             <span className="text-[18px] font-black text-slate-800 block">{analysis.metricsSnapshot.totalSubmissions || 0}</span>
                                             <span className="text-[9px] text-slate-400 block font-bold">Submissions</span>
                                         </div>
                                         <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                             <span className="text-[18px] font-black text-slate-800 block">{analysis.metricsSnapshot.interviewsCount || 0}</span>
                                             <span className="text-[9px] text-slate-400 block font-bold">Interviews</span>
                                         </div>
                                         <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                             <span className="text-[18px] font-black text-slate-800 block">{analysis.metricsSnapshot.conversionRate || 0}%</span>
                                             <span className="text-[9px] text-slate-400 block font-bold">Conversion</span>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* 6. AI Operational Memory & Insights (Refinement 11) */}
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Memory & Learnings</h4>
                                 <div className="space-y-2.5 text-xs text-slate-700">
                                     <div>
                                         <span className="font-bold text-slate-500 block text-[10px]">Observations</span>
                                         <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] font-medium leading-relaxed">
                                             {(analysis.classification?.memory?.observations || []).map((o: string, i: number) => (
                                                 <li key={i}>{o}</li>
                                             ))}
                                         </ul>
                                     </div>
                                     <div className="border-t border-slate-100 pt-2">
                                         <span className="font-bold text-slate-500 block text-[10px]">Experiences</span>
                                         <p className="text-[11px] font-semibold mt-1">
                                             {analysis.classification?.memory?.learning || "Sender behaves consistently within expected operational parameters."}
                                         </p>
                                     </div>
                                     <div className="border-t border-slate-100 pt-2">
                                         <span className="font-bold text-slate-500 block text-[10px]">Recommendations</span>
                                         <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-indigo-700 font-bold">
                                             {(analysis.classification?.memory?.recommendations || []).map((r: string, i: number) => (
                                                 <li key={i}>{r}</li>
                                             ))}
                                         </ul>
                                     </div>
                                 </div>
                             </div>

                             {/* 7. Suggested Action Controls */}
                             <div>
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Suggested Action Workflow</h4>
                                 <div className="space-y-2">
                                 {analysis.classification?.suggestedActions && analysis.classification.suggestedActions.length > 0 ? (
                                     analysis.classification.suggestedActions.map((action: string, idx: number) => {
                                         let btnClass = "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";
                                         const actionLower = action.toLowerCase();
                                         if (actionLower.includes('submit')) btnClass = "bg-emerald-600 hover:bg-emerald-700 text-white border-none";
                                         else if (actionLower.includes('match')) btnClass = "bg-blue-600 hover:bg-blue-700 text-white border-none";
                                         else if (actionLower.includes('deal room')) btnClass = "bg-purple-600 hover:bg-purple-700 text-white border-none";
                                         else if (actionLower.includes('broadcast')) btnClass = "bg-orange-600 hover:bg-orange-700 text-white border-none";
                                         else if (actionLower.includes('email') || actionLower.includes('reply')) btnClass = "bg-indigo-600 hover:bg-indigo-700 text-white border-none";
                                         else if (actionLower.includes('archive')) btnClass = "bg-slate-100 text-slate-700 hover:bg-slate-200 border-none";
                                         else if (idx === 0) btnClass = "bg-indigo-600 hover:bg-indigo-700 text-white border-none";

                                         return <Button key={idx} onClick={() => handleAction(action)} className={cn("w-full justify-start text-xs shadow-sm font-bold", btnClass)}>{action}</Button>;
                                     })
                                 ) : (
                                     <Button onClick={() => handleAction('Process Request')} className="w-full justify-start text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold">Process Request</Button>
                                 )}
                                 </div>
                             </div>

                             {/* 8. Unified Conversation timeline (Refinement 14) */}
                             <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unified Conversation Event Chain</h4>
                                 <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-slate-200 ml-1">
                                     {analysis.classification?.timeline && analysis.classification.timeline.length > 0 ? (
                                         analysis.classification.timeline.map((event: any, idx: number) => (
                                             <div key={idx} className="relative pl-6">
                                                 <div className={cn("absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm", idx === analysis.classification.timeline.length - 1 ? "bg-indigo-500" : "bg-slate-400")}></div>
                                                 <div className="flex flex-col">
                                                     <div className="flex items-center justify-between">
                                                         <p className={cn("text-[9px] font-bold", idx === analysis.classification.timeline.length - 1 ? "text-indigo-500" : "text-slate-400")}>{event.time}</p>
                                                     </div>
                                                     <p className={cn("text-xs font-black leading-tight", idx === analysis.classification.timeline.length - 1 ? "text-slate-900" : "text-slate-700")}>{event.title}</p>
                                                     <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{event.description}</p>
                                                 </div>
                                             </div>
                                         ))
                                     ) : (
                                         <div className="relative pl-6">
                                             <div className="absolute left-0 top-1 w-3 h-3 bg-slate-400 rounded-full border-2 border-white shadow-sm"></div>
                                             <div className="flex flex-col">
                                                 <p className="text-[10px] font-bold text-slate-400 mb-0.5">Just now</p>
                                                 <p className="text-xs font-bold text-slate-600">Email Received</p>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>
                    ) : (
                         <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-sm">
                             No insights available. Click any thread to run intelligence analysis.
                         </div>
                    )}
                </div>
                )}
            </div>
         )}
      </div>
    </div>
  );
}
