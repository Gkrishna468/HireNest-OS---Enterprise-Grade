import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { cn } from "./lib/utils";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firebase";
import { 
  Activity, 
  Briefcase, 
  Users, 
  MessageSquare, 
  Bell, 
  Building2, 
  Shield, 
  Database, 
  Settings, 
  ShieldCheck,
  Bot,
  CheckSquare
} from "lucide-react";
import Onboarding from "./views/Onboarding";

import DashboardTab from "./views/DashboardTab";
import JobsTab from "./views/JobsTab";
import CandidatesTab from "./views/CandidatesTab";
import DealRoomsTab from "./views/DealRoomsTab";
import AdminUsersManager from "./views/AdminUsersManager";
import AdminOverview from "./views/AdminOverview";
import AdminSecurityDashboard from "./views/AdminSecurityDashboard";
import ClientsTab from "./views/ClientsTab";
import VendorsTab from "./views/VendorsTab";
import NotificationsTab from "./views/NotificationsTab";
import AgentHQ from "./views/AgentHQ";
import ExecutionTracker from "./views/ExecutionTracker";

import WelcomeDemo from "./components/WelcomeDemo";

// Global auth context simulation
export let currentUserState: { user: any; org: any } | null = null;


function Sidebar({ org, user }: { org: any, user: any }) {
  const location = useLocation();
  
  const isAdmin = org.type === 'admin';
  const isClient = org.type === 'client';
  const isVendor = ['vendor', 'vendor_agency', 'independent_vendor', 'independent_recruiter', 'freelancer_recruiter', 'recruitment_agency'].includes(org.type);

  const navItems = [
    { name: "Dashboard", path: isAdmin ? "/admin-overview" : (isClient ? "/clients" : "/vendors"), icon: <Activity size={18} />, visible: true },
    { name: "Requirements", path: "/jobs", icon: <Briefcase size={18} />, visible: true },
    { name: "Candidate Pool", path: "/candidates", icon: <Users size={18} />, visible: isAdmin || isVendor },
    { name: "Deal Rooms", path: "/deals", icon: <MessageSquare size={18} />, visible: true },
    { name: "Notifications", path: "/notifications", icon: <Bell size={18} />, visible: true },
    { name: "Manage Clients", path: "/admin/clients", icon: <Building2 size={18} />, visible: isAdmin },
    { name: "Manage Vendors", path: "/admin/vendors", icon: <Shield size={18} />, visible: isAdmin },
    { name: "Strategic Agent HQ", path: "/admin/strategy", icon: <Bot size={18} />, visible: isAdmin },
    { name: "Execution HQ", path: "/admin/execution", icon: <CheckSquare size={18} />, visible: isAdmin },
    { name: "Security & Trust", path: "/admin/security", icon: <Shield size={18} />, visible: isAdmin },
    { name: "System Settings", path: "/users", icon: <Settings size={18} />, visible: isAdmin }
  ];

  return (
    <nav className="w-64 bg-white border-r border-slate-100 flex flex-col p-6 shrink-0 overflow-y-auto overflow-x-hidden">
      <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Identity Protocol</label>
        <div className="flex items-center gap-3">
            <div className={cn(
                "w-3 h-3 rounded-full shadow-sm",
                org.type === 'admin' ? "bg-indigo-500 shadow-indigo-100" : (org.type === 'client' ? "bg-emerald-500 shadow-emerald-100" : "bg-amber-500 shadow-amber-100")
            )}></div>
            <span className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border",
                org.type === 'admin' ? "text-indigo-600 bg-white border-indigo-100" : 
                (org.type === 'client' ? "text-emerald-600 bg-white border-emerald-100" : "text-amber-600 bg-white border-amber-100")
            )}>{org.type} NODE</span>
        </div>
        <div className="mt-3 px-1">
            <div className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">{org.companyName}</div>
            <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{user.email}</div>
        </div>
      </div>

      <div className="space-y-1.5 flex-1">
        <div className="text-[10px] uppercase font-black text-slate-400 mb-3 px-3 tracking-widest opacity-50">Workflow Layers</div>
        {navItems.filter(i => i.visible).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
                isActive 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-100" 
                  : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "transition-colors",
                isActive ? "text-indigo-400" : "text-slate-300 group-hover:text-slate-600"
              )}>
                {item.icon}
              </div>
              <span>{item.name}</span>
              {item.name === "Deal Rooms" && !isActive && (
                 <span className="ml-auto bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">4</span>
              )}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-8 pt-8 border-t border-slate-50">
        <div className="p-4 bg-indigo-900 rounded-[24px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
                <ShieldCheck size={40} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">Trust Engine</span>
                </div>
                <p className="text-[10px] text-indigo-100/70 leading-relaxed font-bold">Matching Matrix v2.4 initialized. All nodes operational.</p>
            </div>
        </div>
      </div>
    </nav>
  );
}

