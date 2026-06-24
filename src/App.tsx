import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  MessageSquare,
  Settings,
  ShieldCheck,
  Brain,
  Bell,
  LogOut,
  ChevronRight,
  Activity,
  Network,
  UserCheck,
  Fingerprint,
  Cpu,
  Database,
  BrainCircuit,
  Menu,
  X,
  Zap,
  Target,
  DollarSign,
  FileText,
  Clock,
  Receipt,
  BookOpen,
  Search,
  TrendingUp,
  ShieldAlert,
  Globe2,
  Video,
  Star,
  Award,
  Terminal,
} from "lucide-react";
import { cn } from "./lib/utils";

// Import views
import DashboardTab from "./views/DashboardTab";
import AgentHQ from "./views/AgentHQ";
import CandidatesTab from "./views/CandidatesTab";
import JobsTab from "./views/JobsTab";
import NetworkDirectoryTab from "./views/NetworkDirectoryTab";
import Client360Tab from "./views/Client360Tab";
import AutonomousOperationsTab from "./views/AutonomousOperationsTab";
import Vendor360Tab from "./views/Vendor360Tab";
import VendorIntelligenceTab from "./views/VendorIntelligenceTab";
import KnowledgeIntelligenceTab from "./views/KnowledgeIntelligenceTab";
import EnterpriseCommandCenterTab from "./views/EnterpriseCommandCenterTab";
import AIOpsCenterTab from "./views/AIOpsCenterTab";
import FinanceOSTab from "./views/FinanceOSTab";
import AICopilotTab from "./views/AICopilotTab";
import RecruiterPerformanceTab from "./views/RecruiterPerformanceTab";
import RagIntelligenceTab from "./views/RagIntelligenceTab";
import PredictiveIntelligenceTab from "./views/PredictiveIntelligenceTab";
import DealRoomsTab from "./views/DealRoomsTab";
import InterviewsTab from "./views/InterviewsTab";
import { PlacementsTab } from "./views/PlacementsTab";
import InboxTab from "./views/InboxTab";

import WorkflowOperationsTab from "./views/WorkflowOperationsTab";
import OperationalHealthTab from "./views/OperationalHealthTab";
import FinancialsTab from "./views/FinancialsTab";
import RevenueIntelligenceTab from "./views/RevenueIntelligenceTab";
import TrustEngineTab from "./views/TrustEngineTab";
import NotificationsTab from "./views/NotificationsTab";
import Onboarding from "./views/Onboarding";
import MatchIntelligenceTab from "./views/MatchIntelligenceTab";
import AdminOverview from "./views/AdminOverview";
import AdminGovernanceDashboard from "./views/AdminGovernanceDashboard";
import AdminSecurityDashboard from "./views/AdminSecurityDashboard";
import AdminOpsDashboard from "./views/AdminOpsDashboard";
import AdminUsersManager from "./views/AdminUsersManager";
import TraceView from "./views/TraceView";
import MemoryMapView from "./views/MemoryMapView";
import TenantUsageDashboard from "./views/TenantUsageDashboard";
import WelcomeDemo from "./components/WelcomeDemo";
import SLAIntelligenceTab from "./views/SLAIntelligenceTab";
import ContractsTab from "./views/ContractsTab";
import TimesheetsTab from "./views/TimesheetsTab";
import InvoicesTab from "./views/InvoicesTab";
import OwnershipLedgerTab from "./views/OwnershipLedgerTab";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { LiveToaster } from "./components/LiveToaster";
import SignalsTab from "./views/SignalsTab";
import { NotificationCenter } from "./components/NotificationCenter";

import { auth } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { useSystemStore } from "./stores/SystemStore";

import SettingsTab from "./views/SettingsTab";

import BenchmarkDashboard from "./views/BenchmarkDashboard";
import CustomerSuccessDashboard from "./views/CustomerSuccessDashboard";
import AILearningLoopTab from "./views/AILearningLoopTab";
import EvidenceDashboard from "./views/EvidenceDashboard";
import FounderControlTower from "./views/FounderControlTower";

