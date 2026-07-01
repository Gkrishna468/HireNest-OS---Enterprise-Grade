import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Fingerprint, 
  Lock, 
  Mail, 
  ArrowRight, 
  Bot, 
  CheckCircle2, 
  Building2, 
  Users, 
  Briefcase,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Activity
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Authentication failed. Check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Left Side: Brand & Social Proof */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter">
              HireNest<span className="text-indigo-600">OS</span>
            </h1>
          </div>

          <div className="space-y-8 max-w-md">
            <h2 className="text-5xl font-black text-white tracking-tighter leading-none">
              Welcome to <br />
              <span className="text-indigo-400">HireNestOS</span>
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed">
              AI-Native Staffing Operating System. One platform. Infinite possibilities.
            </p>

            <div className="space-y-4 pt-10">
              {[
                { icon: Zap, text: "Automate workflows", sub: "24/7 autonomous hiring" },
                { icon: Users, text: "Find the best talent", sub: "Proprietary matching engine" },
                { icon: Activity, text: "Scale your business", sub: "Real-time revenue intelligence" }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.text}</h4>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-10">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4">Secure. Intelligent. Autonomous.</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 bg-white relative">
        <div className="max-w-md w-full">
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white rotate-3">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter">HireNestOS</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Login to your account</h3>
            <p className="text-sm text-slate-500 font-medium mt-2">Access your workspace and continue</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-rose-800 font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-600 focus:bg-white outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                <button type="button" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-600 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
            >
              {isLoading ? "Authenticating..." : "Secure Login"} <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <span>Don't have an account?</span>
            <Link to="/#early-access" className="text-indigo-600 hover:underline">Get Early Access</Link>
          </div>

          <div className="relative my-10 flex items-center justify-center">
            <div className="absolute inset-0 border-t border-slate-100" />
            <span className="relative bg-white px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">or continue with</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="h-14 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest text-slate-700"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
              Sign in with Google
            </button>
          </div>

          <div className="mt-12 pt-10 border-t border-slate-50 text-center">
            <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Link to="/terms" className="hover:text-slate-600">Terms</Link>
              <Link to="/privacy" className="hover:text-slate-600">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
