import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "../lib/Button";

export default function Onboarding({ onComplete }: { onComplete: (orgData: any) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [orgType, setOrgType] = useState<"vendor" | "client" | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [msaFile, setMsaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check if user already has an org
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.organizationId) {
            const orgDoc = await getDoc(doc(db, "organizations", userData.organizationId));
            if (orgDoc.exists()) {
              onComplete({ user: userData, org: orgDoc.data() });
            }
          }
        }
      }
    });
    return () => unsub();
  }, [onComplete]);

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
        setError("Domain not authorized. Please add 'run.app' to Authorized domains in Firebase Console -> Authentication -> Settings.");
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError("");
    
    try {
      if (!orgType || !companyName || !ndaFile || !msaFile) {
        setError("Please fill out all fields and upload required documents.");
        setLoading(false);
        return;
      }
      
      const orgId = "ORG-" + Math.floor(Math.random() * 100000);

      // Upload NDA
      const ndaRef = ref(storage, `compliance/${orgId}/NDA.pdf`);
      await uploadBytes(ndaRef, ndaFile);
      const ndaUrl = await getDownloadURL(ndaRef);

      // Upload MSA
      const msaRef = ref(storage, `compliance/${orgId}/MSA.pdf`);
      await uploadBytes(msaRef, msaFile);
      const msaUrl = await getDownloadURL(msaRef);

      // Create Org
      const orgData = {
        organizationId: orgId,
        type: orgType,
        companyName,
        status: "pending_review",
        ndaUploaded: true,
        msaUploaded: true,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "organizations", orgId), orgData);

      // Create Compliance Docs
      await setDoc(doc(db, "compliance_documents", orgId + "_NDA"), {
        organizationId: orgId,
        documentType: "NDA",
        fileUrl: ndaUrl,
        uploadedAt: new Date().toISOString(),
        status: "pending",
        ownerId: user.uid,
      });

      await setDoc(doc(db, "compliance_documents", orgId + "_MSA"), {
        organizationId: orgId,
        documentType: "MSA",
        fileUrl: msaUrl,
        uploadedAt: new Date().toISOString(),
        status: "pending",
        ownerId: user.uid,
      });

      // Create User
      const userData = {
        uid: user.uid,
        email: user.email,
        role: orgType === "client" ? "client_hm" : "vendor_recruiter",
        organizationId: orgId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "users", user.uid), userData);

      // Trigger Cloud Function stand-in (Call our Express server to send emails/notifications)
      fetch('/api/trigger-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, type: orgType, companyName, email: user.email })
      }).catch(console.error);

      onComplete({ user: userData, org: orgData });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">HireNest<span className="text-indigo-600">OS</span></h1>
            <p className="text-sm text-slate-500 mt-2">AI-Native Staffing Marketplace</p>
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
            <h2 className="text-xl font-bold text-slate-800">Organization Setup</h2>
            <p className="text-xs text-slate-500">Configure your workspace identity</p>
          </div>
          <Button variant="ghost" onClick={() => signOut(auth)} size="sm">Sign Out</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Workspace Role:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setOrgType("vendor"); }}
                className={`p-3 border rounded-lg text-left transition-all ${orgType === 'vendor' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
              >
                <div className="font-bold text-slate-800 text-sm">Vendor</div>
                <div className="text-[10px] text-slate-500 mt-1">Submit candidates to open requirements and track placements.</div>
              </button>
              <button
                type="button"
                onClick={() => { setOrgType("client"); }}
                className={`p-3 border rounded-lg text-left transition-all ${orgType === 'client' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}
              >
                <div className="font-bold text-slate-800 text-sm">Client</div>
                <div className="text-[10px] text-slate-500 mt-1">Post requirements, review candidates, and hire anonymously.</div>
              </button>
            </div>
          </div>

          <>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Company Name</label>
              <input 
                type="text" 
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. ABC Staffing Solutions"
              />
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Compliance Documents</h3>
              <p className="text-xs text-slate-500">Upload your signed Non-Disclosure Agreement (NDA) and Master Service Agreement (MSA).</p>
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Signed NDA (PDF/Doc)</label>
                <input 
                  type="file" 
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setNdaFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Signed MSA (PDF/Doc)</label>
                <input 
                  type="file" 
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setMsaFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>
            </div>
          </>

          {error && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>}

          <Button type="submit" disabled={loading || !orgType} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3">
            {loading ? "Configuring Workspace..." : "Submit Registration"}
          </Button>
        </form>
      </div>
    </div>
  );
}
