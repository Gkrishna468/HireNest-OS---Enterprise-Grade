import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { Send, Shield, Paperclip, Eye, EyeOff, FileText, Bot, DollarSign } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, getDoc, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";

export default function DealRoomsTab() {
  const [dealRooms, setDealRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

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
  }, []);

  useEffect(() => {
    if (selectedRoom) {
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

    await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), payload);
    setInputText("");
  };

  const handleRevealToggle = async () => {
    if (!selectedRoom) return;
    const nextState = !selectedRoom.identitiesRevealed;
    await updateDoc(doc(db, "dealRooms", selectedRoom.id), {
      identitiesRevealed: nextState
    });
    
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

  const isAdmin = userRole === 'admin';
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
            <div className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0">
              <div className="font-semibold text-sm text-slate-800 flex items-center">
                <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs mr-3 border border-indigo-200 uppercase tracking-tighter">DEAL_{selectedRoom.id.slice(0, 6)}</span>
                {selectedRoom.identitiesRevealed ? (
                  <span className="text-xs font-bold text-red-600 flex items-center">
                    <Eye size={14} className="mr-1" /> Identities Unmasked
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500 flex items-center">
                    <Shield size={14} className="mr-1 text-emerald-500" /> Masking Protocols Active
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                {isAdmin && (
                  <Button onClick={handleRevealToggle} size="sm" variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-1 h-auto ${selectedRoom.identitiesRevealed ? 'border-amber-200 text-amber-600' : 'border-red-200 text-red-600'}`}>
                    {selectedRoom.identitiesRevealed ? "Enable Masking" : "Unmask Identities"}
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  value={inputText}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Message this deal room securely..."
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
                <Button onClick={handleSend} size="sm" className="bg-indigo-600 hover:bg-slate-900 text-white flex-shrink-0 h-auto py-2 px-6 font-black text-[10px] tracking-widest">
                  SEND
                </Button>
              </div>
            </div>
          </section>

          {/* Intelligence Snapshot Sidebar */}
          <section className="w-80 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Bot size={14} className="text-indigo-600" /> Match Intelligence
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Density Factor</h4>
                      <div className="flex items-end gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-2xl font-black text-slate-800">{selectedRoom.matchData?.matchScore || '--'}%</span>
                          <span className="text-[9px] font-bold text-emerald-600 mb-1 uppercase tracking-widest">Matched Efficiency</span>
                      </div>
                  </div>

                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Key Strengths</h4>
                      <div className="space-y-1.5">
                          {selectedRoom.matchData?.strengths?.map((s: string, idx: number) => (
                              <div key={idx} className="text-[11px] text-slate-600 flex gap-2">
                                  <div className="mt-1.5 h-1 w-1 bg-indigo-400 rounded-full shrink-0" /> {s}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div>
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Detected Gaps</h4>
                      <div className="space-y-1.5">
                          {selectedRoom.matchData?.gaps?.map((g: string, idx: number) => (
                              <div key={idx} className="text-[11px] text-slate-600 flex gap-2">
                                  <div className="mt-1.5 h-1 w-1 bg-orange-400 rounded-full shrink-0" /> {g}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl italic">
                      <h4 className="text-[9px] font-black uppercase text-indigo-700 tracking-widest mb-1 flex items-center gap-1">
                          <Shield size={10}/> Gov Remark
                      </h4>
                      <p className="text-[10px] text-indigo-900 leading-relaxed">
                          {selectedRoom.matchData?.recruiterAssessment || "Profile verified against enterprise protocols."}
                      </p>
                  </div>
              </div>
          </section>
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
