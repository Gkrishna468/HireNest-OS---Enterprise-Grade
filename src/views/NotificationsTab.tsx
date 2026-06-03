import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface Notification {
  id: string;
  title: string;
  message: string;
  text?: string;
  type: "info" | "warning" | "success" | "urgent" | string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationsTab({
  org,
  role,
}: {
  org: any;
  role?: string;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !org) return;

    // Listen to personal and organization-level notifications
    const recipients = [auth.currentUser.uid];
    const orgId = org?.organizationId || org?.id;
    if (orgId) {
      recipients.push(orgId);
    }

    // Broadcast tokens based on role
    if (role) {
      if (role === "admin" || role === "super_admin" || role === "hq" || role === "ops_admin" || role === "hq_admin") recipients.push("GLOBAL_ADMIN");
      if (role.includes("client")) recipients.push("GLOBAL_CLIENT");
      if (role.includes("vendor")) recipients.push("GLOBAL_VENDOR");
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "in", recipients),
      // removed orderBy created at to avoid index error, will sort in-memory
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => {
            const docData = d.data();
            return {
              id: d.id,
              title: docData.title,
              message: docData.message,
              type: (docData.type || "info").toLowerCase(),
              timestamp: docData.createdAt?.seconds
                ? new Date(docData.createdAt.seconds * 1000).toISOString()
                : new Date().toISOString(),
              read: docData.read || false,
              actionUrl: docData.actionUrl,
              createdAt: docData.createdAt, // keeping raw for sorting
            } as Notification & { createdAt: any };
          })
          .sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        setNotifications(data as Notification[]);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "notifications");
        setLoading(false);
      },
    );

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
    const unread = notifications.filter((n) => !n.read);
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
      case "urgent":
        return <AlertTriangle className="text-amber-600" size={18} />;
      case "warning":
        return <Clock className="text-orange-500" size={18} />;
      case "success":
        return <CheckCircle className="text-emerald-500" size={18} />;
      default:
        return <Info className="text-indigo-500" size={18} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            System Notifications
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-lg border border-indigo-100 font-mono">
              {notifications.filter((n) => !n.read).length} UNREAD
            </span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Real-time governance alerts and commercial updates.
          </p>
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
            <p className="text-sm font-bold uppercase tracking-widest">
              Inbox Zero Reached
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.actionUrl) {
                  navigate(n.actionUrl);
                  return;
                }

                const fullText =
                  `${n.title || ""} ${n.text || ""} ${n.message || ""}`.toLowerCase();

                if (fullText.includes("deal room") || n.type === "DEAL_ROOM") {
                  navigate("/deal-rooms");
                } else if (
                  fullText.includes("resume") ||
                  fullText.includes("candidate") ||
                  n.type === "CANDIDATE" ||
                  n.type === "RESUME"
                ) {
                  navigate("/candidates");
                } else if (
                  fullText.includes("job") ||
                  fullText.includes("requirement") ||
                  n.type === "JOB_BROADCAST"
                ) {
                  navigate("/jobs");
                } else if (fullText.includes("vendor")) {
                  navigate("/network");
                } else if (fullText.includes("client")) {
                  navigate("/network");
                } else if (fullText.includes("match")) {
                  // Fallback for match could be jobs or candidates, Deal Room might catch it earlier.
                  navigate("/candidates");
                }
              }}
              className={cn(
                "p-5 rounded-3xl border transition-all relative overflow-hidden group cursor-pointer hover:-translate-y-1 hover:shadow-lg",
                n.read
                  ? "bg-white border-slate-100 opacity-75"
                  : "bg-white border-indigo-100 shadow-xl shadow-indigo-50/50",
              )}
            >
              {!n.read && (
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
              )}
              <div className="flex gap-4">
                <div
                  className={cn(
                    "mt-1 p-2 rounded-2xl h-fit",
                    n.type === "urgent"
                      ? "bg-amber-50"
                      : n.type === "warning"
                        ? "bg-orange-50"
                        : n.type === "success"
                          ? "bg-emerald-50"
                          : "bg-indigo-50",
                  )}
                >
                  {getTypeIcon(n.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-slate-900 text-sm">
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="h-8 w-8 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </Button>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="h-8 w-8 text-slate-300 hover:text-indigo-500"
                        >
                          <CheckCircle size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">
                    {n.message || n.text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {n.actionUrl && (
                      <Link to={n.actionUrl || "#"}>
                        <Button
                          variant="ghost"
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 p-0 h-fit flex items-center gap-1 hover:bg-transparent"
                        >
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
        <h4 className="text-sm font-black uppercase tracking-widest mb-2">
          Notification Preferences
        </h4>
        <p className="text-[11px] text-slate-400 max-w-md font-medium leading-relaxed">
          Notification tabs are now globally enabled for all OS users. Real-time
          browser push notifications can be toggled in your individual OS
          settings panel.
        </p>
        <Button
          onClick={() => setShowConfigModal(true)}
          className="mt-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl"
        >
          Configure Alerts
        </Button>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-3">
                <Bell className="text-indigo-600" size={20} />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Alert Preferences
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConfigModal(false)}
              >
                X
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Admin Alerts
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Critical system and governance notifications
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Activity Timeline Thresholds
                      </h4>
                      <p className="text-xs text-slate-500">
                        Alert when error rates exceed safe limits
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                      Default On
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        New Node Provisioning
                      </h4>
                      <p className="text-xs text-slate-500">
                        Alerts when new workspaces are created
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 uppercase font-black"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Vendor OS Alerts
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Supply chain and placement operations
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Deal Room Invites
                      </h4>
                      <p className="text-xs text-slate-500">
                        When assigned to a new enterprise deal
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                      Default On
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Candidate Status Updates
                      </h4>
                      <p className="text-xs text-slate-500">
                        When candidate moves through pipeline stages
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 uppercase font-black"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Client OS Alerts
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Hiring manager and intake notifications
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Pipeline Match Readiness
                      </h4>
                      <p className="text-xs text-slate-500">
                        When AI flags a highly compatible candidate
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                      Default On
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Invoice Generation
                      </h4>
                      <p className="text-xs text-slate-500">
                        When payment milestones are reached
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 uppercase font-black"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </section>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <Button
                onClick={() => setShowConfigModal(false)}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
