import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { cn } from "./lib/utils";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Onboarding from "./views/Onboarding";
import { ComplianceBanner } from "./components/ComplianceBanner";

import DashboardTab from "./views/DashboardTab";
import JobsTab from "./views/JobsTab";
import CandidatesTab from "./views/CandidatesTab";
import DealRoomsTab from "./views/DealRoomsTab";
import AdminUsersManager from "./views/AdminUsersManager";

// Global auth context simulation
export let currentUserState: { user: any; org: any } | null = null;

function Sidebar({ orgType }: { orgType: string }) {
  const location = useLocation();
  const navItems = [
    { name: "Dashboard", path: "/", icon: "▤" },
    { name: "Requirements", path: "/jobs", icon: "⌘" },
    { name: "Candidates", path: "/candidates", icon: "👥" },
    { name: "Deal Rooms", path: "/deals", icon: "💬" },
    ...(orgType === 'admin' ? [{ name: "Users", path: "/users", icon: "⚙️" }] : [])
  ];

  const intelligenceItems = [
    { name: "Agent Flows", path: "#", icon: "✦" },
    { name: "Margin Control", path: "#", icon: "⚖️" },
    { name: "Outreach Bot", path: "#", icon: "⚡" },
  ];

  return (
    <nav className="w-52 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 px-2">Operating Layer</div>
        {navItems.map((item) => {
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
        {intelligenceItems.map((item) => (
            <a
              key={item.name}
              href={item.path}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 text-slate-600 text-sm"
            >
              <span className="text-lg leading-none">{item.icon}</span> <span>{item.name}</span>
            </a>
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
  console.log("App component mounting");
  const [authState, setAuthState] = useState<{ loading: boolean, authData: { user: any, org: any } | null, error: string | null }>({ loading: true, authData: null, error: null });

  useEffect(() => {
    const timer = setTimeout(() => {
       if (authState.loading) {
         setAuthState(prev => ({ ...prev, loading: false, error: "Initialization timed out. Please check your network connection or try refreshing." }));
       }
    }, 10000); // 10s timeout
    return () => clearTimeout(timer);
  }, [authState.loading]);

// Helper to fetch data with retries
async function fetchWithRetry(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
    try {
      return await fn();
    } catch (err: any) {
      const errMsg = (err.message || "").toLowerCase();
      console.log("Firestore fetch error:", errMsg, err);
      if (retries > 0 && (errMsg.includes("offline") || errMsg.includes("unavailable") || errMsg.includes("network"))) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(fn, retries - 1, delay * 2);
      }
      throw err;
    }
}

  useEffect(() => {
    console.log("Bypassing Firebase Auth, forcing Admin state");
    setAuthState({
      loading: false,
      authData: {
        user: { uid: 'mock-admin', email: 'gopalkrishna0046@gmail.com' },
        org: {
          organizationId: "ORG-GLOBAL-HQ",
          type: "admin",
          companyName: "HireNest Global HQ",
          status: "approved",
          ndaUploaded: true,
          msaUploaded: true,
          ownerId: 'mock-admin',
          createdAt: new Date().toISOString()
        }
      },
      error: null
    });
    
    return () => {};
  }, []);

  if (authState.loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 font-mono text-sm text-slate-500">Initializing HireNestOS SecOps...</div>;
  }

  if (!authState.authData) {
    return <Onboarding error={authState.error} onComplete={(data) => {
       currentUserState = data;
       setAuthState({ loading: false, authData: data, error: null });
    }} />;
  }

  const { user, org } = authState.authData;

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        <TopBar orgData={org} />
        <ComplianceBanner orgData={org} userId={user.uid} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar orgType={org.type} />
          <main className="flex-1 overflow-y-auto flex flex-col">
            <Routes>
              <Route path="/" element={<DashboardTab />} />
              <Route path="/jobs" element={<JobsTab />} />
              <Route path="/candidates" element={<CandidatesTab />} />
              <Route path="/deals" element={<DealRoomsTab />} />
              <Route path="/users" element={<AdminUsersManager orgData={org} />} />
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
