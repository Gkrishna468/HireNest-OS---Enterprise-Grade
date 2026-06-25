import React, { useEffect, useState } from 'react';
import { Mail, Inbox, Send, RefreshCw, AlertCircle, FileText, LayoutDashboard, Zap } from 'lucide-react';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { EmptyState } from '../components/EmptyState';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function InboxTab() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const categories = ['ALL', 'REQUIREMENT', 'RESUME', 'VENDOR_RESPONSE', 'INTERVIEW', 'INVOICE', 'OFFER', 'OTHER'];
  const displayNames: Record<string, string> = {
      'ALL': 'All',
      'REQUIREMENT': 'Requirements',
      'RESUME': 'Candidates',
      'VENDOR_RESPONSE': 'Vendors',
      'INTERVIEW': 'Interviews',
      'INVOICE': 'Invoices',
      'OFFER': 'Offers',
      'OTHER': 'Other'
  };

  const filteredEmails = emails.filter(email => {
      if (activeCategory === 'ALL') return true;
      const type = email.classification?.type || 'OTHER';
      if (activeCategory === 'RESUME' && type === 'CANDIDATE') return true; // Handling potential model aliases
      return type === activeCategory;
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

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="p-6 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Mail size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Work Email Integration</h1>
                <p className="text-xs text-slate-500 font-medium">Sync with your connected work account to send submissions and track activity</p>
             </div>
         </div>
         {isConnected && (
            <Button onClick={() => fetchEmails()} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Inbox
            </Button>
         )}
      </header>

      <div className="flex-1 overflow-y-auto p-6">
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
           <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
               <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3">
                     <div className="flex items-center gap-2">
                        <Inbox size={16} className="text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-800">Recent Messages</h3>
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {categories.map(cat => (
                           <button 
                              key={cat}
                              onClick={() => setActiveCategory(cat)}
                              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                           >
                              {displayNames[cat]}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {loading && emails.length === 0 ? (
                        <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-slate-300" /></div>
                     ) : filteredEmails.length === 0 ? (
                        <EmptyState icon={Mail} title="No Messages" description={`No recent messages found for ${displayNames[activeCategory]}.`} />
                     ) : (
                        filteredEmails.map(email => (
                           <div key={email.id} 
                                onClick={() => { setSelectedEmail(email); analyzeEmail(email.id); }}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                              <div className="text-xs font-bold text-slate-800 truncate">{email.from}</div>
                              <div className="text-[10px] font-semibold text-slate-600 truncate mt-1">{email.subject}</div>
                              <div className="text-[9px] text-slate-400 truncate mt-1">{email.snippet}</div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
               
               <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                  {!selectedEmail ? (
                    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-12 w-12 bg-indigo-50 flex items-center justify-center rounded-xl">
                                <LayoutDashboard className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">MailOS Dashboard</h3>
                                <p className="text-sm font-medium text-slate-500">Live AI operations overview</p>
                            </div>
                        </div>
                        
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Today's Traffic</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Emails</div>
                                <div className="text-2xl font-black text-slate-900">74</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Requirements</div>
                                <div className="text-2xl font-black text-indigo-600">9</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Resumes</div>
                                <div className="text-2xl font-black text-emerald-600">28</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Vendor Replies</div>
                                <div className="text-2xl font-black text-blue-600">41</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Invoices</div>
                                <div className="text-2xl font-black text-amber-600">5</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Offers</div>
                                <div className="text-2xl font-black text-emerald-600">2</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Interviews</div>
                                <div className="text-2xl font-black text-purple-600">7</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Unread Work</div>
                                <div className="text-2xl font-black text-rose-600">12</div>
                            </div>
                        </div>

                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">AI Performance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
                                <div>
                                   <div className="text-xs font-bold text-slate-500 mb-1">Automation Success</div>
                                   <div className="text-xl font-black text-emerald-600">99.3%</div>
                                </div>
                                <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
                                    <Zap className="text-emerald-500" size={20} />
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
                                <div>
                                   <div className="text-xs font-bold text-slate-500 mb-1">Average Processing</div>
                                   <div className="text-xl font-black text-indigo-600">1.8 sec</div>
                                </div>
                                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center">
                                    <RefreshCw className="text-indigo-500" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : analyzing ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-4">
                        <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
                        <span className="text-sm font-bold text-slate-600">Analyzing Email...</span>
                    </div>
                  ) : analysis ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <Badge className="mb-3 bg-indigo-50 text-indigo-700 border-indigo-200 uppercase tracking-widest">{analysis.classification?.type || 'UNKNOWN'}</Badge>
                                <h2 className="text-lg font-bold text-slate-900">{analysis.subject}</h2>
                                <p className="text-xs text-slate-500 mt-1">From: {analysis.from}</p>
                            </div>
                            <div className="text-right">
                                <div className="group relative inline-block">
                                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 cursor-help">
                                     Confidence {analysis.classification?.confidence || 98}%
                                  </div>
                                  <div className="absolute hidden group-hover:block z-10 w-64 p-3 mt-2 right-0 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-xl leading-relaxed whitespace-pre-wrap">
                                    {analysis.classification?.confidenceReason || "High confidence based on extracted entities."}
                                  </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Extracted Entities</h4>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                       {analysis.classification?.data && Object.keys(analysis.classification.data).map(key => (
                                          <div key={key} className="flex justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                              <span className="text-xs font-medium text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                              <span className="text-xs font-bold text-slate-800 text-right max-w-[200px] truncate">{Array.isArray(analysis.classification.data[key]) ? analysis.classification.data[key].join(', ') : analysis.classification.data[key]}</span>
                                          </div>
                                       ))}
                                       {(!analysis.classification?.data || Object.keys(analysis.classification.data).length === 0) && (
                                           <span className="text-xs text-slate-400">No structured data extracted.</span>
                                       )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">AI Summary</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 whitespace-pre-wrap">
                                        {analysis.classification?.summary || 'No summary available.'}
                                    </p>
                                </div>
                                {analysis.attachments?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Attachments</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.attachments.map((att: string) => (
                                                <Badge key={att} variant="outline" className="text-xs text-slate-600 bg-white"><FileText size={12} className="mr-1" /> {att}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-6">
                                {analysis.businessImpact && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Business Impact</h4>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-xs font-medium text-slate-500">Revenue Potential</span>
                                                <span className="text-xs font-black text-emerald-600">₹{analysis.businessImpact.estimatedRevenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-xs font-medium text-slate-500">Matching Jobs</span>
                                                <span className="text-xs font-black text-indigo-600">{analysis.businessImpact.matchingJobs?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-xs font-medium text-slate-500">Priority</span>
                                                <span className="text-xs font-black text-amber-600">{analysis.businessImpact.priority}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs font-medium text-slate-500">Automation</span>
                                                <span className="text-xs font-black text-slate-800">{analysis.businessImpact.automationReady ? 'Ready' : 'Pending'}</span>
                                            </div>
                                        </div>
                                        
                                        {analysis.businessImpact.matchingJobs && analysis.businessImpact.matchingJobs.length > 0 && (
                                            <div className="mt-4">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Perfect Matches</h5>
                                                <div className="space-y-2">
                                                    {analysis.businessImpact.matchingJobs.map((job: any) => (
                                                        <div key={job.id} className="bg-white border border-slate-200 p-3 rounded-lg flex justify-between items-center group cursor-pointer hover:border-indigo-300">
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-800">{job.client}</div>
                                                                <div className="text-[10px] text-slate-500">{job.title} · {job.location}</div>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end">
                                                                <div className="text-xs font-black text-emerald-600 mb-1">{job.score}%</div>
                                                                <Button className="h-6 text-[9px] px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">Submit</Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Suggested Actions</h4>
                                {analysis.classification?.suggestedActions && analysis.classification.suggestedActions.length > 0 ? (
                                    analysis.classification.suggestedActions.map((action: string, idx: number) => (
                                        <Button key={idx} className={cn("w-full justify-start text-xs", idx === 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50")}>{action}</Button>
                                    ))
                                ) : (
                                    <Button className="w-full justify-start text-xs bg-indigo-600 hover:bg-indigo-700">Process Request</Button>
                                )}
                                <Button className="w-full justify-start text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 mt-4">Archive Email</Button>
                                
                                <div className="mt-8">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Timeline</h4>
                                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-1 before:w-0.5 before:bg-slate-200 ml-1">
                                        {analysis.classification?.timeline && analysis.classification.timeline.length > 0 ? (
                                            analysis.classification.timeline.map((event: any, idx: number) => (
                                                <div key={idx} className="relative pl-6">
                                                    <div className={cn("absolute left-0 top-1.5 w-2 h-2 rounded-full", idx === analysis.classification.timeline.length - 1 ? "bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]" : "bg-slate-400")}></div>
                                                    <p className={cn("text-[10px] font-bold", idx === analysis.classification.timeline.length - 1 ? "text-indigo-400" : "text-slate-400")}>{event.time}</p>
                                                    <p className={cn("text-xs font-bold", idx === analysis.classification.timeline.length - 1 ? "text-slate-700" : "text-slate-500")}>{event.title}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                <div className="relative pl-6">
                                                    <div className="absolute left-0 top-1.5 w-2 h-2 bg-slate-400 rounded-full"></div>
                                                    <p className="text-[10px] font-bold text-slate-400">09:12 AM</p>
                                                    <p className="text-xs font-bold text-slate-700">Email Received</p>
                                                </div>
                                                <div className="relative pl-6">
                                                    <div className="absolute left-0 top-1.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"></div>
                                                    <p className="text-[10px] font-bold text-indigo-400">09:12 AM</p>
                                                    <p className="text-xs font-bold text-slate-700">Extracted & Classified</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                       <span className="text-sm text-slate-500">Failed to analyze message.</span>
                    </div>
                  )}
               </div>
           </div>
        )}
      </div>
    </div>
  );
}
