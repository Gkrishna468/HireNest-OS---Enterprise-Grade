import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CheckSquare, 
  Calendar, 
  UserPlus, 
  ShieldCheck, 
  Target, 
  Rocket, 
  TrendingUp, 
  Plus, 
  Filter, 
  Download,
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronRight,
  LayoutGrid,
  ListTodo,
  FileText,
  Settings,
  Activity,
  Zap,
  Cpu,
  Verified,
  DollarSign,
  ShieldAlert,
  AlertTriangle,
  BrainCircuit,
  Lock,
  EyeOff
} from "lucide-react";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";
import { cn } from "../lib/utils";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  orderBy,
  limit
} from "firebase/firestore";
import { runawayAgentCheck } from "../services/agentService";

type Category = "daily" | "orchestration" | "economics" | "events" | "trust" | "risk" | "briefing" | "client" | "vendor" | "recruiter" | "candidate" | "partnership" | "product" | "sales" | "review" | "scoreboard" | "rules" | "ceo" | "agents";

export default function ExecutionTracker() {
  const [activeCategory, setActiveCategory] = useState<Category>("daily");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const categories = [
    { id: "daily", label: "Daily Dashboard", icon: <CheckSquare size={16} /> },
    { id: "orchestration", label: "Orchestration Hub", icon: <Cpu size={16} /> },
    { id: "agents", label: "AI Agents (Cortex)", icon: <BrainCircuit size={16} /> },
    { id: "economics", label: "Economic HQ", icon: <DollarSign size={16} /> },
    { id: "events", label: "Global Event Bus", icon: <Activity size={16} /> },
    { id: "trust", label: "Trust Index", icon: <ShieldCheck size={16} /> },
    { id: "risk", label: "Risk Center", icon: <ShieldAlert size={16} /> },
    { id: "briefing", label: "AI Briefings", icon: <Zap size={16} /> },
    { id: "client", label: "Client Follow-up", icon: <UserPlus size={16} /> },
    { id: "vendor", label: "Vendor Verification", icon: <ShieldCheck size={16} /> },
    { id: "recruiter", label: "Recruiter Ops", icon: <ListTodo size={16} /> },
    { id: "candidate", label: "Pipeline", icon: <Target size={16} /> },
    { id: "partnership", label: "Strategy", icon: <Calendar size={16} /> },
    { id: "product", label: "Product Roadmap", icon: <Rocket size={16} /> },
    { id: "sales", label: "Outreach", icon: <TrendingUp size={16} /> },
    { id: "review", label: "Weekly Review", icon: <FileText size={16} /> },
    { id: "ceo", label: "CEO OS", icon: <Settings size={16} /> },
  ];

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchGovernanceData = async () => {
      try {
        const response = await fetch('/api/governance');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setItems(data.execution_tracker || []);
      } catch (error: any) {
        setErrorMsg(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGovernanceData();
    // v5.0 Autonomous trigger
    runawayAgentCheck();
  }, []);

  const filteredItems = items.filter(item => {
    if (activeCategory === 'daily') return true;
    return item.category === activeCategory;
  });

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "In Progress" : "Completed";
    try {
      await updateDoc(doc(db, "execution_tracker", id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `execution_tracker/${id}`);
    }
  };

  const deleteItem = async (id: string) => {
    if (confirm("Purge this execution pulse?")) {
      try {
        await deleteDoc(doc(db, "execution_tracker", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `execution_tracker/${id}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in progress': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'waiting': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'escalated': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'blocked': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-rose-600';
      case 'Medium': return 'text-amber-600';
      case 'Low': return 'text-emerald-600';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Strategic Header */}
      <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Global Governance Active</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Master Follow-Up & Execution Tracker
            </h1>
            <p className="text-slate-500 font-medium mt-1">HireNestOS Operational Control System • Systematic Scalability Engine</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="rounded-2xl border-2 border-slate-100 h-11 px-6 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Download size={14}/> Export Intelligence
             </Button>
             <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-11 px-6 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200"
              >
                <Plus size={16}/> Log Execution Item
             </Button>
          </div>
        </div>

        {/* Global Scoreboard Strip */}
        <div className="grid grid-cols-4 gap-6 mb-8">
            {[
                { label: "Client Acquisition", target: "8", current: "3", color: "indigo" },
                { label: "Vendor Growth", target: "20", current: "14", color: "emerald" },
                { label: "Execution Velocity", target: "95%", current: "82%", color: "amber" },
                { label: "Critical Escalations", target: "0", current: "2", color: "rose" }
            ].map((stat, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-slate-900">{stat.current}</span>
                            <span className="text-[10px] text-slate-400 font-bold">/ {stat.target}</span>
                        </div>
                    </div>
                    <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-${stat.color}-500`} 
                            style={{ width: `${Math.min(100, (parseInt(stat.current) / (parseInt(stat.target) || 1)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>

        {/* Nav Categories */}
        <div className="flex gap-1 bg-slate-50 p-1.5 rounded-[20px] border border-slate-100 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as Category)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                        activeCategory === cat.id 
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200 flex-1 min-w-[140px]" 
                            : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    {cat.icon}
                    <span>{cat.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-8">
        <div className="flex flex-1 bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex-col">
            {/* Context Sub-navigation */}
            <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex gap-4">
                    {["active", "pending", "completed", "escalated"].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "text-[10px] font-black uppercase tracking-widest pb-1 transition-all border-b-2",
                                activeTab === tab ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-slate-50">
                        <Filter size={14}/>
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:bg-slate-50">
                        <Download size={14}/>
                    </Button>
                </div>
            </div>

            {/* List View */}
            <div className="flex-1 overflow-y-auto">
                {errorMsg && errorMsg.includes("permissions") ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 animate-pulse border-2 border-rose-200">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic">Access Restricted</h2>
                        <p className="text-slate-500 mt-4 max-w-lg mx-auto font-medium leading-loose">
                            HireNestOS Governance Layer detected a <span className="text-rose-600 font-bold">Permission Denial</span>. 
                            The cloud security rules for <code className="bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-mono">execution_tracker</code> 
                            require manual authority alignment.
                        </p>
                        <div className="mt-8 flex gap-4">
                            <Link to="/settings">
                                <Button className="bg-slate-900 text-white rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200 hover:scale-105 transition-transform">
                                    Open Security Dashboard
                                </Button>
                            </Link>
                            <Button 
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest border-2"
                            >
                                Retry Handshake
                            </Button>
                        </div>
                    </div>
                ) : activeCategory === 'review' ? (
                    <ReviewSystemView />
                ) : activeCategory === 'ceo' ? (
                    <CEOOpsView />
                ) : activeCategory === 'orchestration' ? (
                    <OrchestrationHubView />
                ) : activeCategory === 'agents' ? (
                    <AgentOrchestrationView />
                ) : activeCategory === 'economics' ? (
                    <EconomicHQView />
                ) : activeCategory === 'events' ? (
                    <EventBusView />
                ) : activeCategory === 'trust' ? (
                    <TrustIndexView />
                ) : activeCategory === 'risk' ? (
                    <RiskCenterView />
                ) : activeCategory === 'briefing' ? (
                    <AIBriefingView />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b border-slate-100">
                            <tr>
                                <th className="pl-8 pr-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Prio</th>
                                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Task / Item</th>
                                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Owner</th>
                                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Action</th>
                                <th className="pr-8 pl-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-slate-200 mb-4 border border-slate-100 uppercase font-black italic">!</div>
                                            <p className="text-xs font-black text-slate-900 uppercase">No execution items logged</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">Deploy new strategy to the {activeCategory} layer to begin tracking.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                                        <td className="pl-8 pr-4 py-4">
                                            <div className={cn("text-[10px] font-black", getPriorityColor(item.priority))}>
                                                {item.priority.toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => toggleStatus(item.id, item.status)}
                                                    className={cn(
                                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                                        item.status === 'Completed' ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-transparent hover:border-indigo-400"
                                                    )}
                                                >
                                                    <CheckSquare size={12} />
                                                </button>
                                                <div>
                                                    <div className={cn("text-xs font-black transition-all", item.status === 'Completed' ? "text-slate-400 line-through" : "text-slate-900")}>
                                                        {item.title}
                                                    </div>
                                                    {item.notes && <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-md">{item.notes}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-black text-slate-600 uppercase italic">
                                            @{item.owner || "Unassigned"}
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-bold text-slate-500">
                                            {item.deadline || "TBD"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border", getStatusColor(item.status))}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-[10px] font-black text-indigo-600">
                                            {item.nextAction || "---"}
                                        </td>
                                        <td className="pr-8 pl-4 py-4 text-right">
                                            <button 
                                                onClick={() => deleteItem(item.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                <div className="p-8 bg-slate-900 text-white">
                    <h2 className="text-xl font-black italic tracking-tighter">NEW EXECUTION PULSE</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Global Authority Dispatch</p>
                </div>
                <form onSubmit={async (e: any) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    try {
                      await addDoc(collection(db, "execution_tracker"), {
                          category: activeCategory,
                          title: formData.get("title"),
                          priority: formData.get("priority"),
                          status: "Not Started",
                          owner: formData.get("owner"),
                          deadline: formData.get("deadline"),
                          notes: formData.get("notes"),
                          nextAction: formData.get("nextAction"),
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                      });
                      setShowAddModal(false);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.CREATE, "execution_tracker");
                    }
                }} className="p-8 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Task Title</label>
                        <input name="title" required className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" placeholder="e.g. Client Follow-up regarding..."/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Priority</label>
                            <select name="priority" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Owner</label>
                            <input name="owner" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" placeholder="@username"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Deadline</label>
                            <input name="deadline" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" placeholder="e.g. Next Mon / May 20"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Next Action</label>
                            <input name="nextAction" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" placeholder="Immediate step..."/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Context / Notes</label>
                        <textarea name="notes" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 h-24" placeholder="Additional intelligence..."/>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" onClick={() => setShowAddModal(false)} variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest">Cancel</Button>
                        <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100">Deploy Pulse</Button>
                    </div>
                </form>
              </div>
          </div>
      )}
    </div>
  );
}

function ReviewSystemView() {
    const questions = [
        { cat: "Business Growth", q: ["How many new vendors onboarded?", "How many active clients?", "How many submissions completed?", "Interview conversion ratio?", "Partnerships moved forward?"] },
        { cat: "Product Progress", q: ["Which modules shipped?", "Unresolved bugs?", "Workflow failures?", "Immediate escalation needs?"] },
        { cat: "Operational Discipline", q: ["Follow-ups missed?", "Overdue tasks?", "Delay causes?", "Automation needs?"] }
    ];

    return (
        <div className="p-8 grid grid-cols-3 gap-8">
            {questions.map((section, idx) => (
                <div key={idx} className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-6 flex items-center gap-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        {section.cat}
                    </h3>
                    <div className="space-y-4 flex-1">
                        {section.q.map((q, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-indigo-500 transition-all"></div>
                                <p className="text-[11px] font-black text-slate-800 leading-relaxed">{q}</p>
                                <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Draft Response</span>
                                    <ChevronRight size={14} className="text-slate-200"/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function EventBusView() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/governance')
            .then(r => r.json())
            .then(data => {
                setEvents(data.execution_events || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="h-full flex flex-col">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Immutable Execution Log</h2>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                   Every operational event captured in the nervous system of HireNestOS.
               </p>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-50">
                    {events.map((event) => (
                        <div key={event.id} className="p-4 hover:bg-slate-50 flex items-center gap-6 group transition-colors">
                            <div className="w-12 text-[10px] font-black text-slate-300 font-mono">
                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-3 min-w-[140px]">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    event.eventType.includes('BREACHED') ? 'bg-rose-50 text-rose-500' : 
                                    event.eventType.includes('CREATED') ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'
                                )}>
                                    <Zap size={14} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-tight",
                                    event.eventType.includes('BREACHED') ? 'text-rose-600' : 'text-slate-900'
                                )}>
                                    {event.eventType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-500 truncate block">
                                    {event.targetType.toUpperCase()}: {event.targetId} • {event.metadata?.title || "No Title"}
                                </span>
                            </div>
                            <div className="text-[9px] font-black uppercase text-indigo-600 italic px-2 py-1 bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                Actor: {event.actorType}@{event.actorId.slice(0, 5)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RiskCenterView() {
    const [risks, setRisks] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/governance')
            .then(r => r.json())
            .then(data => {
                setRisks(data.risk_assessments || []);
            });
    }, []);

    return (
        <div className="h-full flex flex-col p-8 bg-rose-50/20">
            <div className="mb-8">
               <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                   <ShieldAlert className="text-rose-500" /> Operational Risk Center
               </h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-Powered Fraud, Duplicate, & Ghosting Detection</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {risks.map((risk) => (
                    <div key={risk.id} className="bg-white rounded-3xl border border-rose-100 p-6 flex items-start gap-6 shadow-sm">
                        <div className={cn(
                            "p-4 rounded-2xl",
                            risk.riskLevel === 'Critical' ? 'bg-rose-500 text-white' :
                            risk.riskLevel === 'High' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                        )}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {risk.entityType.toUpperCase()} Detected: {risk.entityId}
                                </h3>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase",
                                    risk.riskLevel === 'Critical' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                                )}>
                                    {risk.riskLevel} IMPACT
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium mb-4 leading-relaxed">
                                {risk.aiJustification}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {risk.signals?.map((s: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase">
                                        SIGNAL: {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <Button variant="outline" className="text-[10px] h-8 font-black uppercase tracking-widest text-rose-600 border-rose-100 hover:bg-rose-50">
                            QUARANTINE
                        </Button>
                    </div>
                ))}

                {risks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30">
                        <ShieldCheck size={80} className="text-emerald-500 mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest text-emerald-900">System Secure • 0 Critical Risks Detected</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function AIBriefingView() {
    return (
        <div className="h-full flex flex-col p-12 bg-slate-900 text-white overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-12">
                    <div className="p-4 bg-indigo-500 rounded-3xl animate-pulse">
                        <BrainCircuit size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase">Intelligence Briefing</h2>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em]">Operational Narrative • Generated {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    <section>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 py-2 border-b border-white/10">Active Predictions</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] hover:bg-white/10 transition-colors cursor-pointer group">
                                <div className="text-[10px] font-black text-indigo-400 uppercase mb-4">Closure Probability</div>
                                <div className="text-4xl font-black mb-2">78.4%</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidence: 0.92 (High)</div>
                                <div className="mt-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-500 w-[78%] group-hover:animate-pulse"></div>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-8 rounded-[40px] hover:bg-white/10 transition-colors cursor-pointer group">
                                <div className="text-[10px] font-black text-rose-400 uppercase mb-4">Avg Ghosting Risk</div>
                                <div className="text-4xl font-black mb-2 text-rose-400">12.5%</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trend: ↓ 4% from last week</div>
                                <div className="mt-6 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                     <div className="h-full bg-rose-500 w-[12%]"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-indigo-600 rounded-[50px] p-12 flex items-center justify-between gap-12">
                         <div className="flex-1">
                             <h4 className="text-2xl font-black uppercase tracking-tight mb-4">Dynamic Routing Recommendation</h4>
                             <p className="text-sm font-medium leading-loose opacity-80 mb-8">
                                 AI Analysis Suggests: Requirement <span className="font-bold underline text-white">TECH-SR-039</span> should be prioritized to <span className="font-bold underline text-white">Vendor Alpha-1</span>. 
                                 Historical match accuracy is 92% higher for this specific JD cluster.
                             </p>
                             <Button className="bg-white text-indigo-600 hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl">
                                 AUTO-ORCHESTRATE EXECUTION
                             </Button>
                         </div>
                         <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                              <Target size={80} className="text-white/20" />
                         </div>
                    </section>

                    <section>
                         <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 py-2 border-b border-white/10">Strategic Insights</h3>
                         <div className="space-y-4">
                             {[
                                 { icon: <DollarSign />, title: "Margin Leakage Detected", body: "Vendor B-9 markup is consistently 4% higher than equilibrium. Negotiate payout cap.", color: "text-amber-400" },
                                 { icon: <Activity />, title: "Escalation Momentum", body: "SLA response time for Feedback in Dept-Finance is improving. Bottleneck moved to Interview Scheduling.", color: "text-emerald-400" },
                                 { icon: <Verified />, title: "Trust Gain", body: "Recruiter Janet D. reached 100% first-pass verification rate this month. Upgrade to Senior Node status.", color: "text-indigo-400" }
                             ].map((insight, i) => (
                                 <div key={i} className="flex gap-6 p-6 border-b border-white/5 hover:bg-white/5 transition-colors">
                                     <div className={cn("shrink-0", insight.color)}>
                                         {insight.icon}
                                     </div>
                                     <div>
                                         <div className="text-sm font-black uppercase tracking-tight mb-1">{insight.title}</div>
                                         <p className="text-xs text-slate-400 leading-relaxed font-medium">{insight.body}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function TrustIndexView() {
    const [metrics, setMetrics] = useState<any[]>([]);
    
    useEffect(() => {
        fetch('/api/governance')
            .then(r => r.json())
            .then(data => {
                setMetrics(data.trust_metrics || []);
            });
    }, []);

    const calculateGrade = (score: number) => {
        if (score >= 95) return { label: "AAA", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
        if (score >= 85) return { label: "AA", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
        if (score >= 70) return { label: "A", color: "text-slate-600 bg-slate-50 border-slate-100" };
        return { label: "B", color: "text-amber-600 bg-amber-50 border-amber-100" };
    };

    return (
        <div className="h-full flex flex-col p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Network Trust Memory</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Algorithmic Reputation Layer • Score = Execution Accuracy + Speed</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white min-w-[200px]">
                        <div className="text-[10px] font-black uppercase opacity-40 mb-1">Total Verified Nodes</div>
                        <div className="text-2xl font-black text-emerald-400">{metrics.length}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {metrics.map((m) => {
                    const grade = calculateGrade(m.score);
                    return (
                        <div key={m.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl shadow-slate-100/50 hover:scale-[1.02] transition-transform flex flex-col gap-6 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8">
                               <Verified size={40} className="text-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </div>
                           <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                     <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl">
                                         {m.nodeId?.slice(0, 2).toUpperCase()}
                                     </div>
                                     <div>
                                         <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{m.companyName || "Organization"}</div>
                                         <div className="text-[10px] font-bold text-slate-400 font-mono mt-1">ID: {m.nodeId}</div>
                                     </div>
                                </div>
                                <div className={cn("px-4 py-2 rounded-2xl font-black text-lg border", grade.color)}>
                                    {grade.label}
                                </div>
                           </div>

                           <div className="grid grid-cols-3 gap-4">
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Trust Score</div>
                                    <div className="text-xl font-black text-indigo-600">{m.score}%</div>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Closures</div>
                                    <div className="text-xl font-black text-emerald-600">{m.totalClosures || 0}</div>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Events Logged</div>
                                    <div className="text-xl font-black text-slate-900">{m.eventsProcessed || 0}</div>
                               </div>
                           </div>

                           <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                               <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.score}%` }}></div>
                               </div>
                               <span className="text-[9px] font-black text-slate-400 uppercase">Resilience Index</span>
                           </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function OrchestrationHubView() {
    const [requirements, setRequirements] = useState<any[]>([]);
    const [durableExecutions, setDurableExecutions] = useState<any[]>([]);
    const [agentRuntimes, setAgentRuntimes] = useState<any[]>([]);
    const [infrastructureShards, setInfrastructureShards] = useState<any[]>([]);
    const [billingLedgers, setBillingLedgers] = useState<any[]>([]);
    
    useEffect(() => {
        fetch('/api/admin/governance-data')
            .then(r => r.json())
            .then(data => {
                if (data.ok) {
                    setRequirements(data.requirements_public || data.requirements || []);
                    setDurableExecutions(data.durableExecutions || []);
                    setAgentRuntimes(data.agentRuntimePools || []);
                    setInfrastructureShards(data.tenantInfrastructureMap || []);
                    setBillingLedgers(data.billingLedgers || []);
                }
            });
    }, []);

    return (
        <div className="h-full flex flex-col p-8 bg-indigo-50/10 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Autonomous Orchestration Hub</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Durable Workflows & Agent Coordination Layer</p>
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-4">
                    <div className="text-center">
                        <div className="text-[8px] font-black opacity-40 uppercase">Durable Execs</div>
                        <div className="text-sm font-black">{durableExecutions.length} Active</div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-center">
                        <div className="text-[8px] font-black opacity-40 uppercase">Agent Runtimes</div>
                        <div className="text-sm font-black">{agentRuntimes.length} Deployed</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Durable Executions Feed */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2">Durable Workflows</h3>
                    {durableExecutions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-white border border-slate-100 rounded-3xl">No durable executions active</div>
                    ) : durableExecutions.map((exec) => (
                        <div key={exec.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 flex items-center gap-8 group hover:border-indigo-200 transition-all">
                            <div className="h-20 w-20 rounded-3xl bg-indigo-600 flex flex-col items-center justify-center text-white relative shrink-0">
                                <Cpu size={32} />
                                <div className="absolute -bottom-2 bg-slate-900 text-[10px] px-2 py-0.5 rounded shadow">
                                    {exec.partition || "GLOBAL"}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{exec.workflowType}</h3>
                                    <Badge variant="outline" className={cn("text-[9px] font-black", exec.state === 'COMPLETED' ? 'text-emerald-500' : 'text-indigo-500')}>{exec.state}</Badge>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-4">
                                    <span>ID: {exec.id}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span>History Len: {exec.history?.length || 0}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button className="bg-white text-indigo-600 border border-indigo-100 hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl">
                                    Trace
                                </Button>
                            </div>
                        </div>
                    ))}

                    <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2 mt-8">Agent Tasks</h3>
                    {agentRuntimes.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-white border border-slate-100 rounded-3xl">No multi-agent runtimes provisioned</div>
                    ) : agentRuntimes.map((agent) => (
                        <div key={agent.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 flex items-center gap-8 group hover:border-indigo-200 transition-all">
                            <div className="h-20 w-20 rounded-3xl bg-slate-900 flex flex-col items-center justify-center text-white relative shrink-0">
                                <BrainCircuit size={32} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{agent.assignedAgentRole}</h3>
                                    <Badge variant="outline" className="text-[9px] font-black">{agent.status}</Badge>
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-4 text-ellipsis overflow-hidden whitespace-nowrap max-w-[400px]">
                                    <span>Intent: {agent.intent}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button className="bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl">
                                    Inspect Tools
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Knowledge Graph Card */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-[40px] p-8 text-white">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6">Execution & Billing Metering</h3>
                        <div className="space-y-4">
                            {billingLedgers.map((b) => (
                                <div key={b.id} className="border-b border-white/5 pb-4 mb-4 line-last-hide">
                                    <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
                                        <span className="text-slate-500 font-bold uppercase">Org ID</span>
                                        <span className="font-black text-indigo-400">{b.orgId} ({b.billingPeriod})</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
                                        <span className="text-slate-500 font-bold uppercase">Workflow Executions</span>
                                        <span className="font-black text-emerald-400">{b.workflowExecutions}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
                                        <span className="text-slate-500 font-bold uppercase">Vector Operations</span>
                                        <span className="font-black text-indigo-400">{b.vectorQueries}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] py-1 border-b border-white/5">
                                        <span className="text-slate-500 font-bold uppercase">AI Compute Meter</span>
                                        <span className="font-black text-amber-400">{b.aiTokens} TKNS</span>
                                    </div>
                                </div>
                            ))}
                            {billingLedgers.length === 0 && (
                                <div className="text-center text-[10px] font-bold text-slate-500 py-4">No recent billing ledger updates.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Tenant Infrastructure Routing</h3>
                         <div className="space-y-3">
                             {infrastructureShards.map(shard => (
                                 <div key={shard.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                     <div className="flex justify-between">
                                         <span className="text-[10px] font-black text-slate-800">{shard.id}</span>
                                         <span className="text-[8px] font-black text-indigo-600 bg-white px-2 py-1 rounded shadow-sm">{shard.region}</span>
                                     </div>
                                     <div className="text-[8px] font-bold text-slate-400 uppercase">
                                         Tier: {shard.tier} | Shard ID: {shard.shardId}
                                     </div>
                                 </div>
                             ))}
                             {infrastructureShards.length === 0 && (
                                 <div className="text-center text-[10px] font-bold text-slate-500 py-4">Global Default Partition Route</div>
                             )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EconomicHQView() {
    return (
        <div className="h-full flex flex-col p-12 bg-white overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">Economic <br/> Sovereignty HQ</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Revenue Realization & Margin Infrastructure</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px] min-w-[180px]">
                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Locked Value</div>
                            <div className="text-2xl font-black text-slate-900">₹8,42,000</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[32px] min-w-[180px]">
                            <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Expected Realization</div>
                            <div className="text-2xl font-black text-slate-900">82.4%</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-8 mb-12">
                    {[
                        { label: "Margin Leakage Risk", val: "2.4%", status: "LOW", color: "text-emerald-500" },
                        { label: "Pending Collections", val: "₹1,24,000", status: "STABLE", color: "text-indigo-500" },
                        { label: "Payout Efficiency", val: "94.2%", status: "EXCELLENT", color: "text-emerald-500" }
                    ].map((stat, i) => (
                        <div key={i} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{stat.label}</div>
                            <div className={cn("text-3xl font-black tracking-tighter mb-2", stat.color)}>{stat.val}</div>
                            <Badge className="text-[8px] font-black uppercase tracking-widest">{stat.status}</Badge>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="bg-slate-900 rounded-[50px] p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <TrendingUp size={160} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-6">Revenue Realization Forecast (Next 30d)</h4>
                            <div className="flex items-end gap-2 h-40 mb-8 px-4">
                                {[45, 67, 89, 100, 78, 92, 54, 88, 76, 95].map((h, i) => (
                                    <div key={i} className="flex-1 bg-white/10 hover:bg-indigo-500 transition-all rounded-t-lg" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center py-6 border-t border-white/10">
                                <div>
                                    <div className="text-xs font-black uppercase italic">Pipeline Enterprise Value</div>
                                    <div className="text-2xl font-black text-indigo-400">₹42.5 Lacs <span className="text-[10px] text-white/40 uppercase not-italic">Weighted</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-[50px] p-10 flex flex-col justify-between">
                         <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Lock size={16} className="text-indigo-600" />
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Settlement & Escrow Engine</h4>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { node: "Vendor Alpha-1", amt: "₹1,24,000", status: "VERIFIED", date: "May 25" },
                                    { node: "Recruiter Node 42", amt: "₹45,000", status: "PENDING_SLA", date: "May 28" },
                                    { node: "Partner Global", amt: "₹5,00,000", status: "ESCROW_LOCKED", date: "Jun 01" }
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-900">{s.node}</div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{s.date}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[11px] font-black text-slate-900">{s.amt}</div>
                                            <div className="text-[7px] font-black text-indigo-600 uppercase">{s.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                         <Button variant="outline" className="w-full mt-6 rounded-2xl h-12 border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest">
                             View Transaction Ledger
                         </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AgentOrchestrationView() {
    const [activities, setActivities] = useState<any[]>([]);
    
    useEffect(() => {
        fetch('/api/admin/governance-data')
            .then(r => r.json())
            .then(data => {
                if (data.ok) setActivities(data.agent_activities || []);
            });
    }, []);

    const agents = [
        { type: "VENDOR_OPTIMIZATION", name: "Optimization Agent", color: "bg-indigo-500", desc: "Routes execution flows based on trust & latency." },
        { type: "FRAUD_SENTINEL", name: "Fraud Sentinel", color: "bg-rose-500", desc: "Monitors network for duplicate or suspicious patterns." },
        { type: "REVENUE_GUARDIAN", name: "Revenue Guardian", color: "bg-emerald-500", desc: "Protects margin integrity and realization rates." },
        { type: "EXECUTION_MOMENTUM", name: "Momentum Agent", color: "bg-amber-500", desc: "Detects stall events and triggers follow-ups." }
    ];

    return (
        <div className="h-full flex flex-col p-8 bg-slate-50/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Multi-Agent Orchestration Layer</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Autonomous Coordination Engines • Cortex v5.0 Active</p>
                </div>
                <Button className="bg-slate-900 text-white rounded-2xl h-10 px-6 font-black uppercase text-[10px] tracking-widest">
                   Force System Sync
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-8">
                {agents.map((agent) => (
                    <div key={agent.type} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-4", agent.color)}>
                            <Cpu size={20} />
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-2">{agent.name}</h3>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{agent.desc}</p>
                    </div>
                ))}
            </div>

            <div className="flex-1 bg-white rounded-[40px] border border-slate-200 overflow-hidden flex flex-col shadow-2xl">
                 <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/50">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent Activity Event Bus</h4>
                 </div>
                 <div className="flex-1 overflow-y-auto">
                    {activities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 italic font-black uppercase text-[10px] text-slate-400">
                             Listening for agent telemetry...
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {activities.map((act) => (
                                <div key={act.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center gap-6 group">
                                    <div className="w-16 text-[10px] font-black text-slate-300 font-mono">
                                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-3 min-w-[200px]">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            act.agentType === 'FRAUD_SENTINEL' ? 'bg-rose-500' : 
                                            act.agentType === 'REVENUE_GUARDIAN' ? 'bg-emerald-500' : 
                                            act.agentType === 'VENDOR_OPTIMIZATION' ? 'bg-indigo-500' : 'bg-amber-500'
                                        )} />
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{act.agentType.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-slate-600">{act.action}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={act.impactLevel === 'CRITICAL' || act.impactLevel === 'HIGH' ? 'destructive' : 'secondary'} className="text-[8px] font-black uppercase">
                                            {act.impactLevel}
                                        </Badge>
                                        <ChevronRight size={14} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
}

function CEOOpsView() {
    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 flex flex-col gap-8">
                    <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <Settings size={200} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black italic tracking-tighter mb-4">CEO Operating System</h2>
                            <p className="text-slate-400 font-medium max-w-xl mb-8 leading-relaxed">
                                High-velocity execution framework for HireNestOS leadership. 
                                Focus on systems that create scalability and eliminate manual dependencies.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    "Vendor Intelligence Hub",
                                    "Client Trust Infrastructure",
                                    "Recruiter Network Expansion",
                                    "AI Screening Accuracy",
                                    "Workflow Automation",
                                    "Verification Systems",
                                    "Margin Governance",
                                    "Scalable Operations"
                                ].map((focus, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 hover:bg-indigo-900/30 transition-colors cursor-pointer group">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                        <span className="text-xs font-black uppercase tracking-tight text-slate-300 group-hover:text-white">{focus}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-emerald-50 rounded-[40px] p-10 border border-emerald-100 flex flex-col gap-6">
                            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                                <DollarSign size={16} className="text-emerald-500" /> Revenue Infrastructure
                            </h3>
                            <div className="space-y-4">
                               <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Locked Gross Margin</div>
                                   <div className="text-2xl font-black text-slate-900">₹1,18,27,500 <span className="text-xs text-emerald-500 ml-1">↑ 12%</span></div>
                               </div>
                               <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Enterprise Value</div>
                                   <div className="text-2xl font-black text-slate-900">₹20Cr <span className="text-[10px] text-slate-400 font-bold ml-1">EST</span></div>
                               </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-[40px] p-10 border border-indigo-100 flex flex-col gap-6">
                            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500" /> SLA Governance
                            </h3>
                            <div className="space-y-4">
                               <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg response time</div>
                                   <div className="text-2xl font-black text-slate-900">4.2 <span className="text-xs text-indigo-500 ml-1">HRS</span></div>
                               </div>
                               <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active SLAs</div>
                                   <div className="text-2xl font-black text-slate-900">28 <span className="text-[10px] text-emerald-500 font-bold ml-1">0 BREACHED</span></div>
                               </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-8">
                     <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-xl">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Reminder Framework</h3>
                        <div className="space-y-6">
                            {[
                                { time: "09:00 AM", title: "Morning Review", desc: "Prioritize client/vendor tasks, check overdue items." },
                                { time: "02:00 PM", title: "Afternoon Pulse", desc: "Validate progress, escalate blockers, push responses." },
                                { time: "08:00 PM", title: "Evening Wrap", desc: "Update status, prepare next-day, log learnings." }
                            ].map((slot, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform"></div>
                                        <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
                                    </div>
                                    <div className="pb-6">
                                        <div className="text-[10px] font-black text-indigo-600 mb-1">{slot.time}</div>
                                        <div className="text-xs font-black text-slate-900 mb-1">{slot.title}</div>
                                        <div className="text-[10px] text-slate-400 font-bold leading-relaxed">{slot.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>

                     <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 italic text-slate-800 text-6xl font-black opacity-20 group-hover:translate-y-2 transition-transform select-none tracking-tighter cursor-default">
                             RULES
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 relative z-10">Execution Logic</h3>
                        <div className="space-y-4 relative z-10">
                            {[
                                "Never leave a client without response",
                                "Track every single submission",
                                "Document every vendor interaction",
                                "Define next steps for meetings",
                                "Milestone-driven roadmap",
                                "Instant escalation of misses"
                            ].map((rule, i) => (
                                <div key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-tight text-slate-400 hover:text-white transition-colors">
                                    <span className="text-indigo-500 font-mono">0{i+1}</span>
                                    {rule}
                                </div>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
