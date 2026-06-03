import React, { useEffect, useState } from 'react';
import { Mail, Inbox, Send, RefreshCw, AlertCircle, FileText, LayoutDashboard } from 'lucide-react';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { EmptyState } from '../components/EmptyState';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function InboxTab() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
       if (!user) {
         if (active) setIsConnected(false);
         return;
       }
       try {
          const token = await user.getIdToken();
          const res = await fetch('/api/oauth/status', {
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

      const response = await fetch('/api/google/gmail/messages', {
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

  const handleConnect = async () => {
     const user = auth.currentUser;
     if (!user) return;
     try {
        const res = await fetch(`/api/oauth/url?uid=${user.uid}&redirectTo=${encodeURIComponent(window.location.href)}`);
        const data = await res.json();
        if (data.url) {
           window.location.href = data.url;
        }
     } catch (e) {
        console.error(e);
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
              <p className="text-sm text-slate-500">Connect your work account via OAuth to provision the Workspace scopes securely.</p>
              <Button onClick={handleConnect} className="w-full bg-indigo-600 hover:bg-indigo-700">Connect Workspace</Button>
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
