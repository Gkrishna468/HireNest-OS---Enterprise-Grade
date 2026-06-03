import React, { useEffect, useState } from 'react';
import { Mail, Inbox, Send, RefreshCw, AlertCircle, FileText, LayoutDashboard } from 'lucide-react';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { EmptyState } from '../components/EmptyState';

export default function InboxTab() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to retrieve cached token from localStorage
    const token = localStorage.getItem("google_access_token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const fetchEmails = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/gopal@hirenestworkforce.com/messages?maxResults=15', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails or token expired.');
      }

      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        const fullMessages = await Promise.all(data.messages.map(async (msg: any) => {
          const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/gopal@hirenestworkforce.com/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, {
             headers: {
               'Authorization': `Bearer ${accessToken}`,
               'Accept': 'application/json'
             }
          });
          const detailData = await detailResponse.json();
          const subjectHeader = detailData.payload?.headers?.find((h: any) => h.name === 'Subject');
          const fromHeader = detailData.payload?.headers?.find((h: any) => h.name === 'From');
          return {
             id: msg.id,
             snippet: detailData.snippet,
             subject: subjectHeader?.value || '(No Subject)',
             from: fromHeader?.value || '(Unknown Sender)'
          };
        }));
        setEmails(fullMessages);
      } else {
        setEmails([]);
      }
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('expired') || err.message.includes('Unauthorized') || err.message.includes('401')) {
          localStorage.removeItem("google_access_token");
          setAccessToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchEmails();
    }
  }, [accessToken]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <header className="p-6 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Mail size={20} />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Work Email Integration</h1>
                <p className="text-xs text-slate-500 font-medium">Synced with support inbox: gopal@hirenestworkforce.com</p>
             </div>
         </div>
         {accessToken && (
            <Button onClick={fetchEmails} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Inbox
            </Button>
         )}
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {!accessToken ? (
           <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-12 space-y-4">
              <Mail className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-bold text-slate-800">No Email Integration connected</h2>
              <p className="text-sm text-slate-500">Sign out and sign in using Google Auth to provision the Workspace scopes to empower this feature.</p>
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
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                     <Inbox size={16} className="text-indigo-600" />
                     <h3 className="text-sm font-bold text-slate-800">Recent Messages</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {loading && emails.length === 0 ? (
                        <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-slate-300" /></div>
                     ) : emails.length === 0 ? (
                        <EmptyState icon={Mail} title="Inbox Empty" description="No recent messages found." />
                     ) : (
                        emails.map(email => (
                           <div key={email.id} className="p-3 bg-white border border-slate-100 hover:border-slate-300 rounded-lg cursor-pointer transition-colors">
                              <div className="text-xs font-bold text-slate-800 truncate">{email.from}</div>
                              <div className="text-[10px] font-semibold text-slate-600 truncate mt-1">{email.subject}</div>
                              <div className="text-[9px] text-slate-400 truncate mt-1">{email.snippet}</div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
               
               <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-center p-8 h-full">
                  <div className="max-w-xs space-y-4">
                     <div className="h-16 w-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto">
                        <Send className="text-indigo-400" size={24} />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800">Automated Submission Logging</h3>
                     <p className="text-sm text-slate-500 leading-relaxed">
                        In phase 1, your inbox is directly connected for tracking recent activities. Send mail capabilities & templated outreach workflows will activate when navigating candidates to deals.
                     </p>
                     <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 w-full" onClick={() => window.location.hash = '#/deal-rooms'}>
                       Go To Deal Rooms
                     </Button>
                  </div>
               </div>
           </div>
        )}
      </div>
    </div>
  );
}
