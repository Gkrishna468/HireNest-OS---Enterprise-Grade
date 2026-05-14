import { useState, useEffect } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, Clock, Trash2, ArrowRight } from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationsTab({ org }: { org: any }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Simulated notification stream based on role
    const mockNotifications: Notification[] = [
      {
        id: "1",
        title: "New Requirement Awaiting Approval",
        message: "Enterprise Solutions Inc has posted a 'Senior DevOps Engineer' role. Margin governance is pending.",
        type: 'urgent',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: false,
        actionUrl: "/admin/clients"
      },
      {
        id: "2",
        title: "Candidate Submission Received",
        message: "Sarah Connor has been submitted for 'Frontend Lead' by Elite Staffing Group.",
        type: 'info',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        read: true,
        actionUrl: "/deals"
      },
      {
        id: "3",
        title: "Margin Approved",
        message: "Commercial governance for 'Cloud Architect' role was approved at 15% fixed margin.",
        type: 'success',
        timestamp: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
        read: true
      },
      {
        id: "4",
        title: "SLA Warning",
        message: "Requirement REQ-002 has been open for 48 hours without a submission. Review vendor outreach.",
        type: 'warning',
        timestamp: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
        read: false
      }
    ];

    setNotifications(mockNotifications);
  }, [org]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="text-amber-600" size={18} />;
      case 'warning': return <Clock className="text-orange-500" size={18} />;
      case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
      default: return <Info className="text-indigo-500" size={18} />;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            System Notifications
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-lg border border-indigo-100 font-mono">
              {notifications.filter(n => !n.read).length} UNREAD
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time governance alerts and commercial updates.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
          className="rounded-xl border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 h-10"
        >
          Mark all as read
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300">
             <Bell size={48} className="mb-4 opacity-20" />
             <p className="text-sm font-bold uppercase tracking-widest">Inbox Zero Reached</p>
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={cn(
                "p-5 rounded-3xl border transition-all relative overflow-hidden group",
                n.read ? "bg-white border-slate-100 opacity-75" : "bg-white border-indigo-100 shadow-xl shadow-indigo-50/50"
              )}
            >
              {!n.read && (
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
              )}
              <div className="flex gap-4">
                <div className={cn(
                  "mt-1 p-2 rounded-2xl h-fit",
                  n.type === 'urgent' ? "bg-amber-50" : (n.type === 'warning' ? "bg-orange-50" : (n.type === 'success' ? "bg-emerald-50" : "bg-indigo-50"))
                )}>
                  {getTypeIcon(n.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-slate-900 text-sm">{n.title}</h3>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => deleteNotification(n.id)} className="h-8 w-8 text-slate-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </Button>
                      {!n.read && (
                        <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} className="h-8 w-8 text-slate-300 hover:text-indigo-500">
                          <CheckCircle size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">{n.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {n.actionUrl && (
                      <Button variant="link" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 p-0 h-fit flex items-center gap-1">
                        View Details <ArrowRight size={10} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Bell size={120} />
         </div>
         <h4 className="text-sm font-black uppercase tracking-widest mb-2">Notification Preferences</h4>
         <p className="text-[11px] text-slate-400 max-w-md font-medium leading-relaxed">
           Notification tabs are now globally enabled for all OS users. 
           Real-time browser push notifications can be toggled in your individual OS settings panel.
         </p>
         <Button className="mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl">
           Configure Alerts
         </Button>
      </div>
    </div>
  );
}
