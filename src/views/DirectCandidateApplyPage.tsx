import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Check,
  Eye,
  LogIn,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../lib/Button";
import { Badge } from "../lib/Badge";
import { HireNestBrandLogo } from "../components/brand/HireNestBrandLogo";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";
import {
  CandidateJobFeedService,
  CandidateJobFeedItem
} from "../services/candidateJobFeedService";

export default function DirectCandidateApplyPage() {
  const { requirementId, token } = useParams<{ requirementId: string; token?: string }>();
  const navigate = useNavigate();

  // Requirement Data State
  const [job, setJob] = useState<CandidateJobFeedItem | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auth / Candidate State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [candidateProfile, setCandidateProfile] = useState<any | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  // Form Mode for Logged-Out Candidates: "REGISTER" or "SIGNIN"
  const [authMode, setAuthMode] = useState<"REGISTER" | "SIGNIN">("REGISTER");

  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Application / Resume Upload State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isExtractingResume, setIsExtractingResume] = useState<boolean>(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedExpYears, setExtractedExpYears] = useState<number>(3);
  const [resumeText, setResumeText] = useState<string>("");

  // Screening Answers
  const [useExistingProfile, setUseExistingProfile] = useState<boolean>(true);
  const [availability, setAvailability] = useState<string>("Immediate (within 15 days)");
  const [onsiteReady, setOnsiteReady] = useState<string>("Yes, fully available for Onsite requirement");
  const [expectedCTC, setExpectedCTC] = useState<string>("");
  const [currentCTC, setCurrentCTC] = useState<string>("");
  const [candidateNotes, setCandidateNotes] = useState<string>("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [createdAppId, setCreatedAppId] = useState<string>("");

  // 1. Load Requirement Details
  useEffect(() => {
    let isMounted = true;
    const fetchRequirement = async () => {
      if (!requirementId) {
        setLoadError("Invalid or missing requirement ID.");
        setIsLoadingJob(false);
        return;
      }

      setIsLoadingJob(true);
      const res = await CandidateJobFeedService.verifyDirectCandidateInvite(requirementId, token);
      if (isMounted) {
        if (res.valid && res.job) {
          setJob(res.job);
        } else {
          setLoadError(res.errorReason || "This position is unavailable or expired.");
        }
        setIsLoadingJob(false);
      }
    };

    fetchRequirement();
    return () => {
      isMounted = false;
    };
  }, [requirementId, token]);

  // 2. Track Auth User & Existing Profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsLoadingProfile(true);
        try {
          const profRef = doc(db, "candidate_profiles", user.uid);
          const profSnap = await getDoc(profRef);
          if (profSnap.exists()) {
            const data = profSnap.data();
            setCandidateProfile(data);
            setFullName(data.name || user.displayName || "");
            setEmail(data.email || user.email || "");
            setPhone(data.phone || "");
            if (data.skills && Array.isArray(data.skills)) {
              setExtractedSkills(data.skills);
            }
          } else {
            setFullName(user.displayName || "");
            setEmail(user.email || "");
          }
        } catch (err) {
          console.warn("Failed to fetch candidate profile:", err);
        } finally {
          setIsLoadingProfile(false);
        }
      }
    });

    return () => unsub();
  }, []);

  // 3. Handle Resume File Upload & Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setIsExtractingResume(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/public-candidate-resume", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Failed to extract resume details.");
      }

      const data = await res.json();
      const skillsFound =
        data.candidateProfile?.skills ||
        data.skills ||
        [];
      const expFound = data.candidateProfile?.experienceYears || data.experienceYears || 3;
      const text = data.text || data.candidateProfile?.resumeText || "";

      setExtractedSkills(skillsFound);
      setExtractedExpYears(expFound);
      setResumeText(text);

      if (data.candidateProfile?.name && !fullName) {
        setFullName(data.candidateProfile.name);
      }
      if (data.candidateProfile?.email && !email) {
        setEmail(data.candidateProfile.email);
      }
      if (data.candidateProfile?.phone && !phone) {
        setPhone(data.candidateProfile.phone);
      }
    } catch (err: any) {
      console.warn("Resume extraction note:", err);
    } finally {
      setIsExtractingResume(false);
    }
  };

  // 4. Handle Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let activeUserId = currentUser?.uid;
      let activeEmail = (currentUser?.email || email).trim().toLowerCase();
      let activeName = (currentUser?.displayName || fullName).trim();

      // If user is not logged in, handle Sign-In or Register
      if (!currentUser) {
        if (!activeEmail || !password) {
          throw new Error("Please enter your email and password to proceed.");
        }

        if (authMode === "REGISTER") {
          if (!activeName) throw new Error("Please enter your full name.");
          if (!phone) throw new Error("Please enter your mobile phone number.");
          if (!resumeFile && extractedSkills.length === 0) {
            throw new Error("Please upload your CV/Resume to complete application.");
          }

          // Create Firebase Account (or recover existing account if email in use)
          let userCred: any = null;
          try {
            userCred = await createUserWithEmailAndPassword(auth, activeEmail, password);
            activeUserId = userCred.user.uid;

            await updateProfile(userCred.user, {
              displayName: activeName
            });
          } catch (authErr: any) {
            if (authErr?.code === 'auth/email-already-in-use' || authErr?.message?.includes('auth/email-already-in-use')) {
              try {
                userCred = await signInWithEmailAndPassword(auth, activeEmail, password);
                activeUserId = userCred.user.uid;
                activeName = userCred.user.displayName || activeName;
              } catch (loginErr: any) {
                throw new Error(
                  "An account with this email already exists. Please enter your existing account password or switch to 'Sign In'."
                );
              }
            } else if (authErr?.code === 'auth/network-request-failed' || authErr?.message?.includes('Failed to fetch')) {
              throw new Error("Network connectivity issue. Please check your connection and try again.");
            } else {
              throw authErr;
            }
          }

          // Save Candidate User in `users` collection with CANDIDATE role
          await setDoc(
            doc(db, "users", activeUserId),
            {
              id: activeUserId,
              uid: activeUserId,
              name: activeName,
              displayName: activeName,
              email: activeEmail,
              phone: phone,
              role: "CANDIDATE",
              userType: "Candidate",
              organizationId: "ORG-CANDIDATE-COMMUNITY",
              status: "ACTIVE",
              onboardingCompleted: true,
              createdAt: new Date().toISOString()
            },
            { merge: true }
          );

          // Save Candidate Profile
          await setDoc(
            doc(db, "candidate_profiles", activeUserId),
            {
              id: activeUserId,
              userId: activeUserId,
              name: activeName,
              email: activeEmail,
              phone: phone,
              skills: extractedSkills,
              experienceYears: extractedExpYears,
              preferredWorkMode: "Onsite",
              resumeFileName: resumeFile?.name || "Resume.pdf",
              resumeText: resumeText || "",
              sourceType: "DIRECT_CANDIDATE",
              ownershipType: "DIRECT",
              vendorId: null,
              ownerType: "HIRENEST",
              ownerId: "GLOBAL_HQ",
              createdVia: "DIRECT_CANDIDATE_LINK",
              inviteToken: token || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } else {
          // Sign In Existing Account
          const userCred = await signInWithEmailAndPassword(auth, activeEmail, password);
          activeUserId = userCred.user.uid;
          activeName = userCred.user.displayName || activeName;
        }
      }

      // Prepare Application Record
      const appRef = doc(collection(db, "applications"));
      const appId = appRef.id;

      const applicationPayload = {
        id: appId,
        candidateUid: activeUserId,
        candidateName: activeName,
        candidateEmail: activeEmail,
        candidatePhone: phone || candidateProfile?.phone || "",
        requirementId: job.id,
        requirementTitle: job.title,
        jobTitle: job.title,
        jobLocation: job.location,
        jobType: "FTE",
        workMode: "Onsite",
        status: "SUBMITTED",
        candidateFacingStatus: "Submitted",
        sourceType: "DIRECT_CANDIDATE",
        appliedVia: "DIRECT_INVITE_LINK",
        inviteToken: token || null,
        skillsSnapshot: extractedSkills.length > 0 ? extractedSkills : candidateProfile?.skills || [],
        experienceYearsSnapshot: extractedExpYears || candidateProfile?.experienceYears || 3,
        resumeFileName: resumeFile?.name || candidateProfile?.resumeFileName || "Resume.pdf",
        availability,
        onsiteReady,
        expectedCTC: expectedCTC || "Negotiable",
        currentCTC: currentCTC || "Not Disclosed",
        candidateNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(appRef, applicationPayload);

      // Create matching synchronized record in `submissions` for Global HQ visibility
      try {
        const subRef = doc(collection(db, "submissions"));
        await setDoc(subRef, {
          id: subRef.id,
          applicationId: appId,
          requirementId: job.id,
          requirementTitle: job.title,
          candidateId: activeUserId,
          candidateUid: activeUserId,
          candidateName: activeName,
          candidateEmail: activeEmail,
          candidatePhone: phone || candidateProfile?.phone || "",
          status: "SUBMITTED",
          sourceType: "DIRECT_CANDIDATE",
          ownershipType: "DIRECT",
          vendorId: null,
          vendorName: "Direct Candidate Application",
          ownerType: "HIRENEST",
          ownerId: "GLOBAL_HQ",
          skills: extractedSkills.length > 0 ? extractedSkills : candidateProfile?.skills || [],
          experienceYears: extractedExpYears || candidateProfile?.experienceYears || 3,
          resumeFileName: resumeFile?.name || candidateProfile?.resumeFileName || "Resume.pdf",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (subErr) {
        console.warn("HQ Submission link note:", subErr);
      }

      setCreatedAppId(appId);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Application submission failed:", err);
      setSubmitError(err.message || "Failed to submit application. Please check details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen
  if (isLoadingJob) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Loading Job Opportunity...</p>
        </div>
      </div>
    );
  }

  // Error / Closed Position Screen
  if (loadError || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Position Unavailable</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {loadError || "The job opportunity you are trying to view is no longer accepting applications or has expired."}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate("/")}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Go to HireNest Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
        >
          {/* Header Banner */}
          <div className="p-8 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white text-center space-y-3">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/30 text-white shadow-lg">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Application Submitted!</h2>
            <p className="text-xs text-emerald-100/90 max-w-sm mx-auto">
              Your profile has been submitted directly to HireNest Talent Acquisition for this role.
            </p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  Submitted
                </Badge>
              </div>
              <p className="font-bold text-slate-900 text-base">{job.title}</p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.location}</span>
                <span>•</span>
                <span>FTE • Onsite</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Candidate Account:</strong> Active and securely authenticated.</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Resume & Skills:</strong> Profile saved in your Candidate Portal.</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Direct Route:</strong> Queued for recruiter screening.</span>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => navigate("/")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md"
              >
                Go to Candidate Portal
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <HireNestBrandLogo size="sm" theme="dark" showSubtitle={false} />
        </Link>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <User className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline font-medium">{currentUser.displayName || currentUser.email}</span>
            </div>
          ) : (
            <button
              onClick={() => setAuthMode(authMode === "REGISTER" ? "SIGNIN" : "REGISTER")}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {authMode === "REGISTER" ? "Already have an account? Sign In" : "Need an account? Register"}
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Requirement Opportunity Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Invitation Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Invited Opportunity</span>
              </div>

              {/* Title & Core Metadata */}
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  {job.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    Full-Time (FTE)
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Onsite
                  </span>
                </div>
              </div>

              {/* Experience & Openings */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Experience</span>
                  <span className="font-semibold text-slate-200">{job.experience || "3-6 Years"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Work Arrangement</span>
                  <span className="font-semibold text-slate-200">Onsite at Client Site</span>
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Required Skillset
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills && job.skills.length > 0 ? (
                    job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Relevant professional domain experience</span>
                  )}
                </div>
              </div>

              {/* Description Summary */}
              {job.description && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Opportunity Overview
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {job.description}
                  </p>
                </div>
              )}

              {/* Candidate Privacy Guarantee */}
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Your application is direct and confidential. Only authorized HireNest recruiters managing this requirement will review your profile.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Apply Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {currentUser ? "Review & Submit Application" : authMode === "REGISTER" ? "Apply for this Position" : "Sign In to Apply"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser
                    ? "Confirm your details to submit your profile for this opportunity."
                    : authMode === "REGISTER"
                    ? "Upload your CV and complete your application in one seamless step."
                    : "Enter your HireNest credentials to apply with your existing profile."}
                </p>
              </div>

              {submitError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitApplication} className="space-y-5">
                {/* 1. If Candidate Logged In */}
                {currentUser ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Account</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          Active Profile
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">{currentUser.displayName || fullName}</p>
                      <p className="text-xs text-slate-500">{currentUser.email}</p>
                    </div>

                    {/* Resume Source Option */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                        Resume Selection
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                          <input
                            type="radio"
                            name="resumeChoice"
                            checked={useExistingProfile}
                            onChange={() => setUseExistingProfile(true)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 text-xs">
                            <span className="font-semibold text-slate-800 block">Use Existing Candidate Profile Resume</span>
                            <span className="text-slate-500">{candidateProfile?.resumeFileName || "Saved Profile Resume"}</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                          <input
                            type="radio"
                            name="resumeChoice"
                            checked={!useExistingProfile}
                            onChange={() => setUseExistingProfile(false)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 text-xs">
                            <span className="font-semibold text-slate-800 block">Upload an Updated CV for this Role</span>
                            <span className="text-slate-500">Attach a fresh PDF or DOCX file</span>
                          </div>
                        </label>
                      </div>

                      {!useExistingProfile && (
                        <div className="pt-2">
                          <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                            <input
                              type="file"
                              accept=".pdf,.docx,.doc"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <UploadCloud className="w-8 h-8 text-indigo-500" />
                            <span className="text-xs font-semibold text-slate-800">
                              {resumeFile ? resumeFile.name : "Click or drag updated CV to upload"}
                            </span>
                            <span className="text-[11px] text-slate-400">Supported formats: PDF, DOCX (Max 10MB)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ) : authMode === "REGISTER" ? (
                  /* 2. Registration + Direct Apply Form for New Candidate */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. rahul@example.com"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +91 98765 43210"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Create Account Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resume Upload Dropzone */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Upload CV / Resume <span className="text-rose-500">*</span>
                      </label>
                      <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <UploadCloud className="w-8 h-8 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-800">
                          {resumeFile ? resumeFile.name : "Click or drag your CV to upload"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isExtractingResume ? "Parsing skills & experience via AI..." : "PDF or DOCX (Instant skill analysis)"}
                        </span>
                      </label>

                      {extractedSkills.length > 0 && (
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1.5 mt-2">
                          <span className="text-[11px] font-semibold text-indigo-900 block">
                            Detected Skills from Resume ({extractedSkills.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {extractedSkills.slice(0, 10).map((sk, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 text-[11px] font-medium"
                              >
                                {sk}
                              </span>
                            ))}
                            {extractedSkills.length > 10 && (
                              <span className="text-[11px] text-indigo-500 py-0.5">
                                +{extractedSkills.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 3. Existing User Sign In Form */
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-registered@email.com"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Screening & Availability Section */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Screening & Availability
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Notice Period / Availability
                      </label>
                      <select
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="Immediate (within 15 days)">Immediate (within 15 days)</option>
                        <option value="30 Days">30 Days</option>
                        <option value="45 Days">45 Days</option>
                        <option value="60 Days+">60 Days+</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Onsite Work Confirmation
                      </label>
                      <select
                        value={onsiteReady}
                        onChange={(e) => setOnsiteReady(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="Yes, fully available for Onsite requirement">
                          Yes, available for Onsite ({job.location})
                        </option>
                        <option value="Yes, willing to relocate">Yes, willing to relocate</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Expected Compensation (CTC / Rate)
                      </label>
                      <input
                        type="text"
                        value={expectedCTC}
                        onChange={(e) => setExpectedCTC(e.target.value)}
                        placeholder="e.g. 18 LPA or Negotiable"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Current Compensation (Optional)
                      </label>
                      <input
                        type="text"
                        value={currentCTC}
                        onChange={(e) => setCurrentCTC(e.target.value)}
                        placeholder="e.g. 14 LPA"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || isExtractingResume}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      "Submitting Application..."
                    ) : currentUser ? (
                      <>
                        <Check className="w-4 h-4" />
                        Submit Application for {job.title}
                      </>
                    ) : authMode === "REGISTER" ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Create Account & Submit Application
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In & Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
