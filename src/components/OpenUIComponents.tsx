import React, { useState } from "react";
import { 
  Brain, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  Search, 
  UserCheck, 
  DollarSign, 
  Target, 
  Activity, 
  CheckCircle, 
  Info, 
  Calendar, 
  Clock, 
  MapPin, 
  Briefcase, 
  Award, 
  User, 
  Users, 
  ChevronRight, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  Clock3,
  Flame,
  Zap,
  TrendingDown,
  ShieldAlert
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { cn } from "../lib/utils";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";

// ==========================================
// TYPE DEFINITIONS
// ==========================================
export type OpenUIComponentName = 
  | "KPIGrid" 
  | "CandidateTable" 
  | "CandidateCard" 
  | "RequirementHealth" 
  | "RequirementCard" 
  | "VendorPerformance" 
  | "SubmissionTimeline" 
  | "SkillsMatrix" 
  | "AIInsight" 
  | "FollowUpCard" 
  | "TaskBoard" 
  | "RevenueCard";

export interface OpenUIComponentProps {
  component: OpenUIComponentName;
  props: any;
}

// ==========================================
// 1. KPI GRID COMPONENT
// ==========================================
export function KPIGrid({ metrics = [] }: { metrics?: Array<{ label: string; value: string | number; change?: string; trend?: "up" | "down" | "neutral"; subtitle?: string }> }) {
  const defaultMetrics = [
    { label: "Active Pipelines", value: "18 Roles", change: "+12%", trend: "up", subtitle: "SLA response stable" },
    { label: "Average Time-to-Submit", value: "3.2 Hours", change: "-25%", trend: "up", subtitle: "Target < 4.0 Hours" },
    { label: "Client Placement Fee", value: "₹2,50,000", change: "+8%", trend: "up", subtitle: "Avg billing threshold" },
    { label: "Vendor Fulfillment Rate", value: "84.2%", change: "-2.1%", trend: "down", subtitle: "Requires intervention" }
  ];

  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="openui-kpi-grid">
      {displayMetrics.map((m, idx) => (
        <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">{m.label}</span>
            {m.change && (
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
                m.trend === "up" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                m.trend === "down" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                "bg-slate-800 text-slate-400 border border-slate-700"
              )}>
                {m.change}
                {m.trend === "up" && <ArrowUpRight size={10} />}
                {m.trend === "down" && <ArrowDownRight size={10} />}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono tracking-tight">{m.value}</div>
          {m.subtitle && (
            <p className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1">
              <Activity size={10} className="text-indigo-400" />
              {m.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 2. CANDIDATE TABLE COMPONENT
// ==========================================
export function CandidateTable({ candidates = [], onAction }: { candidates?: Array<{ id: string; name: string; matchScore: number; role: string; vendor: string; skills: string[]; status: string }>; onAction?: (actionName: string, payload: any) => void }) {
  const [filterText, setFilterText] = useState("");
  const defaultCandidates = [
    { id: "CAND-0821", name: "Rohan Deshmukh", matchScore: 97, role: "Senior Frontend Engineer", vendor: "Apex Solutions", skills: ["React", "TypeScript", "Tailwind", "Next.js"], status: "MATCHED" },
    { id: "CAND-0914", name: "Ananya Nair", matchScore: 94, role: "Senior Backend Specialist", vendor: "Elite Tech Partners", skills: ["Node.js", "Express", "PostgreSQL", "Redis"], status: "REVIEW_PENDING" },
    { id: "CAND-0743", name: "Vikram Malhotra", matchScore: 89, role: "DevOps Architect", vendor: "Apex Solutions", skills: ["AWS", "Docker", "Kubernetes", "Terraform"], status: "SUBMITTED" },
    { id: "CAND-0855", name: "Sarah Fernandez", matchScore: 92, role: "Product Manager", vendor: "Global Bench Talent", skills: ["Agile", "Roadmapping", "SQL", "Jira"], status: "INTERVIEW_SCHEDULED" }
  ];

  const list = candidates.length > 0 ? candidates : defaultCandidates;
  const filteredList = list.filter(c => 
    (c.name || "").toLowerCase().includes(filterText.toLowerCase()) || 
    (c.skills || []).some(s => (s || "").toLowerCase().includes(filterText.toLowerCase())) || 
    (c.role || "").toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-4" id="openui-candidate-table">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-indigo-400" /> Candidates Pool Analysis
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Vetted bench profiles matching dynamic SLA constraints.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search candidates, skills, or roles..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <Search size={12} className="absolute right-3 top-2.5 text-slate-600" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Match Score</th>
              <th className="py-3 px-4">Role / Domain</th>
              <th className="py-3 px-4">Primary Skills</th>
              <th className="py-3 px-4">Vendor Partner</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50 text-xs">
            {filteredList.map((c) => (
              <tr key={c.id} className="hover:bg-slate-850/30 transition-all group">
                <td className="py-4 px-4 font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 text-[10px]">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="group-hover:text-indigo-400 transition-colors">{c.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">{c.id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={cn(
                    "text-xs font-mono font-black px-2 py-1 rounded-lg border",
                    c.matchScore >= 95 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    c.matchScore >= 90 ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {c.matchScore}%
                  </span>
                </td>
                <td className="py-4 px-4 text-slate-400 font-medium">{c.role}</td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {c.skills.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[9px] font-mono bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400">{s}</span>
                    ))}
                    {c.skills.length > 3 && (
                      <span className="text-[9px] font-mono text-slate-600 px-1 py-0.5">+{c.skills.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-slate-400 text-[11px] font-mono">{c.vendor}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button 
                      size="sm"
                      onClick={() => onAction && onAction("CANDIDATE_RECOMMEND", c)}
                      className="text-[10px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-widest uppercase px-3 rounded-lg"
                    >
                      Submit
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => onAction && onAction("CANDIDATE_DETAILS", c)}
                      className="text-[10px] h-7 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    >
                      Inspect
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-600 font-mono text-xs">
                  No bench profiles match the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 3. CANDIDATE CARD COMPONENT
// ==========================================
export function CandidateCard({ candidate }: { candidate?: any }) {
  const defaultCandidate = {
    id: "CAND-0821",
    name: "Rohan Deshmukh",
    matchScore: 97,
    role: "Senior Frontend Engineer",
    vendor: "Apex Solutions",
    trustScore: 92,
    experience: "6.2 Years",
    noticePeriod: "Immediate",
    currentLocation: "Pune, IN",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux Toolkit", "REST APIs", "Jest", "Vite"],
    summary: "High-caliber frontend architect specializing in modular design systems, dynamic routing, and performant state managers. Proven track record at Apex Solutions delivering high-uptime dashboards.",
    salaryExpectation: "₹18,00,000 LPA",
    gapAnalysis: "Fully matches frontend tech stack. Slight gap in AWS serverless deployment, but has solid local container experience."
  };

  const data = candidate || defaultCandidate;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6" id="openui-candidate-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-850">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-lg font-mono">
            {data.name.split(" ").map((n: any) => n[0]).join("")}
          </div>
          <div>
            <h3 className="text-md font-black text-white uppercase">{data.name}</h3>
            <p className="text-[10px] text-slate-500 font-mono">{data.id} • Supplied by <span className="text-indigo-400">{data.vendor}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center min-w-20">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">MATCH SCORE</span>
            <span className="text-base font-black text-emerald-400 font-mono">{data.matchScore}%</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center min-w-20">
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">TRUST INDEX</span>
            <span className="text-base font-black text-indigo-400 font-mono">{data.trustScore}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">EXPERIENCE</span>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-1">
            <Briefcase size={12} className="text-indigo-400" /> {data.experience}
          </span>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">NOTICE PERIOD</span>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-1">
            <Clock size={12} className="text-indigo-400" /> {data.noticePeriod}
          </span>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">LOCATION</span>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-1">
            <MapPin size={12} className="text-indigo-400" /> {data.currentLocation}
          </span>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">COMPENSATION</span>
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-1">
            <DollarSign size={12} className="text-indigo-400" /> {data.salaryExpectation}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technical Narrative Summary</h4>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">{data.summary}</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Skills Core Normalization</h4>
        <div className="flex flex-wrap gap-1.5">
          {data.skills.map((s: string, idx: number) => (
            <span key={idx} className="text-[10px] font-mono bg-slate-950 border border-slate-850 px-3 py-1 rounded-full text-slate-300 font-medium">{s}</span>
          ))}
        </div>
      </div>

      {data.gapAnalysis && (
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-lg space-y-1">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
            <Brain size={12} /> AI Copilot Fitment Assessment
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">{data.gapAnalysis}</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. REQUIREMENT HEALTH COMPONENT (With charts!)
// ==========================================
export function RequirementHealth({ requirements = [] }: { requirements?: Array<{ id: string; title: string; client: string; daysOpen: number; matchCount: number; status: string; risk: "Low" | "Medium" | "High"; slaBreachHours?: number }> }) {
  const defaultReqs = [
    { id: "REQ-1024", title: "Lead Fullstack Dev", client: "Zeta Global", daysOpen: 14, matchCount: 1, status: "OPEN", risk: "High", slaBreachHours: 36 },
    { id: "REQ-1011", title: "Senior Python Analyst", client: "Kora Capital", daysOpen: 8, matchCount: 5, status: "OPEN", risk: "Medium", slaBreachHours: 0 },
    { id: "REQ-0985", title: "Cloud Security Specialist", client: "SecureSphere", daysOpen: 3, matchCount: 8, status: "OPEN", risk: "Low", slaBreachHours: 0 },
    { id: "REQ-1050", title: "Lead AI Engineer", client: "Aether AI", daysOpen: 19, matchCount: 2, status: "OPEN", risk: "High", slaBreachHours: 12 }
  ];

  const list = requirements.length > 0 ? requirements : defaultReqs;

  // Chart data calculation
  const chartData = [
    { name: "Risk: High", value: list.filter(r => r.risk === "High").length, color: "#f43f5e" },
    { name: "Risk: Medium", value: list.filter(r => r.risk === "Medium").length, color: "#fbbf24" },
    { name: "Risk: Low", value: list.filter(r => r.risk === "Low").length, color: "#10b981" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="openui-requirement-health">
      
      {/* Visual Analytics */}
      <div className="lg:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-rose-500 animate-pulse" /> Risk Distribution
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">SLA pipelines segmented by risk factor indicators.</p>
        </div>

        <div className="h-44 w-full flex items-center justify-center py-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "8px" }}
                itemStyle={{ color: "#f1f5f9", fontSize: "11px", fontFamily: "monospace" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                {d.name}
              </span>
              <span className="font-bold text-white font-mono">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SLA Risk Table */}
      <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Urgent Action Pipelines</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Live pipelines exhibiting critical sourcing stagnation.</p>
        </div>

        <div className="space-y-3">
          {list.map((r, idx) => (
            <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-slate-800 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{r.title}</span>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase">{r.id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1"><Building size={10} /> {r.client}</span>
                  <span>•</span>
                  <span>Open: <strong className="text-slate-300">{r.daysOpen} days</strong></span>
                  <span>•</span>
                  <span>Matched: <strong className="text-slate-300">{r.matchCount} candidates</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {r.slaBreachHours && r.slaBreachHours > 0 ? (
                  <span className="text-[9px] font-mono bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md border border-rose-500/20 font-black animate-pulse flex items-center gap-1">
                    <Flame size={10} /> SLA BREACH: {r.slaBreachHours}H
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 font-black">
                    SLA STABLE
                  </span>
                )}
                
                <span className={cn(
                  "text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-full",
                  r.risk === "High" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  r.risk === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}>
                  {r.risk} Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 5. REQUIREMENT CARD COMPONENT
// ==========================================
export function RequirementCard({ requirement }: { requirement?: any }) {
  const defaultReq = {
    id: "REQ-1024",
    title: "Lead Fullstack Dev",
    client: "Zeta Global",
    status: "OPEN",
    priority: "CRITICAL",
    targetCTC: "₹24,00,000 LPA max",
    experienceRequired: "8+ Years",
    requiredSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS S3/Lambda"],
    sourcingGoal: 15,
    currentSourcedCount: 6,
    summary: "Need a comprehensive fullstack lead capable of orchestrating serverless infrastructure on AWS and building robust modular web app components in React/TypeScript.",
    slaDays: 7,
    remainingHours: 18
  };

  const data = requirement || defaultReq;
  const progressPercent = Math.min(100, Math.round((data.currentSourcedCount / data.sourcingGoal) * 100));

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6" id="openui-requirement-card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-850">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-md font-black text-white uppercase">{data.title}</h3>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black uppercase">{data.priority}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">{data.id} • Assigned client <strong className="text-slate-300">{data.client}</strong></p>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/15 p-3 rounded-lg flex items-center gap-2">
          <Clock3 size={16} className="text-rose-500 animate-pulse" />
          <div>
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">SLA REMAINING</span>
            <span className="text-xs font-mono font-black text-rose-400">{data.remainingHours} Hours</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">EXPERIENCE CORE</span>
          <span className="text-xs font-bold text-slate-200 mt-1 block">{data.experienceRequired}</span>
        </div>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-850">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">COMPENSATION BAND</span>
          <span className="text-xs font-bold text-slate-200 mt-1 block">{data.targetCTC}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Role Scope</h4>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">{data.summary}</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Required Skills Benchmark</h4>
        <div className="flex flex-wrap gap-1.5">
          {data.requiredSkills.map((s: string, idx: number) => (
            <span key={idx} className="text-[10px] font-mono bg-slate-950 border border-slate-850 px-3 py-1 rounded-full text-indigo-400 font-bold">{s}</span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sourcing Pipeline Goal</span>
          <span className="font-mono text-slate-300">{data.currentSourcedCount} / {data.sourcingGoal} Sourced ({progressPercent}%)</span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. VENDOR PERFORMANCE COMPONENT
// ==========================================
export function VendorPerformance({ vendors = [] }: { vendors?: Array<{ id: string; name: string; trustScore: number; benchSize: number; submittedCount: number; placedCount: number; rejectRate: number; compliance: boolean }> }) {
  const defaultVendors = [
    { id: "VEN-01", name: "Apex Solutions", trustScore: 92, benchSize: 45, submittedCount: 18, placedCount: 4, rejectRate: 12, compliance: true },
    { id: "VEN-02", name: "Elite Tech Partners", trustScore: 84, benchSize: 32, submittedCount: 14, placedCount: 2, rejectRate: 24, compliance: true },
    { id: "VEN-03", name: "Global Bench Talent", trustScore: 71, benchSize: 19, submittedCount: 8, placedCount: 0, rejectRate: 48, compliance: false },
    { id: "VEN-04", name: "Swift Hiring Inc", trustScore: 88, benchSize: 28, submittedCount: 11, placedCount: 3, rejectRate: 15, compliance: true }
  ];

  const list = vendors.length > 0 ? vendors : defaultVendors;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4" id="openui-vendor-performance">
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Award size={16} className="text-indigo-400" /> Vendor Intelligence Audit
        </h3>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Bench partner delivery audit and compliance validation.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <th className="py-3 px-4">Vendor Partner</th>
              <th className="py-3 px-4 text-center">Trust Score</th>
              <th className="py-3 px-4 text-center">Bench Size</th>
              <th className="py-3 px-4 text-center">Submissions</th>
              <th className="py-3 px-4 text-center">Placed</th>
              <th className="py-3 px-4 text-center">CV Reject %</th>
              <th className="py-3 px-4 text-right">SLA Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50 text-xs font-mono">
            {list.map((v) => (
              <tr key={v.id} className="hover:bg-slate-850/30 transition-all">
                <td className="py-4 px-4 font-bold text-slate-200 font-sans">
                  <div>{v.name}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{v.id}</div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={cn(
                    "font-black text-xs px-2 py-0.5 rounded-md",
                    v.trustScore >= 90 ? "text-emerald-400 bg-emerald-500/10" :
                    v.trustScore >= 80 ? "text-indigo-400 bg-indigo-500/10" :
                    "text-rose-400 bg-rose-500/10 animate-pulse"
                  )}>
                    {v.trustScore}
                  </span>
                </td>
                <td className="py-4 px-4 text-center text-slate-300 font-bold">{v.benchSize}</td>
                <td className="py-4 px-4 text-center text-slate-400">{v.submittedCount}</td>
                <td className="py-4 px-4 text-center text-emerald-400 font-bold">{v.placedCount}</td>
                <td className="py-4 px-4 text-center text-rose-400">{v.rejectRate}%</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end items-center gap-1.5">
                    {v.compliance ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 text-[9px] font-black tracking-wider uppercase">
                        <CheckCircle2 size={10} /> Active Compliant
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 text-[9px] font-black tracking-wider uppercase animate-pulse">
                        <ShieldAlert size={10} /> Audit Flagged
                      </Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 7. SUBMISSION TIMELINE COMPONENT
// ==========================================
export function SubmissionTimeline({ timeline = [] }: { timeline?: Array<{ stage: string; date: string; description: string; active: boolean }> }) {
  const defaultTimeline = [
    { stage: "Candidate Normalization", date: "Sep 15, 10:00 AM", description: "Bench resume processed and verified for trust alignment.", active: true },
    { stage: "Requirement Semantic Fit", date: "Sep 15, 11:30 AM", description: "Automated match score triggered. Confidence evaluated at 96%.", active: true },
    { stage: "Recruiter Validation Override", date: "Sep 15, 02:15 PM", description: "Override executed. Candidate successfully queued for client submission.", active: true },
    { stage: "Client Submission Dispatched", date: "Sep 16, 09:30 AM", description: "Candidate packet formally dispatched to Zeta Global.", active: true },
    { stage: "Technical Interview Loop", date: "Sep 17, 03:00 PM", description: "Interview loop pending coordination.", active: false }
  ];

  const list = timeline.length > 0 ? timeline : defaultTimeline;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6" id="openui-submission-timeline">
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-indigo-400" /> Sourcing Submission Ledger
        </h3>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Auditable progression history of the candidate file.</p>
      </div>

      <div className="relative pl-6 space-y-6 border-l border-slate-800">
        {list.map((item, idx) => (
          <div key={idx} className="relative">
            {/* Dot indicator */}
            <span className={cn(
              "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 flex items-center justify-center",
              item.active 
                ? "bg-indigo-600 border-slate-900 ring-2 ring-indigo-500/20" 
                : "bg-slate-950 border-slate-900 text-slate-700"
            )}>
              {item.active && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </span>

            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className={cn(
                  "text-xs font-black uppercase tracking-wider",
                  item.active ? "text-slate-200" : "text-slate-500"
                )}>
                  {item.stage}
                </h4>
                <span className="text-[9px] font-mono text-slate-500">{item.date}</span>
              </div>
              <p className={cn(
                "text-xs leading-relaxed font-medium",
                item.active ? "text-slate-400" : "text-slate-600"
              )}>
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 8. SKILLS MATRIX COMPONENT (With visual bars!)
// ==========================================
export function SkillsMatrix({ data = [] }: { data?: Array<{ skill: string; weight: number; matchPercent: number; isMissing: boolean }> }) {
  const defaultData = [
    { skill: "React Architecture", weight: 5, matchPercent: 100, isMissing: false },
    { skill: "TypeScript Normalization", weight: 4, matchPercent: 95, isMissing: false },
    { skill: "State Management (Redux)", weight: 3, matchPercent: 100, isMissing: false },
    { skill: "Webpack/Vite Custom Bundling", weight: 3, matchPercent: 80, isMissing: false },
    { skill: "AWS Serverless (Lambda)", weight: 4, matchPercent: 20, isMissing: true },
    { skill: "Automated Testing (Jest/RTL)", weight: 2, matchPercent: 90, isMissing: false }
  ];

  const list = data.length > 0 ? data : defaultData;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4" id="openui-skills-matrix">
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Brain size={16} className="text-indigo-400" /> Skill Matrix Gap Assessment
        </h3>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Granular validation of requested benchmarks against normal candidate vectors.</p>
      </div>

      <div className="space-y-4">
        {list.map((item, idx) => (
          <div key={idx} className="space-y-1.5 p-3 bg-slate-950 rounded-lg border border-slate-850/50">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="flex items-center gap-2">
                {item.isMissing ? (
                  <XCircle size={12} className="text-rose-500 animate-pulse" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                )}
                <span className={cn(item.isMissing ? "text-rose-400 font-bold" : "text-slate-200")}>{item.skill}</span>
              </span>
              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
                <span>Weight: <strong className="text-slate-300">{item.weight}/5</strong></span>
                <span>•</span>
                <span className={cn("font-bold", item.isMissing ? "text-rose-400" : "text-emerald-400")}>{item.matchPercent}% matched</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  item.isMissing ? "bg-rose-500/80" : 
                  item.matchPercent >= 90 ? "bg-emerald-500" : 
                  item.matchPercent >= 60 ? "bg-indigo-500" : "bg-amber-500"
                )} 
                style={{ width: `${item.matchPercent}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 9. AI INSIGHT COMPONENT
// ==========================================
export function AIInsight({ title, content, riskLevel = "low", nextSteps = [] }: { title?: string; content?: string; riskLevel?: "low" | "medium" | "high"; nextSteps?: string[] }) {
  const defaultTitle = "Recruiter Operations Briefing";
  const defaultContent = "SLA metrics indicate Zeta Global has 1 high-risk requirement at risk of breach due to sparse candidate submissions fromApex Solutions. We recommend executing an immediate sourcing override using global candidate pool indexes.";
  const defaultSteps = [
    "Execute search query on CandidatePool matching 'React + TypeScript'",
    "Engage Apex Solutions vendor coordinator regarding trust index updates",
    "Prepare secondary priority ledger routing to Elite Tech partners"
  ];

  return (
    <div className={cn(
      "p-6 border rounded-xl space-y-4",
      riskLevel === "high" ? "bg-rose-500/5 border-rose-500/15" :
      riskLevel === "medium" ? "bg-amber-500/5 border-amber-500/15" :
      "bg-indigo-500/5 border-indigo-500/15"
    )} id="openui-ai-insight">
      <div className="flex gap-3 items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border",
          riskLevel === "high" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
          riskLevel === "medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
          "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
        )}>
          <Sparkles size={14} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{title || defaultTitle}</h3>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{riskLevel} Risk severity index</p>
        </div>
      </div>

      <div className="text-xs text-slate-300 leading-relaxed font-medium">
        {content || defaultContent}
      </div>

      {(nextSteps.length > 0 || defaultSteps.length > 0) && (
        <div className="space-y-2 pt-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Action Plan Tasks:</span>
          <div className="space-y-1.5">
            {(nextSteps.length > 0 ? nextSteps : defaultSteps).map((step, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs font-mono text-slate-400">
                <span className="w-4 h-4 rounded bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0 text-[10px] text-indigo-400 font-bold">{idx + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 10. FOLLOW-UP CARD COMPONENT
// ==========================================
export function FollowUpCard({ task, onComplete }: { task?: any; onComplete?: () => void }) {
  const defaultTask = {
    id: "TASK-4412",
    title: "Review Candidate Rohan Deshmukh with Zeta Global hiring manager",
    dueDate: "Sep 18, 05:00 PM",
    requirement: "Lead Fullstack Dev (REQ-1024)",
    priority: "URGENT",
    assignedTo: "HQ Ops Lead"
  };

  const t = task || defaultTask;

  return (
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700 transition-all" id="openui-follow-up-card">
      <div className="space-y-1.5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded uppercase">{t.id}</span>
          <span className={cn(
            "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase",
            t.priority === "URGENT" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-400"
          )}>
            {t.priority}
          </span>
        </div>
        <h4 className="text-xs font-black text-slate-200 leading-snug">{t.title}</h4>
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1"><Target size={10} /> {t.requirement}</span>
          <span className="flex items-center gap-1"><Calendar size={10} /> Due: {t.dueDate}</span>
        </div>
      </div>

      <Button 
        onClick={onComplete}
        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-widest uppercase px-4 py-2 rounded-lg self-end sm:self-center shrink-0"
      >
        Dismiss / Done
      </Button>
    </div>
  );
}

// ==========================================
// 11. TASK BOARD COMPONENT
// ==========================================
export function TaskBoard({ columns = [] }: { columns?: Array<{ name: string; cards: Array<{ id: string; title: string; subtitle?: string; priority?: string }> }> }) {
  const defaultColumns = [
    {
      name: "Needs Sourcing (2)",
      cards: [
        { id: "REQ-1024", title: "Lead Fullstack Dev", subtitle: "Zeta Global • High Priority", priority: "URGENT" },
        { id: "REQ-1050", title: "Lead AI Engineer", subtitle: "Aether AI • 19 days open", priority: "HIGH" }
      ]
    },
    {
      name: "Awaiting Feedback (1)",
      cards: [
        { id: "CAND-0914", title: "Ananya Nair (Fitment Audit)", subtitle: "Zeta Global • Interview looping", priority: "MEDIUM" }
      ]
    },
    {
      name: "Completed SLA (2)",
      cards: [
        { id: "REQ-0985", title: "Cloud Security Specialist", subtitle: "Sourced 8/15 goal • Completed", priority: "LOW" },
        { id: "CAND-0821", title: "Rohan Deshmukh Placement", subtitle: "Placed at Zeta Global", priority: "LOW" }
      ]
    }
  ];

  const boardColumns = columns.length > 0 ? columns : defaultColumns;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="openui-task-board">
      {boardColumns.map((col, idx) => (
        <div key={idx} className="bg-slate-950 rounded-xl border border-slate-900 p-4 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">{col.name}</span>
            <span className="text-[10px] font-mono text-slate-600">{col.cards.length} items</span>
          </div>

          <div className="space-y-3">
            {col.cards.map((card) => (
              <div key={card.id} className="p-4 bg-slate-900 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase">{card.id}</span>
                  {card.priority && (
                    <span className={cn(
                      "text-[8px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                      card.priority === "URGENT" || card.priority === "HIGH" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-850 text-slate-500"
                    )}>
                      {card.priority}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-200 leading-relaxed">{card.title}</h4>
                {card.subtitle && <p className="text-[10px] text-slate-500 font-mono">{card.subtitle}</p>}
              </div>
            ))}
            {col.cards.length === 0 && (
              <div className="text-center py-8 text-slate-800 text-[11px] font-mono">Column is empty.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// 12. REVENUE CARD COMPONENT (With visual graphs!)
// ==========================================
export function RevenueCard({ stats }: { stats?: any }) {
  const defaultStats = {
    projected: 1200000,
    uninvoiced: 350000,
    collected: 850000,
    chartData: [
      { month: "May", Revenue: 340000 },
      { month: "Jun", Revenue: 450000 },
      { month: "Jul", Revenue: 580000 },
      { month: "Aug", Revenue: 720000 },
      { month: "Sep", Revenue: 850000 }
    ]
  };

  const data = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="openui-revenue-card">
      <div className="lg:col-span-1 space-y-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Collected Revenue YTD</span>
          <div className="text-3xl font-black text-emerald-400 font-mono">₹{data.collected.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-mono">Total cash cleared through submissions billing ledger.</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Uninvoiced / Outstanding</span>
          <div className="text-2xl font-black text-amber-500 font-mono">₹{data.uninvoiced.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-mono">Completed placements awaiting invoices generation.</p>
        </div>
      </div>

      <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" /> Revenue Trajectory
          </h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Month-on-month placement commission values.</p>
        </div>

        <div className="h-44 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#475569" fontSize={10} fontFamily="monospace" />
              <YAxis stroke="#475569" fontSize={10} fontFamily="monospace" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "8px" }}
                itemStyle={{ color: "#f1f5f9", fontSize: "11px", fontFamily: "monospace" }}
              />
              <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CENTRAL COMPONENT ROUTER / RENDERER
// ==========================================
export function OpenUIRenderer({ component, props, onAction }: { component: OpenUIComponentName; props: any; onAction?: (actionName: string, payload: any) => void }) {
  switch (component) {
    case "KPIGrid":
      return <KPIGrid {...props} />;
    case "CandidateTable":
      return <CandidateTable {...props} onAction={onAction} />;
    case "CandidateCard":
      return <CandidateCard {...props} />;
    case "RequirementHealth":
      return <RequirementHealth {...props} />;
    case "RequirementCard":
      return <RequirementCard {...props} />;
    case "VendorPerformance":
      return <VendorPerformance {...props} />;
    case "SubmissionTimeline":
      return <SubmissionTimeline {...props} />;
    case "SkillsMatrix":
      return <SkillsMatrix {...props} />;
    case "AIInsight":
      return <AIInsight {...props} />;
    case "FollowUpCard":
      return <FollowUpCard {...props} onComplete={() => onAction && onAction("TASK_COMPLETE", props.task)} />;
    case "TaskBoard":
      return <TaskBoard {...props} />;
    case "RevenueCard":
      return <RevenueCard {...props} />;
    default:
      return (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono text-slate-500 text-xs">
          <AlertCircle size={16} className="text-amber-500 mx-auto mb-2" />
          Unrecognized OpenUI Component: {component}
        </div>
      );
  }
}