function TopBar({ orgData }: { orgData: any }) {
  const handleLogout = () => {
    signOut(auth);
    window.location.reload();
  };

  return (
    <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 border-b border-slate-700">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-lg italic">H</div>
          <span className="font-bold tracking-tight text-xl">HireNest<span className="text-indigo-400">OS</span></span>
        </div>
        <div className="relative">
          <input type="text" placeholder="Search candidates, requirements, vendors..." className="bg-slate-800 text-sm py-1.5 px-4 rounded-md w-80 border border-slate-700 focus:outline-none focus:border-indigo-500 placeholder-slate-400" />
          <span className="absolute right-3 top-1.5 text-xs text-slate-500">⌘K</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 hidden sm:flex">
          <div className={`w-2 h-2 rounded-full ${orgData?.status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-300">
            {orgData?.type === 'admin' ? "Admin Tenant: Global_HQ" : `${orgData?.type} Tenant: ${orgData?.companyName}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{orgData?.status}</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-indigo-400 hover:text-indigo-300 underline font-mono ml-2">Log Out</button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<{ loading: boolean, authData: { user: any, org: any } | null }>({ loading: true, authData: null });
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // IMMEDIATE OVERRIDE: If they are the owner/admin emails, give them HQ access immediately
          const isStaticAdmin = fbUser.email === "gopalkrishna0046@gmail.com" || fbUser.email === "gopal@hirenestworkforce.com";
          
          if (isStaticAdmin) {
            const orgId = "ORG-GLOBAL-HQ";
            const adminData = {
              user: { 
                uid: fbUser.uid, 
                email: fbUser.email, 
                role: "admin" as const, 
                organizationId: orgId,
                createdAt: new Date().toISOString()
              },
              org: { 
                organizationId: orgId, 
                type: "admin" as const, 
                companyName: "HireNest Global HQ", 
                status: "approved" as const,
                ownerId: fbUser.uid,
                createdAt: new Date().toISOString()
              }
            };
            
            // Background sync/bootstrap (silent)
            try {
              const userDoc = await getDoc(doc(db, "users", fbUser.uid));
              if (!userDoc.exists()) {
                await setDoc(doc(db, "organizations", orgId), adminData.org);
                await setDoc(doc(db, "users", fbUser.uid), adminData.user);
              }
            } catch (e) {
              console.warn("Silent admin sync failed (non-blocking):", e);
            }

            currentUserState = adminData;
            setAuthState({ loading: false, authData: adminData });
            return;
          }

          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "users", fbUser.uid));
          } catch (e) {
             handleFirestoreError(e, OperationType.GET, `users/${fbUser.uid}`);
             return;
          }

          if (userDoc?.exists()) {
            const userData = userDoc.data();

            if (userData.organizationId) {
              const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
              if (orgDoc.exists()) {
                const data = { user: userData, org: orgDoc.data() };
                currentUserState = data;
                setAuthState({ loading: false, authData: data });
                return;
              }
            }
          } 
        }
      } catch (error: any) {
        console.error("Initialization error:", error);
        setAuthState({ loading: false, authData: null });
        return;
      }
      currentUserState = null;
      setAuthState({ loading: false, authData: null });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Strategic Onboarding Check
    const checkDemo = async () => {
        if (!authState.authData) return;
        const seenKey = `seen_demo_${authState.authData.user.uid}`;
        if (!localStorage.getItem(seenKey)) {
            setShowDemo(true);
        }
    };
    checkDemo();
  }, [authState.authData]);

  const handleCloseDemo = () => {
      if (authState.authData) {
          localStorage.setItem(`seen_demo_${authState.authData.user.uid}`, 'true');
      }
      setShowDemo(false);
  };

  if (authState.loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 font-mono text-sm text-slate-500">Initializing HireNestOS SecOps...</div>;
  }

  if (!authState.authData) {
    return <Onboarding onComplete={(data) => {
       currentUserState = data;
       setAuthState({ loading: false, authData: data });
    }} />;
  }

  const { org } = authState.authData;

  return (
    <BrowserRouter>
      {showDemo && org.type !== 'admin' && (
          <WelcomeDemo 
            type={org.type as 'client' | 'vendor'} 
            onClose={handleCloseDemo} 
          />
      )}
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        <TopBar orgData={org} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar org={org} user={authState.authData.user} />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/" element={
                 org.type === 'admin' ? <Navigate to="/admin-overview" replace /> : 
                 org.type === 'client' ? <Navigate to="/clients" replace /> : 
                 <Navigate to="/vendors" replace />
              } />
              
              {/* Contextual Workspace Routes */}
              <Route path="/clients" element={<DashboardTab />} />
              <Route path="/vendors" element={<DashboardTab />} />
              
              <Route path="/jobs" element={<JobsTab />} />
              <Route path="/candidates" element={<CandidatesTab />} />
              <Route path="/deals" element={<DealRoomsTab />} />
              <Route path="/notifications" element={<NotificationsTab org={org} />} />
              
              {org.type === 'admin' && (
                <>
                  <Route path="/admin/clients" element={<ClientsTab />} />
                  <Route path="/admin/vendors" element={<VendorsTab />} />
                  <Route path="/admin/strategy" element={<AgentHQ />} />
                  <Route path="/admin/execution" element={<ExecutionTracker />} />
                  <Route path="/admin/security" element={<AdminSecurityDashboard />} />
                  <Route path="/admin-overview" element={<AdminOverview />} />
                  <Route path="/users" element={<AdminUsersManager orgData={org} />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        
        {/* Bottom Status & System Footer */}
        <footer className="h-8 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Llama 4 (Matching) Active
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              GPT-4o (Negotiation) Active
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Scraper Flow (LinkedIn) Rate Limited
            </div>
          </div>
          <div className="font-mono uppercase hidden sm:block">
            HireNest System v2.4.12-Beta • Ping 42ms • Region: US-East-1
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
