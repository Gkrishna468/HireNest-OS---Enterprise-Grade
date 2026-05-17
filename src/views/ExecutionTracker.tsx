import { useState, useEffect } from "react";
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
  Settings
} from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  Timestamp,
  orderBy
} from "firebase/firestore";

type Category = "daily" | "client" | "vendor" | "recruiter" | "candidate" | "partnership" | "product" | "sales" | "review" | "scoreboard" | "rules" | "ceo";

export default function ExecutionTracker() {
  const [activeCategory, setActiveCategory] = useState<Category>("daily");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const categories = [
    { id: "daily", label: "Daily Dashboard", icon: <CheckSquare size={16} /> },
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

  useEffect(() => {
    const q = query(collection(db, "execution_tracker"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredItems = items.filter(item => {
    if (activeTab === "active") return item.status !== "Completed" && item.category === activeCategory;
    if (activeTab === "completed") return item.status === "Completed" && item.category === activeCategory;
    if (activeTab === "pending") return item.status === "Waiting" && item.category === activeCategory;
    if (activeTab === "escalated") return item.status === "Escalated" && item.category === activeCategory;
    return item.category === activeCategory;
  });

  const seedInitialData = async () => {
    const initialData = [
      { category: "daily", title: "Review pending follow-ups", owner: "CEO", deadline: "Today 09:00", priority: "High", status: "In Progress", notes: "Daily Morning Review" },
      { category: "client", title: "Mapout Digital - Budget Confirmation", owner: "Ops", deadline: "May 20", priority: "High", status: "Waiting", notes: "Waiting for finance feedback", nextAction: "Call Roger" },
      { category: "vendor", title: "Amce Crop Test - Email Verification", owner: "SecOps", deadline: "May 18", priority: "Medium", status: "In Progress", notes: "Check official domain records", nextAction: "Verify MX records" },
      { category: "product", title: "AI Resume Parsing Optimization", owner: "Dev", deadline: "May 25", priority: "High", status: "In Progress", notes: "Testing Llama 4 matches" },
      { category: "sales", title: "GCC Client - LinkedIn Outreach", owner: "Growth", deadline: "May 19", priority: "High", status: "Waiting", notes: "Awaiting reply on demo invite" },
    ];

    try {
      for (const item of initialData) {
        await addDoc(collection(db, "execution_tracker"), {
          ...item,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      alert("Intelligence layers seeded successfully.");
    } catch (err) {
      console.error("Seeding failed", err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "In Progress" : "Completed";
    await updateDoc(doc(db, "execution_tracker", id), {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteItem = async (id: string) => {
    if (confirm("Purge this execution pulse?")) {
      await deleteDoc(doc(db, "execution_tracker", id));
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
                {activeCategory === 'review' ? (
                    <ReviewSystemView />
                ) : activeCategory === 'ceo' ? (
                    <CEOOpsView />
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
                                            <Button 
                                                onClick={seedInitialData}
                                                variant="outline" 
                                                className="mt-6 border-slate-200 rounded-xl font-black text-[9px] uppercase h-9 shadow-sm"
                                            >
                                                Seed Initial Data
                                            </Button>
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

                    <div className="bg-emerald-50 rounded-[40px] p-10 border border-emerald-100 flex flex-col gap-6">
                        <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                             <AlertCircle size={16} className="text-emerald-500" /> Daily Leadership Inquiries
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            {[
                                "What is currently blocked?",
                                "What can we automate right now?",
                                "Which follow-up creates revenue?",
                                "Execution gaps hurting scale?",
                                "Partnership leverage points?",
                                "Delayed critical modules?"
                            ].map((q, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm group hover:scale-[1.02] transition-transform">
                                    <p className="text-xs font-black text-slate-900 leading-relaxed mb-4">{q}</p>
                                    <div className="w-full h-1.5 bg-emerald-50 rounded-full overflow-hidden">
                                        <div className="w-0 h-full bg-emerald-400 group-hover:w-full transition-all duration-1000"></div>
                                    </div>
                                </div>
                            ))}
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
