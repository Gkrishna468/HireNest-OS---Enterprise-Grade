import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { Send, Shield, Paperclip, Eye, EyeOff, FileText, Bot } from "lucide-react";

export default function DealRoomsTab() {
  const [dealRooms, setDealRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    fetch("/api/dealrooms").then(res => res.json()).then(data => {
      setDealRooms(data);
      if (data.length > 0) handleSelectRoom(data[0]);
    });
  }, []);

  const handleSelectRoom = (room: any) => {
    setSelectedRoom(room);
    fetch(`/api/dealrooms/${room.id}/messages`)
      .then(res => res.json())
      .then(setMessages);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedRoom) return;
    
    const payload = {
      senderRole: "Admin", // For demo purposes, we send as Admin
      senderId: "Admin",
      text: inputText,
      type: "text"
    };

    const res = await fetch(`/api/dealrooms/${selectedRoom.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const newMessage = await res.json();
    setMessages([...messages, newMessage]);
    setInputText("");
  };

  const handleSendDocument = async () => {
    if (!selectedRoom) return;
    
    const payload = {
      senderRole: "Admin",
      senderId: "Admin",
      text: "Uploaded NDA_Document_V2.pdf",
      type: "document",
      fileUrl: "#"
    };

    const res = await fetch(`/api/dealrooms/${selectedRoom.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const newMessage = await res.json();
    setMessages([...messages, newMessage]);
  };

  const handleReveal = async () => {
    if (!selectedRoom) return;
    const res = await fetch(`/api/dealrooms/${selectedRoom.id}/reveal`, {
      method: "POST"
    });
    if(res.ok) {
       const updatedRoom = await res.json();
       setSelectedRoom(updatedRoom);
       // Refresh messages
       fetch(`/api/dealrooms/${selectedRoom.id}/messages`)
         .then(r => r.json())
         .then(setMessages);
       
       // Update rooms list locally
       setDealRooms(dealRooms.map(r => r.id === updatedRoom.id ? updatedRoom : r));
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden p-4 gap-4 pb-0 h-full">
      {/* Left: Deal Rooms List (High Density Styling) */}
      <section className="w-1/3 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-w-[320px]">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">Anonymous Deals</h3>
          <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 italic flex items-center">
            <Shield size={10} className="mr-1" /> Masking Policies
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-4 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-4 py-2 border-b border-slate-100 shrink-0">
            <div className="col-span-2">Deal ID / Req</div>
            <div>Parties</div>
            <div className="text-right">Stage</div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {dealRooms.map(room => {
              const isSelected = selectedRoom?.id === room.id;
              const isRevealed = room.identitiesRevealed;
              return (
                <div 
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className={`grid grid-cols-4 items-center px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50/50 relative' : 'hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />}
                  
                  <div className="col-span-2">
                    <div className="font-mono text-[11px] font-bold text-indigo-600 flex items-center">
                      {room.id}
                      {isRevealed ? <Eye size={10} className="ml-1 text-red-500" /> : <EyeOff size={10} className="ml-1 text-slate-400" />}
                    </div>
                    <div className="text-[11px] font-semibold truncate pr-2">{room.requirementId}</div>
                  </div>
                  
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {isRevealed ? "Google HQ" : room.client.substring(0, 6)} / {isRevealed ? "ABC Staff" : room.vendor}
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 uppercase whitespace-nowrap">
                      {room.status}
                    </span>
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
              <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs mr-3 border border-indigo-200">{selectedRoom.id}</span>
              {selectedRoom.identitiesRevealed ? (
                <span className="text-xs font-bold text-red-600 flex items-center">
                  <Eye size={14} className="mr-1" /> Identities Revealed by Admin
                </span>
              ) : (
                <span className="text-xs font-normal text-slate-500 flex items-center">
                  <Shield size={14} className="mr-1 text-slate-400" /> Identity Masking Active
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">REQ: {selectedRoom.requirementId}</span>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">CAND: {selectedRoom.candidate}</span>
              {!selectedRoom.identitiesRevealed && (
                <Button onClick={handleReveal} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 text-[10px] uppercase font-bold tracking-wider py-1 h-auto ml-2">
                  Reveal
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center text-[10px] uppercase tracking-wider font-bold text-slate-400 my-4 border-b border-slate-200 pb-2 flex items-center justify-center">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="px-3">Deal Room Created - Confidentiality Enforced</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>
            
            {messages.map(msg => {
              const isAI = msg.senderRole === "AI Copilot";
              const isMe = msg.senderRole === "Admin" || msg.senderRole === "System Admin";
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
                      {msg.senderRole} <span className="font-mono ml-1">({msg.senderId})</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg max-w-[85%] text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : isAI ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-tl-none font-medium' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                    {msg.type === 'document' ? (
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className={isMe ? "text-indigo-200" : "text-indigo-500"} />
                        <span className="font-semibold underline cursor-pointer">{msg.text}</span>
                      </div>
                    ) : msg.text}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex gap-2">
              <Button onClick={handleSendDocument} variant="outline" size="icon" className="border-slate-300 text-slate-500 hover:bg-slate-50 h-auto py-1.5 px-3">
                 <Paperclip size={14} />
              </Button>
              <input 
                type="text" 
                value={inputText}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                onChange={e => setInputText(e.target.value)}
                placeholder="Message this deal room securely..."
                className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
              />
              <Button onClick={handleSend} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 h-auto py-1.5 px-3">
                <Send size={14} className="mr-1.5" /> <span className="text-xs font-bold tracking-wider">SEND</span>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex-1 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center flex-col text-slate-400 shadow-sm">
          <Shield size={32} className="mb-2 opacity-50" />
          <p className="text-xs font-medium uppercase tracking-widest">Select a Deal Room</p>
        </section>
      )}
    </div>
  );
}
