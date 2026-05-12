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

  useEffect(() => {
    // Fetch User Role
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) setUserRole(userDoc.data().role);
      }
    };
    fetchUser();

    // Listen to Deal Rooms
    const q = collection(db, "dealRooms");
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDealRooms(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "dealRooms");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      const q = query(
        collection(db, "dealRooms", selectedRoom.id, "messages"),
        orderBy("timestamp", "asc")
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `dealRooms/${selectedRoom.id}/messages`);
      });
      return () => unsubscribe();
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

  const handleReveal = async () => {
    if (!selectedRoom) return;
    await updateDoc(doc(db, "dealRooms", selectedRoom.id), {
      identitiesRevealed: true
    });
    
    // System message
    await addDoc(collection(db, "dealRooms", selectedRoom.id, "messages"), {
      senderRole: "System Admin",
      senderId: "Admin",
      text: "🚨 NDA Approved. Market identities have been revealed for direct coordination. Audit log updated: GOV-REVEAL-LOG.",
      type: "system",
      timestamp: serverTimestamp()
    });
    
    // Audit log
    await addDoc(collection(db, "auditLogs"), {
      eventId: "IDENTITY_REVEALED",
      dealRoomId: selectedRoom.id,
      actorId: auth.currentUser?.uid,
      timestamp: serverTimestamp(),
      metadata: { clientId: selectedRoom.clientId, vendorId: selectedRoom.vendorId }
    });
  };

  const isAdmin = userRole === 'admin';

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
            {dealRooms.map(room => {
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
        <section className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex flex-col overflow-hidden shadow-sm">
          <div className="h-14 border-b bg-white flex items-center px-4 justify-between shrink-0">
            <div className="font-semibold text-sm text-slate-800 flex items-center">
              <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs mr-3 border border-indigo-200">{selectedRoom.id.slice(0, 8)}</span>
              {selectedRoom.identitiesRevealed ? (
                <span className="text-xs font-bold text-red-600 flex items-center">
                  <Eye size={14} className="mr-1" /> Identity Revealed
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 flex items-center">
                  <Shield size={14} className="mr-1 text-slate-400" /> Masking Protocols Active
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {isAdmin && !selectedRoom.identitiesRevealed && (
                <Button onClick={handleReveal} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-[10px] uppercase font-bold tracking-wider py-1 h-auto ml-2">
                  Reveal Identities
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
                     <span className="bg-red-100 text-red-700 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-red-200">{msg.text}</span>
                  </div>
                )
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${isAI ? 'text-indigo-600 flex items-center' : 'text-slate-500'}`}>
                      {isAI && <span className="mr-1">✦</span>}
                      {msg.senderRole}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg max-w-[85%] text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : isAI ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-tl-none font-medium' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
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
                className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              />
              <Button onClick={handleSend} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 h-auto py-1.5 px-4 font-bold text-xs">
                SEND
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center flex-col text-slate-400 shadow-sm">
          <Shield size={32} className="mb-2 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Deal Environment</p>
        </section>
      )}
    </div>
  );
}
