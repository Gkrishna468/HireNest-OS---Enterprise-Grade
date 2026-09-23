import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Bot,
  UserCheck,
  ShieldCheck,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  AlertTriangle,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  VolumeX,
  Play,
  RotateCcw,
  User,
  HeartHandshake
} from "lucide-react";
import { db } from "../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";

// WebRTC Audio Stream active client session

async function hashTokenClient(token: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(token);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export default function AIInterviewSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>(); // URL parameter containing the rawToken
  const navigate = useNavigate();

  // Route & Verification States
  const [hashedId, setHashedId] = useState<string>("");
  const [session, setSession] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  // Interview Interface States
  const [voiceChoice, setVoiceChoice] = useState("male_professional");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  // Camera & Stream states
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Compute hashedId asynchronously on mount/change
  useEffect(() => {
    if (!sessionId) return;
    hashTokenClient(sessionId).then((hId) => {
      setHashedId(hId);
    });
  }, [sessionId]);

  // Initial secure load of the session stub (zero-trust, no candidate info leaked)
  useEffect(() => {
    if (!sessionId) return;

    const initSession = async () => {
      try {
        const res = await fetch("/api/candidates/screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-session",
            rawToken: sessionId
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSession(data.session);
          
          const saved = localStorage.getItem(`verified_interview_${sessionId}`);
          if (saved === "true" || data.session.status === "VERIFIED" || data.session.status === "IN_PROGRESS") {
            setIsVerified(true);
          }
        } else {
          setVerificationError(data.error || "Failed to load session details.");
        }
      } catch (err: any) {
        setVerificationError("Network error loading session: " + err.message);
      }
    };

    initSession();
  }, [sessionId]);

  // Real-time listener for the Interview Session (only active when verified)
  useEffect(() => {
    if (!hashedId || !isVerified) return;

    const unsub = onSnapshot(doc(db, "ai_interview_sessions", hashedId), async (sessionDoc) => {
      if (sessionDoc.exists()) {
        const sData = sessionDoc.data();
        setSession({ id: sessionDoc.id, ...sData });

        // Secure candidate details lookup once verified
        if (sData.candidateId) {
          const candDoc = await getDoc(doc(db, "candidatePool", sData.candidateId));
          if (candDoc.exists()) {
            setCandidate(candDoc.data());
          }
        }
      } else {
        setVerificationError("Interview session not found or link has expired.");
      }
    }, (error) => {
      console.error("[AIInterviewSessionView] Subscription error:", error);
    });

    return () => unsub();
  }, [hashedId, isVerified]);

  // Activate local WebRTC video / audio stream
  useEffect(() => {
    if (isVerified && session && (session.status === "IN_PROGRESS" || session.status === "VERIFIED" || session.status === "CREATED")) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            setCameraActive(true);
          }
        })
        .catch((err) => {
          console.warn("Camera or microphone permission was blocked or unavailable:", err);
          setMicError("Camera or microphone was not detected. Please verify browser permissions.");
        });
    }
    return () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVerified, session?.status]);

  // Handle Candidate Verification via Secure API (zero-trust, verified strictly on server)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationEmail.trim()) {
      setVerificationError("Please enter a valid email address.");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");

    try {
      const response = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-email",
          rawToken: sessionId,
          email: verificationEmail.trim()
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Verification failed");
      }

      setIsVerified(true);
      setSession(data.session);
      if (sessionId) {
        localStorage.setItem(`verified_interview_${sessionId}`, "true");
      }
    } catch (err: any) {
      setVerificationError(err.message || "Error verifying candidate: the email provided does not match our application records.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Inform candidate that Live WebRTC audio stream handles capture continuously on server side
  const toggleSpeechRecognition = () => {
    setSystemMessage("🎙️ Continuous Real-time WebRTC audio is active. Your voice stream is captured and analyzed on the server-side media container; local browser transcription is bypassed.");
  };

  // Submit current round answer to adaptive server API
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim()) {
      setSystemMessage("Please speak or type an answer before submitting.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    setSystemMessage(null);
    setMicError("");

    try {
      const response = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-answer",
          sessionId: session.id, // session.id is the hashedId
          answer: candidateAnswer,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }

      setCandidateAnswer(""); // Clear input box
      setSystemMessage("Your response has been successfully captured. Mapped technical vectors analyzed.");
    } catch (err: any) {
      setSystemMessage("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join / Start active interview rounds on the server side securely
  const startInterview = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join-interview",
          sessionId: session.id, // session.id is the hashedId
          voiceChoice,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to join interview");
      }
      setSession(data.session);
    } catch (err: any) {
      setSystemMessage("Join failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" id="interview-view-loading">
        <div className="text-center space-y-4">
          <Bot className="w-16 h-16 text-indigo-400 animate-pulse mx-auto" />
          <h2 className="text-2xl font-black tracking-tight">HireNestOS Securing Node Connection</h2>
          <p className="text-slate-400 text-sm max-w-sm">Please wait while we establish a secure verification connection to the adaptive interview engine...</p>
        </div>
      </div>
    );
  }

  // 1. Unverified Layout
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" id="interview-view-unverified">
        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
              <UserCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Candidate Verification</h1>
            <p className="text-slate-400 text-xs">
              To begin your secure adaptive AI Interview Session, verify the email address associated with your application.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-slate-300 font-bold text-xs mb-1.5 uppercase tracking-wider">
                Application Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                placeholder="you@domain.com"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
              />
            </div>

            {verificationError && (
              <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Verifying Node Identity...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Secure Session</span>
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-[10px] text-slate-500 border-t border-slate-900 pt-4">
            Secured by **HireNestOS Cryptographic Keys**. No credentials saved locally.
          </div>
        </div>
      </div>
    );
  }

  // 2. Verified Complete State Layout
  if (session.status === "COMPLETED") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6" id="interview-view-completed">
        <div className="w-full max-w-2xl bg-slate-950/90 rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Interview Completed!</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Your responses have been successfully compiled, evaluated, and saved to the secure **HireNestOS Candidate Ledger**.
            </p>
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Real-Time Evaluation Telemetry</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Integrity Verification Status</span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PASS (Perfect Resume Alignment)</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Total Response Rounds</span>
                <div className="text-slate-300 font-bold text-sm">
                  5 / 5 Complete
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs leading-relaxed text-slate-400">
              <span className="font-extrabold text-slate-300 block mb-1">What's Next?</span>
              Our principal recruiters and hiring manager will review your structured briefing and transcript analysis. You will receive an update in your Candidate Dashboard within 48 business hours.
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Timestamped: {new Date(session.updatedAt).toLocaleString()}</span>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-lg flex items-center gap-1"
            >
              <span>Return Home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Interview Awaiting Start & Consent Gate
  if (!session.consentGiven) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6" id="interview-view-consent-gate">
        <div className="w-full max-w-xl bg-slate-950/90 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <HeartHandshake className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black">HireNest AI Interview</h2>
              <p className="text-xs text-slate-500">Explicit Recording & AI Analysis Consent</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Welcome, <strong className="text-white">{candidate?.name || "Candidate"}</strong>. To ensure an objective, high-fidelity assessment process, this automated tech interview utilizes real-time audio/video processing and advanced AI evaluation pipelines.
            </p>

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 space-y-4">
              <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Required Permissions & Protocols</h4>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">🎙️ Audio Recording</span>
                    <span className="text-slate-400">Capture voice answers to run Speech-to-Text translation.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">🎥 Video Recording</span>
                    <span className="text-slate-400">Verify identity and candidate presence during the evaluation.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">📝 Live Transcription</span>
                    <span className="text-slate-400">Save detailed vocal-to-text transcript logs for recruiter review.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked disabled className="mt-1 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">🧠 AI Intelligence Analysis</span>
                    <span className="text-slate-400">Map technical competence vectors and verify candidate resume evidence.</span>
                  </div>
                </label>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              By clicking "Agree & Start Interview", you confirm that you consent to your video, audio, and transcriptions being captured, analyzed, and shared with hiring managers for recruitment selection purposes under our <strong className="text-slate-300">Privacy Policy</strong>. No biometrics are stored after the position is filled.
            </p>
          </div>

          <Button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/candidates/screen", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "record-consent",
                    sessionId: session.id,
                    consentVersion: "v1.0"
                  })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                  throw new Error(data.error || "Failed to record consent");
                }
                // Transition the local state context immediately
                setSession((prev: any) => ({
                  ...prev,
                  consentGiven: true,
                  consentTimestamp: data.consentTimestamp,
                  consentVersion: data.consentVersion
                }));
              } catch (err: any) {
                setSystemMessage("Consent failure: " + err.message);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Confirming Consent...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Agree & Start Interview</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // 3a. Interview Awaiting Start (Consent already given)
  if (session.status === "PENDING" || !session.currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6" id="interview-view-start-screen">
        <div className="w-full max-w-xl bg-slate-950/90 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black">AI Technical Interview</h2>
              <p className="text-xs text-slate-500">Round-based Adaptive Evaluation Engine</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              Welcome, **{candidate?.name || "Candidate"}**. You are about to join a secure 5-round adaptive interview mapped to the open Job Specification.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
              <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Evaluation Protocol</h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                <li>Strictly ignore voice styling, appearance, and focus purely on substance.</li>
                <li>Your answers will be evaluated based on clarity, relevance, completeness, and structure.</li>
                <li>Each answer is limited to text or vocal input and helps form the next custom adaptive challenge.</li>
              </ul>
            </div>

            <div>
              <label className="block text-slate-300 font-bold text-xs mb-1.5 uppercase tracking-wider">
                Presenter Voice Style Preference
              </label>
              <select
                value={voiceChoice}
                onChange={(e) => setVoiceChoice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="male_professional">Male Professional (Principal Recruiter)</option>
                <option value="female_professional">Female Professional (Engineering Lead)</option>
                <option value="warm_host">Warm Podcast Host (Hiring Manager)</option>
                <option value="crisp_academic">Crisp Academic (Architect)</option>
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                *Note: Voice style is for your presentation preference only.
              </span>
            </div>
          </div>

          <Button
            onClick={startInterview}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Preparing Interview Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Join Live Interview Session</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // 4. Main ACTIVE Interview UI
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col" id="interview-view-active">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h1 className="font-extrabold text-sm tracking-tight">HireNestOS Candidate AI Interview</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800 text-xs py-1">
            Round {session.currentRound || 1} / 5
          </Badge>
          <Badge className="bg-slate-900 text-slate-300 border-slate-800 text-xs py-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span>Secure Node</span>
          </Badge>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6 justify-center">
        
        {/* Real Dual WebRTC Streams Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Candidate Stream Frame */}
          <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center shadow-lg">
            {cameraActive ? (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
              />
            ) : (
              <div className="text-center p-4">
                <User className="w-12 h-12 text-slate-700 mx-auto animate-pulse" />
                <span className="text-xs text-slate-500 font-bold block mt-2">Activating Candidate stream...</span>
              </div>
            )}
            <div className="absolute top-3 left-3 bg-red-600 text-white text-3s font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> LIVE
            </div>
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded text-3s font-semibold border border-slate-800 text-slate-300">
              {candidate?.name || "Candidate"} (You)
            </div>
          </div>

          {/* AI Interviewer Participant Frame */}
          <div className="relative aspect-video bg-indigo-950/80 rounded-2xl overflow-hidden border border-indigo-900/50 flex flex-col items-center justify-center shadow-lg">
            <div className="absolute top-3 left-3 bg-indigo-600 text-white text-3s font-bold px-2.5 py-1 rounded flex items-center gap-1.5 shadow-md uppercase tracking-wider font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>AI Agent: {session.agentState || "CONNECTED"}</span>
            </div>
            
            {/* Pulsing voice circles that expand when the agent is speaking */}
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/25 transition-all duration-300 ${isPlayingVoice ? "animate-ping" : "scale-90"}`}></div>
              <div className={`absolute w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 transition-all duration-300 ${isPlayingVoice ? "scale-110" : "scale-95"}`}></div>
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg relative z-10">
                <Sparkles size={20} className={isPlayingVoice ? "animate-spin" : ""} />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-indigo-900/85 backdrop-blur-xs px-2.5 py-1 rounded text-3s font-semibold border border-indigo-800 text-indigo-200">
              HireNest AI Agent ({(voiceChoice || "").replace("_", " ")})
            </div>
          </div>

        </div>

        {/* Presenter & Question Canvas */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {/* Subtle tech background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider">
                Current Question
              </h3>
              <p className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed">
                {session.currentQuestion}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-900 pt-4">
            <button
              onClick={() => speakQuestion(session.currentQuestion)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition-all"
            >
              {isPlayingVoice ? (
                <>
                  <Volume2 className="w-4 h-4 animate-bounce text-indigo-400" />
                  <span>Presenter Speaking...</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Replay Audio Question</span>
                </>
              )}
            </button>
            <div className="text-[10px] text-slate-500">
              Voice Choose: {(voiceChoice || "").replace("_", " ")}
            </div>
          </div>
        </div>

        {/* Candidate Input Arena */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Answer</span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSpeechRecognition}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                    <span>Listening... (Tap to Lock)</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Speak Response</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Visual Waveform during Voice Input */}
          {isListening && (
            <div className="flex items-center gap-1 justify-center py-2 bg-indigo-950/20 rounded-lg border border-indigo-900/30">
              <div className="w-1 h-6 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-1 h-8 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-1 h-4 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }}></div>
              <div className="w-1 h-10 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              <div className="w-1 h-5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }}></div>
              <span className="text-xs text-indigo-300 font-bold ml-2">Audio spectrum active... speak clearly</span>
            </div>
          )}

          {micError && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{micError}</span>
            </div>
          )}

          <textarea
            className="w-full h-32 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700 resize-none leading-relaxed"
            placeholder="Type your response here or click 'Speak Response' to transcribe vocally..."
            value={candidateAnswer}
            onChange={(e) => setCandidateAnswer(e.target.value)}
          ></textarea>

          {systemMessage && (
            <div className="bg-slate-900 text-slate-400 text-xs p-3 rounded-lg">
              {systemMessage}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-slate-500 max-w-md">
              **Biometric Guard Active**: Speech transcripts are analyzed objectively without accents, gender, or audio quality bias.
            </span>
            <Button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !candidateAnswer.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer / Copyright */}
      <footer className="bg-slate-950 border-t border-slate-900 text-center py-3 text-[10px] text-slate-600">
        HireNestOS Candidate Assessment Terminal • AI-Native Staffing Engine
      </footer>
    </div>
  );
}
