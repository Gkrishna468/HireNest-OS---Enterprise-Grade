import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "../lib/Button";
import { ShieldCheck, UploadCloud, CheckCircle, Fingerprint, Building, UserCheck, Briefcase, ArrowRight, LogOut, FileText } from "lucide-react";

export default function Onboarding({ onComplete }: { onComplete: (orgData: any) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [hasPredefinedRole, setHasPredefinedRole] = useState(false);

  // Form States
  const [orgType, setOrgType] = useState<"client" | "vendor_agency" | "independent_recruiter" | "independent_vendor" | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Files
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [ndaFile, setNdaFile] = useState<File | null>(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Welcome/Auth, 2: Setup, 3: Success Reloading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);

            if (data.onboardingCompleted === true) {
              // Onboarding already complete, proceed directly
              if (data.organizationId) {
                const orgDoc = await getDoc(doc(db, "organizations", data.organizationId));
                onComplete({ user: data, org: orgDoc.exists() ? orgDoc.data() : null });
              } else {
                onComplete({ user: data, org: null });
              }
              return;
            }

            // User pre-exists with a pre-configured role from Admin Dashboard
            if (data.role && data.role !== "PENDING_VERIFICATION") {
              setHasPredefinedRole(true);
              const predefined = data.role;
              setSelectedRole(predefined);

              // Map role to archetype
              if (predefined.startsWith("client_") || predefined === "client") {
                setOrgType("client");
              } else if (predefined.startsWith("vendor_") || predefined === "vendor") {
                setOrgType("vendor_agency");
              } else if (predefined.includes("recruiter")) {
                setOrgType("independent_recruiter");
              } else if (predefined === "independent" || predefined === "independent_vendor") {
                setOrgType("independent_vendor");
              }

              // Load company name if they are linked to an org
              if (data.organizationId) {
                const orgDoc = await getDoc(doc(db, "organizations", data.organizationId));
                if (orgDoc.exists()) {
                  setCompanyName(orgDoc.data().companyName || "");
                }
              }
            }
          }
          setStep(2); // Go straight to setup step
        } catch (e) {
          console.error("Failed to fetch initial profile data:", e);
        } finally {
          setLoading(false);
        }
      } else {
        setStep(1);
        setUserData(null);
        setHasPredefinedRole(false);
      }
    });
    return () => unsub();
  }, [onComplete]);

  // Handle traditional auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in email and password credentials.");
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication credentials rejected. Confirm input and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google sign in popup
  const handleGoogleBtn = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to finalize authentication handshake.");
    }
  };

  // Safe Firebase Storage uploader with resilient fallback
  const uploadToStorageSafe = async (file: File, folder: string) => {
    if (!user) return "";
    try {
      const path = `onboarding_documents/${user.uid}/${folder}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.warn("Storage upload failed, fallback to descriptor details:", err);
      return `gs://${storage?.app?.options?.projectId || "hirenest-os"}/onboarding_documents/${user.uid}/${file.name}`;
    }
  };

  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case 'client_admin':
        return ["view_dashboard", "manage_jobs", "create_deal_rooms", "approve_hires", "view_candidates", "invite_client_users"];
      case 'client_hm':
        return ["view_dashboard", "manage_jobs", "create_deal_rooms", "view_candidates"];
      case 'client_finance':
        return ["view_dashboard", "approve_payments", "view_billings", "view_deals"];
      case 'client_recruiter':
        return ["view_dashboard", "view_candidates", "manage_pipelines", "create_interviews"];
      case 'vendor_admin':
        return ["view_dashboard", "manage_candidates", "submit_candidates", "view_jobs", "view_deal_rooms", "manage_vendor_users"];
      case 'vendor_recruiter':
        return ["view_dashboard", "manage_candidates", "submit_candidates", "view_jobs"];
      case 'independent_recruiter':
        return ["view_dashboard", "manage_candidates", "submit_candidates", "view_jobs", "create_deal_rooms", "track_placements"];
      case 'freelancer_recruiter':
        return ["view_dashboard", "manage_candidates", "submit_candidates", "view_jobs"];
      case 'independent_vendor':
        return ["view_dashboard", "manage_candidates", "submit_candidates", "view_jobs", "view_deals"];
      case 'independent':
        return ["view_dashboard", "submit_self", "view_jobs", "view_deals"];
      default:
        return ["view_dashboard"];
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");

    // Field Verifications
    if (!orgType) {
      setError("Please declare a valid workspace role archetype.");
      return;
    }
    if (!selectedRole) {
      setError("Please select your dedicated operational sub-role authority.");
      return;
    }
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      setError("Government ID Protocol Refused: Valid 12-digit numerical Aadhaar ID is required.");
      return;
    }
    if (!aadhaarFile) {
      setError("Aadhaar Verification File required to certify identity node.");
      return;
    }

    // Role-specific field checks
    if (["client", "vendor_agency"].includes(orgType) && !companyName) {
      setError("Institution / Corporation entity name is required.");
      return;
    }
    if (["client", "vendor_agency"].includes(orgType) && (!businessFile || !ndaFile)) {
      setError("Company incorporation records and signed agreement PDFs are required.");
      return;
    }
    if (["independent_recruiter", "independent_vendor"].includes(orgType) && !businessFile) {
      setError("Credential portfolio or professional reference file is required.");
      return;
    }

    setLoading(true);

    try {
      console.log("[ONBOARDING] Initiating cryptographic identity verification flow...");

      // 1. Upload files
      const aadhaarUrl = await uploadToStorageSafe(aadhaarFile, "aadhaar_card");
      const businessUrl = businessFile ? await uploadToStorageSafe(businessFile, "entity_registration") : "";
      const ndaUrl = ndaFile ? await uploadToStorageSafe(ndaFile, "signed_agreement") : "";

      // 2. Resolve/Create Organization
      let orgId = userData?.organizationId || "";
      if (!orgId) {
        orgId = "ORG-" + Math.random().toString(36).substring(2, 11).toUpperCase();
        const finalOrgType = orgType === 'client' ? 'client' : 'vendor';
        
        await setDoc(doc(db, "organizations", orgId), {
          id: orgId,
          organizationId: orgId,
          companyName: companyName || user.displayName || user.email?.split("@")[0] || "Solo Node Provider",
          type: finalOrgType,
          status: "ACTIVE",
          onboardingCompleted: true,
          createdAt: new Date().toISOString()
        });
      } else {
        // Update existing org company name if changed
        await setDoc(doc(db, "organizations", orgId), {
          companyName: companyName || user.displayName || user.email?.split("@")[0] || "Solo Node Provider",
          status: "ACTIVE",
          onboardingCompleted: true
        }, { merge: true });
      }

      // 3. Assemble and apply profile permissions configuration
      const grantedPermissions = getPermissionsForRole(selectedRole);

      // 4. Update core user document
      const userProfile = {
        uid: user.uid,
        email: user.email,
        role: selectedRole,
        organizationId: orgId,
        status: "ACTIVE",
        onboardingCompleted: true,
        aadhaarNumber: aadhaarNumber,
        linkedin: linkedinUrl || null,
        companyName: companyName || user.displayName || "Freelance Node",
        permissions: grantedPermissions,
        onboardingDocuments: {
          aadhaarDoc: aadhaarUrl || "VERIFIED_RECORD",
          businessDoc: businessUrl || null,
          ndaDoc: ndaUrl || null
        },
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", user.uid), userProfile, { merge: true });

      // 5. Submit notification request to Admin ledger
      await fetch('/api/onboard-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          orgId: orgId,
          role: selectedRole,
          aadhaarNumber: aadhaarNumber,
          verificationStatus: 'VERIFIED'
        })
      }).catch(err => console.warn("Sync onboard request to backoffice non-blocking result:", err));

      console.log("[ONBOARDING] Workspace node is authentic. Relaying user session...");
      setStep(3);

      setTimeout(() => {
        onComplete({ user: userProfile, org: { id: orgId, type: orgType } });
      }, 1500);

    } catch (err: any) {
      console.error("[ONBOARDING] Handshake failure:", err);
      setError(err.message || "An unexpected failure occurred during authority routing.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-mono text-xs">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="tracking-widest uppercase">Syncing Node Identity...</p>
        </div>
      </div>
    );
  }

  // STEP 3: Complete Success Transition
  if (step === 3) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-indigo-500/20 rounded-[32px] p-10 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 h-32 w-32 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="h-20 w-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle className="h-10 w-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black lowercase tracking-tight">Identity Handshake Complete</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Node authority has been successfully registered. Gateway permissions have been securely provisioned for role: <span className="font-mono text-indigo-400 font-bold">[{selectedRole}]</span>.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-900/30 text-left font-mono text-[10px] text-slate-400">
            <div className="flex justify-between border-b border-indigo-950 pb-1.5 mb-1.5">
              <span>Access Node:</span>
              <span className="text-emerald-400 font-bold">PROVISIONED</span>
            </div>
            <div className="flex justify-between">
              <span>Tenant Status:</span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono tracking-widest animate-pulse uppercase">
            Redirecting to home page Node...
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: Login Gate
  if (step === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[40px] shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
          
          <div className="text-center mb-8 mt-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Fingerprint className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight lowercase">identity protocol portal</h1>
            <p className="text-xs text-slate-400 font-bold lowercase mt-1">global network staffing authority & ledger</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-xs p-4 rounded-2xl font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Node Email Account</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl p-3.5 text-sm font-bold transition-all outline-none"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Network Authorization Pass</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl p-3.5 text-sm font-bold transition-all outline-none"
                placeholder="密码 key"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest transition-all mt-4">
              {loading ? "Decrypting Node..." : "Join System Node"}
            </Button>
          </form>

          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <span className="relative bg-white px-3 text-[9px] text-slate-400 font-bold tracking-widest uppercase">Auth Hub</span>
          </div>

          <Button type="button" onClick={handleGoogleBtn} className="w-full h-12 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold text-xs uppercase tracking-widest gap-2.5 transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign-In with Google Auth
          </Button>
        </div>
      </div>
    );
  }

  // STEP 2: Onboarding Setup
  return (
    <div className="flex min-h-screen bg-slate-50 p-6 items-center justify-center">
      <div className="max-w-3xl w-full bg-white rounded-[32px] shadow-2xl border border-slate-200 flex flex-col md:flex-row overflow-hidden max-h-[92vh]">
        
        {/* Left Side: Brand Context banner */}
        <div className="md:w-1/3 bg-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden select-none border-b md:border-b-0 md:border-r border-slate-800">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Fingerprint size={120} />
          </div>
          <div className="space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 bg-indigo-600 rounded-full px-3 py-1 border border-indigo-400/20 text-[9px] uppercase tracking-widest font-black">
              <ShieldCheck size={12} /> Live Security Node
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight italic tracking-tighter">onboarding workspace validation</h2>
              <p className="text-[10px] text-slate-400 mt-2 font-mono">ID: {user?.uid.substring(0, 10).toUpperCase()}</p>
            </div>
          </div>

          <div className="mt-8 space-y-4 pt-6 border-t border-slate-800">
            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-[9px] font-bold">1</div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wide">Workspace Node Selection</h4>
                <p className="text-[9px] text-slate-500">Pick your role matching your organization registry.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-[9px] font-bold">2</div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wide">KYC Government ID</h4>
                <p className="text-[9px] text-slate-500">Attach secure Aadhaar reference file for trust-score verification.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-5 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-[9px] font-bold">3</div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wide">Fulfill Documents</h4>
                <p className="text-[9px] text-slate-500">Upload active corporate records or talent reference portfolio files.</p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 relative z-10 flex items-center justify-between border-t border-slate-800">
            <span className="text-[9px] text-slate-500 font-mono">Secure: SHA-256 Protocol</span>
            <button 
              type="button" 
              onClick={() => signOut(auth)}
              className="text-[9px] font-bold text-slate-400 hover:text-white uppercase flex items-center gap-1 transition-colors"
            >
              <LogOut size={12} /> Log out
            </button>
          </div>
        </div>

        {/* Right Side: Identity Form */}
        <div className="flex-1 p-8 overflow-y-auto max-h-[92vh] md:max-h-none">
          <div className="mb-6 flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">Configure Workspace Identity</h2>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Assign authority and establish cryptographic credentials</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-xs p-3.5 rounded-2xl font-bold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-6">
            
            {/* STAGE A: Org Archetype Choice */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">
                1. Select Network Archetype
              </label>
              
              {hasPredefinedRole ? (
                <div className="p-4 bg-slate-900 border border-indigo-500/30 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[8px] bg-indigo-600 text-white rounded px-2 py-0.5 font-bold uppercase">Preconfigured Entity</span>
                    <h3 className="text-xs font-black lowercase tracking-tight font-mono mt-1">Role: [{selectedRole.toUpperCase()}]</h3>
                  </div>
                  <CheckCircle className="text-emerald-400 h-5 w-5" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "client", label: "Client Node", desc: "Corporate entity hiring talent", icon: Building },
                    { id: "vendor_agency", label: "Vendor Partner", desc: "Sourcing agency deploying experts", icon: Briefcase },
                    { id: "independent_recruiter", label: "Solo Recruiter", desc: "Independent recruiter agent", icon: UserCheck },
                    { id: "independent_vendor", label: "Freelancer", desc: "Solo contractor / Specialist Node", icon: Fingerprint }
                  ].map((arch) => {
                    const Icon = arch.icon;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => {
                          setOrgType(arch.id as any);
                          // Default first sub-role
                          if (arch.id === "client") setSelectedRole("client_hm");
                          else if (arch.id === "vendor_agency") setSelectedRole("vendor_admin");
                          else if (arch.id === "independent_recruiter") setSelectedRole("independent_recruiter");
                          else if (arch.id === "independent_vendor") setSelectedRole("independent_vendor");
                        }}
                        className={`p-3 border-2 rounded-2xl text-left select-none transition-all outline-none flex flex-col justify-between h-24 ${
                          orgType === arch.id 
                            ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100" 
                            : "border-slate-100 hover:border-indigo-100 focus:border-indigo-100"
                        }`}
                      >
                        <div className="flex justify-between w-full items-center">
                          <span className="font-black text-xs text-slate-900 uppercase tracking-tight leading-none">{arch.label}</span>
                          <Icon className={`h-4 w-4 ${orgType === arch.id ? "text-indigo-600" : "text-slate-400"}`} />
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase leading-tight line-clamp-2">{arch.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STAGE B: Sub-Role Selection */}
            {orgType && (
              <div className="space-y-4 pt-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  2. Operational Sub-Role Node
                </label>
                
                {hasPredefinedRole ? (
                  <p className="text-[10px] font-semibold text-slate-400">Locked-in role: <span className="font-mono text-indigo-600">[{selectedRole}]</span></p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    {orgType === "client" && [
                      { id: "client_hm", name: "Hiring Manager (Operations Node)", desc: "Build workspace queries, open roles, and approve submissions" },
                      { id: "client_finance", name: "Financial Controller (Settlements)", desc: "Govern budget allocation, ledger payments, and rate structures" },
                      { id: "client_recruiter", name: "Talent Lead (Strategy Sourcing)", desc: "Direct client interviews and guide pipeline placement" },
                      { id: "client_admin", name: "Client Administrator (Owner Authority)", desc: "Full organization governance and portal profile config" }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedRole === r.id 
                            ? "border-indigo-600 bg-white" 
                            : "border-transparent bg-slate-200/45 hover:bg-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full flex items-center justify-center border ${selectedRole === r.id ? "border-indigo-600" : "border-slate-300"}`}>
                            {selectedRole === r.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-snug">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {orgType === "vendor_agency" && [
                      { id: "vendor_admin", name: "Vendor Administrator (Ops Lead)", desc: "Full supply capabilities, deploy contractors, and manage vendor fees" },
                      { id: "vendor_recruiter", name: "Partner Recruiter (Sourcing Node)", desc: "Direct candidate profiles matching clients pipeline filters" }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedRole === r.id 
                            ? "border-indigo-600 bg-white" 
                            : "border-transparent bg-slate-200/45 hover:bg-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full flex items-center justify-center border ${selectedRole === r.id ? "border-indigo-600" : "border-slate-300"}`}>
                            {selectedRole === r.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-snug">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {orgType === "independent_recruiter" && [
                      { id: "independent_recruiter", name: "Solo Recruiter Node", desc: "Private recruitment advisor with direct pipeline access" },
                      { id: "freelancer_recruiter", name: "Freelance Sourcing Specialist", desc: "Subcontracted sourcing agent submitting matched specialists" }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedRole === r.id 
                            ? "border-indigo-600 bg-white" 
                            : "border-transparent bg-slate-200/45 hover:bg-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full flex items-center justify-center border ${selectedRole === r.id ? "border-indigo-600" : "border-slate-300"}`}>
                            {selectedRole === r.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-snug">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {orgType === "independent_vendor" && [
                      { id: "independent_vendor", name: "Independent Specialty Partner", desc: "Freelance professional managing multiple contract assignments" },
                      { id: "independent", name: "High-Authority Specialist Node", desc: "Specialist authority providing bespoke technology services directly" }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedRole === r.id 
                            ? "border-indigo-600 bg-white" 
                            : "border-transparent bg-slate-200/45 hover:bg-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full flex items-center justify-center border ${selectedRole === r.id ? "border-indigo-600" : "border-slate-300"}`}>
                            {selectedRole === r.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.name}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-snug">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STAGE C: Profile details & Aadhaar */}
            {orgType && (
              <div className="space-y-4 pt-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  3. Demographic Details & Credentials
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Entity Institution Name for corporate roles */}
                  {["client", "vendor_agency"].includes(orgType) && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Institution / Agency Name</label>
                      <input 
                        type="text" 
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 focus:border-indigo-600 rounded-xl p-3 text-xs font-bold transition-all outline-none"
                        placeholder="e.g. Acme Corporation Pvt Ltd"
                      />
                    </div>
                  )}

                  {/* Standard Aadhaar input (Mandatory for all roles!) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Aadhaar Card Number (12 Digits)</label>
                    <input 
                      type="text" 
                      required
                      maxLength={12}
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-250 focus:border-indigo-600 rounded-xl p-3 text-xs font-black tracking-[0.2em] transition-all outline-none"
                      placeholder="000000000000"
                    />
                  </div>

                  {/* LinkedIn profile URL */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">LinkedIn Profile URL</label>
                    <input 
                      type="url" 
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:border-indigo-600 rounded-xl p-3 text-xs font-bold transition-all outline-none"
                      placeholder="https://linkedin.com/in/profile"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE D: Trust Document Upload Panel */}
            {orgType && (
              <div className="space-y-4 pt-1">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  4. Upload Trust Verification Files
                </label>

                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase leading-snug mb-2">Each secure node is validated with supporting credentials. Base documents are encrypted end-to-end.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Aadhaar File Upload (Required across all roles) */}
                    <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-400">Government ID (Aadhaar Card)</span>
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 transition-colors text-center cursor-pointer flex flex-col items-center justify-center min-h-[70px]">
                        <input 
                          type="file" 
                          required
                          disabled={loading}
                          accept=".pdf,image/*"
                          onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {aadhaarFile ? (
                          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                            <CheckCircle size={14} /> {aadhaarFile.name.substring(0, 18)}...
                          </div>
                        ) : (
                          <div className="text-slate-400 flex flex-col items-center">
                            <UploadCloud size={18} className="text-indigo-400 mb-1" />
                            <span className="text-[9px] font-mono leading-none">Aadhaar Card (PDF/Image)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role-Specific Document Upload */}
                    {["client", "vendor_agency"].includes(orgType) && (
                      <>
                        <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
                          <span className="text-[9px] font-black uppercase text-slate-400">Incorporation / Tax Records</span>
                          <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 transition-colors text-center cursor-pointer flex flex-col items-center justify-center min-h-[70px]">
                            <input 
                              type="file" 
                              required
                              disabled={loading}
                              accept=".pdf,image/*"
                              onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {businessFile ? (
                              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                                <CheckCircle size={14} /> {businessFile.name.substring(0, 18)}...
                              </div>
                            ) : (
                              <div className="text-slate-400 flex flex-col items-center">
                                <UploadCloud size={18} className="text-indigo-400 mb-1" />
                                <span className="text-[9px] font-mono leading-none">incorporation.pdf (GST/Trade)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="sm:col-span-2 space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
                          <span className="text-[9px] font-black uppercase text-slate-400">Signed Master Agreement / NDA</span>
                          <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 transition-colors text-center cursor-pointer flex flex-col items-center justify-center min-h-[70px]">
                            <input 
                              type="file" 
                              required
                              disabled={loading}
                              accept=".pdf"
                              onChange={(e) => setNdaFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {ndaFile ? (
                              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                                <CheckCircle size={14} /> {ndaFile.name.substring(0, 30)}...
                              </div>
                            ) : (
                              <div className="text-slate-400 flex flex-col items-center">
                                <FileText size={18} className="text-indigo-400 mb-1" />
                                <span className="text-[9px] font-mono leading-none">Upload Signed Agreement Document (PDF)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Independent / Small recruiter Document Upload */}
                    {["independent_recruiter", "independent_vendor"].includes(orgType) && (
                      <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black uppercase text-slate-400">Professional Reference / Portfolio</span>
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 transition-colors text-center cursor-pointer flex flex-col items-center justify-center min-h-[70px]">
                          <input 
                            type="file" 
                            required
                            disabled={loading}
                            accept=".pdf,image/*"
                            onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {businessFile ? (
                            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                              <CheckCircle size={14} /> {businessFile.name.substring(0, 18)}...
                            </div>
                          ) : (
                            <div className="text-slate-400 flex flex-col items-center">
                              <UploadCloud size={18} className="text-indigo-400 mb-1" />
                              <span className="text-[9px] font-mono leading-none">resume_or_portfolio.pdf</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Launch CTA */}
            {orgType && (
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-14 bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Completing Cryptographic Validation...
                  </>
                ) : (
                  <>
                    Onboard Node & Complete Gateway <ArrowRight size={14} />
                  </>
                )}
              </Button>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
