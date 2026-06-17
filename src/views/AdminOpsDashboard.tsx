import React, { useState } from "react";
import {
  Activity,
  Server,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Clock,
  Terminal,
} from "lucide-react";
import { Badge } from "../lib/Badge";
import { cn } from "../lib/utils";

import WorkflowDashboard from "./ops/WorkflowDashboard";
import DLQViewer from "./ops/DLQViewer";
import ReplayUI from "./ops/ReplayUI";
import ApprovalQueue from "./ops/ApprovalQueue";
import SLAMonitor from "./ops/SLAMonitor";
import EventExplorer from "./ops/EventExplorer";

export default function AdminOpsDashboard() {
  const [activeTab, setActiveTab] = useState("workflows");

  const tabs = [
    { id: "workflows", label: "Workflows", icon: Server },
    { id: "dlq", label: "DLQ", icon: AlertTriangle },
    { id: "replay", label: "Replay Engine", icon: RotateCcw },
    { id: "approvals", label: "Approvals", icon: ShieldAlert },
    { id: "sla", label: "SLA Monitor", icon: Clock },
    { id: "events", label: "Event Explorer", icon: Terminal },
  ];

  return (
    <div className="flex-1 bg-white overflow-hidden flex flex-col">
      <div className="h-14 border-b flex items-center px-6 justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h1 className="text-sm font-black tracking-widest uppercase text-slate-800">
            Runtime Operations Center
          </h1>
          <Badge
            variant="outline"
            className="ml-2 bg-indigo-50 border-indigo-200 text-indigo-700 text-[10px]"
          >
            PHASE 5B ACTIVE
          </Badge>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b bg-slate-50/50 px-6 pt-3 flex gap-6 overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {activeTab === "workflows" && <WorkflowDashboard />}
        {activeTab === "dlq" && <DLQViewer />}
        {activeTab === "replay" && <ReplayUI />}
        {activeTab === "approvals" && <ApprovalQueue />}
        {activeTab === "sla" && <SLAMonitor />}
        {activeTab === "events" && <EventExplorer />}
      </div>
    </div>
  );
}
