import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Mail, 
  MessageCircle, 
  Search, 
  Globe,
  Building,
  UserCircle,
  FileText,
  Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NetworkTab() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('overview');

  const apps = [
    {
      title: "Global Requirements",
      description: "All client requirements in one unified view",
      icon: <Briefcase className="h-6 w-6 text-indigo-500" />,
      action: () => navigate('/jobs'),
      color: "bg-indigo-50 border-indigo-100"
    },
    {
      title: "Global Candidate Pool",
      description: "All vendors and candidates with AI semantic search",
      icon: <Users className="h-6 w-6 text-emerald-500" />,
      action: () => navigate('/candidates'),
      color: "bg-emerald-50 border-emerald-100"
    },
    {
      title: "MailOS 2.0",
      description: "Automatic email parsing and requirement creation",
      icon: <Mail className="h-6 w-6 text-blue-500" />,
      action: () => navigate('/emails'),
      color: "bg-blue-50 border-blue-100"
    },
    {
      title: "WhatsApp Business",
      description: "Vendor and client communication integration",
      icon: <MessageCircle className="h-6 w-6 text-green-500" />,
      action: () => navigate('/whatsapp'),
      color: "bg-green-50 border-green-100"
    }
  ];

  const views360 = [
    { title: "Client 360", icon: <Building className="h-5 w-5" />, path: '/client-360' },
    { title: "Vendor 360", icon: <Globe className="h-5 w-5" />, path: '/vendor-360' },
    { title: "Candidate 360", icon: <UserCircle className="h-5 w-5" />, path: '/candidates' },
    { title: "Requirement 360", icon: <FileText className="h-5 w-5" />, path: '/jobs' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-indigo-600" />
            Global Network
          </h1>
          <p className="text-sm text-slate-500">
            Unified access to Global Requirements, Candidate Pools, and Communications
          </p>
        </div>

        {/* 360 Views Quick Access */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Unified 360 Views
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {views360.map((view) => (
              <button
                key={view.title}
                onClick={() => navigate(view.path)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-600 transition-all gap-2 text-slate-600 group"
              >
                <div className="p-3 bg-white rounded-lg shadow-sm group-hover:text-indigo-600 transition-colors">
                  {view.icon}
                </div>
                <span className="text-xs font-bold">{view.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Network Apps */}
        <div className="grid md:grid-cols-2 gap-6">
          {apps.map((app) => (
            <div 
              key={app.title}
              onClick={app.action}
              className={`p-6 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${app.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  {app.icon}
                </div>
                <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{app.title}</h3>
              <p className="text-sm text-slate-600 font-medium">
                {app.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
