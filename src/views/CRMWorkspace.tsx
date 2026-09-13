import React, { useState, useEffect } from "react";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  FileText,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Bot,
  AlertCircle,
  Plus,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  CRMService,
  CRMOpportunityEntity,
  CRMContactEntity,
  CRMOutreachDraftEntity,
  ClientService,
  ClientEntity,
  RequirementService,
} from "../core/services";
import { HiringSignalService } from "../core/intelligence";
import { HireNestAccessContext } from "../core/types";
import { getPermissionsForRole, normalizeRole, isRoleAdminEquivalent } from "../lib/rbac";
import { useSystemStore } from "../stores/SystemStore";

export default function CRMWorkspace({ userRole, orgId }: { userRole?: string; orgId?: string }) {
  const { user } = useSystemStore();
  const [activeTab, setActiveTab] = useState<"pipeline" | "accounts" | "contacts" | "signals" | "sdr" | "delivery">("pipeline");
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<CRMOpportunityEntity[]>([]);
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const [contacts, setContacts] = useState<CRMContactEntity[]>([]);
  const [hiringSignals, setHiringSignals] = useState<any[]>([]);
  const [sdrDrafts, setSdrDrafts] = useState<CRMOutreachDraftEntity[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<CRMOpportunityEntity | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Construct standard HireNestAccessContext
  const currentRole = normalizeRole(userRole || "BUSINESS_OPERATIONS");
  const accessContext: HireNestAccessContext = {
    uid: user?.uid || "usr-current",
    email: user?.email || "operator@hirenest.os",
    role: currentRole,
    organizationId: orgId || "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole(currentRole),
    isAdminEquivalent: isRoleAdminEquivalent(currentRole),
    status: "ACTIVE",
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Opportunities
      const opps = await CRMService.listOpportunities(accessContext);
      if (opps.length > 0) {
        setOpportunities(opps);
      } else {
        // Fallback initial dataset if collection is empty
        const initialOpps: CRMOpportunityEntity[] = [
          {
            id: "OPP-101",
            clientId: "CLIENT-ACME",
            clientName: "Acme Cloud Technologies",
            title: "10x Senior Full-Stack Engineering Pod",
            stage: "NEGOTIATION",
            dealValue: 180000,
            probability: 80,
            expectedRevenue: 144000,
            targetRoles: ["React", "TypeScript", "Node.js", "Kubernetes"],
            positionsCount: 10,
            ownerId: accessContext.uid,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "OPP-102",
            clientId: "CLIENT-NEXUS",
            clientName: "Nexus BioHealth",
            title: "GenAI & ML Infrastructure Contract",
            stage: "PROPOSAL_SENT",
            dealValue: 120000,
            probability: 60,
            expectedRevenue: 72000,
            targetRoles: ["Python", "PyTorch", "GCP Vertex AI"],
            positionsCount: 4,
            ownerId: accessContext.uid,
            createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "OPP-103",
            clientId: "CLIENT-FINCORP",
            clientName: "FinCorp Global",
            title: "Core Banking Modernization Team",
            stage: "DELIVERY_HANDOFF",
            dealValue: 240000,
            probability: 100,
            expectedRevenue: 240000,
            targetRoles: ["Java", "Spring Boot", "Kafka", "Microservices"],
            positionsCount: 6,
            linkedRequirementId: "HN-REQ-88210",
            ownerId: accessContext.uid,
            createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        setOpportunities(initialOpps);
      }

      // 2. Fetch Clients
      const clientList = await ClientService.listClients(accessContext);
      if (clientList.length > 0) {
        setClients(clientList);
      } else {
        setClients([
          {
            id: "CLIENT-ACME",
            name: "Acme Cloud Technologies",
            industry: "Enterprise SaaS",
            status: "ACTIVE",
            activeRequirementsCount: 3,
            totalPlacementsCount: 8,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "CLIENT-NEXUS",
            name: "Nexus BioHealth",
            industry: "Healthcare AI",
            status: "ACTIVE",
            activeRequirementsCount: 2,
            totalPlacementsCount: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "CLIENT-FINCORP",
            name: "FinCorp Global",
            industry: "Financial Services",
            status: "ACTIVE",
            activeRequirementsCount: 5,
            totalPlacementsCount: 14,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }

      // 3. Fetch Contacts
      const contactList = await CRMService.listContacts(accessContext);
      if (contactList.length > 0) {
        setContacts(contactList);
      } else {
        setContacts([
          {
            id: "CTC-01",
            clientId: "CLIENT-ACME",
            clientName: "Acme Cloud Technologies",
            name: "Sarah Jenkins",
            title: "VP of Engineering",
            email: "s.jenkins@acmecloud.io",
            phone: "+1-555-0182",
            decisionAuthority: "PRIMARY_DECISION_MAKER",
            sentiment: "CHAMPION",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "CTC-02",
            clientId: "CLIENT-ACME",
            clientName: "Acme Cloud Technologies",
            name: "Marcus Vance",
            title: "Head of Talent Acquisition",
            email: "m.vance@acmecloud.io",
            phone: "+1-555-0193",
            decisionAuthority: "ECONOMIC_BUYER",
            sentiment: "POSITIVE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "CTC-03",
            clientId: "CLIENT-NEXUS",
            clientName: "Nexus BioHealth",
            name: "Dr. Elena Rostova",
            title: "Chief AI Officer",
            email: "elena@nexusbio.health",
            phone: "+1-555-0149",
            decisionAuthority: "PRIMARY_DECISION_MAKER",
            sentiment: "CHAMPION",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }

      // 4. Fetch Hiring Signals
      const signalsRes = await HiringSignalService.detectHiringSignals(accessContext, "Acme Cloud Technologies");
      setHiringSignals(signalsRes.signals || []);
    } catch (err) {
      console.error("Failed to load CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, orgId]);

  // Total metrics
  const totalPipeline = opportunities.reduce((acc, o) => acc + o.dealValue, 0);
  const expectedRevenue = opportunities.reduce((acc, o) => acc + o.expectedRevenue, 0);
  const activeDealsCount = opportunities.filter((o) => !["CLOSED_LOST"].includes(o.stage)).length;

  const handleHandoffToCore = async (oppId: string) => {
    try {
      setLoading(true);
      const res = await CRMService.handoffToDeliveryRequirement(accessContext, oppId);
      setActionSuccess(`Successfully handed off opportunity to Core Requirement ${res.requirementId}! Demand is now live in HireNest OS.`);
      await fetchData();
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err: any) {
      alert(`Handoff failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIOutreach = async (client: ClientEntity) => {
    try {
      setLoading(true);
      const draft = await CRMService.generateSDRDraft(accessContext, {
        clientId: client.id,
        clientName: client.name,
        targetTech: ["React", "TypeScript", "Node.js", "Cloud Architecture"],
      });
      setSdrDrafts((prev) => [draft, ...prev]);
      setActiveTab("sdr");
      setActionSuccess(`AI SDR draft generated for ${client.name}. Please review and approve.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(`AI SDR generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async (draftId: string, action: "APPROVE" | "REJECT") => {
    try {
      const updated = await CRMService.approveOutreachDraft(accessContext, draftId, action);
      setSdrDrafts((prev) => prev.map((d) => (d.id === draftId ? updated : d)));
      setActionSuccess(`Outreach draft ${draftId} successfully ${action === "APPROVE" ? "approved & queued for dispatch" : "rejected"}.`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Commercial Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase">
                HireNest CRM & Revenue Workspace
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Commercial Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authority: {accessContext.role} • Single SSOT Linked with HireNest OS
            </p>
          </div>
        </div>

        {/* Global Operations / Revenue Switcher */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all shadow-sm"
            title="Switch to Operations Workspace (os.hirenestworkforce.com)"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Switch to OS Operations</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh Revenue State"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-emerald-400")} />
          </button>
        </div>
      </header>

      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-950/40 border-b border-slate-800">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ${(totalPipeline / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {activeDealsCount} active qualified opportunities
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Weighted Expected Yield</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300">
            ${(expectedRevenue / 1000).toFixed(0)}k
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Probability weighted realization
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Active Client Accounts</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {clients.length}
          </div>
          <div className="text-[11px] text-indigo-300 font-semibold mt-1">
            Enterprise clients under active management
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>AI SDR Opportunities</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {hiringSignals.length} Signals
          </div>
          <div className="text-[11px] text-amber-400 font-semibold mt-1">
            Live expansion intent detected
          </div>
        </div>
      </div>

      {/* Notifications / Success banner */}
      {actionSuccess && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="px-6 pt-4 border-b border-slate-800 flex flex-wrap gap-2">
        {[
          { id: "pipeline", label: "Opportunities Pipeline", icon: DollarSign },
          { id: "accounts", label: "Client Accounts", icon: Building2 },
          { id: "contacts", label: "Decision Makers", icon: Users },
          { id: "signals", label: "Account Signals", icon: Target },
          { id: "sdr", label: "AI SDR Studio", icon: Bot },
          { id: "delivery", label: "Live Delivery Telemetry", icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2",
                isActive
                  ? "bg-slate-800/90 text-emerald-400 border-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-emerald-400" : "text-slate-400")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* 1. OPPORTUNITIES PIPELINE */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Commercial Deal Pipeline</h2>
                <p className="text-xs text-slate-400">Track stages from lead qualification through Core Delivery Handoff</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities
                .filter((o) => o.title.toLowerCase().includes(searchQuery.toLowerCase()) || o.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((opp) => {
                  const isHandoffReady = ["CLOSED_WON", "NEGOTIATION"].includes(opp.stage) && !opp.linkedRequirementId;
                  const isHandedOff = opp.stage === "DELIVERY_HANDOFF" || !!opp.linkedRequirementId;

                  return (
                    <div
                      key={opp.id}
                      className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 hover:border-slate-600 transition-all shadow-xl flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            {opp.id}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                              opp.stage === "DELIVERY_HANDOFF"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : opp.stage === "CLOSED_WON"
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                            )}
                          >
                            {opp.stage.replace("_", " ")}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white mb-1">{opp.title}</h3>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{opp.clientName}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Deal Value</span>
                            <div className="text-sm font-black text-emerald-400">${opp.dealValue.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Yield</span>
                            <div className="text-sm font-black text-cyan-300">${opp.expectedRevenue.toLocaleString()} ({opp.probability}%)</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {opp.targetRoles.map((role, idx) => (
                            <span key={idx} className="text-[10px] font-medium bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-700/60 pt-3">
                        {isHandedOff ? (
                          <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Linked Core Req: {opp.linkedRequirementId}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                              Live in OS
                            </span>
                          </div>
                        ) : isHandoffReady ? (
                          <button
                            onClick={() => handleHandoffToCore(opp.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Handoff to Core Delivery</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Stage: {opp.stage}</span>
                            <span className="text-slate-500 text-[11px]">{opp.positionsCount} Positions</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 2. CLIENT ACCOUNTS */}
        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Enterprise Client Accounts</h2>
                <p className="text-xs text-slate-400">Authoritative clients managed across CRM & Core Platform</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <div key={client.id} className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {client.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {client.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{client.name}</h3>
                  <p className="text-xs text-slate-400 mb-4">{client.industry || "Enterprise Technology"}</p>

                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Active Reqs</span>
                      <div className="text-sm font-black text-indigo-300">{client.activeRequirementsCount || 0}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Total Placed</span>
                      <div className="text-sm font-black text-emerald-400">{client.totalPlacementsCount || 0}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateAIOutreach(client)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all border border-slate-600"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generate AI SDR Outreach</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. CONTACTS & DECISION MAKERS */}
        {activeTab === "contacts" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Decision Makers & Key Stakeholders</h2>
              <p className="text-xs text-slate-400">Key buyer personas linked to client accounts</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400">{contact.clientName}</span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {contact.decisionAuthority.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{contact.name}</h3>
                  <p className="text-xs text-slate-400 mb-3">{contact.title}</p>

                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-400">Sentiment:</span>
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {contact.sentiment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. HIRING SIGNALS & INTENT */}
        {activeTab === "signals" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Account Intelligence & Hiring Signals</h2>
              <p className="text-xs text-slate-400">Real-time signals detected by HireNest AI Intelligence Core</p>
            </div>

            <div className="space-y-3">
              {hiringSignals.map((signal, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{signal.company}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {signal.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{signal.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">Score: {signal.score}</div>
                      <span className="text-[10px] text-slate-500 uppercase">{signal.impact} Impact</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. AI SDR STUDIO */}
        {activeTab === "sdr" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">AI SDR Studio & Outreach Cadence</h2>
                <p className="text-xs text-slate-400">Human-in-the-Loop review for AI-generated outreach campaigns</p>
              </div>
            </div>

            {sdrDrafts.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/60 p-8">
                <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">No Active Outreach Drafts</h3>
                <p className="text-xs text-slate-400 mb-4">Generate candidate pitch emails from the Client Accounts or Signals tab.</p>
                <button
                  onClick={() => setActiveTab("accounts")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                >
                  View Accounts
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sdrDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {draft.id}
                        </span>
                        <span className="text-xs font-bold text-white">{draft.contactName} ({draft.contactEmail})</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase px-2 py-0.5 rounded border",
                          draft.approvalStatus === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : draft.approvalStatus === "REJECTED"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        )}
                      >
                        {draft.approvalStatus.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                      <div className="font-bold text-indigo-300">Subject: {draft.subject}</div>
                      <div className="text-slate-300 whitespace-pre-line leading-relaxed">{draft.body}</div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>AI Confidence: {(draft.aiConfidence * 100).toFixed(0)}% • Human Review Required</span>
                      </div>

                      {draft.approvalStatus === "PENDING_REVIEW" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveDraft(draft.id, "REJECT")}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-all"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveDraft(draft.id, "APPROVE")}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30"
                          >
                            Approve & Dispatch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. LIVE DELIVERY TELEMETRY */}
        {activeTab === "delivery" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white">Live Requirement Delivery Telemetry</h2>
              <p className="text-xs text-slate-400">Real-time fulfillment progress synchronized directly with HireNest OS</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities
                .filter((o) => o.linkedRequirementId)
                .map((opp) => (
                  <div key={opp.id} className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-400">{opp.clientName}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {opp.linkedRequirementId}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-3">{opp.title}</h3>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center mb-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Required</div>
                        <div className="text-sm font-black text-white">{opp.positionsCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Submissions</div>
                        <div className="text-sm font-black text-cyan-400">8</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Interviews</div>
                        <div className="text-sm font-black text-indigo-300">4</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Commercial Value: ${(opp.dealValue / 1000).toFixed(0)}k</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational in Core OS
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
