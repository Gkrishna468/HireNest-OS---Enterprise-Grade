import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, AlertCircle, TrendingUp, CheckCircle, Clock, FileText, Database, GitMerge, FileQuestion, Users } from 'lucide-react';
import { auth } from '../lib/firebase';
import { Badge } from '../lib/Badge';
import { Button } from '../lib/Button';
import { EmptyState } from '../components/EmptyState';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';

export default function InboxTab() {
  const [metrics, setMetrics] = useState<any>({});
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const [metricsRes, queueRes, auditRes] = await Promise.all([
        fetch('/api/workspace/intake/metrics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workspace/intake/review-queue', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workspace/intake/audit', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [metricsData, queueData, auditData] = await Promise.all([
        metricsRes.json(),
        queueRes.json(),
        auditRes.json()
      ]);

      setMetrics(metricsData.metrics || {});
      setReviewQueue(queueData.queue || []);
      setAuditLogs(auditData.audit || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
      setSyncing(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch('/api/workspace/mailos/sync', { 
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` } 
        });
        await fetchDashboardData();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSyncing(false);
      }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#F8FAFC]">
      <header className="p-6 bg-white border-b border-slate-200">
         <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                 <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Database size={24} />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Intake Dashboard</h1>
                    <p className="text-sm text-slate-500 font-medium">Universal Intake Platform</p>
                 </div>
             </div>
             <Button onClick={handleSync} disabled={syncing} className="gap-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-5 py-2.5 shadow-sm text-sm font-bold">
                 <RefreshCw size={16} className={cn(syncing && "animate-spin")} />
                 {syncing ? 'Processing Intake...' : 'Sync Channels'}
             </Button>
         </div>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-semibold text-sm">{error}</span>
            </div>
        )}

        {/* METRICS ROW */}
        <section>
            <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase mb-4">Today's Intake</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <Mail size={20} className="text-slate-400 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.source_gmail || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Emails</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <FileText size={20} className="text-emerald-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.type_requirement || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Requirements</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <Users size={20} className="text-blue-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.type_candidate || metrics.type_resume || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Candidates</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <CheckCircle size={20} className="text-purple-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.status_success || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Processed</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <FileQuestion size={20} className="text-orange-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.status_manual_review || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Review</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <GitMerge size={20} className="text-slate-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.status_duplicate || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Duplicates</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <AlertCircle size={20} className="text-red-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{metrics.status_failed || 0}</span>
                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Failures</span>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MANUAL REVIEW QUEUE */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileQuestion size={16} className="text-orange-500" />
                        Needs Review
                    </h3>
                    <Badge className="bg-orange-100 text-orange-700 border-none font-bold">{reviewQueue.length}</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {reviewQueue.length === 0 ? (
                        <EmptyState icon={CheckCircle} title="All Caught Up" description="No items require manual review." />
                    ) : (
                        <div className="space-y-2 p-2">
                            {reviewQueue.map(item => (
                                <div key={item.id} className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 transition-colors bg-white group cursor-pointer shadow-sm">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={cn(
                                                    "text-[10px] uppercase font-black tracking-wider border-none",
                                                    item.confidence < 50 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                                )}>
                                                    {item.classificationType} - {item.confidence}% Conf
                                                </Badge>
                                                <span className="text-xs text-slate-500 font-medium capitalize">{item.source}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.envelopeSummary?.subject || '(No Subject)'}</h4>
                                            <p className="text-xs text-slate-500 font-medium truncate">{item.envelopeSummary?.sender}</p>
                                        </div>
                                        <Button className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold">
                                            Review
                                        </Button>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs font-medium text-slate-600 flex items-center gap-2">
                                        <AlertCircle size={14} className="text-slate-400" />
                                        {item.reason}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* INTAKE AUDIT LOG */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        Intake Audit
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {auditLogs.length === 0 ? (
                        <EmptyState icon={Database} title="No Logs Yet" description="Process intake to see audit logs." />
                    ) : (
                        <div className="space-y-2 p-2">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn(
                                                "text-[9px] uppercase font-black tracking-widest border-none",
                                                log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-800" :
                                                log.status === 'DUPLICATE' ? "bg-slate-200 text-slate-700" :
                                                "bg-orange-100 text-orange-700"
                                            )}>
                                                {log.status}
                                            </Badge>
                                            <span className="text-xs text-slate-400 font-mono">{log.correlationId}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.executionTimeMs}ms</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 mb-2">
                                        <span className="capitalize">{log.source}</span> Intake Processed
                                    </div>
                                    {log.createdEntities && log.createdEntities.length > 0 && (
                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Created:</span>
                                            {log.createdEntities.map((entity: any, i: number) => (
                                                <Badge key={i} className="bg-white border-slate-200 text-slate-600 text-[10px] font-bold">
                                                    {entity.type}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
}
