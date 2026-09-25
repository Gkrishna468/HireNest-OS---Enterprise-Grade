import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Bot,
  ShieldCheck,
  Video,
  Mic,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  XCircle,
  Play,
  RotateCcw,
  Check,
  VideoOff,
  MicOff,
  Radio
} from "lucide-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useParticipants,
  TrackLoop,
  ParticipantTile,
  VideoTrack
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface SessionInfo {
  id: string;
  status: string;
  candidateName?: string;
  jobTitle?: string;
  createdAt?: string;
  expiresAt?: string;
  consentGiven?: boolean;
}

function RealtimeSessionRoom({
  sessionInfo,
  onConclude
}: {
  sessionInfo: SessionInfo | null;
  onConclude: () => void;
}) {
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false }
    ],
    { onlySubscribed: false }
  );

  const localParticipant = participants.find((p) => p.isLocal);
  const technicalTeamParticipant = participants.find(
    (p) => p.identity === "hirenest-technical-team" || p.name === "HireNest Technical Team" || (!p.isLocal && p.identity.includes("technical"))
  ) || participants.find((p) => !p.isLocal);

  const localCameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera && t.publication?.track
  );

  const technicalTeamAudioTrack = tracks.find(
    (t) => !t.participant.isLocal && t.source === Track.Source.Microphone
  );

  const [connectionTimedOut, setConnectionTimedOut] = useState(false);

  useEffect(() => {
    if (technicalTeamParticipant) {
      setConnectionTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (!technicalTeamParticipant) {
        setConnectionTimedOut(true);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [technicalTeamParticipant]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <RoomAudioRenderer />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[280px]">
        {/* Candidate Tile */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 aspect-video flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between z-10">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded-md backdrop-blur-md border border-slate-800">
              You ({sessionInfo?.candidateName || "Candidate"})
            </span>
            <span className={`px-2 py-0.5 rounded-full text-3s font-mono font-bold uppercase backdrop-blur-md ${
              localParticipant?.isMicrophoneEnabled
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}>
              {localParticipant?.isMicrophoneEnabled ? "Mic Active" : "Mic Muted"}
            </span>
          </div>

          {localCameraTrack && localCameraTrack.publication?.track ? (
            <VideoTrack
              trackRef={localCameraTrack}
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <div className="text-center space-y-2 text-slate-500 z-0">
                <Video className="w-8 h-8 mx-auto opacity-60 text-emerald-400 animate-pulse" />
                <p className="text-2xs font-mono text-emerald-400 font-bold">
                  {localParticipant ? "Connected to Room" : "Connecting Media..."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* HireNest Technical Team Tile */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 aspect-video flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between z-10">
            <span className="text-2xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-md backdrop-blur-md border border-slate-800">
              <Sparkles size={12} /> HireNest Technical Team
            </span>
            <div className="flex items-center gap-1.5 z-10">
              {technicalTeamAudioTrack && (
                <span className="px-2 py-0.5 rounded-full text-3s font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Volume2 size={10} className="animate-pulse" /> Voice Active
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-3s font-mono font-bold uppercase ${
                technicalTeamParticipant
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
                {technicalTeamParticipant ? "Technical Team Connected" : "Connecting Technical Team..."}
              </span>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-0">
            <div className={`w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 flex items-center justify-center mb-3 shadow-lg ${
              technicalTeamParticipant ? "animate-pulse ring-2 ring-indigo-500/40" : "opacity-50"
            }`}>
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold text-slate-200">
              {technicalTeamParticipant ? "HireNest Technical Team" : "Waiting for HireNest Technical Team..."}
            </p>
            <p className="text-2xs text-slate-400 mt-1 max-w-xs">
              {technicalTeamParticipant
                ? "Speak naturally into your microphone when replying. The HireNest Technical Team listens and responds automatically via WebRTC."
                : connectionTimedOut
                  ? "Connection taking longer than expected. Please verify network or click below to retry."
                  : "WebRTC channel handshake & technical interviewer dispatch in progress."}
            </p>
            {connectionTimedOut && !technicalTeamParticipant && (
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-2xs font-bold rounded-lg transition"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <ControlBar controls={{ camera: true, microphone: true, screenShare: false, leave: false }} />
        <button
          onClick={onConclude}
          className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm"
        >
          Conclude Interview
        </button>
      </div>
    </div>
  );
}

export default function CandidateAIInterviewView() {
  const params = useParams<{ rawToken?: string; sessionId?: string }>();
  const location = useLocation();

  // Resolve canonical candidate token once from route parameters or URL path
  const canonicalCandidateToken = useMemo(() => {
    const rawParam = (params.rawToken || params.sessionId || "").trim();
    if (rawParam) return rawParam;

    // Fallback: extract last path segment from location if present
    const pathParts = location.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1].trim();
      if (lastPart && !["ai-interview", "interview", "candidate"].includes(lastPart.toLowerCase())) {
        return lastPart;
      }
    }
    return "";
  }, [params.rawToken, params.sessionId, location.pathname]);

  const canonicalCandidateTokenRef = useRef<string>(canonicalCandidateToken);
  useEffect(() => {
    canonicalCandidateTokenRef.current = canonicalCandidateToken;
  }, [canonicalCandidateToken]);

  // Page States: "LOADING" | "ERROR" | "PREJOIN" | "LIVE" | "INTERRUPTED" | "COMPLETED"
  const [pageState, setPageState] = useState<"LOADING" | "ERROR" | "PREJOIN" | "LIVE" | "INTERRUPTED" | "COMPLETED">("LOADING");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // Preflight Device States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Consent State
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // LiveKit Connection States
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");

  // Sound Test state
  const [isPlayingTestSound, setIsPlayingTestSound] = useState<boolean>(false);

  // 1. Initial Token Resolution (Zero-Trust Session Lookup)
  useEffect(() => {
    const activeToken = canonicalCandidateTokenRef.current || canonicalCandidateToken;

    console.log("[AI Interview] token state:", {
      present: Boolean(activeToken),
      length: activeToken ? activeToken.length : 0,
      route: location.pathname,
      action: "get-session"
    });

    if (!activeToken) {
      console.warn("[AI Interview] CANDIDATE_TOKEN_MISSING on initial session load", {
        present: false,
        length: 0,
        route: location.pathname,
        action: "get-session"
      });
      setErrorMessage("No interview invitation token provided in URL. Please use the original invitation link.");
      setPageState("ERROR");
      return;
    }

    const loadSession = async () => {
      setPageState("LOADING");
      try {
        const res = await fetch("/api/candidates/screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-session",
            rawToken: activeToken
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 401 || res.status === 403) {
            if (data.error && data.error.includes("No token provided")) {
              throw new Error("Internal API authentication configuration error.");
            }
          }
          throw new Error(data.error || "Interview invitation is invalid or has expired.");
        }

        const sess = data.session;
        setSessionInfo(sess);

        if (sess.status === "COMPLETED") {
          setPageState("COMPLETED");
        } else if (sess.status === "EXPIRED") {
          setErrorMessage("This interview invitation has expired. Please contact your recruiter.");
          setPageState("ERROR");
        } else if (sess.status === "REVOKED") {
          setErrorMessage("This interview invitation has been revoked. Please contact your recruiter.");
          setPageState("ERROR");
        } else {
          setPageState("PREJOIN");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load interview session. Token is invalid or expired.");
        setPageState("ERROR");
      }
    };

    loadSession();
  }, [canonicalCandidateToken, location.pathname]);

  // 2. Preflight Camera & Microphone Stream Setup
  useEffect(() => {
    if (pageState !== "PREJOIN") return;

    let isMounted = true;

    async function initMedia() {
      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        setCameraActive(stream.getVideoTracks().some((t) => t.enabled));
        setMicActive(stream.getAudioTracks().some((t) => t.enabled));

        // Audio Level Meter Setup
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateLevel = () => {
              if (!isMounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
          }
        } catch {
          // Non-critical meter fallback
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Media device error:", err);
        setMediaError("Camera or Microphone permission was denied or unavailable. Please enable permissions in browser settings.");
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => null);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [pageState]);

  // Speaker Test Audio Output
  const handleTestSpeaker = () => {
    setIsPlayingTestSound(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 chime
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      setTimeout(() => {
        setIsPlayingTestSound(false);
        ctx.close().catch(() => null);
      }, 1200);
    } catch {
      setIsPlayingTestSound(false);
    }
  };

  // 3. Start Interview Action
  const handleStartInterview = async () => {
    if (!consentGiven) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const activeToken = canonicalCandidateTokenRef.current || canonicalCandidateToken;

    console.log("[AI Interview] token state:", {
      present: Boolean(activeToken),
      length: activeToken ? activeToken.length : 0,
      route: location.pathname,
      action: "record-consent"
    });

    if (!activeToken || activeToken.length === 0) {
      console.warn("[AI Interview] CANDIDATE_TOKEN_MISSING before record-consent", {
        present: false,
        length: 0,
        route: location.pathname,
        action: "record-consent"
      });
      setErrorMessage("Interview invitation token is missing. Please reopen the original invitation link. [CANDIDATE_TOKEN_MISSING]");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step A: Record Recording Consent using canonicalCandidateToken ONLY
      const consentRes = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-consent",
          rawToken: activeToken,
          consentVersion: "v1.0"
        })
      });
      const consentData = await consentRes.json();
      console.log("[AI Interview] consent response:", {
        status: consentRes.status,
        success: consentData.success,
        alreadyConsented: consentData.alreadyConsented,
        sessionStatus: consentData.sessionStatus,
        errorCode: consentData.errorCode,
        error: consentData.error
      });
      console.log("[AI Interview] session status:", consentData.sessionStatus || "UNKNOWN");

      if (!consentRes.ok || !consentData.success) {
        if (consentData.sessionStatus === "COMPLETED" || consentData.errorCode === "INTERVIEW_ALREADY_COMPLETED") {
          setPageState("COMPLETED");
          return;
        }
        const msg = consentData.error || (consentData.errorCode ? `Error [${consentData.errorCode}]` : "Failed to record candidate consent.");
        throw new Error(msg);
      }

      // Step B: Request Short-Lived LiveKit JWT using canonicalCandidateToken ONLY
      const tokenRes = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "livekit-token",
          rawToken: activeToken
        })
      });
      const tokenData = await tokenRes.json();
      console.log("[AI Interview] LiveKit token response:", {
        status: tokenRes.status,
        success: tokenData.success,
        hasToken: Boolean(tokenData.token),
        tokenLength: tokenData.tokenLength || tokenData.token?.length,
        tokenFingerprint: tokenData.tokenFingerprint,
        wsUrl: tokenData.url,
        roomName: tokenData.roomName,
        sessionStatus: tokenData.sessionStatus,
        errorCode: tokenData.errorCode,
        error: tokenData.error
      });

      if (!tokenRes.ok || !tokenData.token) {
        if (tokenData.sessionStatus === "COMPLETED" || tokenData.errorCode === "INTERVIEW_ALREADY_COMPLETED") {
          setPageState("COMPLETED");
          return;
        }
        if (tokenData.errorCode === "LIVEKIT_NOT_CONFIGURED" || tokenRes.status === 503) {
          throw new Error("Realtime interview service is temporarily unavailable. Please contact support.");
        }
        const msg = tokenData.error || (tokenData.errorCode ? `Error [${tokenData.errorCode}]` : "Failed to generate realtime media access token.");
        throw new Error(msg);
      }

      if (!tokenData.url) {
        throw new Error("Realtime interview server URL not provided by server.");
      }

      // Stop preflight stream before LiveKit takes over tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      setLivekitToken(tokenData.token);
      setLivekitUrl(tokenData.url);
      setPageState("LIVE");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start interview session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER STATE: LOADING
  // -------------------------------------------------------------
  if (pageState === "LOADING") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 flex items-center justify-center mx-auto shadow-2xl">
            <Bot className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-tight">HireNest AI Interview</h2>
          <p className="text-slate-400 text-xs max-w-sm font-medium">
            Verifying secure invitation token & connecting workforce intelligence...
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: ERROR / INVALID TOKEN (NO REDIRECT TO LANDING!)
  // -------------------------------------------------------------
  if (pageState === "ERROR") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Invitation Invalid or Expired</h1>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              {errorMessage || "This interview link is no longer valid or has expired. Please contact your recruiting team to receive a fresh invitation link."}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-2xs font-mono text-slate-500 text-left space-y-1">
            <div>Status Code: 403_TOKEN_INVALID</div>
            <div>Secure Boundary: HireNest Candidate Preflight</div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: COMPLETED
  // -------------------------------------------------------------
  if (pageState === "COMPLETED") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Interview Completed</h1>
            <p className="text-slate-300 text-xs mt-2 leading-relaxed">
              Thank you, <strong className="text-white">{sessionInfo?.candidateName || "Candidate"}</strong>. Your technical evaluation responses have been submitted to the recruitment panel.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Position</span>
              <span className="font-bold text-slate-200">{sessionInfo?.jobTitle || "Requirement"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Check size={12} /> COMPLETED
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: LIVE WEBRTC INTERVIEW
  // -------------------------------------------------------------
  if (pageState === "LIVE") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight">HIRENEST AI INTERVIEW</h1>
              <p className="text-2xs text-slate-400">{sessionInfo?.jobTitle || "Technical Screening"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-2xs font-extrabold flex items-center gap-1">
              <Radio size={10} className="animate-pulse" /> LIVE WEBRTC STREAM
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={livekitToken}
            connect={true}
            audio={true}
            video={true}
            className="w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-2xl flex flex-col gap-6"
            onDisconnected={() => setPageState("INTERRUPTED")}
          >
            <RealtimeSessionRoom
              sessionInfo={sessionInfo}
              onConclude={() => setPageState("COMPLETED")}
            />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: INTERRUPTED (RECONNECTION / RECOVERY)
  // -------------------------------------------------------------
  if (pageState === "INTERRUPTED") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center border border-amber-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Network Connection Interrupted</h2>
        <p className="text-xs text-slate-400 max-w-md">
          Your connection to the LiveKit server was dropped. You can attempt to reconnect or conclude the interview session.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setPageState("CONSENT");
              handleStartSession();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Reconnect Stream
          </button>
          <button
            onClick={() => setPageState("COMPLETED")}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Conclude Interview
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE: PREJOIN / PREFLIGHT SCREEN (PRIMARY CANDIDATE PAGE)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800/80 p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xs font-extrabold text-indigo-400 tracking-widest uppercase">
            HIRENEST AI INTERVIEW
          </h1>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Hello {sessionInfo?.candidateName || "Candidate"}
          </h2>
          <p className="text-slate-400 text-xs">
            {sessionInfo?.jobTitle || "Technical Position"} • AI Level-1 Screening
          </p>
        </div>

        {/* Schedule & Info Box */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-2.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Calendar size={13} className="text-indigo-400" /> Scheduled Date
            </span>
            <span className="font-bold text-white">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Clock size={13} className="text-indigo-400" /> Estimated Duration
            </span>
            <span className="font-bold text-white">~30 minutes</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Sparkles size={13} className="text-indigo-400" /> Evaluation Mode
            </span>
            <span className="font-bold text-indigo-400 uppercase text-2xs bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              LiveKit Realtime Voice AI
            </span>
          </div>
        </div>

        {/* Preflight Device Check Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" /> Before You Begin (Device Preflight)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Camera Preview */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-2 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-bold text-slate-400 flex items-center gap-1">
                  <Video size={12} /> Camera
                </span>
                {cameraActive ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check size={12} /> Ready
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <VideoOff size={12} /> Checking...
                  </span>
                )}
              </div>

              <div className="w-full aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {!cameraActive && (
                  <span className="text-2xs text-slate-500 absolute">Camera Feed Inactive</span>
                )}
              </div>
            </div>

            {/* Microphone Meter & Audio Check */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1">
                    <Mic size={12} /> Microphone
                  </span>
                  {micActive ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check size={12} /> Ready
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <MicOff size={12} /> Checking...
                    </span>
                  )}
                </div>

                {/* Level Meter */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                  <span className="text-3s text-slate-500 font-mono block text-right">
                    Audio Input Level: {micLevel}%
                  </span>
                </div>
              </div>

              {/* Speaker Test Button */}
              <button
                type="button"
                onClick={handleTestSpeaker}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-2xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-800"
              >
                <Volume2 size={12} className={isPlayingTestSound ? "animate-bounce text-indigo-400" : ""} />
                {isPlayingTestSound ? "Playing Test Chime..." : "Test Speaker Audio"}
              </button>
            </div>
          </div>

          {mediaError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{mediaError}</span>
            </div>
          )}
        </div>

        {/* Consent Checkbox */}
        <div className="bg-indigo-950/30 p-4 rounded-2xl border border-indigo-500/20 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
            <span className="text-xs text-slate-200 leading-normal">
              I consent to audio/video recording and AI-assisted technical screening assessment under the HireNest Privacy Terms.
            </span>
          </label>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStartInterview}
          disabled={!consentGiven || isSubmitting}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-sm rounded-2xl transition shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Connecting to AI Realtime Agent...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start Interview</span>
            </>
          )}
        </button>

        <p className="text-center text-3s text-slate-500">
          No account or login required. Powered by HireNest WebRTC Intelligence.
        </p>
      </div>
    </div>
  );
}
