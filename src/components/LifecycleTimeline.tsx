import React from 'react';
import { CheckCircle2, Clock, Zap, AlertCircle, Mail, User, Briefcase, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TimelineEvent {
  id: string;
  type: 'INTAKE' | 'MATCH' | 'SUBMISSION' | 'INTERVIEW' | 'OFFER' | 'REJECTION' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'ACTIVE';
  meta?: any;
}

interface LifecycleTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function LifecycleTimeline({ events, className }: LifecycleTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'INTAKE': return <Mail size={14} className="text-indigo-500" />;
      case 'MATCH': return <Zap size={14} className="text-amber-500" />;
      case 'SUBMISSION': return <Briefcase size={14} className="text-emerald-500" />;
      case 'INTERVIEW': return <Calendar size={14} className="text-purple-500" />;
      case 'OFFER': return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'REJECTION': return <AlertCircle size={14} className="text-rose-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className={cn("space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100", className)}>
      {events.map((event, idx) => (
        <div key={event.id} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
          <div className={cn(
            "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white shadow-sm",
            event.status === 'COMPLETED' ? "border-emerald-500" : 
            event.status === 'ACTIVE' ? "border-indigo-500 animate-pulse" : "border-slate-200"
          )}>
            {getIcon(event.type)}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">{event.title}</h4>
              <span className="text-[10px] font-mono font-bold text-slate-400">{event.timestamp}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{event.description}</p>
            
            {event.meta && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(event.meta).map(([key, val]) => (
                  <span key={key} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-400 uppercase tracking-widest">
                    {key}: {String(val)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
