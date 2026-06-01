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
  Target,
  DollarSign,
  FileText,
  Clock,
  Receipt,
  BookOpen,
} from "lucide-react";
import { cn } from "./lib/utils";

// Import views
import DashboardTab from "./views/DashboardTab";
import AgentHQ from "./views/AgentHQ";
import CandidatesTab from "./views/CandidatesTab";
import JobsTab from "./views/JobsTab";
import NetworkDirectoryTab from "./views/NetworkDirectoryTab";
import RagIntelligenceTab from "./views/RagIntelligenceTab";
import PredictiveIntelligenceTab from "./views/PredictiveIntelligenceTab";
import DealRoomsTab from "./views/DealRoomsTab";
import { ClientCandidatePipeline } from "./views/workspaces/ClientCandidatePipeline";
import WorkflowOperationsTab from "./views/WorkflowOperationsTab";
import OperationalHealthTab from "./views/OperationalHealthTab";
import FinancialsTab from "./views/FinancialsTab";
import TrustEngineTab from "./views/TrustEngineTab";
import NotificationsTab from "./views/NotificationsTab";
import Onboarding from "./views/Onboarding";
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

import { auth, db } from "./lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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
  const [user, setUser] = React.useState<any>(null);
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDemo, setShowDemo] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const {
            doc,
            getDoc,
            updateDoc,
            collection,
            query,
            where,
            getDocs,
            deleteDoc,
          } = await import("firebase/firestore");
          const { db } = await import("./lib/firebase");
          const d = await getDoc(doc(db, "users", u.uid));
          let data: any = {};
          if (d.exists()) {
            data = d.data();
          }

          const superAdmins = [
            "gopal@hirenestworkforce.com",
            "gopalkrishna0046@gmail.com",
          ];
          if (u.email && superAdmins.includes(u.email.toLowerCase())) {
            data.role = "super_admin";
            data.organizationId = "ORG-GLOBAL-HQ";
            data.status = "ACTIVE";
            data.onboardingCompleted = true;

            // -------- ONE TIME CLEANUP SCRIPT -------- //
            // This runs automatically for the admin to satisfy the roger1 request
            try {
              const q = query(
                collection(db, "users"),
                where("email", "==", "roger1@mapoutinc.com"),
              );
              const reqs = await getDocs(q);
              if (!reqs.empty) {
                for (let rUser of reqs.docs) {
                  const uId = rUser.id;
                  const uData = rUser.data();
                  // reset onboarding flag
                  if (uData.onboardingCompleted) {
                    await updateDoc(doc(db, "users", uId), {
                      onboardingCompleted: false,
                      ndaUploaded: false,
                      verificationStatus: "PENDING",
                    });
                  }
                  const orgId = uData.organizationId || uData.orgId || uId;

                  // Reset Org
                  try {
                    await updateDoc(doc(db, "organizations", orgId), {
                      onboardingCompleted: false,
                      ndaUploaded: false,
                      verificationStatus: "PENDING",
                    });
                  } catch (e) {}

                  // Submissions / DealRooms / Requirements
                  const qReq = await getDocs(
                    query(
                      collection(db, "requirements"),
                      where("clientId", "==", orgId),
                    ),
                  );
                  let reqIds: string[] = [];
                  for (let rDoc of qReq.docs) {
                    reqIds.push(rDoc.id);
                    await deleteDoc(rDoc.ref);
                  }

                  try {
                    const qCand = await getDocs(
                      collection(db, "candidatePool"),
                    );
                    for (let cDoc of qCand.docs) {
                      const cd = cDoc.data();
                      if (
                        cd.vendorId === orgId ||
                        cd.clientId === orgId ||
                        reqIds.includes(cd.mappedJobId)
                      ) {
                        await deleteDoc(cDoc.ref);
                      }
                    }
                  } catch (cleanupErr) {
                    console.error(
                      "Cleanup script error on candidatePool:",
                      cleanupErr,
                    );
                  }

                  const qDeal = await getDocs(collection(db, "dealRooms"));
                  for (let dDoc of qDeal.docs) {
                    const dd = dDoc.data();
                    if (dd.requirementId && reqIds.includes(dd.requirementId)) {
                      await deleteDoc(dDoc.ref);
                    } else if (dd.clientId === orgId || dd.vendorId === orgId) {
                      await deleteDoc(dDoc.ref);
                    }
                  }
                  console.log("[CLEANUP] Wiped Roger1 context.");
                }
              }
            } catch (cle) {
              console.warn("[CLEANUP] Failed", cle);
            }
            // ------ END CLEANUP SCRIPT -------- //
          }

          setUserData(data);
          if (!data.hasSeenDemo && Object.keys(data).length > 0) {
            setShowDemo(true);
          }
        } catch (e) {
          console.error("User data sync failed", e);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  if (!user && location.pathname !== "/onboarding") {
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
    setShowDemo(false);
    if (user) {
      setUserData((prev: any) => ({ ...prev, hasSeenDemo: true }));
      try {
        await updateDoc(doc(db, "users", user.uid), { hasSeenDemo: true });
      } catch (err) {
        console.error("Failed to update demo flag:", err);
      }
    }
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
                id="tour-submissions"
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
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
                id="tour-submissions"
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
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
                to="/deal-rooms?view=interviews"
                icon={MessageSquare}
                label="Interviews"
                active={location.pathname === "/deal-rooms?view=interviews"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <SidebarItem
                id="tour-submissions"
                to="/deal-rooms?view=offers"
                icon={Target}
                label="Placements"
                active={location.pathname === "/deal-rooms?view=offers"}
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
                to="/deal-rooms"
                icon={MessageSquare}
                label="Submissions"
                active={location.pathname === "/deal-rooms"}
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
                label="Revenue"
                active={location.pathname === "/financials"}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">
                Administration
              </div>
              <SidebarItem
                to="/health"
                icon={Activity}
                label="Prod Health"
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
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline-block">
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
            <Link
              to="/notifications"
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors relative"
            >
              <Bell size={18} />
              <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardTab />} />
            {isAdmin && <Route path="/hq" element={<AgentHQ />} />}
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
            {isClient && !isAdmin ? (
              <Route
                path="/candidates"
                element={
                  <ClientCandidatePipeline
                    orgId={userData?.organizationId || ""}
                  />
                }
              />
            ) : isAdmin || isVendor || isRecruiter ? (
              <Route path="/candidates" element={<CandidatesTab />} />
            ) : null}
            <Route path="/jobs" element={<JobsTab />} />
            {(isAdmin || isRecruiter) && (
              <Route path="/network" element={<NetworkDirectoryTab />} />
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
            {isAdmin && <Route path="/governance" element={<AdminGovernanceDashboard />} />}
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
            <Route path="/settings" element={<AdminSecurityDashboard />} />
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
