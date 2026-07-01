import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Zap, 
  Bot, 
  Globe, 
  CheckCircle2, 
  ArrowRight, 
  Mail, 
  Building2, 
  Users, 
  Activity,
  ChevronRight,
  Shield,
  MessageSquare,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function LandingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    companyEmail: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, "early_access_leads"), {
        ...formData,
        timestamp: new Date().toISOString(),
        status: 'new'
      });
      setIsSubmitted(true);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "early_access_leads");
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              HireNest<span className="text-indigo-600">OS</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#early-access" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Early Access</a>
            <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Login</Link>
            <button 
              onClick={() => document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-indigo-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <Zap size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI-Native • Automate • Scale</span>
            </div>
            
            <h2 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              Run Your Staffing <br />
              Business on <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Autopilot</span>
            </h2>
            
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg font-medium">
              The AI-native Operating System that unifies Recruiters, Vendors, Clients and Candidates in one intelligent platform.
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              {[
                { icon: CheckCircle2, text: "Autonomous Workflows" },
                { icon: CheckCircle2, text: "Real-time Intelligence" },
                { icon: CheckCircle2, text: "End-to-End Visibility" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <item.icon size={16} className="text-indigo-500" />
                  {item.text}
                </div>
              ))}
            </div>

            <div className="pt-8">
               <button 
                onClick={() => document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex items-center gap-3 bg-white text-slate-950 px-8 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                Join Early Access <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-right duration-1000 delay-300">
            <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-4 shadow-2xl overflow-hidden shadow-indigo-500/10">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
                alt="Dashboard Mockup" 
                className="w-full h-auto rounded-[2rem] opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              
              <div className="absolute bottom-10 left-10 right-10 p-8 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-3xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Mission Control</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active System Projection</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-3/4 animate-pulse" />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>AI EFFICIENCY</span>
                    <span className="text-indigo-400">94.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By / Partner Network */}
      <section className="py-24 border-y border-white/5 bg-slate-950/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">The Network</p>
            <h3 className="text-2xl font-black tracking-tighter text-white">Trusted by IT Staffing Partners</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Partner 1: Mapout */}
            <div className="group p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 flex flex-col items-center justify-center text-center gap-6">
              <div className="h-16 w-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <Globe size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-white mb-1">Mapout Inc</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400 transition-colors">Global Client Partner</p>
              </div>
            </div>

            {/* Partner 2: Worknexa */}
            <div className="group p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 flex flex-col items-center justify-center text-center gap-6">
              <div className="h-16 w-16 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <Users size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-white mb-1">Worknexa</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-purple-400 transition-colors">Strategic Vendor</p>
              </div>
            </div>

            {/* Partner 3: Shreeji */}
            <div className="group p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 flex flex-col items-center justify-center text-center gap-6">
              <div className="h-16 w-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                <Building2 size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-white mb-1">Shreeji Consulting</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-400 transition-colors">Platform Beta Partner</p>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-950 bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
                  +
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">
              100+ Vendors & Clients joining the ecosystem soon
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">The Operating System</h3>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Everything You Need. All in One OS.</h2>
            <p className="text-slate-400 font-medium leading-relaxed">Ditch the siloed tools. HireNestOS unifies every stakeholder in your staffing ecosystem with AI-powered intelligence.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Mail, title: "Intelligent Intake", desc: "AI parses JDs & resumes from emails, WhatsApp and portals automatically." },
              { icon: Zap, title: "AI Matching Engine", desc: "Proprietary engine delivers accurate matches with explainable AI." },
              { icon: Bot, title: "Autonomous Workflow", desc: "Event-driven offices work 24/7 to automate your entire hiring lifecycle." },
              { icon: Activity, title: "Real-time Intelligence", desc: "Live dashboards, predictive insights and revenue projections." }
            ].map((feature, i) => (
              <div key={i} className="group p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] hover:bg-slate-900 hover:border-indigo-500/20 transition-all">
                <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-lg font-black mb-3">{feature.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access Form */}
      <section id="early-access" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -z-10" />
        
        <div className="max-w-5xl mx-auto bg-slate-900 border border-white/10 rounded-[3rem] p-8 md:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h2 className="text-4xl font-black tracking-tighter leading-none">Get Early Access</h2>
              <p className="text-slate-400 leading-relaxed font-medium">
                Join the future of staffing. Be among the first to experience AI-powered hiring at scale. We are currently rolling out access to selected partners.
              </p>
              
              <div className="space-y-4 pt-4">
                {[
                  "No Setup Fees",
                  "Dedicated Success Manager",
                  "Early Adopter Pricing",
                  "Priority Feature Requests"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {isSubmitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in duration-500">
                  <div className="h-20 w-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black mb-2">You're on the list!</h3>
                    <p className="text-slate-400 text-sm font-medium">We'll reach out to your company email soon.</p>
                  </div>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Company Name</label>
                      <input 
                        type="text" 
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Acme Staffing"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Personal Email</label>
                      <input 
                        type="email" 
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                        placeholder="john@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Company Email</label>
                      <input 
                        type="email" 
                        name="companyEmail"
                        required
                        value={formData.companyEmail}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                        placeholder="john@acme.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Phone Number (Optional)</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-900/40"
                  >
                    {isSubmitting ? "Processing..." : "Secure Early Access"}
                  </button>

                  <p className="text-[10px] text-slate-500 text-center font-medium">
                    By joining, you agree to our <Link to="/terms" className="text-slate-400 underline">Terms</Link> and <Link to="/privacy" className="text-slate-400 underline">Privacy Policy</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white rotate-3">
                <ShieldCheck size={20} />
              </div>
              <h1 className="text-lg font-black tracking-tighter">HireNestOS</h1>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              The AI-Native Staffing Operating System that automates, matches and scales your staffing business.
            </p>
          </div>

          {[
            { title: "Product", links: ["Features", "Pricing", "Integrations", "Roadmap"] },
            { title: "Solutions", links: ["For Recruiters", "For Vendors", "For Clients", "Enterprise"] },
            { title: "Company", links: [
              { label: "About Us", href: "https://www.hirenestworkforce.com" },
              { label: "Careers", href: "#" },
              { label: "Partners", href: "#" },
              { label: "Contact", href: "#" }
            ] }
          ].map((col, i) => (
            <div key={i} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link: any, j) => (
                  <li key={j}>
                    <a 
                      href={typeof link === 'string' ? '#' : link.href} 
                      className="text-xs text-slate-500 hover:text-indigo-400 transition-colors font-medium"
                    >
                      {typeof link === 'string' ? link : link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">© 2026 HireNestOS. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/terms" className="text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest">Terms</Link>
            <Link to="/privacy" className="text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
