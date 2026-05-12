import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { cn } from "./lib/utils";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./lib/firebase";
import Onboarding from "./views/Onboarding";

import DashboardTab from "./views/DashboardTab";
import JobsTab from "./views/JobsTab";
import CandidatesTab from "./views/CandidatesTab";
import DealRoomsTab from "./views/DealRoomsTab";
import AdminUsersManager from "./views/AdminUsersManager";
import AdminOverview from "./views/AdminOverview";
import ClientsTab from "./views/ClientsTab";
import VendorsTab from "./views/VendorsTab";

// Global auth context simulation
export let currentUserState: { user: any; org: any } | null = null;


function Sidebar({ org, user }: { org: any, user: any }) {
  const location = useLocation();
  
  const isAdmin = org.type === 'admin';
  const isClient = org.type === 'client';
  const isVendor = org.type === 'vendor';

  const navItems = [
    { name: "Dashboard", path: isAdmin ? "/admin-overview" : (isClient ? "/clients" : "/vendors"), icon: "▤", visible: true },
    { name: "Requirements", path: "/jobs", icon: "⌘", visible: true },
    { name: "Candidates", path: "/candidates", icon: "👥", visible: isAdmin || isVendor },
    { name: "Deal Rooms", path: "/deals", icon: "💬", visible: true },
    { name: "Manage Clients", path: "/admin/clients", icon: "🏢", visible: isAdmin },
    { name: "Manage Vendors", path: "/admin/vendors", icon: "⛑️", visible: isAdmin },
    { name: "Platform Analytics", path: "/admin-overview", icon: "📊", visible: isAdmin },
    { name: "System Settings", path: "/users", icon: "⚙️", visible: isAdmin }
  ];

  const intelligenceItems = [
    { name: "Agent Flows", path: "#", icon: "✦", visible: isAdmin || isClient },
    { name: "Margin Control", path: "#", icon: "⚖️", visible: isAdmin || (isClient && user.role === 'client_finance') },
    { name: "Outreach Bot", path: "#", icon: "⚡", visible: isAdmin || isVendor },
  ];

  return (
    <nav className="w-52 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Authenticated Hub</label>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-[11px] font-bold uppercase text-slate-700">{org.type} workforce</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 px-2">Operating Layer</div>
        {navItems.filter(i => i.visible).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium",
                isActive 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "hover:bg-slate-100 text-slate-600"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.name}</span>
              {item.name === "Deal Rooms" && (
                 <span className="ml-auto bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">4</span>
              )}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-8 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 px-2">AI Intelligence</div>
        {intelligenceItems.filter(i => i.visible).map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 text-slate-600 text-sm"
            >
              <span className="text-lg leading-none">{item.icon}</span> <span>{item.name}</span>
            </Link>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <div className="p-3 bg-slate-900 rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-indigo-300 font-bold uppercase">AI Match Engine</span>
                <span className="text-[10px] text-emerald-400">Online</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">942 resumes parsed in last 24h. Matching precision increased by 4.2%.</p>
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
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
          } else if (fbUser.email === "gopalkrishna0046@gmail.com" || fbUser.email === "gopal@hirenestworkforce.com") {
            // Bootstrap the admin user
            const orgId = "ORG-GLOBAL-HQ";
            const orgData = {
              organizationId: orgId,
              type: "admin",
              companyName: "HireNest Global HQ",
              status: "approved",
              ndaUploaded: false,
              msaUploaded: false,
              ownerId: fbUser.uid,
              createdAt: new Date().toISOString()
            };
            const userData = {
              uid: fbUser.uid,
              email: fbUser.email,
              role: "admin",
              organizationId: orgId,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, "organizations", orgId), orgData);
            await setDoc(doc(db, "users", fbUser.uid), userData);
            
            const data = { user: userData, org: orgData };
            currentUserState = data;
            setAuthState({ loading: false, authData: data });
            return;
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
              
              {org.type === 'admin' && (
                <>
                  <Route path="/admin/clients" element={<ClientsTab />} />
                  <Route path="/admin/vendors" element={<VendorsTab />} />
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
