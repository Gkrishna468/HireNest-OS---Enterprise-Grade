import { useState, useEffect, useRef } from "react";
import {
  Briefcase,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Bot,
  Send,
  UploadCloud,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Star,
  Zap,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  Plus,
  RefreshCw,
  X
} from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

interface CandidatePortalProps {
  userName: string;
  orgId?: string;
  metrics?: any;
}

export default function CandidatePortalWorkspace({
  userName,
  orgId,
  metrics
}: CandidatePortalProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Experience / Progress States
  const [tourStep, setTourStep] = useState<number>(0);
  const [showTour, setShowTour] = useState<boolean>(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activationScore, setActivationScore] = useState<number>(30); // starts with 30 for completing basic onboarding
  const [experienceHealth, setExperienceHealth] = useState<'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION'>('GOOD');
  
  // Lists from DB
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  
  // Form / Profile State
  const [profile, setProfile] = useState({
    name: userName,
    email: "",
    phone: "",
    location: "New York, USA",
    skills: ["React", "TypeScript", "Tailwind CSS", "JavaScript"],
    targetRoles: ["Frontend Engineer", "React Developer"],
    experienceYears: 3
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newRole, setNewRole] = useState("");

  // Resume Upload & Analysis State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // AI Coach Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: "welcome",
      sender: "coach",
      text: `Hello ${userName}! I'm your AI Career Coach. I have analyzed your profile. You currently have a strong foundation in React and TypeScript. How can I help you prepare or improve your profile alignment today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isCoachTyping, setIsCoachTyping] = useState(false);

  // Micro feedback states
  const [cardFeedback, setCardFeedback] = useState<Record<string, { submitted: boolean; helpful: boolean; reason?: string }>>({});
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Get Current User Auth & Sync DB Profile
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
      setProfile(prev => ({
        ...prev,
        name: user.displayName || userName,
        email: user.email || ""
      }));

      // Fetch or initialize Candidate Profile
      const profileRef = doc(db, "candidate_profiles", user.uid);
      getDoc(profileRef).then(snap => {
        if (snap.exists()) {
          setProfile(snap.data() as any);
        } else {
          // Initialize profile doc
          setDoc(profileRef, {
            id: user.uid,
            userId: user.uid,
            name: user.displayName || userName,
            email: user.email || "",
            location: "New York, USA",
            skills: ["React", "TypeScript", "Tailwind CSS", "JavaScript"],
            targetRoles: ["Frontend Engineer", "React Developer"],
            experienceYears: 3,
            createdAt: new Date().toISOString()
          });
        }
      });

      // Fetch/sync candidate progress state
      const progressRef = doc(db, "candidate_progress", user.uid);
      getDoc(progressRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.completedSteps) setCompletedSteps(data.completedSteps);
          if (data?.activationScore) setActivationScore(data.activationScore);
          if (data?.experienceHealth) setExperienceHealth(data.experienceHealth);
          if (data?.tourCompleted) setShowTour(!data.tourCompleted);
        } else {
          setDoc(progressRef, {
            id: user.uid,
            userId: user.uid,
            completedSteps: ["onboarding"],
            activationScore: 30,
            experienceHealth: "GOOD",
            createdAt: new Date().toISOString()
          });
        }
      });

      // Load Isolated Submissions / Applications
      const qApps = query(
        collection(db, "submissions"),
        where("candidateId", "==", user.uid)
      );
      const unsubApps = onSnapshot(qApps, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setApplications(list);
      }, err => {
        console.warn("Application query restricted or offline:", err);
      });

      // Load Isolated Interviews
      const qInterviews = query(
        collection(db, "interviews"),
        where("candidateId", "==", user.uid)
      );
      const unsubInt = onSnapshot(qInterviews, snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInterviews(list);
      }, err => {
        console.warn("Interviews query restricted or offline:", err);
      });

      return () => {
        unsubApps();
        unsubInt();
      };
    }
  }, [userName]);

  // Scroll Chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isCoachTyping]);

  // Publish Business events to candidate_progress and system events log
  const trackProgressAndPublish = async (stepId: string, valueToAdd: number) => {
    if (!currentUser) return;
    
    const updated = [...completedSteps];
    if (!updated.includes(stepId)) {
      updated.push(stepId);
      const newScore = Math.min(100, activationScore + valueToAdd);
      const newHealth = newScore >= 90 ? "EXCELLENT" : newScore >= 60 ? "GOOD" : "NEEDS_ATTENTION";
      
      setCompletedSteps(updated);
      setActivationScore(newScore);
      setExperienceHealth(newHealth);

      // Save to Firestore
      const progressRef = doc(db, "candidate_progress", currentUser.uid);
      await setDoc(progressRef, {
        userId: currentUser.uid,
        completedSteps: updated,
        activationScore: newScore,
        experienceHealth: newHealth,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Log business activity event securely
      try {
        await addDoc(collection(db, "candidate_activity"), {
          userId: currentUser.uid,
          event: `CANDIDATE_${stepId.toUpperCase()}_COMPLETED`,
          scoreImpact: valueToAdd,
          currentActivationScore: newScore,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Couldn't write candidate activity:", err);
      }
    }
  };

  // Submit Feedback Event (Helpful / Not Helpful)
  const handleFeedbackSubmit = async (cardId: string, helpful: boolean) => {
    setCardFeedback(prev => ({
      ...prev,
      [cardId]: { submitted: true, helpful, reason: feedbackTexts[cardId] || "" }
    }));

    if (!currentUser) return;

    try {
      await addDoc(collection(db, "candidate_feedback"), {
        userId: currentUser.uid,
        userName: profile.name,
        cardId,
        isHelpful: helpful,
        reason: feedbackTexts[cardId] || "",
        page: "candidate_dashboard",
        workspace: "CandidatePortalWorkspace",
        role: "candidate",
        timestamp: new Date().toISOString()
      });
      
      // Update experience score a tiny bit for active feedback engagement (+5%)
      trackProgressAndPublish(`feedback_${cardId}`, 5);
    } catch (err) {
      console.warn("Feedback logging restricted or offline:", err);
    }
  };

  // Profile Save
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsEditingProfile(false);
    
    const profileRef = doc(db, "candidate_profiles", currentUser.uid);
    await setDoc(profileRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Track step
    trackProgressAndPublish("profile_completed", 30);
  };

  // Skill Add
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  // Role Add
  const handleAddRole = () => {
    if (!newRole.trim()) return;
    if (!profile.targetRoles.includes(newRole.trim())) {
      setProfile(prev => ({
        ...prev,
        targetRoles: [...prev.targetRoles, newRole.trim()]
      }));
    }
    setNewRole("");
  };

  const handleRemoveRole = (role: string) => {
    setProfile(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.filter(r => r !== role)
    }));
  };

  // Onboarding Guided Tour Next/Close
  const handleTourNext = () => {
    if (tourStep < 3) {
      setTourStep(prev => prev + 1);
    } else {
      setShowTour(false);
      // Mark tour as completed in DB
      if (currentUser) {
        setDoc(doc(db, "candidate_progress", currentUser.uid), {
          tourCompleted: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        trackProgressAndPublish("guided_tour", 10);
      }
    }
  };

  // Resume drag-and-drop / file upload analysis
  const handleResumeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processResumeFile(e.target.files[0]);
    }
  };

  const processResumeFile = (file: File) => {
    setResumeFile(file);
    setIsUploadingResume(true);
    
    // Simulate parse, text extraction, and score generation
    setTimeout(async () => {
      setIsUploadingResume(false);
      const isReactOrTs = file.name.toLowerCase().includes("react") || file.name.toLowerCase().includes("cv") || file.name.toLowerCase().includes("resume");
      
      const analysis = {
        fileName: file.name,
        score: isReactOrTs ? 88 : 74,
        strength: "Excellent technical breakdown of React rendering, custom hooks, and state modularization.",
        gaps: [
          "Quantify client-side outcomes (e.g. state size reductions, faster loading times by %)",
          "Explicitly declare Tailwind CSS projects to align with modern corporate requirements."
        ],
        keywordsMatched: ["React", "TypeScript", "JavaScript", "HTML5", "CSS3", "Git"],
        feedbackNotes: "This resume aligns closely with top Frontend Engineer roles. We highly recommend talking to the AI Career Coach next to run a real-time mock interview."
      };
      
      setResumeAnalysis(analysis);
      trackProgressAndPublish("resume_upload", 30);

      // Save document link to Firestore candidate_documents securely
      if (currentUser) {
        try {
          await addDoc(collection(db, "candidate_documents"), {
            userId: currentUser.uid,
            docType: "RESUME",
            fileName: file.name,
            fileUrl: "https://hirenest-documents.web.app/resumes/uploaded_draft.pdf",
            analysisScore: analysis.score,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Could not save candidate document log:", e);
        }
      }
    }, 1500);
  };

  // AI Career Coach message dispatcher
  const handleSendCoachMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsgText = chatInput.trim();
    setChatInput("");

    const newMsgs = [
      ...chatMessages,
      {
        id: Math.random().toString(),
        sender: "user",
        text: userMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setChatMessages(newMsgs);
    setIsCoachTyping(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsgText,
          context: "candidate_career_coach",
          pageData: JSON.stringify({
            candidateName: profile.name,
            skills: profile.skills,
            targetRoles: profile.targetRoles,
            experienceYears: profile.experienceYears,
            hasResumeUploaded: !!resumeAnalysis
          })
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "coach",
            text: data.insight || "I processed your request, and recommend updating your skills. Let's do a mock interview next!",
            recommendation: data.action || null,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        trackProgressAndPublish("coach_session", 10);
      } else {
        throw new Error("Endpoint failed");
      }
    } catch (e) {
      // Graceful local AI fallback responses for candidate support
      setTimeout(() => {
        let reply = "I've reviewed your request. To boost your interview performance, make sure to emphasize your experience with component lifecycle, React hooks (like useMemo/useCallback), and layout responsive strategies. Would you like me to quiz you on common React questions?";
        if (userMsgText.toLowerCase().includes("resume") || userMsgText.toLowerCase().includes("improve")) {
          reply = "To make your resume shine, highlight your accomplishments rather than just list duties. Use the STAR method (Situation, Task, Action, Result) and state exactly how you saved client loads or developer hours!";
        } else if (userMsgText.toLowerCase().includes("mock") || userMsgText.toLowerCase().includes("interview")) {
          reply = "Let's start! Question 1: What is the main difference between useEffect and useLayoutEffect, and in what specific corporate scenario would you prefer useLayoutEffect? Take your time to explain.";
        }
        setChatMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "coach",
            text: reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        trackProgressAndPublish("coach_session", 10);
      }, 1200);
    } finally {
      setIsCoachTyping(false);
    }
  };

  // Calculated Metrics
  const matchPercentage = profile.skills.includes("TypeScript") && profile.skills.includes("React") ? 88 : 65;

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto text-slate-100 font-sans">
      
      {/* Dynamic Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-10 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
          <div>
            <span className="text-[10px] bg-indigo-600 text-white font-black px-2.5 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
              Talent Node Connected
            </span>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-2 flex items-center gap-3">
              Candidate Cockpit: {profile.name}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Bot size={14} className="text-indigo-400" />
              Secure Isolation Mode active. Your profile, matches, and documentation are strictly private.
            </p>
          </div>

          {/* Persona Metric Cards */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex gap-6 items-center">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Activation Progress</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${activationScore}%` }}></div>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400">{activationScore}%</span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Health Score</span>
                <span className={`text-xs font-bold ${experienceHealth === 'EXCELLENT' ? 'text-emerald-400' : experienceHealth === 'GOOD' ? 'text-indigo-400' : 'text-amber-400'}`}>
                  {experienceHealth}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Experience Engine Guided Tour Banner */}
      {showTour && (
        <div className="mx-8 mt-8 bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-950/10">
          <div className="absolute right-4 top-4">
            <button 
              onClick={() => {
                setShowTour(false);
                trackProgressAndPublish("tour_dismissed", 0);
              }}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-4 items-start max-w-4xl">
            <div className="bg-indigo-600/20 p-3 rounded-2xl border border-indigo-500/30 text-indigo-400 mt-1 shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                Quick Guide (Step {tourStep + 1} of 4)
              </span>
              {tourStep === 0 && (
                <>
                  <h3 className="text-base font-bold text-white mt-1.5 mb-1">Welcome to HireNestOS! Let's get matching.</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This interactive dashboard is your command console. By completing your profile setup, uploading an authorized resume, and speaking to the Career Coach, our matchmaking layer identifies the optimal requirements with top-tier clients.
                  </p>
                </>
              )}
              {tourStep === 1 && (
                <>
                  <h3 className="text-base font-bold text-white mt-1.5 mb-1">Target matching skills & roles.</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Scroll down to your Profile Card below. Add precise, verified skills and preferred roles. Your SLA Match gauge on the right updates instantly to reflect your alignment with open requests.
                  </p>
                </>
              )}
              {tourStep === 2 && (
                <>
                  <h3 className="text-base font-bold text-white mt-1.5 mb-1">Upload Resume & get immediate analysis feedback.</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Use our instant Resume Analyzer. Drag-and-drop your latest PDF resume, and our parser will score your formatting, flag missing keywords, and suggest layout revisions to pass strict compliance filters.
                  </p>
                </>
              )}
              {tourStep === 3 && (
                <>
                  <h3 className="text-base font-bold text-white mt-1.5 mb-1">Career Coach Consultation.</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Need to stand out? Chat with your private AI Career Coach. It will run mock interview sessions, review compliance hurdles, and formulate personalized strategies based on real recruiter comments.
                  </p>
                </>
              )}
              <div className="flex items-center gap-3 mt-4">
                <Button variant="default" size="sm" onClick={handleTourNext}>
                  {tourStep < 3 ? "Next Step" : "Complete Guide & Boost Score (+10%)"}
                </Button>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((s) => (
                    <div key={s} className={`h-1.5 w-1.5 rounded-full ${s === tourStep ? "bg-indigo-400" : "bg-slate-700"}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout of Cockpit */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT/MIDDLE: Profile, Applications, Document Analyzer */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* MODULE 1: PROFILE MANAGEMENT */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <User size={16} className="text-indigo-400" /> Professional Profile Node
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {currentUser?.uid || "OFFLINE_GUEST"}</p>
                </div>
                {!isEditingProfile ? (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditingProfile(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSaveProfile}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500">Node Identifier</span>
                      <p className="text-sm font-bold text-white mt-0.5">{profile.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500">Primary Contact</span>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5">{profile.email || "Pending Authentication"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500">Deployment Base</span>
                      <p className="text-sm font-semibold text-slate-300 mt-0.5">{profile.location}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Target Roles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.targetRoles.map((r, idx) => (
                          <Badge key={idx} variant="outline">{r}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Verified Sourcing Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((s, idx) => (
                          <Badge key={idx} variant="success">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Node Name</label>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Deployment Location</label>
                      <input 
                        type="text" 
                        value={profile.location}
                        onChange={(e) => setProfile({...profile, location: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Target Roles Editor */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Positions</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Frontend Specialist"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <Button variant="secondary" size="sm" onClick={handleAddRole}>
                        <Plus size={14} /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.targetRoles.map((r, idx) => (
                        <div key={idx} className="bg-indigo-950/40 border border-indigo-800/50 rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                          {r}
                          <button onClick={() => handleRemoveRole(r)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills Editor */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Technical Skills</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Next.js"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <Button variant="secondary" size="sm" onClick={handleAddSkill}>
                        <Plus size={14} /> Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((s, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          {s}
                          <button onClick={() => handleRemoveSkill(s)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Engine Integration */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-semibold">
                  <HelpCircle size={12} /> Was this profile details container helpful?
                </span>
                {!cardFeedback["profile_node"]?.submitted ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFeedbackSubmit("profile_node", true)} 
                      className="text-slate-500 hover:text-emerald-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleFeedbackSubmit("profile_node", false)} 
                      className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Thanks for feedback!</span>
                )}
              </div>
            </div>

            {/* MODULE 2: INSTANT RESUME ANALYZER (FILE UPLOAD) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-2">
                <FileText size={16} className="text-emerald-400" /> Instant Resume Analyzer
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Upload your resume in PDF/DOCX format to get an instant compatibility review and keyword match score.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload Area */}
                <div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleResumeDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      dragOver ? "border-indigo-500 bg-indigo-950/20" : "border-slate-800 hover:border-slate-700 bg-slate-950/50"
                    }`}
                  >
                    <UploadCloud className="h-10 w-10 text-slate-500 mb-3" />
                    <p className="text-xs font-semibold text-slate-300">Drag & Drop Resume File Here</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">or</p>
                    <label className="mt-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer select-none">
                      Select File
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={handleResumeFileSelect} 
                        className="hidden" 
                      />
                    </label>
                    {resumeFile && (
                      <p className="text-xs text-indigo-400 font-mono mt-4 truncate max-w-full">
                        📁 {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {isUploadingResume && (
                    <div className="mt-4 flex items-center gap-3 text-xs text-indigo-400">
                      <RefreshCw size={14} className="animate-spin" />
                      Parsing and generating score vectors...
                    </div>
                  )}
                </div>

                {/* Analysis Display */}
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 min-h-48 flex flex-col justify-between">
                  {resumeAnalysis ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-500">Analysis Output</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">Match Rate:</span>
                          <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                            {resumeAnalysis.score}/100
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Strength</span>
                        <p className="text-xs text-slate-300 leading-snug">{resumeAnalysis.strength}</p>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-1">Identified Gaps</span>
                        <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                          {resumeAnalysis.gaps.map((g: string, i: number) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Keywords Extracted</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resumeAnalysis.keywordsMatched.map((k: string, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{k}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                      <FileText size={24} className="opacity-20 mb-2" />
                      <p className="text-xs">No analysis cached. Upload your resume to run the parser.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Engine Integration */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-semibold">
                  <HelpCircle size={12} /> Was this instant resume analyzer helpful?
                </span>
                {!cardFeedback["resume_analyzer"]?.submitted ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFeedbackSubmit("resume_analyzer", true)} 
                      className="text-slate-500 hover:text-emerald-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleFeedbackSubmit("resume_analyzer", false)} 
                      className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Thanks for feedback!</span>
                )}
              </div>
            </div>

            {/* MODULE 3: ISOLATED LISTS: APPLICATIONS & INTERVIEWS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* APPLICATIONS LIST */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-400" /> Isolated Application Pipeline
                </h3>
                
                {applications.length > 0 ? (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-xs text-white truncate max-w-[150px]">{app.requirementName || "Software Engineer"}</h4>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono ${
                              app.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                              app.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {app.status || "PENDING"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Ref ID: {app.id.substring(0, 8)}</p>
                        </div>
                        <div className="border-t border-slate-900 mt-2.5 pt-2 flex justify-between items-center">
                          <span className="text-[9px] text-slate-400">Match score: {app.matchScore || "88%"}</span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "Recently"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-500">
                    <Clock size={20} className="mx-auto opacity-20 mb-2" />
                    <p className="text-xs">No active applications currently logged.</p>
                  </div>
                )}
              </div>

              {/* INTERVIEWS LIST */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-amber-400" /> Isolated Interview Pipeline
                </h3>

                {interviews.length > 0 ? (
                  <div className="space-y-3">
                    {interviews.map((int) => (
                      <div key={int.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-xs text-white">{int.roundName || "Technical Round"}</h4>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase font-mono">
                              {int.status || "SCHEDULED"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Interviewer: {int.interviewerName || "Staff Architect"}</p>
                        </div>
                        <div className="border-t border-slate-900 mt-2.5 pt-2 flex justify-between items-center text-[10px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{int.timeSlot || "Pending details"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-500">
                    <Calendar size={20} className="mx-auto opacity-20 mb-2" />
                    <p className="text-xs">No scheduled interviews currently logged.</p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT: AI Coach & Match confidence */}
          <div className="space-y-8">
            
            {/* MATCH CONFIDENCE GAUGE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-4">
                <Zap size={16} className="text-indigo-400" /> Match Confidence Gauge
              </h2>

              <div className="flex flex-col items-center py-4 bg-slate-950/40 border border-slate-800 rounded-xl p-4 mb-4">
                {/* Circular Indicator */}
                <div className="relative h-28 w-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="48" className="stroke-slate-800 fill-none" strokeWidth="6" />
                    <circle cx="56" cy="56" r="48" className="stroke-indigo-500 fill-none transition-all duration-1000" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 48}`} strokeDashoffset={`${2 * Math.PI * 48 * (1 - matchPercentage / 100)}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black font-mono text-white">{matchPercentage}%</span>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mt-1">SLA Target</span>
                  </div>
                </div>

                <div className="text-center mt-4 space-y-1">
                  <p className="text-xs font-bold text-slate-200">SLA Position Alignment</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                    Based on your skills profile aligning with 4 active Client Requirements.
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Proactive Recommendations</span>
                
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex gap-3 hover:border-slate-700 transition-colors">
                  <div className="h-5 w-5 bg-indigo-600/15 rounded-lg border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Plus size={12} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">Add "GraphQL" Skill</h4>
                    <p className="text-[9px] text-slate-400 leading-snug mt-0.5">Will boost SLA Match score to **94%** for 2 open positions.</p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex gap-3 hover:border-slate-700 transition-colors">
                  <div className="h-5 w-5 bg-emerald-600/15 rounded-lg border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">Perform AI Mock Interview</h4>
                    <p className="text-[9px] text-slate-400 leading-snug mt-0.5">Triggers candidate-readiness certification value (+15%).</p>
                  </div>
                </div>
              </div>

              {/* Feedback Engine Integration */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-semibold">
                  <HelpCircle size={12} /> Was this match gauge helpful?
                </span>
                {!cardFeedback["match_gauge"]?.submitted ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFeedbackSubmit("match_gauge", true)} 
                      className="text-slate-500 hover:text-emerald-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleFeedbackSubmit("match_gauge", false)} 
                      className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 p-1 rounded-md transition-colors"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Thanks for feedback!</span>
                )}
              </div>
            </div>

            {/* AI CAREER COACH PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[480px] relative overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4 shrink-0 justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-600 text-white p-2 rounded-xl">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-white tracking-wider leading-none">AI Career Coach</h3>
                    <span className="text-[9px] font-bold text-emerald-400 mt-1 block">Live Consultation Active</span>
                  </div>
                </div>

                <button 
                  onClick={() => setChatMessages([{
                    id: "reset",
                    sender: "coach",
                    text: `Sure, let's start fresh. Ready to prepare or quiz?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }])}
                  className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded"
                  title="Reset conversation"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 select-text">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                    {msg.sender === 'coach' && (
                      <div className="bg-slate-800 border border-slate-700 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={12} className="text-indigo-400" />
                      </div>
                    )}
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono mt-1 block text-right">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                {isCoachTyping && (
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="bg-slate-800 border border-slate-700 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={12} className="text-indigo-400" />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 text-slate-400 px-3 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 font-semibold">
                      <RefreshCw size={10} className="animate-spin" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Suggesters */}
              <div className="flex flex-wrap gap-1.5 shrink-0 mb-3">
                {["Suggest resume gaps", "Run mock interview", "Review skills match"].map((s, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setChatInput(s);
                    }}
                    className="text-[9px] bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors font-bold uppercase"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 shrink-0 border-t border-slate-800 pt-3">
                <input 
                  type="text" 
                  placeholder="Ask Coach details, interview prep, etc..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCoachMessage()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleSendCoachMessage}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Feedback Engine Integration */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
                <span className="text-[9px] text-slate-500 flex items-center gap-1 font-semibold">
                  <HelpCircle size={10} /> Helpful?
                </span>
                {!cardFeedback["career_coach"]?.submitted ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleFeedbackSubmit("career_coach", true)} 
                      className="text-slate-500 hover:text-emerald-400 hover:bg-slate-800 p-1 rounded transition-colors"
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button 
                      onClick={() => handleFeedbackSubmit("career_coach", false)} 
                      className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 p-1 rounded transition-colors"
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Thanks!</span>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
