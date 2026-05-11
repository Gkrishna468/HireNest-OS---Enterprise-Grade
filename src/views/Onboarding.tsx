import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "../lib/Button";

export default function Onboarding({ error: externalError, onComplete }: { error?: string | null, onComplete: (orgData: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const error = externalError || localError;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!email || !password) {
      setLocalError("Please enter email and password.");
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setLocalError("Email/Password Authentication is not enabled. Please go to your Firebase Console -> Authentication -> Sign-in method, and enable 'Email/Password'.");
      } else {
        setLocalError("Invalid credentials or user not found.");
      }
    }
  };

  const handleLogin = async () => {
    try {
      setLocalError("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setLocalError("Domain not authorized. Please add 'run.app' to Authorized domains in Firebase Console -> Authentication -> Settings.");
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setLocalError("Sign-in popup was cancelled.");
      } else if (err.message?.includes("client is offline")) {
        setLocalError("Network error. Please check your connection.");
      } else {
        setLocalError(err.message || "Failed to sign in with Google.");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HireNest<span className="text-indigo-600">OS</span></h1>
          <p className="text-sm text-slate-500 mt-2">Global HQ Tenant Access</p>
        </div>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter your password"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white flex justify-center py-2.5">
            Sign In
          </Button>
        </form>

        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative bg-white px-2 text-xs text-slate-400 font-medium">OR</span>
        </div>

        <Button type="button" onClick={handleLogin} className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center py-2.5 gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        {error && (
          <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-md text-sm text-center border border-red-200 shadow-sm leading-relaxed font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
