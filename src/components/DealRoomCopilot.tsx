import React, { useState } from 'react';
import { Bot, Sparkles, Send } from 'lucide-react';
import { Button } from '../lib/Button';

export function DealRoomCopilot({ room }: { room: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCopilotQuery = async (aiQuery: string) => {
        setIsLoading(true);
        setQuery(aiQuery);
        setResponse("");
        
        try {
            const res = await fetch('/api/deal-intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    profile: room.candidateName || "Candidate",
                    job: room.jobTitle || "Role", 
                    stage: room.currentStage || "Review",
                    query: aiQuery 
                })
            });
            const data = await res.json();
            setResponse(data.summary || "AI Copilot analysis completed regarding the deal constraints.");
        } catch(error) {
            setResponse("Copilot reasoning engine encountered an anomaly.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <div className="p-4 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between">
               <div className="flex items-center gap-2 text-indigo-800">
                  <Bot size={16} /> 
                  <span className="text-[11px] font-bold uppercase tracking-widest">Deal Room Copilot Offline</span>
               </div>
               <Button onClick={() => setIsOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest">
                  Activate AI
               </Button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-indigo-50 border-t border-indigo-100 flex flex-col gap-3 shrink-0 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-800">
                   <Sparkles size={16} className="text-indigo-600" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-indigo-900">Active Copilot Session</span>
                </div>
                <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                   Minimize
                </Button>
            </div>

            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 custom-scrollbar">
                {["Summarize Candidate", "Why is it delayed?", "Compare Resume vs JD", "Generate Next Steps", "Deal Health Score"].map(q => (
                    <button 
                       key={q} 
                       onClick={() => handleCopilotQuery(q)}
                       className="whitespace-nowrap px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {response && (
                <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-slate-700 leading-relaxed max-h-[150px] overflow-y-auto">
                   <div className="text-[10px] font-bold uppercase text-indigo-600 mb-1 border-b border-indigo-50 pb-1 flex items-center justify-between">
                      <span>Response to: {query}</span>
                   </div>
                   <div className="whitespace-pre-wrap">{response}</div>
                </div>
            )}

            {isLoading && (
               <div className="text-[10px] uppercase text-indigo-500 font-bold animate-pulse flex items-center gap-2">
                   <Bot size={12} /> Synthesizing intelligence...
               </div>
            )}
        </div>
    );
}
