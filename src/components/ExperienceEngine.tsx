import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  HeartHandshake, 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  BookOpen, 
  X, 
  HelpCircle, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  PlayCircle, 
  Keyboard, 
  Bot, 
  Search, 
  Zap, 
  Award, 
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

// Checklist step definition
interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  targetPath: string;
}

// Progressive Education Milestone
interface Milestone {
  id: string;
  week: number;
  title: string;
  description: string;
  actionLabel: string;
  actionCode: string;
}

// Context Help Article
interface HelpArticle {
  id: string;
  question: string;
  answer: string;
  pathFilter?: string;
}

interface Props {
  user: any;
  userData: any;
  isAdmin: boolean;
  isClient: boolean;
  isVendor: boolean;
  isRecruiter: boolean;
  isIndependent: boolean;
}

export function ExperienceEngine({ 
  user, 
  userData, 
  isAdmin, 
  isClient, 
  isVendor, 
  isRecruiter, 
  isIndependent 
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // UI States
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"checklist" | "progressive" | "help">("checklist");
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  
  // Persistence States
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [completedWeeks, setCompletedWeeks] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({ helpClicks: 0, toursCompleted: 0 });
  const [syncing, setSyncing] = useState(false);

  // Resolve Role and Role Archetype Label
  const role = userData?.role || "guest";
  const userRoleLabel = isAdmin 
    ? "Administrator Node" 
    : isClient 
      ? "Client Hiring Partner" 
      : isVendor 
        ? "Vendor Delivery Agency" 
        : isRecruiter 
          ? "Recruitment Advisor" 
          : "Specialist Provider Node";

  // 1. Role-based Checklist Steps Definition
  const checklistSteps: ChecklistStep[] = React.useMemo(() => {
    if (isRecruiter || isIndependent) {
      return [
        { id: "req-create", label: "Open a Job Requirement", description: "Establish a requirement with skills and budget details.", targetPath: "/jobs" },
        { id: "req-match", label: "Analyze AI Match Confidence", description: "Verify Layer 1 (Deterministic) and Layer 2 (Semantic) matched candidates.", targetPath: "/matches" },
        { id: "cand-submit", label: "Propose matched candidate", description: "Submit your candidate to the client's Deal Room.", targetPath: "/deal-rooms" },
        { id: "sched-interview", label: "Arrange technical interviews", description: "Configure calendar slots and select feedback forms.", targetPath: "/interviews" }
      ];
    }
    if (isVendor) {
      return [
        { id: "company-profile", label: "Verify company profile", description: "Configure organizational details in workspace settings.", targetPath: "/settings" },
        { id: "bench-upload", label: "Sow your talent pool", description: "Upload resumes or fill out bench consultant details.", targetPath: "/candidates" },
        { id: "vendor-submit", label: "Fulfill open requirements", description: "Submit consultants to matched client opportunities.", targetPath: "/deal-rooms" },
        { id: "audit-invoice", label: "Track payments & billing", description: "Monitor approved placements and vendor fee ledgers.", targetPath: "/trust-sla" }
      ];
    }
    if (isClient) {
      return [
        { id: "client-req", label: "Publish first requirement", description: "Publish open role parameters including tech stack and budget.", targetPath: "/jobs" },
        { id: "review-sub", label: "Evaluate vendor submissions", description: "Examine matched bench candidates and review resume profiles.", targetPath: "/candidates" },
        { id: "client-interview", label: "Schedule team interviews", description: "Book interview sessions with shortlisted consultants.", targetPath: "/interviews" },
        { id: "client-offer", label: "Dispatch formal offer", description: "Draft rate details and trigger onboard workflows.", targetPath: "/deal-rooms" }
      ];
    }
    if (isAdmin) {
      return [
        { id: "audit-events", label: "Audit Event Ledger", description: "Review system-wide transaction and identity logs.", targetPath: "/signals" },
        { id: "manage-users", label: "Govern active user roles", description: "Audit node registration status and KYC documents.", targetPath: "/users" },
        { id: "monitor-health", label: "Verify office heartbeats", description: "Monitor recruitment and finance offices latency states.", targetPath: "/health" }
      ];
    }
    return [
      { id: "explore-dash", label: "Explore BOS Dashboard", description: "Familiarize yourself with metrics and vital signs.", targetPath: "/" },
      { id: "ask-copilot", label: "Query AI Copilot", description: "Trigger Alt+A to prompt model for system intelligence.", targetPath: "/ai-copilot" }
    ];
  }, [isAdmin, isClient, isVendor, isRecruiter, isIndependent]);

  // 2. Progressive Education Weeks definition
  const milestones: Milestone[] = [
    { id: "week-1", week: 1, title: "Week 1: Command Palette", description: "Trigger the global command search with Cmd/Ctrl+K to jump directly between clients, candidates, and jobs.", actionLabel: "Open Search (Cmd+K)", actionCode: "search" },
    { id: "week-2", week: 2, title: "Week 2: AI Copilot", description: "Interact with the universal Ask Copilot chat sidebar (Alt+A) for deep metrics lookup and instant risk assessments.", actionLabel: "Ask Copilot (Alt+A)", actionCode: "copilot" },
    { id: "week-3", week: 3, title: "Week 3: Automation Studio", description: "Configure automated triggers and notification rules to prevent SLA compliance delays.", actionLabel: "Go to Automation Studio", actionCode: "automation" },
    { id: "week-4", week: 4, title: "Week 4: Keyboard Triggers", description: "Utilize single key shortcuts (N for Jobs, S for submissions, I for interviews, C for candidates) for lightning operations.", actionLabel: "Familiarize with Shortcuts", actionCode: "shortcuts" }
  ];

  // 3. Dynamic Context-Aware Help Articles
  const helpArticles: HelpArticle[] = [
    { id: "h-trust", question: "How does the HireNestOS trust-score work?", answer: "Secure nodes (recruiters, vendors, clients) receive trust scores based on KYC checks, Aadhaar verification, NDA sign-offs, and historical placement completions. Higher scores grant priority matching ranking!" },
    { id: "h-copilot", question: "How do I invoke the AI Copilot?", answer: "Press Alt + A on your keyboard or click the 'Ask Copilot' button in the page header to interact with our central model gateway." },
    { id: "h-heartbeats", question: "What are operational office heartbeats?", answer: "They represent microservice stability checks. Green status means real-time event loops, database sync, and AI RAG pipelines are operating correctly.", pathFilter: "/" },
    { id: "h-jobs", question: "How do I allocate specific vendors to a job?", answer: "When creating or editing a requirement, add vendor organizational IDs to the allocated vendor array to restrict requirement visibility.", pathFilter: "/jobs" },
    { id: "h-matches", question: "How is Match Confidence formulated?", answer: "Our engine uses Layer 1 (Deterministic filters on skills, rates, notice) and Layer 2 (Semantic parsing on job-role context). Recruiters can apply Layer 3 override manually.", pathFilter: "/matches" },
    { id: "h-resumes", question: "How does the resume parser protect PII?", answer: "Our parser extracts key professional milestones while isolating sensitive demographic details in compliant Firestore paths.", pathFilter: "/candidates" },
    { id: "h-deal-rooms", question: "What occurs inside a Submission Deal Room?", answer: "Deal Rooms are isolated spaces containing the candidate resume, client notes, interview loops, rate negotiations, and secure contracts.", pathFilter: "/deal-rooms" },
    { id: "h-calendars", question: "How do I link Google Calendar for slots?", answer: "Authorized users can trigger OAuth workflows via Settings -> Integrations to let HireNestOS book calendar slots directly.", pathFilter: "/interviews" }
  ];

  // Filter help articles based on active route
  const currentHelpArticles = helpArticles.filter(art => !art.pathFilter || location.pathname === art.pathFilter);

  // Load persistence state from Firestore and LocalStorage fallback
  useEffect(() => {
    if (!user?.uid) return;

    const loadState = async () => {
      try {
        const docRef = doc(db, "user_onboarding", user.uid);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setCompletedSteps(data.completedSteps || []);
          setCompletedWeeks(data.completedWeeks || []);
          setTelemetry(data.telemetry || { helpClicks: 0, toursCompleted: 0 });
          
          if (data.hasCompletedOnboarding === false && !localStorage.getItem(`welcome_seen_${user.uid}`)) {
            setShowWelcome(true);
          }
        } else {
          // Initialize in Firestore
          const initialState = {
            uid: user.uid,
            email: user.email,
            role,
            completedSteps: [],
            completedWeeks: [],
            telemetry: { helpClicks: 0, toursCompleted: 0 },
            hasCompletedOnboarding: false,
            updatedAt: new Date().toISOString()
          };
          await setDoc(docRef, initialState);
          setShowWelcome(true);
        }
      } catch (err) {
        console.warn("Could not sync with firestore onboarding state, using localStorage fallback:", err);
        const cachedSteps = JSON.parse(localStorage.getItem(`steps_${user.uid}`) || "[]");
        const cachedWeeks = JSON.parse(localStorage.getItem(`weeks_${user.uid}`) || "[]");
        setCompletedSteps(cachedSteps);
        setCompletedWeeks(cachedWeeks);
        if (!localStorage.getItem(`welcome_seen_${user.uid}`)) {
          setShowWelcome(true);
        }
      }
    };
    
    loadState();
  }, [user?.uid, role]);

  // Sync state back to Firestore
  const saveState = async (updatedSteps: string[], updatedWeeks: string[], updatedTelemetry = telemetry) => {
    if (!user?.uid) return;
    setSyncing(true);
    try {
      // Update Firestore
      const docRef = doc(db, "user_onboarding", user.uid);
      const isComplete = updatedSteps.length === checklistSteps.length;
      
      await updateDoc(docRef, {
        completedSteps: updatedSteps,
        completedWeeks: updatedWeeks,
        telemetry: updatedTelemetry,
        hasCompletedOnboarding: isComplete,
        updatedAt: new Date().toISOString()
      });

      // Dispatch telemetry event to central eventLedger
      await setDoc(doc(db, "eventLedger", `EVT-ONB-${Date.now()}`), {
        type: "OnboardingChecklistUpdated",
        userId: user.uid,
        email: user.email,
        role,
        progress: Math.round((updatedSteps.length / checklistSteps.length) * 100),
        isComplete,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.warn("Firestore save failed, using local storage cache:", err);
      localStorage.setItem(`steps_${user.uid}`, JSON.stringify(updatedSteps));
      localStorage.setItem(`weeks_${user.uid}`, JSON.stringify(updatedWeeks));
    } finally {
      setSyncing(false);
    }
  };

  // Toggle step checklist completion
  const handleToggleStep = (stepId: string) => {
    const exists = completedSteps.includes(stepId);
    let nextSteps: string[];
    
    if (exists) {
      nextSteps = completedSteps.filter(id => id !== stepId);
    } else {
      nextSteps = [...completedSteps, stepId];
      if (nextSteps.length === checklistSteps.length) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    }
    
    setCompletedSteps(nextSteps);
    saveState(nextSteps, completedWeeks);
  };

  // Toggle week milestone completion
  const handleToggleWeek = (weekId: string) => {
    const exists = completedWeeks.includes(weekId);
    const nextWeeks = exists 
      ? completedWeeks.filter(id => id !== weekId) 
      : [...completedWeeks, weekId];
    
    setCompletedWeeks(nextWeeks);
    saveState(completedSteps, nextWeeks);
  };

  // Record Telemetry Help Clicks
  const handleHelpClick = (articleId: string) => {
    setSelectedArticle(selectedArticle === articleId ? null : articleId);
    
    const updatedTelemetry = { ...telemetry, helpClicks: telemetry.helpClicks + 1 };
    setTelemetry(updatedTelemetry);
    saveState(completedSteps, completedWeeks, updatedTelemetry);
    
    // Log helpful click event
    setDoc(doc(db, "eventLedger", `EVT-HLP-${Date.now()}`), {
      type: "HelpTopicClicked",
      userId: user.uid,
      articleId,
      path: location.pathname,
      timestamp: new Date().toISOString()
    }).catch(() => {});
  };

  // Interactive Product Tour Controller
  const startTour = () => {
    setShowWelcome(false);
    localStorage.setItem(`welcome_seen_${user.uid}`, "true");
    setIsOpen(true);
    setActiveTab("checklist");
    setTourStep(0);
  };

  const handleNextTourStep = () => {
    if (tourStep === null) return;
    if (tourStep < checklistSteps.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);
      // Automatically redirect to the target page to show them the screen!
      navigate(checklistSteps[nextStep].targetPath);
    } else {
      // Tour completed
      setTourStep(null);
      const updatedTelemetry = { ...telemetry, toursCompleted: telemetry.toursCompleted + 1 };
      setTelemetry(updatedTelemetry);
      saveState(completedSteps, completedWeeks, updatedTelemetry);
      
      // Log tour completion
      setDoc(doc(db, "eventLedger", `EVT-TOUR-${Date.now()}`), {
        type: "TourCompleted",
        userId: user.uid,
        role,
        timestamp: new Date().toISOString()
      }).catch(() => {});
      
      alert("🎉 Guided workspace tour complete! You are now ready to operate HireNestOS.");
    }
  };

  // Calculate Product Health Score
  const totalItems = checklistSteps.length + milestones.length;
  const completedItems = completedSteps.length + completedWeeks.length;
  const healthPercentage = Math.round((completedItems / totalItems) * 100);

  // Resolve recommended next action
  const nextIncompleteStep = checklistSteps.find(step => !completedSteps.includes(step.id));
  const recommendedStep = nextIncompleteStep || checklistSteps[0];

  return (
    <>
      {/* 1. Welcome Overlay First-Run Modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-[11000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
            
            <div className="mb-6 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <HeartHandshake size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight lowercase">Welcome to HireNestOS</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Experience Engine Onboarding</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 mb-6">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Greetings! You have registered as a <span className="font-bold text-indigo-600">{userRoleLabel}</span>. 
                HireNestOS has preconfigured your workspace checklist to maximize activation and streamline client-recruiter loops.
              </p>
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Your Getting Started Checklist:</h4>
                <ul className="space-y-1.5">
                  {checklistSteps.map((step, i) => (
                    <li key={step.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {step.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={startTour}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <PlayCircle size={16} />
                Start Tour
              </button>
              <button 
                onClick={() => {
                  setShowWelcome(false);
                  localStorage.setItem(`welcome_seen_${user.uid}`, "true");
                }}
                className="px-6 border border-slate-200 hover:bg-slate-50 font-bold text-slate-500 rounded-xl transition-all text-xs uppercase tracking-widest"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Floating Active Tour Bubble */}
      {tourStep !== null && (
        <div className="fixed bottom-6 left-6 z-[10500] max-w-sm bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border-2 border-indigo-500 animate-bounce duration-1000">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[9px] bg-indigo-600 px-2 py-0.5 rounded font-black font-mono tracking-wider uppercase">
              Guided Tour ({tourStep + 1}/{checklistSteps.length})
            </span>
            <button onClick={() => setTourStep(null)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <h4 className="text-xs font-black uppercase text-indigo-300 mb-1">
            {checklistSteps[tourStep].label}
          </h4>
          <p className="text-[11px] text-slate-300 mb-4 leading-relaxed font-sans font-medium">
            {checklistSteps[tourStep].description}
          </p>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[9px] text-slate-400 font-mono">Path: {checklistSteps[tourStep].targetPath}</span>
            <button 
              onClick={handleNextTourStep}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>{tourStep === checklistSteps.length - 1 ? "Finish" : "Next"}</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Confetti Highlight Effect on Checklist Complete */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[12000] flex items-center justify-center bg-transparent">
          <div className="text-center p-8 bg-slate-900/90 rounded-[40px] shadow-2xl border border-indigo-500/50 max-w-sm w-full mx-4 animate-in zoom-in-95 backdrop-blur-md">
            <Sparkles className="mx-auto text-amber-400 h-16 w-16 mb-4 animate-spin duration-3000" />
            <h3 className="text-xl font-black text-white lowercase">Activation Handshake Achieved!</h3>
            <p className="text-xs text-indigo-200 mt-2 leading-relaxed">
              Fantastic! You have completed all setup checklist milestones. Your operational status has been updated to fully active.
            </p>
          </div>
        </div>
      )}

      {/* 4. Experience Engine Docked Side Panel Drawer */}
      <div className="fixed bottom-6 right-6 z-[9000] flex flex-col items-end">
        {/* Floating Toggle Badge button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2.5 h-12 rounded-full px-5 shadow-2xl transition-all hover:scale-105 active:scale-95 group border relative overflow-hidden",
            isOpen 
              ? "bg-slate-900 text-white border-slate-800" 
              : "bg-white text-slate-800 border-slate-200/80 hover:border-indigo-400"
          )}
        >
          {/* Internal Progress Ring indicator */}
          <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 transform -rotate-90">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke={isOpen ? "#1e293b" : "#f1f5f9"}
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#6366f1"
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - healthPercentage / 100)}`}
              />
            </svg>
            <span className="absolute text-[8px] font-black font-mono tracking-tight text-indigo-500">
              {healthPercentage}%
            </span>
          </div>
          
          <span className="text-xs font-black uppercase tracking-wider">Experience Engine</span>
          {syncing && <RefreshCw size={12} className="animate-spin text-slate-400 ml-1" />}
        </button>

        {/* Floating Side Drawer Panel */}
        {isOpen && (
          <div className="w-80 md:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl mt-3 flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HeartHandshake className="text-indigo-400 shrink-0" size={18} />
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider">Experience Engine</h3>
                  <p className="text-[9px] text-slate-400 font-bold lowercase mt-0.5">Role: [{userRoleLabel}]</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Smart Score Card */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 via-indigo-100/50 to-purple-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-indigo-600 font-bold">Product Health Score</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{healthPercentage}%</span>
                  <span className="text-[10px] font-bold text-slate-500">activated</span>
                </div>
                <div className="text-[9px] text-slate-500 font-semibold mt-1.5 flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded border border-slate-150">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  Task: {completedItems} of {totalItems} completed
                </div>
              </div>

              {/* Dynamic Action Redirect */}
              {recommendedStep && (
                <button
                  onClick={() => {
                    navigate(recommendedStep.targetPath);
                    setIsOpen(false);
                  }}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-md hover:scale-105 active:scale-95"
                >
                  <span>Next Task</span>
                  <ChevronRight size={12} />
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 p-1.5 bg-slate-50 gap-1 select-none">
              <button
                onClick={() => setActiveTab("checklist")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === "checklist" 
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                📋 Checklist
              </button>
              <button
                onClick={() => setActiveTab("progressive")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === "progressive" 
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                📈 Education
              </button>
              <button
                onClick={() => setActiveTab("help")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeTab === "help" 
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                💡 Help ({currentHelpArticles.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              
              {/* TAB 1: Activation Checklist */}
              {activeTab === "checklist" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Workspace Onboarding</h4>
                    <button 
                      onClick={startTour}
                      className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <PlayCircle size={12} /> Run Tour
                    </button>
                  </div>
                  
                  <div className="space-y-2.5">
                    {checklistSteps.map((step) => {
                      const isChecked = completedSteps.includes(step.id);
                      return (
                        <div 
                          key={step.id} 
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all relative overflow-hidden group",
                            isChecked 
                              ? "bg-emerald-50/40 border-emerald-100" 
                              : "bg-slate-50 border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className="flex gap-3 items-start">
                            <button 
                              onClick={() => handleToggleStep(step.id)}
                              className="mt-0.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              {isChecked ? (
                                <CheckCircle className="text-emerald-500 h-5 w-5" />
                              ) : (
                                <Circle className="text-slate-300 h-5 w-5" />
                              )}
                            </button>
                            <div className="flex-1 pr-6">
                              <h5 
                                onClick={() => {
                                  navigate(step.targetPath);
                                  setIsOpen(false);
                                }}
                                className={cn(
                                  "text-xs font-bold leading-tight cursor-pointer hover:text-indigo-600 select-none",
                                  isChecked ? "text-slate-500 line-through" : "text-slate-800"
                                )}
                              >
                                {step.label}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-snug">
                                {step.description}
                              </p>
                            </div>
                            
                            {/* Action Button */}
                            <button
                              onClick={() => {
                                navigate(step.targetPath);
                                setIsOpen(false);
                              }}
                              className="absolute top-3 right-3 text-slate-300 group-hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: Progressive Education */}
              {activeTab === "progressive" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Learning Milestones</h4>
                    <p className="text-[9px] text-slate-400 leading-normal mt-0.5">Recommended progressive platform timeline to master capabilities without clutter.</p>
                  </div>

                  <div className="relative border-l-2 border-slate-100 pl-4 ml-2.5 space-y-5">
                    {milestones.map((mil) => {
                      const isComplete = completedWeeks.includes(mil.id);
                      return (
                        <div key={mil.id} className="relative">
                          {/* Timeline dot */}
                          <button 
                            onClick={() => handleToggleWeek(mil.id)}
                            className={cn(
                              "absolute -left-[27px] top-0.5 h-4.5 w-4.5 rounded-full border-2 bg-white flex items-center justify-center transition-all",
                              isComplete 
                                ? "border-indigo-600 text-indigo-600" 
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className={cn("h-2 w-2 rounded-full", isComplete ? "bg-indigo-600" : "bg-transparent")} />
                          </button>

                          <div>
                            <span className="text-[8px] font-bold text-indigo-500 font-mono tracking-wider block">WEEK {mil.week}</span>
                            <h5 className="text-xs font-black text-slate-800 leading-tight mt-0.5">{mil.title}</h5>
                            <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-1">{mil.description}</p>
                            
                            <button
                              onClick={() => {
                                if (mil.actionCode === "search") {
                                  // Trigger global search modal event
                                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                                } else if (mil.actionCode === "copilot") {
                                  // Trigger AI Copilot toggle event
                                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true }));
                                } else if (mil.actionCode === "automation") {
                                  navigate("/autonomous-operations");
                                } else {
                                  alert("Single keys: N = Open Jobs, S = Submissions, I = Interviews, C = Candidates Talent Pool, A = Copilot.");
                                }
                                setIsOpen(false);
                              }}
                              className="mt-2 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 tracking-wider"
                            >
                              <span>{mil.actionLabel}</span>
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: Embedded Help Articles */}
              {activeTab === "help" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Contextual Knowledge</h4>
                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black font-mono">
                      Page filters: Active
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentHelpArticles.length === 0 ? (
                      <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <HelpCircle size={20} className="mx-auto text-slate-400 mb-1.5" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase">No specific path articles</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-1">Check general articles in the footer tab below.</p>
                      </div>
                    ) : (
                      currentHelpArticles.map((art) => {
                        const isExpanded = selectedArticle === art.id;
                        return (
                          <div 
                            key={art.id} 
                            className="border border-slate-100 rounded-xl bg-slate-50 overflow-hidden"
                          >
                            <button
                              onClick={() => handleHelpClick(art.id)}
                              className="w-full p-3.5 text-left flex justify-between items-center gap-3 bg-white hover:bg-slate-50/50 transition-colors"
                            >
                              <span className="text-xs font-bold text-slate-700 leading-tight pr-2">
                                {art.question}
                              </span>
                              <HelpCircle size={14} className={cn("text-slate-400 shrink-0 transition-transform", isExpanded && "rotate-45 text-indigo-500")} />
                            </button>
                            
                            {isExpanded && (
                              <div className="p-3.5 border-t border-slate-100 text-[10px] text-slate-600 leading-relaxed font-semibold bg-slate-50">
                                {art.answer}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* General Knowledge fallback banner */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2 mt-4">
                    <div className="flex gap-2 items-center text-[10px] font-black uppercase text-indigo-300">
                      <Bot size={14} />
                      <span>Need bespoke assistance?</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Press <span className="font-mono text-white font-bold bg-slate-850 px-1 rounded">Alt+A</span> or trigger Ask Copilot to chat with the model about custom queries.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer status bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-mono">
              <span>Secure telemetry verified</span>
              <span>v1.2 active</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
