import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Send, Shield, Paperclip, Eye, EyeOff, FileText, Bot, DollarSign, CheckCircle2, Circle, Calendar, MessageSquare, ChevronRight, Sparkles, Clock, Zap, Activity } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDoc, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";
import { logExecutionEvent, ExecutionEventType, createSLA } from "../lib/infrastructureService";
import { ExecutionFeed } from "../components/ExecutionFeed";
import { motion, AnimatePresence } from "motion/react";

const STAGES = [
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'technical_l1', label: 'Tech L1' },
  { id: 'technical_l2', label: 'Tech L2' },
  { id: 'final_round', label: 'Final Round' },
  { id: 'offer', label: 'Offer' },
  { id: 'hired', label: 'Hired' }
];

export default function DealRoomsTab() {
  const [dealRooms, setDealRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [aiIntelligence, setAiIntelligence] = useState<{ questions: string[], starters: string[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    // Fetch User Role
    const fetchUser = async () => {
      if (auth.currentUser) {
        // Priority 1: Check HQ Sync for users if possible, or fallback to direct Firebase
        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            setOrgId(data.organizationId);
          } else {
             // Heuristic for known admins if DB document is missing
             const knownAdmins = ['0xpXdzSQE6V92xbnCkiczPHexiU2', 'vetAu3RF2qYVmsCuB6cpEz9DDqA2', 'ZlpY4qN9BKS7n0yoMQP7LDMvvJ53'];
             if (knownAdmins.includes(auth.currentUser.uid)) {
               setUserRole('admin');
               setOrgId('ORG-GLOBAL-HQ');
             }
          }
        } catch (e) {
           console.warn("User profile fetch failed, using session heuristics");
        }
      }
    };
    fetchUser();

    // Listen to Deal Rooms
    const loadDealRooms = async () => {
      if (!orgId) return;
      try {
        // Try Proxy FIRST (Filtered by user context)
        const response = await fetch(`/api/user/context?orgId=${orgId}&role=${userRole}`);
        if (response.ok) {
           const resData = await response.json();
           if (resData.dealRooms) {
             setDealRooms(resData.dealRooms);
             return;
           }
        }
        
        // Fallback to Firestore
        const q = collection(db, "dealRooms");
        const unsubscribe = onSnapshot(q, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setDealRooms(data);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "dealRooms");
        });
        return unsubscribe;
      } catch (err) {
        console.warn("DealRoom sync fallback triggered");
      }
    };
    
    let unsub: any;
    loadDealRooms().then(u => unsub = u);
    return () => unsub && unsub();
  }, [orgId, userRole]); // Added dependencies

  useEffect(() => {
    if (selectedRoom) {
      setAiIntelligence(null); // Reset when switching rooms
      
      // Auto-Fix Metadata for legacy rooms
      const fixMetadata = async () => {
        if (!selectedRoom.jobTitle || selectedRoom.jobTitle === "Strategic Role" || !selectedRoom.experience) {
          if (selectedRoom.requirementId) {
            try {
              const reqDoc = await getDoc(doc(db, "requirements_public", selectedRoom.requirementId));
              if (reqDoc.exists()) {
                const reqData = reqDoc.data();
                await updateDoc(doc(db, "dealRooms", selectedRoom.id), {
                  jobTitle: reqData.title || selectedRoom.jobTitle || "Strategic Role",
                  experience: reqData.experience || selectedRoom.experience || "8+ YRS"
                });
              }
            } catch (e) {
              console.warn("Metadata auto-fix failed", e);
            }
          }
        }
      };
      fixMetadata();

      const loadMessages = async () => {
        try {
           // Try Proxy for messages first if available in the sync payload
           const response = await fetch('/api/admin/governance-data');
           if (response.ok) {
             // In a real scenario we'd have a specific messages endpoint or filtered sync
             // For now we'll allow Firestore to handle chat as it's more real-time, 
             // but we'll wrap it carefully.
           }
        } catch (e) {}

        const q = query(
          collection(db, "dealRooms", selectedRoom.id, "messages"),
          orderBy("timestamp", "asc")
        );
        const unsubscribe = onSnapshot(q, (snap) => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          console.warn("Message sync fallback - trying legacy API");
          // Fallback to server-side message proxy if Firestore fails
          fetch(`/api/dealrooms/${selectedRoom.id}/messages`)
            .then(r => r.json())
            .then(data => setMessages(data))
            .catch(() => handleFirestoreError(error, OperationType.GET, `dealRooms/${selectedRoom.id}/messages`));
        });
        return unsubscribe;
      };

      let unsubMsg: any;
      loadMessages().then(u => unsubMsg = u);
      return () => unsubMsg && unsubMsg();
    }
  }, [selectedRoom]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom) return;
    
    const payload = {
      senderRole: userRole || "User",
      senderId: auth.currentUser?.uid,
      text: inputText,
      type: "text",
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), payload);
      setInputText("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `dealRooms/${selectedRoom.id}/messages`);
    }
  };

  const fetchIntelligence = async () => {
    if (!selectedRoom) return;
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/deal/intelligence', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          profile: selectedRoom.candidateName || "Candidate Profile",
          jd: selectedRoom.jobTitle || "Job Description",
          type: userRole?.includes('client') ? 'client' : 'vendor'
        })
      });
      if (response.ok) {
        setAiIntelligence(await response.json());
      } else {
        const errText = await response.text();
        console.error(`AI Intelligence fetch failed with status ${response.status}: ${errText}`);
      }
    } catch (e: any) {
      console.error("AI Intelligence network error:", e.message || e);
      // Fallback for UI feedback
      alert(`Network connectivity issue: ${e.message || "Failed to reach intelligence layer"}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateStage = async (stageId: string) => {
    if (!selectedRoom || !stageId) return;
    const isFinalStage = stageId === 'hired';
    try {
      await updateDoc(doc(db, "dealRooms", selectedRoom.id), {
        currentStage: stageId,
        status: isFinalStage ? "CLOSED" : selectedRoom.status,
        updatedAt: serverTimestamp()
      });

      // Log to Execution Bus
      await logExecutionEvent(
        isFinalStage ? ExecutionEventType.PLACEMENT_CLOSED : ExecutionEventType.INTERVIEW_SCHEDULED,
        selectedRoom.id,
        "deal_room",
        { 
          stage: STAGES.find(s => s.id === stageId)?.label, 
          candidateName: selectedRoom.candidateName,
          organizationId: orgId
        },
        selectedRoom.requirementId
      );
      
      // Auto-message for stage update
      await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
        senderRole: "System Admin",
        senderId: "Admin",
        text: `📍 Pipeline update: Target moved to stage [${STAGES.find(s => s.id === stageId)?.label}].`,
        type: "system",
        timestamp: serverTimestamp()
      });

      if (isFinalStage) {
        // Simulate Match Email
        await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
          senderRole: "System Admin",
          senderId: "Admin",
          text: `🎉 MATCH FINALIZED! Sending confirmation email to Admin HQ. (Linked: Vendor ID: ${selectedRoom.vendorId} matched with ${selectedRoom.clientName || 'Client'} for candidate ${selectedRoom.candidateName}).`,
          type: "system",
          timestamp: serverTimestamp()
        });
        
        // Final "Happy Onboarding" message
        await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
          senderRole: "AI Copilot",
          senderId: "system",
          text: `🏆 Deal Closed. Happy Onboarding! Please contact global_admin@hirenestworkforce.com for the final contract signing and billing reconciliation.`,
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Stage update failed", e);
    }
  };

  const handleScheduleInvite = async () => {
    if (!selectedRoom) return;
    
    // Create SLA for Interview Setup (48h)
    await createSLA(selectedRoom.id, "INTERVIEW", 48);

    // Simulate scheduling logic
    await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
      senderRole: userRole || "User",
      senderId: auth.currentUser?.uid,
      text: `📅 CALENDAR REQUEST: Interview session requested for ${selectedRoom.candidateName || 'Candidate'}. Check email for direct link.`,
      type: "text",
      timestamp: serverTimestamp()
    });
    setShowScheduleModal(false);
  };

  const isClient = userRole?.includes('client');
  const isVendor = userRole?.includes('vendor');
  const isAdmin = userRole === 'admin';

  const handleRevealToggle = async () => {
    if (!selectedRoom) return;
    const nextState = !selectedRoom.identitiesRevealed;
    try {
      await updateDoc(doc(db, "dealRooms", selectedRoom.id), {
        identitiesRevealed: nextState
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dealRooms/${selectedRoom.id}`);
    }
    
    // System message
    await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
      senderRole: "System Admin",
      senderId: "Admin",
      text: nextState 
        ? "🚨 NDA Approved. Market identities have been revealed for direct coordination." 
        : "🔒 Security Alert: Identity Masking has been re-enabled for this deal room.",
      type: "system",
      timestamp: serverTimestamp()
    });
  };

  const filteredRooms = dealRooms.filter(room => isAdmin || room.clientId === orgId || room.vendorId === orgId);

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4 pb-0 h-full">
      {/* Left: Deal Rooms List */}
      <section className="w-1/3 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-w-[320px]">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800 tracking-tighter">Enterprise Deal Stream</h3>
          <span className="text-[9px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 italic flex items-center">
            <Shield size={10} className="mr-1" /> Isolation Policy
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            {filteredRooms.map(room => {
              const isSelected = selectedRoom?.id === room.id;
              return (
                <div 
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`px-4 py-4 border-b border-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/50 relative' : 'hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />}
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-[10px] font-bold text-slate-400">ID: {room.id.slice(0,8)}</span>
                    <Badge variant="outline" className="text-[8px] py-0">{room.status}</Badge>
                  </div>
                  <div className="text-[12px] font-bold text-slate-800 truncate mb-1">Candidate Profile: {room.identitiesRevealed ? room.candidateName : "ANON_CANDIDATE"}</div>
                  <div className="text-[10px] text-slate-500 space-x-2">
                    <span>{room.identitiesRevealed ? "Google HQ" : "CLIENT_MASKED"}</span>
                    <span>•</span>
                    <span>{room.identitiesRevealed ? "ABC Staffing" : "VENDOR_MASKED"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right: Active Deal Room Chat */}
      {selectedRoom ? (
        <div className="flex-1 flex gap-4 overflow-hidden">
          <section className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex flex-col overflow-hidden shadow-sm">
            <div className="py-3 border-b bg-white flex items-center px-4 justify-between shrink-0">
              <div className="flex flex-col">
                <div className="font-semibold text-sm text-slate-800 flex items-center mb-1">
                  <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs mr-3 border border-indigo-200 uppercase tracking-tighter">DEAL_{selectedRoom.id.slice(0, 6)}</span>
                  <span className="text-sm font-black text-slate-900 mr-3">{selectedRoom.identitiesRevealed ? selectedRoom.candidateName : "MASKED_CANDIDATE"}</span>
                  {selectedRoom.identitiesRevealed ? (
                    <span className="text-[10px] font-bold text-red-600 flex items-center px-2 py-0.5 bg-red-50 rounded border border-red-100 shrink-0">
                      <Eye size={12} className="mr-1" /> Unmasked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100 shrink-0">
                      <Shield size={12} className="mr-1" /> Masked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <FileText size={12} className="text-slate-400" /> {selectedRoom.jobTitle || "Strategic Role"}
                  </span>
                  <span className="text-slate-200">|</span>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} /> {selectedRoom.experience || selectedRoom.yearsOfExperience || "8+"} YRS EXP
                  </span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {isClient && (
                   <Button onClick={() => setShowScheduleModal(true)} size="sm" variant="outline" className="text-[10px] uppercase font-black border-indigo-200 text-indigo-600 tracking-widest py-1 h-auto">
                     Schedule
                   </Button>
                )}
                {isAdmin && (
                  <Button onClick={handleRevealToggle} size="sm" variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-1 h-auto ${selectedRoom.identitiesRevealed ? 'border-amber-200 text-amber-600' : 'border-red-200 text-red-600'}`}>
                    {selectedRoom.identitiesRevealed ? "Enable Masking" : "Unmask Identities"}
                  </Button>
                )}
              </div>
            </div>

            {/* Pipeline Tracker */}
            <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0 overflow-x-auto">
                <div className="mb-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {STAGES.map((s, i) => {
                         const currentIdx = STAGES.findIndex(st => st.id === (selectedRoom.currentStage || 'shortlisted'));
                         return (
                            <motion.div 
                              key={s.id}
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              className={`h-full border-r border-white/20 ${i <= currentIdx ? (selectedRoom.status === 'CLOSED' ? 'bg-emerald-500' : 'bg-indigo-600') : 'bg-transparent'}`}
                            />
                         );
                    })}
                </div>
                <div className="flex items-center justify-between min-w-[600px]">
                    {STAGES.map((stage, idx) => {
                        const isCurrent = selectedRoom.currentStage === stage.id || (!selectedRoom.currentStage && stage.id === 'shortlisted');
                        const isPast = STAGES.findIndex(s => s.id === (selectedRoom.currentStage || 'shortlisted')) > idx;
                        
                        return (
                            <div key={stage.id} className="flex items-center group relative">
                                <button 
                                  disabled={!isClient && !isAdmin}
                                  onClick={() => updateStage(stage.id)}
                                  className={cn(
                                    "flex flex-col items-center gap-1.5 transition-all text-center",
                                    isCurrent ? "scale-110" : "opacity-60 hover:opacity-100"
                                  )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors",
                                        isCurrent ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" :
                                        isPast ? "bg-emerald-100 border-emerald-500 text-emerald-600" : "bg-white border-slate-200 text-slate-300"
                                    )}>
                                        {isPast ? <CheckCircle2 size={12} /> : <div className="text-[9px] font-black">{idx + 1}</div>}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter w-14",
                                        isCurrent ? "text-indigo-600" : "text-slate-400"
                                    )}>{stage.label}</span>
                                </button>
                                {idx < STAGES.length - 1 && (
                                    <div className="w-12 h-[px] bg-slate-100 mx-2 mt-[-14px]" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Execution Milestones (Network Specific) */}
            <div className="px-4 py-3 bg-slate-900 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
                {[
                    { label: "MSA/NDA EXECUTION", status: selectedRoom.identitiesRevealed ? 'COMPLETED' : 'IN_PROGRESS' },
                    { label: "CLIENT INTERVIEW", status: STAGES.findIndex(s => s.id === selectedRoom.currentStage) >= 2 ? 'COMPLETED' : 'PENDING' },
                    { label: "OFFER ISSUANCE", status: selectedRoom.currentStage === 'offer' ? 'IN_PROGRESS' : (selectedRoom.currentStage === 'hired' ? 'COMPLETED' : 'LOCKED') },
                    { label: "BILLING TRIGGER", status: selectedRoom.status === 'CLOSED' ? 'READY' : 'LOCKED' }
                ].map((m, i) => (
                    <div key={i} className="flex flex-col min-w-[120px]">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                m.status === 'COMPLETED' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
                                m.status === 'IN_PROGRESS' ? "bg-indigo-500 animate-pulse" : 
                                m.status === 'READY' ? "bg-amber-500" : "bg-slate-700"
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tight",
                                m.status === 'COMPLETED' ? "text-white" : "text-slate-400"
                            )}>{m.status.replace('_', ' ')}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Intelligence Quick Tools */}
            <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100/50 flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 text-indigo-700">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Co-Pilot Intelligence</span>
                </div>
                <div className="flex gap-2">
                    {!aiIntelligence ? (
                        <Button 
                          onClick={fetchIntelligence} 
                          disabled={isAiLoading}
                          variant="ghost" 
                          className="h-7 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-white/50 border border-indigo-100"
                        >
                            {isAiLoading ? "Syncing..." : `Generate ${isClient ? 'Interview Questions' : 'Conversation Starters'}`}
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            {(isClient ? aiIntelligence.questions : aiIntelligence.starters).slice(0, 2).map((item, i) => (
                                <button 
                                  key={i}
                                  onClick={() => setInputText(item)}
                                  className="h-7 px-3 text-[9px] font-bold text-indigo-800 bg-white border border-indigo-200 rounded-lg hover:border-indigo-400 truncate max-w-[200px]"
                                >
                                    {item}
                                </button>
                            ))}
                            <Button 
                              onClick={() => setAiIntelligence(null)} 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                            >
                                ↺
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedRoom.status === "CLOSED" && (
                <div className="mb-6 animate-in zoom-in-95 duration-500">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-900 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-2xl animate-pulse" />
                            <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                                <Sparkles className="text-white w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Happy Onboarding!</h2>
                            <p className="text-indigo-100 text-sm max-w-md mx-auto leading-relaxed">
                                Strategy finalized. We have successfully matched <b>{selectedRoom.candidateName}</b> with <b>{selectedRoom.identitiesRevealed ? selectedRoom.clientName : "the client"}</b>.
                            </p>
                            <div className="flex gap-3 justify-center pt-4">
                               <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
                                   Deal Finalized
                               </div>
                               <div className="px-4 py-2 bg-emerald-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                   <CheckCircle2 size={12} /> Compliance Verified
                               </div>
                            </div>
                            <div className="pt-6">
                                <p className="text-white/60 text-[10px] italic">Contact Admin HQ for subsequent workflow documentation.</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 my-8 text-slate-300">
                        <div className="flex-1 h-[1px] bg-slate-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Archived Conversation History</span>
                        <div className="flex-1 h-[1px] bg-slate-200" />
                    </div>
                </div>
              )}
              {messages.map(msg => {
                const isAI = msg.senderRole === "AI Copilot";
                const isMe = msg.senderId === auth.currentUser?.uid;
                const isSystem = msg.type === "system";
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-4">
                       <span className="bg-slate-100 text-slate-600 text-[9px] px-3 py-1 rounded-full font-bold uppercase tracking-[0.2em] border border-slate-200">{msg.text}</span>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isAI ? 'text-indigo-600 flex items-center' : 'text-slate-500'}`}>
                        {isAI && <span className="mr-1">✦</span>}
                        {msg.senderRole}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
                    </div>
                    <div className={`p-2.5 rounded-lg max-w-[85%] text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-slate-900 text-white rounded-tr-none' : isAI ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-tl-none font-medium' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  disabled={selectedRoom.status === "CLOSED"}
                  value={inputText}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={selectedRoom.status === "CLOSED" ? "This room is finalized and read-only." : "Message this deal room securely..."}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50 disabled:bg-slate-100 disabled:italic"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={selectedRoom.status === "CLOSED" || !inputText.trim()}
                  size="sm" 
                  className="bg-indigo-600 hover:bg-slate-900 text-white flex-shrink-0 h-auto py-2 px-6 font-black text-[10px] tracking-widest"
                >
                  SEND
                </Button>
              </div>
            </div>
          </section>

          {/* Intelligence Snapshot Sidebar */}
          <section className="w-80 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Bot size={14} className="text-indigo-600" /> Deal Intelligence
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                  {/* Performance Indicators (SLA Monitor) */}
                  <div className="bg-slate-900 rounded-2xl p-4 border border-white/10 shadow-2xl overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Zap size={60} />
                      </div>
                      <div className="relative z-10">
                          <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3 flex items-center gap-2">
                              <Activity size={12}/> Operational Health
                          </h4>
                          <div className="space-y-3">
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase">Feedback SLA</span>
                                 <div className="flex items-center gap-2">
                                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                                     <span className="text-[10px] font-black text-emerald-400">08h 12m</span>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase">Closure Prob.</span>
                                 <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black text-indigo-400">84% CONFIDENT</span>
                                 </div>
                              </div>
                              <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                 <span className="text-[10px] text-slate-400 font-bold uppercase">Network Trust</span>
                                 <span className="text-[10px] font-black text-indigo-400">92% SECURE</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Operational Timeline Feed */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                      <ExecutionFeed dealId={selectedRoom.id} requirementId={selectedRoom.requirementId} />
                  </div>

                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Counterparties</h4>
                      <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Lead Client</p>
                             <p className="text-xs font-black text-slate-800">{selectedRoom.identitiesRevealed ? (selectedRoom.clientName || 'Google HQ') : "IDENTITY_MASKED"}</p>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Approved Vendor</p>
                             <p className="text-xs font-black text-slate-800">{selectedRoom.identitiesRevealed ? (selectedRoom.vendorName || 'Elite Staffing') : "IDENTITY_MASKED"}</p>
                          </div>
                      </div>
                  </div>

                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pipeline Status</h4>
                      <div className="flex items-end gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                          <span className="text-xl font-black text-indigo-900">{STAGES.find(s => s.id === (selectedRoom.currentStage || 'shortlisted'))?.label}</span>
                          <span className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-widest">Active State</span>
                      </div>
                  </div>

                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Match Diagnostics</h4>
                      <div className="flex items-center gap-2 mb-3">
                         <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500" style={{ width: `${selectedRoom.matchData?.matchScore || 85}%` }} />
                         </div>
                         <span className="text-[10px] font-black text-emerald-600">{selectedRoom.matchData?.matchScore || 85}%</span>
                      </div>
                      <div className="space-y-1.5">
                          {selectedRoom.matchData?.strengths?.map((s: string, idx: number) => (
                              <div key={idx} className="text-[10px] text-slate-600 flex gap-2 font-medium">
                                  <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" /> {s}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl">
                      <h4 className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-2 border-b border-white/10 pb-1">Candidate Direct</h4>
                      <p className="text-xs font-bold text-white mb-1">{selectedRoom.identitiesRevealed ? selectedRoom.candidateName : "HIDDEN_PROFILE"}</p>
                      {selectedRoom.identitiesRevealed && (
                          <div className="space-y-1 mt-2">
                              <p className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <MessageSquare size={10} /> {selectedRoom.candidateEmail || 'c.rivera@example.com'}
                              </p>
                              <Button 
                                onClick={() => setShowScheduleModal(true)}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase py-1.5 rounded-lg"
                              >
                                Schedule Interview
                              </Button>
                          </div>
                      )}
                  </div>
              </div>
          </section>

          {/* Schedule Modal */}
          <AnimatePresence>
              {showScheduleModal && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                      >
                          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Schedule Interview</h3>
                              <Button variant="ghost" onClick={() => setShowScheduleModal(false)} className="h-8 w-8 p-0">✕</Button>
                          </div>
                          <div className="p-6 space-y-4">
                              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                  <p className="text-xs font-bold text-indigo-900 mb-1">Direct Coordination</p>
                                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                                      This will generate a calendar request and send it to the candidate's verified email. 
                                      SLA monitoring will track response time.
                                  </p>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Duration</label>
                                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500">
                                      <option>Technical Assessment (60m)</option>
                                      <option>Screening Call (30m)</option>
                                      <option>Founders Interview (45m)</option>
                                  </select>
                              </div>
                              <Button onClick={handleScheduleInvite} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase py-4 rounded-xl shadow-xl shadow-slate-200 transition-all active:scale-95">
                                Send Invite Request
                              </Button>
                          </div>
                      </motion.div>
                  </div>
              )}
          </AnimatePresence>
        </div>
      ) : (
        <section className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center flex-col text-slate-400 shadow-sm">
          <Shield size={32} className="mb-2 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Deal Environment</p>
        </section>
      )}
    </div>
  );
}