const SidebarItem = ({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  id,
}: {
  to: string;
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  id?: string;
}) => (
  <Link
    to={to}
    id={id}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold uppercase tracking-wider",
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
        : "text-slate-400 hover:bg-slate-50 hover:text-slate-900",
    )}
  >
    <Icon
      size={18}
      className={cn(
        active ? "text-white" : "text-slate-400 group-hover:text-indigo-600",
      )}
    />
    <span>{label}</span>
    {active && <ChevronRight size={14} className="ml-auto" />}
  </Link>
);

const AppContent = () => {
  const location = useLocation();
  const { user, userData, loading, showDemo, initialize, closeDemo } =
    useSystemStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const unsub = initialize();
    return () => {
      if (unsub) unsub();
    };
  }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Syncing Node Identity...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Onboarding
        onComplete={async () => {
          await auth.currentUser?.getIdToken(true);
          window.location.reload();
        }}
      />
    );
  }

  const role = userData?.role || "guest";
  const isAdmin =
    role === "admin" || role === "super_admin" || role === "ops_admin";
  const isClient =
    role === "client" ||
    role === "client_admin" ||
    role === "client_hm" ||
    role === "client_finance" ||
    role === "client_recruiter";
  const isVendor =
    role === "vendor" || role === "vendor_admin" || role === "vendor_recruiter";
  const isRecruiter =
    role === "recruiter" ||
    role === "independent_recruiter" ||
    role === "freelancer_recruiter";
  const isIndependent =
    role === "independent" ||
    role === "independent_vendor" ||
    role === "independent_consultant";

  const hasCompletedOnboarding =
    userData?.onboardingCompleted === true ||
    (userData?.role &&
      userData?.role !== "PENDING_VERIFICATION" &&
      userData?.status === "ACTIVE" &&
      userData?.organizationId);

  const handleCloseDemo = async () => {
    await closeDemo();
  };

  if (user && !hasCompletedOnboarding && !isAdmin) {
    return (
      <Onboarding
        onComplete={async () => {
          await auth.currentUser?.getIdToken(true);
          window.location.reload();
        }}
      />
    );
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <LiveToaster orgId={userData?.organizationId} userRole={userData?.role} />
      {hasCompletedOnboarding && showDemo && (
        <WelcomeDemo
          type={isAdmin || isClient ? "client" : "vendor"}
          onClose={handleCloseDemo}
        />
      )}

      {hasCompletedOnboarding && <OnboardingGuide role={role} />}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-72 bg-white border-r border-slate-100 flex flex-col p-6 shadow-sm z-50 fixed lg:relative h-full transition-transform duration-300 ease-in-out",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tighter">
                HireNest<span className="text-indigo-600">OS</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Enterprise Core
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-900"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {/* RECRUITER NAVIGATION */}
          {isRecruiter && !isAdmin && (
            <>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                Workspace
              </div>
              <SidebarItem
                to="/"
                icon={LayoutDashboard}
                label="Dashboard"
                active={location.pathname === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-requirements"
                to="/jobs"
                icon={Briefcase}
                label="Requirements"
                active={location.pathname === "/jobs"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-candidates"
                to="/candidates"
                icon={Users}
                label="Candidates"
                active={location.pathname === "/candidates"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/matches"
                icon={Star}
                label="Match Intelligence"
                active={location.pathname === "/matches"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-submissions"
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-interviews"
                to="/interviews"
                icon={Video}
                label="Interviews"
                active={location.pathname === "/interviews"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/network"
                icon={Building2}
                label="Vendors"
                active={location.pathname === "/network"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-reports"
                to="/financials"
                icon={FileText}
                label="Reports"
                active={location.pathname === "/financials"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/emails"
                icon={MessageSquare}
                label="Work Email"
                active={location.pathname === "/emails"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </>
          )}

          {/* VENDOR NAVIGATION */}
          {isVendor && !isAdmin && (
            <>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                Workspace
              </div>
              <SidebarItem
                to="/"
                icon={LayoutDashboard}
                label="Dashboard"
                active={location.pathname === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-requirements"
                to="/jobs"
                icon={Briefcase}
                label="Open Requirements"
                active={location.pathname === "/jobs"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-candidates"
                to="/candidates"
                icon={Users}
                label="Candidates"
                active={location.pathname === "/candidates"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/matches"
                icon={Star}
                label="Match Intelligence"
                active={location.pathname === "/matches"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-submissions"
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/interviews"
                icon={Video}
                label="Interviews"
                active={location.pathname === "/interviews"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/emails"
                icon={MessageSquare}
                label="Work Email"
                active={location.pathname === "/emails"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/trust-sla"
                icon={Target}
                label="Performance"
                active={location.pathname === "/trust-sla"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </>
          )}

          {/* CLIENT NAVIGATION */}
          {isClient && !isAdmin && (
            <>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                Workspace
              </div>
              <SidebarItem
                to="/"
                icon={LayoutDashboard}
                label="Dashboard"
                active={location.pathname === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-requirements"
                to="/jobs"
                icon={Briefcase}
                label="Requirements"
                active={location.pathname === "/jobs"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-candidates"
                to="/candidates"
                icon={Users}
                label="Candidates"
                active={location.pathname === "/candidates"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-interviews"
                to="/interviews"
                icon={Video}
                label="Interviews"
                active={location.pathname === "/interviews"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-submissions"
                to="/placements"
                icon={Target}
                label="Placements"
                active={location.pathname === "/placements"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </>
          )}

          {/* INDEPENDENT OR GUEST (Fallback) */}
          {!isAdmin && !isRecruiter && !isVendor && !isClient && (
            <>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">
                Workspace
              </div>
              <SidebarItem
                to="/"
                icon={LayoutDashboard}
                label="Dashboard"
                active={location.pathname === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/jobs"
                icon={Briefcase}
                label="Requirements"
                active={location.pathname === "/jobs"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/candidates"
                icon={Users}
                label="Candidates"
                active={location.pathname === "/candidates"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </>
          )}

          {/* EXECUTIVE ADMIN NAVIGATION */}
          {isAdmin && (
            <>
              <SidebarItem
                to="/"
                icon={LayoutDashboard}
                label="Home"
                active={location.pathname === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Work
              </div>
              <SidebarItem
                to="/signals"
                icon={Activity}
                label="Signals Center"
                active={location.pathname === "/signals"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/jobs"
                icon={Briefcase}
                label="Requirements"
                active={location.pathname === "/jobs"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/candidates"
                icon={Users}
                label="Candidates"
                active={location.pathname === "/candidates"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/matches"
                icon={Star}
                label="Match Opportunities"
                active={location.pathname === "/matches"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/interviews"
                icon={Video}
                label="Interviews"
                active={location.pathname === "/interviews"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/emails"
                icon={Activity}
                label="Work Email"
                active={location.pathname === "/emails"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Network
              </div>
              <SidebarItem
                to="/network?type=vendor"
                icon={Building2}
                label="Vendors"
                active={
                  location.pathname === "/network" &&
                  location.search.includes("type=vendor")
                }
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/network?type=client"
                icon={Users}
                label="Clients"
                active={
                  location.pathname === "/network" &&
                  location.search.includes("type=client")
                }
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/client-360"
                icon={Building2}
                label="Client 360"
                active={location.pathname === "/client-360"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/vendor-360"
                icon={Building2}
                label="Vendor 360"
                active={location.pathname === "/vendor-360"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/vendor-intelligence"
                icon={Award}
                label="Vendor Intelligence"
                active={location.pathname === "/vendor-intelligence"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/recruiter-performance"
                icon={Award}
                label="Recruiter Engine"
                active={location.pathname === "/recruiter-performance"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Finance
              </div>
              <SidebarItem
                to="/invoices"
                icon={Receipt}
                label="Invoices"
                active={location.pathname === "/invoices"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/financials"
                icon={DollarSign}
                label="Finance Ledger"
                active={location.pathname === "/financials"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/revenue-intelligence"
                icon={Activity}
                label="Revenue Intel"
                active={location.pathname === "/revenue-intelligence"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <SidebarItem
                to="/knowledge-graph"
                icon={Network}
                label="Knowledge Graph (Audit)"
                active={location.pathname === "/knowledge-graph"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Enterprise Validation
              </div>
              <SidebarItem
                to="/ai-ops-center"
                icon={Terminal}
                label="AI DevOps"
                active={location.pathname === "/ai-ops-center"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/ai-copilot"
                icon={BrainCircuit}
                label="AI Copilot"
                active={location.pathname === "/ai-copilot"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/autonomous-operations"
                icon={Zap}
                label="Autonomous Ops"
                active={location.pathname === "/autonomous-operations"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/enterprise-command-center"
                icon={TrendingUp}
                label="Command Center"
                active={location.pathname === "/enterprise-command-center"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/finance-os"
                icon={DollarSign}
                label="FinanceOS"
                active={location.pathname === "/finance-os"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/benchmarks"
                icon={Activity}
                label="Benchmarks"
                active={location.pathname === "/benchmarks"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/adoption"
                icon={TrendingUp}
                label="Customer Success"
                active={location.pathname === "/adoption"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/ai-learning"
                icon={Cpu}
                label="AI Learning Loop"
                active={location.pathname === "/ai-learning"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/evidence"
                icon={ShieldAlert}
                label="Evidence Dashboard"
                active={location.pathname === "/evidence"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Administration
              </div>
              <SidebarItem
                to="/founder-tower"
                icon={Globe2}
                label="Founder Tower"
                active={location.pathname === "/founder-tower"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/health"
                icon={TrendingUp}
                label="Operational Intelligence"
                active={location.pathname === "/health"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/governance"
                icon={ShieldCheck}
                label="Governance"
                active={location.pathname === "/governance"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/users"
                icon={Users}
                label="Users"
                active={location.pathname === "/users"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                to="/settings"
                icon={Settings}
                label="Settings"
                active={location.pathname === "/settings"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-2">
          <button
            onClick={() => signOut(auth)}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-bold uppercase tracking-wider cursor-pointer"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full lg:w-auto">
        {/* Global Navigation Hub */}
        <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
            >
              <Menu size={24} />
            </button>
            <div className="bg-slate-900 text-white px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase italic hidden sm:block">
              Node:{" "}
              {isAdmin
                ? "Global HQ"
                : isClient
                  ? "Client Workspace"
                  : isVendor
                    ? "Vendor Workspace"
                    : isRecruiter
                      ? "Recruiter Workspace"
                      : "User Workspace"}
            </div>

            {/* Universal Search Bar */}
            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2 w-64 focus-within:w-80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Candidates, Requirements..."
                className="bg-transparent border-none outline-none text-xs font-medium w-full ml-2 text-slate-700 placeholder-slate-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // Universal Search handling (placeholder behavior for MVP)
                    alert(
                      `Universal Search for: ${e.currentTarget.value}\n(Routing implementation pending)`,
                    );
                  }
                }}
              />
              <div className="ml-2 bg-slate-200 text-slate-500 text-[9px] rounded px-1.5 py-0.5 font-mono opacity-60 pointer-events-none">
                ⌘K
              </div>
            </div>

            <div className="flex items-center gap-2 hidden lg:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Protocol Active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 gap-3">
              <ShieldCheck size={14} className="text-indigo-600" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                Authority: {userData?.role?.replace("_", " ") || "User"}
              </span>
            </div>
            {isAdmin && (
              <Link
                to="/users"
                className="hidden sm:flex bg-slate-900 text-white px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200 items-center gap-2"
              >
                <Users size={14} />
                Onboard Nodes
              </Link>
            )}
            <NotificationCenter userRole={userData?.role} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardTab />} />
            {isAdmin && <Route path="/hq" element={<AgentHQ />} />}
            {isAdmin && <Route path="/signals" element={<SignalsTab />} />}
            {isAdmin && (
              <Route path="/rag-intel" element={<RagIntelligenceTab />} />
            )}
            {isAdmin && (
              <Route
                path="/predictive"
                element={
                  <PredictiveIntelligenceTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                  />
                }
              />
            )}
            <Route path="/candidates" element={<CandidatesTab />} />
            <Route path="/matches" element={<MatchIntelligenceTab />} />
            <Route path="/jobs" element={<JobsTab />} />
            <Route path="/pipeline" element={<CandidatesTab />} />
            {(isAdmin || isRecruiter) && (
              <Route path="/network" element={<NetworkDirectoryTab />} />
            )}
            {isAdmin && (
              <Route path="/benchmarks" element={<BenchmarkDashboard />} />
            )}
            {isAdmin && (
              <Route path="/adoption" element={<CustomerSuccessDashboard />} />
            )}
            {isAdmin && (
              <Route path="/ai-learning" element={<AILearningLoopTab />} />
            )}
            {isAdmin && (
              <Route path="/evidence" element={<EvidenceDashboard />} />
            )}
            {isAdmin && (
              <Route path="/founder-tower" element={<FounderControlTower />} />
            )}
            {isAdmin && (
              <Route
                path="/health"
                element={
                  <OperationalHealthTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                    userId={user?.uid || ""}
                  />
                }
              />
            )}
            {(isAdmin || isRecruiter) && (
              <Route
                path="/financials"
                element={
                  <FinancialsTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                    userId={user?.uid || ""}
                  />
                }
              />
            )}
            {(isAdmin || isRecruiter) && (
              <Route
                path="/revenue-intelligence"
                element={
                  <RevenueIntelligenceTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                  />
                }
              />
            )}
            {(isAdmin || isRecruiter) && (
              <Route
                path="/client-360"
                element={<Client360Tab userRole={role || ""} />}
              />
            )}
            {(isAdmin || isRecruiter) && (
              <Route
                path="/vendor-360"
                element={<Vendor360Tab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/vendor-intelligence"
                element={<VendorIntelligenceTab />}
              />
            )}
            {isAdmin && (
              <Route
                path="/ai-copilot"
                element={<AICopilotTab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/autonomous-operations"
                element={<AutonomousOperationsTab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/knowledge-graph"
                element={<KnowledgeIntelligenceTab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/ai-ops-center"
                element={<AIOpsCenterTab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/enterprise-command-center"
                element={<EnterpriseCommandCenterTab userRole={role || ""} />}
              />
            )}
            {isAdmin && (
              <Route
                path="/finance-os"
                element={<FinanceOSTab userRole={role || ""} />}
              />
            )}
            {(isAdmin || isRecruiter) && (
              <Route
                path="/recruiter-performance"
                element={<RecruiterPerformanceTab userRole={role || ""} />}
              />
            )}
            {(isAdmin || isVendor) && (
              <Route
                path="/trust-sla"
                element={
                  <TrustEngineTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                  />
                }
              />
            )}
            <Route path="/deal-rooms" element={<DealRoomsTab />} />
            <Route path="/placements" element={<PlacementsTab />} />
            <Route path="/interviews" element={<InterviewsTab />} />
            <Route path="/emails" element={<InboxTab />} />
            {isAdmin && (
              <Route
                path="/operations"
                element={
                  <WorkflowOperationsTab
                    userRole={role || ""}
                    orgId={userData?.organizationId || ""}
                  />
                }
              />
            )}
            {isAdmin && <Route path="/admin" element={<AdminOverview />} />}
            {isAdmin && (
              <Route
                path="/governance"
                element={<AdminGovernanceDashboard />}
              />
            )}
            {isAdmin && (
              <Route
                path="/users"
                element={<AdminUsersManager orgData={userData} />}
              />
            )}
            {isAdmin && <Route path="/trace" element={<TraceView />} />}
            {isAdmin && <Route path="/map" element={<MemoryMapView />} />}
            {isAdmin && <Route path="/ops" element={<AdminOpsDashboard />} />}
            {isAdmin && <Route path="/sla" element={<SLAIntelligenceTab />} />}
            {(isAdmin || isVendor || isRecruiter) && (
              <Route path="/ownership" element={<OwnershipLedgerTab />} />
            )}
            {isAdmin && <Route path="/contracts" element={<ContractsTab />} />}
            <Route path="/timesheets" element={<TimesheetsTab />} />
            <Route path="/invoices" element={<InvoicesTab />} />
            <Route
              path="/usage"
              element={<TenantUsageDashboard orgData={userData} />}
            />
            <Route
              path="/notifications"
              element={
                <NotificationsTab
                  org={{ id: userData?.organizationId }}
                  role={userData?.role}
                />
              }
            />
            <Route
              path="/onboarding"
              element={
                <Onboarding onComplete={() => window.location.reload()} />
              }
            />
            <Route
              path="/settings"
              element={
                user && !loading ? (
                  <SettingsTab />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
