import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../lib/Button';
import { EmptyState } from './EmptyState';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function GmailRecentMessages({ filterDomain, filterName, filterEmail }: { filterDomain?: string, filterName?: string, filterEmail?: string }) {
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

      let url = '/api/google/gmail/messages';
      let q = '';
      if (filterDomain && filterDomain.length > 2) {
          q = `from:@${filterDomain} OR to:@${filterDomain}`;
      } else if (filterEmail && filterEmail.length > 2) {
          q = `from:${filterEmail} OR to:${filterEmail}`;
      } else if (filterName && filterName.length > 2) {
          q = `"${filterName}"`;
      }

      if (q) {
          url += `?q=${encodeURIComponent(q)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails via proxy.');
      }

      const data = await response.json();
      let msgs = data.messages || [];
      setEmails(msgs);
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

  if (!isConnected) {
    return (
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <Mail className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="text-sm font-bold text-slate-800">No Email Integration connected</h2>
          <p className="text-xs text-slate-500">Connect your work account via OAuth to see related communications.</p>
          <Button onClick={handleConnect} className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1 h-8">Connect Workspace</Button>
       </div>
    );
  }

  if (error) {
     return (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center space-y-3">
           <AlertCircle className="mx-auto h-6 w-6 text-red-400" />
           <h2 className="text-xs font-bold text-red-800">Connection Error</h2>
           <p className="text-[10px] text-red-600">{error}</p>
        </div>
     );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[300px]">
       <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Mail size={16} className="text-indigo-600" />
             <h3 className="text-sm font-bold text-slate-800">Recent Communications {filterDomain ? `(${filterDomain})` : ''}</h3>
          </div>
          <Button onClick={() => fetchEmails()} variant="outline" className="h-6 w-6 p-0 rounded-md" disabled={loading}>
             <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </Button>
       </div>
       <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[300px]">
          {loading && emails.length === 0 ? (
             <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-slate-300" /></div>
          ) : emails.length === 0 ? (
             <EmptyState icon={Mail} title="No Messages" description="No recent communications found." />
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
  );
}
