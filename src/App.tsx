import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
  Network
} from 'lucide-react';
import { cn } from './lib/utils';

// Import views
import DashboardTab from './views/DashboardTab';
import AgentHQ from './views/AgentHQ';
import CandidatesTab from './views/CandidatesTab';
import ClientsTab from './views/ClientsTab';
import JobsTab from './views/JobsTab';
import DealRoomsTab from './views/DealRoomsTab';
import VendorsTab from './views/VendorsTab';
import NotificationsTab from './views/NotificationsTab';
import Onboarding from './views/Onboarding';
import AdminOverview from './views/AdminOverview';
import AdminSecurityDashboard from './views/AdminSecurityDashboard';
import AdminUsersManager from './views/AdminUsersManager';
import TraceView from './views/TraceView';
import MemoryMapView from './views/MemoryMapView';

import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active?: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-bold uppercase tracking-wider",
      active 
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
        : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <Icon size={18} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
    <span>{label}</span>
    {active && <ChevronRight size={14} className="ml-auto" />}
  </Link>
);

const AppContent = () => {
  const location = useLocation();
  const [user, setUser] = React.useState<any>(null);
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./lib/firebase');
          const d = await getDoc(doc(db, "users", u.uid));
          if (d.exists()) {
            setUserData(d.data());
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
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Node Identity...</p>
        </div>
      </div>
    );
  }

  if (!user && location.pathname !== '/onboarding') {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin' || userData?.role === 'ops_admin';

  if (user && userData?.onboardingCompleted !== true && !isAdmin) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Permanent Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col p-6 shadow-sm z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
             <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter">HireNest<span className="text-indigo-600">OS</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise Core</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">Workspace</div>
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
          <SidebarItem to="/hq" icon={Brain} label="Agent HQ" active={location.pathname === '/hq'} />
          <SidebarItem to="/candidates" icon={Users} label="Candidates" active={location.pathname === '/candidates'} />
          <SidebarItem to="/jobs" icon={Briefcase} label="Job Pipelines" active={location.pathname === '/jobs'} />
          
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">Partners</div>
          <SidebarItem to="/clients" icon={Building2} label="Clients" active={location.pathname === '/clients'} />
          <SidebarItem to="/vendors" icon={Users} label="Vendors" active={location.pathname === '/vendors'} />
          <SidebarItem to="/deal-rooms" icon={MessageSquare} label="Deal Rooms" active={location.pathname === '/deal-rooms'} />
          
          {isAdmin && (
            <>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 mb-4 px-4">Governance & Operations</div>
              <SidebarItem to="/admin" icon={ShieldCheck} label="Governance" active={location.pathname === '/admin'} />
              <SidebarItem to="/users" icon={Users} label="User Management" active={location.pathname === '/users'} />
              <SidebarItem to="/trace" icon={Activity} label="System Trace" active={location.pathname === '/trace'} />
              <SidebarItem to="/map" icon={Network} label="Memory Map" active={location.pathname === '/map'} />
            </>
          )}
          <SidebarItem to="/notifications" icon={Bell} label="Alerts" active={location.pathname === '/notifications'} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-2">
          <SidebarItem to="/settings" icon={Settings} label="System" active={location.pathname === '/settings'} />
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
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Global Navigation Hub */}
        <header className="h-16 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0 z-40">
           <div className="flex items-center gap-6">
              <div className="bg-slate-900 text-white px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase italic">Node: Global HQ</div>
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Active</span>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 gap-3">
                 <ShieldCheck size={14} className="text-indigo-600" />
                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                   Authority: {userData?.role?.replace('_', ' ') || 'User'}
                 </span>
              </div>
              {isAdmin && (
                <Link 
                  to="/users"
                  className="bg-slate-900 text-white px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
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
            <Route path="/hq" element={<AgentHQ />} />
            <Route path="/candidates" element={<CandidatesTab />} />
            <Route path="/jobs" element={<JobsTab />} />
            <Route path="/clients" element={<ClientsTab />} />
            <Route path="/vendors" element={<VendorsTab />} />
            <Route path="/deal-rooms" element={<DealRoomsTab />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/users" element={<AdminUsersManager orgData={userData} />} />
            <Route path="/trace" element={<TraceView />} />
            <Route path="/map" element={<MemoryMapView />} />
            <Route path="/notifications" element={<NotificationsTab org={{ id: userData?.organizationId }} />} />
            <Route path="/onboarding" element={<Onboarding onComplete={() => window.location.reload()} />} />
            <Route path="/settings" element={<AdminSecurityDashboard />} />
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
