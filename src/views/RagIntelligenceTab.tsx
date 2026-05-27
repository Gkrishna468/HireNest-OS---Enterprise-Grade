import { useState } from "react";
import { Brain, Search, Database, Bot, FileText, Zap, ChevronRight, Activity, ArrowRight, ShieldCheck, Mail, Users } from "lucide-react";
import { Button } from "../lib/Button";

export default function RagIntelligenceTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const simulateRAG = async () => {
    if (!query) return;
    setLoading(true);
    setResponse(null);

    // Simulate vector retrieval and generation latency
    setTimeout(() => {
       const isCompliance = query.toLowerCase().includes("nda") || query.toLowerCase().includes("msa") || query.toLowerCase().includes("compliance");
       const isMatching = query.toLowerCase().includes("react") || query.toLowerCase().includes("node") || query.toLowerCase().includes("fintech") || query.toLowerCase().includes("candidate");
       const isWorkflow = query.toLowerCase().includes("delay") || query.toLowerCase().includes("time");

       let simulatedResponse = {
           chunks: [] as string[],
           sources: [] as string[],
           answer: "",
       };

       if (isCompliance) {
          simulatedResponse = {
              chunks: [
                  "File: NDA_Vendor_WorkNexa.pdf (Conf: 94%)",
                  "File: MSA_Signed_GlobalHQ.pdf (Conf: 88%)",
                  "Record: Node ONBOARDING (Status: PENDING)"
              ],
              sources: ["Governance RAG", "Firestore: onboarding_requests"],
              answer: "Based on the retrieved compliance documents and telemetry, Vendor WorkNexa has completed the NDA but their MSA is currently pending signature. Additionally, 2 independent recruiters have missing KYC documentation in their profiles."
          };
       } else if (isMatching) {
          simulatedResponse = {
              chunks: [
                  "Resume: Alex_Chen_React.pdf (Exp: 8 Yrs, Domain: Fintech)",
                  "JD: Senior Frontend Architect - Banking Client (Skills: React, Node.js)",
                  "Recruiter Note: 'Placed Alex 2 years ago, excellent feedback'."
              ],
              sources: ["Candidate Intelligence RAG", "Pinecone: text-embedding-3-small"],
              answer: "I found 3 highly relevant candidates for the Fintech React requirement. Top match is Alex Chen (8 years exp, 95% semantic match). Retrieve candidate pipeline data shows previous positive client feedback."
          };
       } else if (isWorkflow) {
          simulatedResponse = {
              chunks: [
                  "Event: DEAL_ROOM_OPENED (Time: 14 days ago)",
                  "Event: CLIENT_FEEDBACK_PENDING (Time: 10 days ago)",
                  "Email Log: Chase Sent to Client (Repeated 2x)"
              ],
              sources: ["Workflow Intelligence RAG", "Execution Event Bus"],
              answer: "The requirement is delayed because it has been stuck in the Client Feedback stage for 10 days. Automated chase emails were sent 2 times without response. Recommendation: Escalate to Client Admin HQ."
          };
       } else {
          simulatedResponse = {
              chunks: [
                  "Platform Knowledge Base",
                  "Historical Placements",
                  "General Guidelines"
              ],
              sources: ["Recruiter Copilot RAG"],
              answer: "I've scanned the platform memory and policies. Please provide a more specific question regarding candidates, compliance, or workflows to retrieve grounded insights."
          };
       }
       setResponse(simulatedResponse);
       setLoading(false);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
      <div className="p-8 pb-4 flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Brain className="text-indigo-600" size={32} /> 
              RAG Intelligence Hub
           </h1>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Retrieval-Augmented Generation</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
        <div className="grid grid-cols-12 gap-8">
            
            {/* Control Column */}
            <div className="col-span-12 xl:col-span-4 space-y-6">
                
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-100">
                    <h2 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2 mb-6">
                        <Bot size={14} /> Recruiter Copilot Query
                    </h2>

                    <div className="space-y-4">
                        <textarea
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 transition-colors resize-none h-32"
                          placeholder="e.g., 'Who are my best available React candidates with fintech experience?' or 'Which vendors completed NDA but not MSA?'"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <Button 
                            onClick={simulateRAG} 
                            disabled={!query || loading}
                            className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs tracking-widest uppercase shadow-lg shadow-indigo-100"
                        >
                            {loading ? <Activity size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? "Running Semantic Search..." : "Execute Vector Retrieval"}
                        </Button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Suggested RAG Prompts</h3>
                        <div className="space-y-2">
                            <button onClick={() => setQuery("Find best React candidate for fintech startup")} className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors">
                                "Find best React candidate for fintech"
                            </button>
                            <button onClick={() => setQuery("Which vendors completed NDA but not MSA?")} className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors">
                                "Which vendors completed NDA but not MSA?"
                            </button>
                            <button onClick={() => setQuery("Why is this requirement delayed?")} className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors">
                                "Why is this requirement delayed?"
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-2xl">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-6">
                        <Database size={14} /> Active Vector Embeddings
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400"><FileText size={14}/></div>
                                <div>
                                    <div className="text-xs font-bold text-white">Candidates & Resumes</div>
                                    <div className="text-[9px] font-mono text-slate-500">14,230 Vectors</div>
                                </div>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400"><FileText size={14}/></div>
                                <div>
                                    <div className="text-xs font-bold text-white">Job Descriptions & Skills</div>
                                    <div className="text-[9px] font-mono text-slate-500">3,492 Vectors</div>
                                </div>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400"><ShieldCheck size={14}/></div>
                                <div>
                                    <div className="text-xs font-bold text-white">Compliance & Governance</div>
                                    <div className="text-[9px] font-mono text-slate-500">1,104 Vectors</div>
                                </div>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Results Column */}
            <div className="col-span-12 xl:col-span-8">
                {response ? (
                    <div className="flex flex-col gap-6 h-full">
                        
                        {/* The Retrieved Context */}
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2">
                                    <Database size={14} /> Retrieved Context (k=3)
                                </h3>
                                <div className="flex gap-2">
                                    {response.sources.map((s:string, i:number) => (
                                       <span key={i} className="text-[9px] font-mono bg-white px-2 py-1 rounded text-slate-400 border border-slate-100">{s}</span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {response.chunks.map((chunk: string, i:number) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
                                        <div className="h-6 w-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"><Zap size={10}/></div>
                                        <p className="text-xs font-mono leading-relaxed text-slate-600">{chunk}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LLM Reasoning Output */}
                        <div className="bg-white border-2 border-indigo-100 rounded-3xl p-8 shadow-xl flex-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Brain size={120} />
                            </div>

                            <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2 mb-6 relative z-10">
                                <Brain size={14} /> Grounded AI Response
                            </h3>

                            <div className="text-sm font-semibold text-slate-800 leading-loose relative z-10">
                                {response.answer}
                            </div>
                            
                            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confidence: 94.2%</span>
                                <Button variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                                    View Full Pipeline Trace <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
                        <Database size={48} className="mb-6 opacity-20" />
                        <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Enterprise RAG Engine Standing By</h3>
                        <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto mb-8">
                            A retrieval-augmented generation architecture. Ask natural language questions to semantically search resumes, JDs, compliance docs, and operational telemetry.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                <Users size={20} className="mx-auto text-indigo-400 mb-2" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Candidate Intel</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                <ShieldCheck size={20} className="mx-auto text-amber-400 mb-2" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Governance RAG</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                <Activity size={20} className="mx-auto text-emerald-400 mb-2" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Workflow Intel</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}
