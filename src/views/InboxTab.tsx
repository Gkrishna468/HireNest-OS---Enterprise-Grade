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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F8FAFC] overflow-hidden">
      <header className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Mail size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">MailOS</h1>
                <p className="text-xs text-slate-500 font-medium">Enterprise Recruiting Inbox</p>
             </div>
         </div>
         {isConnected && (
            <Button onClick={() => fetchEmails()} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Inbox
            </Button>
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
               <div className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
                  <div className="p-4">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm mb-6">+ Compose</Button>
                      
                      <div className="space-y-1 mb-6">
                          <button onClick={() => setActiveCategory('ALL')} className={cn("w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors", activeCategory === 'ALL' ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <Inbox size={16} className="mr-3" /> Inbox
                          </button>
                          <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <Send size={16} className="mr-3" /> Sent
                          </button>
                          <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                              <FileText size={16} className="mr-3" /> Drafts
                          </button>
                      </div>

                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Recruitment Labels</h4>
                      <div className="space-y-1">
                          <button onClick={() => setActiveCategory('REQUIREMENT')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'REQUIREMENT' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-blue-400 mr-3"></span> Requirements
                          </button>
                          <button onClick={() => setActiveCategory('RESUME')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'RESUME' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-3"></span> Candidates
                          </button>
                          <button onClick={() => setActiveCategory('VENDOR_RESPONSE')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'VENDOR_RESPONSE' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-purple-400 mr-3"></span> Vendors
                          </button>
                          <button onClick={() => setActiveCategory('INVOICE')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'INVOICE' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-amber-400 mr-3"></span> Invoices
                          </button>
                          <button onClick={() => setActiveCategory('INTERVIEW')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'INTERVIEW' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-orange-400 mr-3"></span> Interviews
                          </button>
                          <button onClick={() => setActiveCategory('OFFER')} className={cn("w-full flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", activeCategory === 'OFFER' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100")}>
                              <span className="w-2 h-2 rounded-full bg-rose-400 mr-3"></span> Offers
                          </button>
                      </div>
                  </div>
               </div>
               
               {/* Column 2: Conversation List */}
               <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0">
                  <div className="p-3 border-b border-slate-100 bg-white shadow-sm z-10 shrink-0">
                      <input 
                         type="text" 
                         placeholder="Search mail and attachments..." 
                         className="w-full bg-slate-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                     {loading && emails.length === 0 ? (
                        <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-slate-300" /></div>
                     ) : filteredEmails.length === 0 ? (
                        <EmptyState icon={Mail} title="No Messages" description={`No recent messages found for ${displayNames[activeCategory] || 'this folder'}.`} />
                     ) : (
                        filteredEmails.map(email => (
                           <div key={email.id} 
                                onClick={() => { setSelectedEmail(email); analyzeEmail(email.id); }}
                                className={cn("p-4 border-b border-slate-100 cursor-pointer transition-colors relative", selectedEmail?.id === email.id ? "bg-indigo-50/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-600" : "bg-white hover:bg-slate-50")}>
                              <div className="flex justify-between items-baseline mb-1">
                                  <div className="text-sm font-bold text-slate-900 truncate pr-2">{email.from?.split('<')[0]?.trim()}</div>
                                  <div className="text-[10px] font-medium text-slate-400 shrink-0">10:42 AM</div>
                              </div>
                              <div className="text-[13px] font-semibold text-slate-700 truncate mb-1">{email.subject}</div>
                              <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{email.snippet}</div>
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
                        <h3 className="text-xl font-bold text-slate-400">Select an item to read</h3>
                        <p className="text-sm text-slate-400 mt-2">Nothing is selected</p>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col overflow-hidden relative">
                         <div className="p-6 border-b border-slate-100 shrink-0 bg-white">
                             <h2 className="text-2xl font-bold text-slate-900 mb-4">{selectedEmail.subject}</h2>
                             <div className="flex justify-between items-start">
                                 <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center">
                                         {selectedEmail.from?.charAt(0)?.toUpperCase()}
                                     </div>
                                     <div>
                                         <div className="font-bold text-sm text-slate-900">{selectedEmail.from?.split('<')[0]?.trim()}</div>
                                         <div className="text-xs text-slate-500">to me</div>
                                     </div>
                                 </div>
                                 <div className="text-xs font-medium text-slate-400">
                                     Today, 10:42 AM
                                 </div>
                             </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-6 bg-white">
                             <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                                 {/* Full HTML email mockup */}
                                 <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm mb-6">
                                    <p>Hi,</p>
                                    <p className="mt-4">Please find my updated resume attached for the React Developer position. Let me know if you need any other details.</p>
                                    <p className="mt-4">Best regards,<br/>{selectedEmail.from?.split('<')[0]?.trim() || 'Candidate'}</p>
                                 </div>
                                 
                                 {/* Thread support mockup */}
                                 <div className="border-l-2 border-slate-200 pl-4 text-slate-500 mt-8 text-sm">
                                     <div className="mb-4">
                                         <div className="flex items-center gap-2 mb-2">
                                             <div className="font-bold text-slate-700">Gopal (Recruiter)</div>
                                             <div className="text-xs text-slate-400">Yesterday, 4:30 PM</div>
                                         </div>
                                         <div>Hi {selectedEmail.from?.split('<')[0]?.trim()}, Could you please share your updated resume? We have an opening at Microsoft that matches your profile.</div>
                                     </div>
                                 </div>
                             </div>
                             
                             {analysis?.attachments?.length > 0 && (
                                <div className="mt-8 border-t border-slate-100 pt-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Attachments ({analysis.attachments.length})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.attachments.map((att: string, idx: number) => (
                                            <div key={idx} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 group hover:border-indigo-300 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-slate-700 truncate">{att}</div>
                                                        <div className="text-[10px] text-slate-400">PDF Document</div>
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
                                     <Button variant="outline" className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Templates</Button>
                                     <Button variant="outline" className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Variables</Button>
                                     <Button variant="outline" className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-sm gap-1">✨ AI Draft</Button>
                                 </div>
                                 <textarea 
                                    className="w-full h-24 p-4 text-sm resize-none outline-none text-slate-700" 
                                    placeholder="Write your email... (or click AI Draft)"
                                 ></textarea>
                                 <div className="px-4 py-3 bg-white flex justify-between items-center border-t border-slate-100">
                                     <Button variant="outline" className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 border-none shadow-none gap-2">
                                         <FileText size={14} /> Attach Resume
                                     </Button>
                                     <div className="flex gap-2">
                                         <Button variant="outline" className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-100 shadow-sm">Discard</Button>
                                         <Button className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6">Send</Button>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                  )}
               </div>

               {/* Column 4: AI Workspace */}
               {selectedEmail && (
               <div className="w-[340px] lg:w-[380px] bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
                   {analyzing ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="animate-spin text-indigo-500 w-8 h-8" />
                            <span className="text-sm font-bold text-slate-600">Analyzing Context...</span>
                        </div>
                   ) : analysis ? (
                        <div className="p-5 flex flex-col gap-6">
                            <div>
                                <Badge className={cn("mb-2 uppercase tracking-widest", 
                                    analysis.classification?.type === 'RESUME' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                                    analysis.classification?.type === 'REQUIREMENT' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    analysis.classification?.type === 'INVOICE' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    analysis.classification?.type === 'INTERVIEW' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                    'bg-slate-200 text-slate-800 border-slate-300'
                                )}>
                                    {analysis.classification?.type || 'UNKNOWN'}
                                </Badge>
                                <p className="text-xs text-slate-500 mt-1">Confidence: {analysis.classification?.confidence || 0}%</p>
                            </div>

                            {analysis.classification?.type === 'RESUME' && (
                                <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-emerald-50 rounded-bl-xl border-l border-b border-emerald-100">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Candidate</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                                            {selectedEmail.from?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 line-clamp-1">{analysis.classification?.data?.Name || selectedEmail.from?.split('<')[0]?.trim()}</h3>
                                            <p className="text-[10px] text-slate-500 font-medium">Available in {analysis.classification?.data?.['Notice Period'] || '30 Days'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Experience</div>
                                            <div className="text-sm font-semibold text-slate-800">{analysis.classification?.data?.Experience || '8 Years'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expected CTC</div>
                                            <div className="text-sm font-semibold text-slate-800">{analysis.classification?.data?.['Expected CTC'] || '22 LPA'}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Top Skills</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(analysis.classification.data?.Skills || analysis.classification.data?.skills || ['React', 'Java', 'AWS']).slice(0, 4).map((skill: string) => (
                                                    <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analysis.classification?.type === 'REQUIREMENT' && (
                                <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl border-l border-b border-blue-100">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Requirement</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{analysis.classification?.data?.Title || 'Senior Software Engineer'}</h3>
                                    <p className="text-xs text-slate-500 font-medium mb-4">{analysis.classification?.data?.Client || 'Microsoft'} • {analysis.classification?.data?.Location || 'Hyderabad'}</p>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Budget</div>
                                            <div className="text-sm font-semibold text-slate-800">{analysis.classification?.data?.Budget || '25 LPA'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Openings</div>
                                            <div className="text-sm font-semibold text-slate-800">{analysis.classification?.data?.Openings || '5'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analysis.classification?.type === 'INVOICE' && (
                                <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-amber-50 rounded-bl-xl border-l border-b border-amber-100">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Invoice</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 mb-1">{analysis.classification?.data?.['Invoice Number'] || 'INV-10023'}</h3>
                                    <p className="text-2xl font-black text-slate-800 mb-4">{analysis.classification?.data?.Amount || '₹2,75,000'}</p>
                                    
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                        <span className="text-xs font-bold text-slate-500">Status</span>
                                        <Badge className="bg-rose-100 text-rose-700 border-none text-[10px]">Unpaid</Badge>
                                    </div>
                                </div>
                            )}

                            {analysis.classification?.type === 'INTERVIEW' && (
                                <div className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-purple-50 rounded-bl-xl border-l border-b border-purple-100">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Interview</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                            <span className="text-lg font-black">24</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 line-clamp-1">{analysis.classification?.data?.Candidate || 'Deepeshika Sarkar'}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Tomorrow, 2:00 PM</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 font-medium flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Teams Meeting Link
                                    </div>
                                </div>
                            )}

                            {(!['RESUME', 'REQUIREMENT', 'INVOICE', 'INTERVIEW'].includes(analysis.classification?.type)) && analysis.classification?.data && Object.keys(analysis.classification.data).length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Extracted Entities</h4>
                                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
                                   {Object.keys(analysis.classification.data).filter(k => k !== 'skills' && k !== 'Skills').map(key => (
                                      <div key={key} className="flex justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                          <span className="text-xs font-medium text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                          <span className="text-xs font-bold text-slate-800 text-right max-w-[200px] truncate">{Array.isArray(analysis.classification.data[key]) ? analysis.classification.data[key].join(', ') : analysis.classification.data[key]}</span>
                                      </div>
                                   ))}
                                </div>
                            </div>
                            )}

                            {analysis.businessImpact?.matchingJobs && analysis.businessImpact.matchingJobs.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matching Jobs</h4>
                                <div className="space-y-2">
                                    {analysis.businessImpact.matchingJobs.map((job: any) => (
                                        <div key={job.id} className="bg-white border border-slate-200 p-2.5 rounded-lg flex justify-between items-center group cursor-pointer hover:border-indigo-300 shadow-sm">
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 line-clamp-1">{job.title}</div>
                                                <div className="text-[10px] text-slate-500">{job.client}</div>
                                            </div>
                                            <div className="text-xs font-black text-emerald-600">{job.score}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            {analysis.businessImpact && (
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Business Impact</h4>
                                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-xs font-medium text-slate-500">Estimated Placement</span>
                                        <span className="text-xs font-black text-emerald-600">₹{(analysis.businessImpact.estimatedRevenue/12)?.toLocaleString(undefined, {maximumFractionDigits:0}) || 0} LPM</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-xs font-medium text-slate-500">Estimated Margin</span>
                                        <span className="text-xs font-black text-slate-800">₹{Math.floor((analysis.businessImpact.estimatedRevenue/12)*0.15).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-xs font-medium text-slate-500">Probability</span>
                                        <span className="text-xs font-black text-indigo-600">92%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs font-medium text-slate-500">Priority</span>
                                        <span className="text-xs font-black text-amber-600">{analysis.businessImpact.priority || 'Medium'}</span>
                                    </div>
                                </div>
                            </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested Actions</h4>
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

                                        return <Button key={idx} className={cn("w-full justify-start text-xs shadow-sm font-bold", btnClass)}>{action}</Button>;
                                    })
                                ) : (
                                    <Button className="w-full justify-start text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold">Process Request</Button>
                                )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Workflow Timeline</h4>
                                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-slate-200 ml-1">
                                    {analysis.classification?.timeline && analysis.classification.timeline.length > 0 ? (
                                        analysis.classification.timeline.map((event: any, idx: number) => (
                                            <div key={idx} className="relative pl-6">
                                                <div className={cn("absolute left-0 top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm", idx === analysis.classification.timeline.length - 1 ? "bg-indigo-500" : "bg-slate-400")}></div>
                                                <div className="flex flex-col">
                                                    <p className={cn("text-[10px] font-bold mb-0.5", idx === analysis.classification.timeline.length - 1 ? "text-indigo-500" : "text-slate-400")}>{event.time}</p>
                                                    <p className={cn("text-xs font-bold leading-tight", idx === analysis.classification.timeline.length - 1 ? "text-slate-900" : "text-slate-600")}>{event.title}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="relative pl-6">
                                            <div className="absolute left-0 top-0.5 w-3 h-3 bg-slate-400 rounded-full border-2 border-white shadow-sm"></div>
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
                            No insights available.
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
