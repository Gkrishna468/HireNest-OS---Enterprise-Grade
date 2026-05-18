import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { handleFirestoreError, OperationType } from "../lib/firebase";
import { Button } from "../lib/Button";

export default function Onboarding({ onComplete }: { onComplete: (orgData: any) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [orgType, setOrgType] = useState<"vendor_agency" | "client" | "independent_vendor" | "independent_recruiter" | "freelancer_recruiter" | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [msaFile, setMsaFile] = useState<File | null>(null);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check if user already has an org or is pending
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "PENDING_VERIFICATION" || userData.status === "PENDING") {
              setStep(4);
              return;
            }
            if (userData.organizationId) {
              const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
              if (orgDoc.exists()) {
                onComplete({ user: userData, org: orgDoc.data() });
              }
            }
          }
        } catch (e) {
          console.warn("Onboarding Auth check failed:", e);
        }
      }
    });
    return () => unsub();
  }, [onComplete]);

  // --- Authentication Bridge ---
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password Authentication is not enabled. Please go to your Firebase Console -> Authentication -> Sign-in method, and enable 'Email/Password'.");
      } else {
        setError("Invalid credentials or user not found.");
      }
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`SECURITY PROTOCOL: The domain [${window.location.hostname}] is not yet authorized for this Node. Action Required: Add this domain to the "Authorized domains" list in your Firebase Console -> Authentication -> Settings.`);
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    }
  };

  const checkCorporateEmail = (email: string) => {
    const publicProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com', 'icloud.com'];
    const domain = email.split('@')[1] || "";
    return !publicProviders.includes(domain.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError("");
    
    try {
      if (!orgType) {
        setError("Please select a workspace role.");
        setLoading(false);
        return;
      }

      // Trust Protocols
      const supplyRoles = ["vendor_agency", "independent_vendor", "independent_recruiter", "freelancer_recruiter"];
      if (orgType === "client" || supplyRoles.includes(orgType)) {
        if (!["freelancer_recruiter", "independent_recruiter"].includes(orgType) && !checkCorporateEmail(user.email || "")) {
          setError("SECURITY VULNERABILITY: Official Corporate or Custom Domain Email Required for business nodes.");
          setLoading(false);
          return;
        }
      }

      if (["freelancer_recruiter", "independent_recruiter"].includes(orgType) && (!aadhaarNumber || aadhaarNumber.length < 12)) {
        setError("IDENTITY REJECTED: Valid 12-digit Aadhaar required for individual verification.");
        setLoading(false);
        return;
      }
      
      const payload = {
        type: orgType === 'client' ? 'client' : (orgType === 'freelancer_recruiter' ? 'freelancer' : (orgType.includes('recruiter') ? 'recruiter' : 'vendor')),
        companyName: companyName || (["freelancer_recruiter", "independent_recruiter"].includes(orgType) ? user.displayName : ""),
        email: user.email,
        linkedin: linkedinUrl,
        gstNumber: businessFile ? "GST-PENDING" : null,
        aadhaarNumber: aadhaarNumber || null,
        metadata: {
          originalRole: orgType,
          uid: user.uid,
          selectedRole: selectedRole || ""
        }
      };

      console.log("[PROTOCOL] Initiating Network Onboarding Request...");
      
      const response = await fetch('/api/onboard/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Network Handshake Failed");
      }

      const resData = await response.json();
      console.log("[PROTOCOL] Verification Queue Entry Created:", resData.requestId);

      // Create a local record in users collection specifically as PENDING
      // This allows the app to know they are waiting
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: "PENDING_VERIFICATION",
        onboardingRequestId: resData.requestId,
        status: "PENDING",
        createdAt: new Date().toISOString()
      });

      setStep(4); // Move to "Pending Approval" step
    } catch (err: any) {
      console.error("Governance Handshake Failure:", err);
      setError(err.message || "Protocol execution failed. System halted.");
    }
    setLoading(false);
  };

  if (step === 4) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 text-center space-y-6">
          <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.21 3m-11.33 5a10.978 10.978 0 01-3.232-5.756m11.353 7.555A10.978 10.978 0 0015.12 11" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">Identity in Queue</h2>
          <p className="text-sm text-slate-500 font-medium">Your node identity is currently being verified by the HireNest Global Authority. Access will be provisioned upon trust score confirmation.</p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Queue Status</div>
             <div className="text-xs font-bold text-indigo-600">Verification Pending (Standard Priority)</div>
          </div>
          <Button onClick={() => signOut(auth)} className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs">
            Disconnect Node
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">HireNest<span className="text-indigo-600">OS</span> Identity Protocol</h1>
            <p className="text-sm text-slate-500 mt-2">AI-Native Global Staffing Marketplace</p>
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
                autoComplete="email"
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
                autoComplete="current-password"
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

          {error && <p className="mt-4 text-xs text-red-500 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200 overflow-y-auto max-h-[90vh]">
        <div className="mb-6 flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Identity Protocol Setup</h2>
            <p className="text-xs text-slate-500">Configure your global workspace node identity</p>
          </div>
          <Button variant="ghost" onClick={() => signOut(auth)} size="sm">Sign Out</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Workspace Role Authority:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setOrgType("client"); setSelectedRole("client_hm"); }}
                className={`p-4 border-2 rounded-2xl text-left transition-all ${orgType === 'client' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Client Node</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-relaxed">Hiring organization looking for elite global talent.</div>
              </button>
              <button
                type="button"
                onClick={() => { setOrgType("vendor_agency"); }}
                className={`p-4 border-2 rounded-2xl text-left transition-all ${orgType === 'vendor_agency' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Staffing Agency</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-relaxed">Staffing partner or Agency node providing specialists.</div>
              </button>
              <button
                type="button"
                onClick={() => { setOrgType("independent_vendor"); }}
                className={`p-4 border-2 rounded-2xl text-left transition-all ${orgType === 'independent_vendor' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Independent Vendor</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-relaxed">High-authority independent provider or leadership agency.</div>
              </button>
              <button
                type="button"
                onClick={() => { setOrgType("independent_recruiter"); }}
                className={`p-4 border-2 rounded-2xl text-left transition-all ${orgType === 'independent_recruiter' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Independent Recruiter</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-relaxed">Solo recruiter managing elite talent deal rooms.</div>
              </button>
              <button
                type="button"
                onClick={() => { setOrgType("freelancer_recruiter"); }}
                className={`p-4 border-2 rounded-2xl text-left transition-all ${orgType === 'freelancer_recruiter' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200'}`}
              >
                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">Freelancer Recruiter</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold leading-relaxed">Individual contributor providing specialized sourcing.</div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {orgType === "client" && (
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Select Internal Node Authority:</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'client_hm', label: 'Hiring Manager (Operations)' },
                    { id: 'client_finance', label: 'Financial Controller (Settlements)' },
                    { id: 'client_recruiter', label: 'Talent Lead (Strategy)' }
                  ].map(role => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${selectedRole === role.id ? 'border-indigo-600 bg-white' : 'border-transparent bg-slate-200/50 hover:bg-slate-200'}`}
                    >
                      <span className="text-xs font-bold text-slate-700">{role.label}</span>
                      {selectedRole === role.id && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {orgType && !["freelancer_recruiter", "independent_recruiter", "independent_vendor"].includes(orgType) && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Institution / Agency Name</label>
                <input 
                  type="text" 
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl p-3 text-sm font-bold transition-all outline-none"
                  placeholder="e.g. Acme Staffing Solutions"
                />
              </div>
            )}

            {["freelancer_recruiter", "independent_recruiter"].includes(orgType) && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Aadhaar Number (12 Digits)</label>
                <input 
                  type="text" 
                  required
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl p-3 text-sm font-black tracking-[0.2em] transition-all outline-none"
                  placeholder="0000 0000 0000"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">SECURITY NOTE: Your individual recruiter node is bound to this identity. It is encrypted and used only for marketplace trust scoring.</p>
              </div>
            )}

            {(orgType === "independent_vendor" || orgType === "independent_recruiter" || orgType === "freelancer_recruiter") && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">LinkedIn Profile URL</label>
                <input 
                  type="url" 
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            )}

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-4 font-sans">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Trust Verification Required</h3>
              <p className="text-xs text-slate-500">Upload documentation to establish your Node Authority.</p>
              
              <div className="grid grid-cols-1 gap-4 mt-2">
                  {(orgType === "vendor_agency" || orgType === "client") && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Entity Registration / Tax Document (PDF)</label>
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
                        className="text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Signed Master Agreement (PDF)</label>
                      <input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setNdaFile(e.target.files?.[0] || null)}
                        className="text-[10px]"
                      />
                    </div>
                  </>
                )}
                {["freelancer_recruiter", "independent_recruiter"].includes(orgType) && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Individual Identity Verification (JPG/PNG)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
                      className="text-[10px]"
                    />
                  </div>
                )}
                {orgType === "independent_vendor" && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Corporate Credential or Portfolio (PDF/JPG)</label>
                    <input 
                      type="file" 
                      accept=".pdf,image/*"
                      onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
                      className="text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>}

          <Button type="submit" disabled={loading || !orgType} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3">
            {loading ? "Configuring Workspace..." : "Submit Registration"}
          </Button>
        </form>
      </div>
    </div>
  );
}
