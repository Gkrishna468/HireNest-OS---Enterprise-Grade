import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Info, AlertTriangle, CheckCircle, Clock, Trash2, ArrowRight } from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || !org) return;

    // Listen to personal and organization-level notifications
    const q = query(
      collection(db, "notifications"), 
      where("recipientId", "in", [auth.currentUser.uid, org.organizationId])
      // removed orderBy created at to avoid index error, will sort in-memory
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return {
          id: d.id,
          title: docData.title,
          message: docData.message,
          type: (docData.type || 'info').toLowerCase(),
          timestamp: docData.createdAt?.seconds ? new Date(docData.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
          read: docData.read || false,
          actionUrl: docData.actionUrl,
          createdAt: docData.createdAt // keeping raw for sorting
        } as Notification & { createdAt: any };
      }).sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(data as Notification[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "notifications");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [org]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `notifications/${id}`);
    }
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
          onClick={markAllAsRead}
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
                      <Link to={n.actionUrl}>
                        <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 p-0 h-fit flex items-center gap-1 hover:bg-transparent">
                          View Details <ArrowRight size={10} />
                        </Button>
                      </Link>
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
