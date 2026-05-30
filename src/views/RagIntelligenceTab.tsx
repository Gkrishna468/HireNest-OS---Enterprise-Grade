import { useState } from "react";
import {
  Brain,
  Search,
  Database,
  Bot,
  FileText,
  Zap,
  ChevronRight,
  Activity,
  ArrowRight,
  ShieldCheck,
  Mail,
  Users,
  HardDrive,
  Layers,
  Server,
  Lock,
  Settings,
  Network,
  Clock,
  Briefcase,
  Share2,
  Cpu,
  Workflow,
} from "lucide-react";
import { Button } from "../lib/Button";

export default function RagIntelligenceTab() {
  const [activeView, setActiveView] = useState<
    | "copilot"
    | "ingestion"
    | "topology"
    | "memory"
    | "graph"
    | "temporal"
    | "agents"
  >("copilot");

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const simulateRAG = async () => {
    if (!query) return;
    setLoading(true);
    setResponse(null);

    // Simulate vector retrieval and generation latency
    setTimeout(() => {
      const isCompliance =
        query.toLowerCase().includes("nda") ||
        query.toLowerCase().includes("msa") ||
        query.toLowerCase().includes("compliance");
      const isMatching =
        query.toLowerCase().includes("react") ||
        query.toLowerCase().includes("node") ||
        query.toLowerCase().includes("fintech") ||
        query.toLowerCase().includes("candidate");
      const isWorkflow =
        query.toLowerCase().includes("delay") ||
        query.toLowerCase().includes("time");

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
            "Record: Node ONBOARDING (Status: PENDING)",
          ],
          sources: ["Governance RAG", "Firestore: onboarding_requests"],
          answer:
            "Based on the retrieved compliance documents and telemetry, Vendor WorkNexa has completed the NDA but their MSA is currently pending signature. Additionally, 2 independent recruiters have missing KYC documentation in their profiles.",
        };
      } else if (isMatching) {
        simulatedResponse = {
          chunks: [
            "Resume: Alex_Chen_React.pdf (Exp: 8 Yrs, Domain: Fintech)",
            "JD: Senior Frontend Architect - Banking Client (Skills: React, Node.js)",
            "Recruiter Note: 'Placed Alex 2 years ago, excellent feedback'.",
          ],
          sources: [
            "Candidate Intelligence RAG",
            "Qdrant: text-embedding-3-large",
          ],
          answer:
            "I found 3 highly relevant candidates for the Fintech React requirement. Top match is Alex Chen (8 years exp, 95% semantic match). Retrieving candidate pipeline data shows previous positive client feedback. (Hybrid Search: React + Fintech + 5+ Years = True)",
        };
      } else if (isWorkflow) {
        simulatedResponse = {
          chunks: [
            "Event: DEAL_ROOM_OPENED (Time: 14 days ago)",
            "Event: CLIENT_FEEDBACK_PENDING (Time: 10 days ago)",
            "Email Log: Chase Sent to Client (Repeated 2x)",
          ],
          sources: ["Workflow Intelligence RAG", "Execution Event Bus"],
          answer:
            "The requirement is delayed because it has been stuck in the Client Feedback stage for 10 days. Automated chase emails were sent 2 times without response. Recommendation: Escalate to Client Admin HQ.",
        };
      } else {
        simulatedResponse = {
          chunks: [
            "Platform Knowledge Base",
            "Historical Placements",
            "General Guidelines",
          ],
          sources: ["Recruiter Copilot RAG"],
          answer:
            "I've scanned the platform memory and policies. Please provide a more specific question regarding candidates, compliance, or workflows to retrieve grounded insights.",
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
            Knowledge Search Hub
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Enterprise Cognitive Retrieval Layer
          </p>
        </div>
      </div>

      <div className="px-8 pb-6">
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-xl w-fit border border-slate-200 flex-wrap overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveView("copilot")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "copilot" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Copilot Interface
          </button>
          <button
            onClick={() => setActiveView("ingestion")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "ingestion" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Ingestion Pipeline
          </button>
          <button
            onClick={() => setActiveView("topology")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "topology" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Vector Topology
          </button>
          <button
            onClick={() => setActiveView("memory")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "memory" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Routing & Memory
          </button>
          <div className="w-px h-6 bg-slate-300 self-center mx-1"></div>
          <button
            onClick={() => setActiveView("graph")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "graph" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Graph RAG
          </button>
          <button
            onClick={() => setActiveView("temporal")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "temporal" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Temporal RAG
          </button>
          <button
            onClick={() => setActiveView("agents")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === "agents" ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            Multi-Agent
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
        {activeView === "copilot" && (
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
                    placeholder="e.g., 'React candidates with fintech experience' or 'Vendors completed NDA but not MSA'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button
                    onClick={simulateRAG}
                    disabled={!query || loading}
                    className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs tracking-widest uppercase shadow-lg shadow-indigo-100"
                  >
                    {loading ? (
                      <Activity size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    {loading
                      ? "Executing Hybrid Retrieval..."
                      : "Execute Vector Retrieval"}
                  </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Suggested RAG Prompts
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        setQuery(
                          "Find best React candidate for fintech startup",
                        )
                      }
                      className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors"
                    >
                      "Find best React candidate for fintech"
                    </button>
                    <button
                      onClick={() =>
                        setQuery("Which vendors completed NDA but not MSA?")
                      }
                      className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors"
                    >
                      "Which vendors completed NDA but not MSA?"
                    </button>
                    <button
                      onClick={() =>
                        setQuery("Why is this requirement delayed?")
                      }
                      className="w-full text-left text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 px-4 py-2.5 rounded-lg border border-slate-100 transition-colors"
                    >
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
                      <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Candidates & Resumes
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          14,230 Vectors (Qdrant)
                        </div>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Job Descriptions & Skills
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          3,492 Vectors (Qdrant)
                        </div>
                      </div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                        <ShieldCheck size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          Compliance & Governance
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          1,104 Vectors (Qdrant)
                        </div>
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
                        <Database size={14} /> Retrieved Context (Hybrid Search
                        + Metadata)
                      </h3>
                      <div className="flex gap-2">
                        {response.sources.map((s: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono bg-white px-2 py-1 rounded text-slate-400 border border-slate-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {response.chunks.map((chunk: string, i: number) => (
                        <div
                          key={i}
                          className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3"
                        >
                          <div className="h-6 w-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Zap size={10} />
                          </div>
                          <p className="text-xs font-mono leading-relaxed text-slate-600">
                            {chunk}
                          </p>
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
                      <Bot size={14} /> Grounded AI Reranked Response
                    </h3>

                    <div className="text-sm font-semibold text-slate-800 leading-loose relative z-10">
                      {response.answer}
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Confidence: 94.2%
                      </span>
                      <Button
                        variant="outline"
                        className="h-8 text-[10px] font-black uppercase tracking-widest text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                      >
                        View Full Pipeline Trace <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <Database size={48} className="mb-6 opacity-20" />
                  <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">
                    Enterprise RAG Engine Standing By
                  </h3>
                  <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto mb-8">
                    Cognitive retrieval layer initialized. Multi-tenant vector
                    isolation is ACTIVE. AI Reranking engine is online.
                  </p>

                  <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <Users
                        size={20}
                        className="mx-auto text-indigo-400 mb-2"
                      />
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Candidate Intel
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <ShieldCheck
                        size={20}
                        className="mx-auto text-amber-400 mb-2"
                      />
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Governance RAG
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <Activity
                        size={20}
                        className="mx-auto text-emerald-400 mb-2"
                      />
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        Workflow Intel
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "ingestion" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl overflow-hidden relative">
              <h2 className="text-sm font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3">
                <Layers className="text-indigo-400" size={18} /> Chunking &
                Extraction Pipeline
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative z-10">
                {/* Phase 1 */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 relative">
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 text-slate-500 hidden lg:block">
                    <ArrowRight size={20} />
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-300 mb-4 border border-slate-700">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-white mb-2">
                    Multi-Format Ingestion
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-4">
                    PDF, DOCX, TXT via Unstructured.io
                  </p>
                  <div className="space-y-2">
                    <div className="bg-slate-950 px-3 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase text-indigo-400 border border-slate-800">
                      Resumes
                    </div>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase text-emerald-400 border border-slate-800">
                      JDs
                    </div>
                    <div className="bg-slate-950 px-3 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase text-amber-400 border border-slate-800">
                      Agreements
                    </div>
                  </div>
                </div>
                {/* Phase 2 */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 relative">
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 text-slate-500 hidden lg:block">
                    <ArrowRight size={20} />
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-300 mb-4 border border-slate-700">
                    2
                  </div>
                  <h3 className="text-xs font-bold text-white mb-2">
                    Semantic Chunking Engine
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-4">
                    Context-aware splitting
                  </p>
                  <div className="space-y-2">
                    <div className="bg-slate-700/50 px-3 py-2 rounded flex justify-between items-center text-[10px] text-slate-300 font-mono">
                      <span>[Skills Block]</span>{" "}
                      <span className="text-slate-500">240 T</span>
                    </div>
                    <div className="bg-slate-700/50 px-3 py-2 rounded flex justify-between items-center text-[10px] text-slate-300 font-mono">
                      <span>[Experience Block]</span>{" "}
                      <span className="text-slate-500">410 T</span>
                    </div>
                    <div className="bg-slate-700/50 px-3 py-2 rounded flex justify-between items-center text-[10px] text-slate-300 font-mono">
                      <span>[Compliance Clause]</span>{" "}
                      <span className="text-slate-500">120 T</span>
                    </div>
                  </div>
                </div>
                {/* Phase 3 */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 relative">
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-20 text-slate-500 hidden lg:block">
                    <ArrowRight size={20} />
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-300 mb-4 border border-slate-700">
                    3
                  </div>
                  <h3 className="text-xs font-bold text-white mb-2">
                    OpenAI Embeddings
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-4">
                    text-embedding-3-small/large
                  </p>
                  <div className="h-20 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800">
                    <div className="w-full px-4 flex gap-1 justify-center opacity-50">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="h-6 w-1.5 bg-indigo-500 rounded-sm"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Phase 4 */}
                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-900">
                    4
                  </div>
                  <h3 className="text-xs font-bold text-white mb-2">
                    Vector Storage
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-4">
                    Push to Distributed Index
                  </p>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-center h-20">
                    <HardDrive className="text-indigo-400" size={32} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "topology" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vector Db Architecture */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                <Server className="text-indigo-600" size={18} /> Qdrant Vector
                Topology
              </h2>

              <div className="space-y-6">
                <div className="p-4 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30">
                  <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">
                    Collection: hirenest_production
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500">
                    Dimensions: 1536 (text-embedding-3-small)
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Distance: Cosine Similarity
                  </p>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
                    Payload / Metadata Schema (Critical for Hybrid Search)
                  </h4>
                  <div className="bg-slate-900 rounded-xl p-4 overflow-hidden relative">
                    <div className="absolute right-2 top-2">
                      <ShieldCheck
                        className="text-emerald-400 opacity-50"
                        size={40}
                      />
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed relative z-10">
                      {`{
  "tenantId": "ORG-g07xkgc80",
  "nodeType": "client", // or vendor, recruiter
  "documentType": "resume",
  "entityId": "CAND-9a7x2",
  "timestamp": "2026-05-26T08:00:00Z",
  "visibility": "tenant-scoped" // CRITICAL
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Tenant Security Rules */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                <Lock className="text-amber-500" size={18} /> Multi-Tenant
                Vector Isolation
              </h2>

              <div className="space-y-6">
                <p className="text-sm font-semibold text-slate-600">
                  Enterprise AI dictates that vector retrieval must rigidly
                  enforce tenant boundaries. Vectors are filtered contextually
                  before returning to the LLM context window.
                </p>

                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-4">
                    <div className="bg-amber-100 text-amber-700 p-2 rounded-lg shrink-0">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Strict Tenant Scoping
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        Filter condition:{" "}
                        <code className="bg-slate-200 px-1 rounded text-slate-800">
                          metadata.tenantId == req.auth.tenantId
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg shrink-0">
                      <Database size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Requirement-Scoped Context
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        RAG must retrieve candidates relevant ONLY to selected
                        JD, not global pool.{" "}
                        <code className="bg-slate-200 px-1 rounded text-slate-800">
                          metadata.linked_reqs INCLUDES target_req
                        </code>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-4">
                    <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg shrink-0">
                      <Settings size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Federated Network Queries
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        If HQ runs a match, vectors are searched globally across
                        verified vendor sub-tenants conditionally.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "memory" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Reranking Engine */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                <Brain className="text-indigo-600" size={18} /> Deep Reranking
                Layer
              </h2>

              <p className="text-sm font-semibold text-slate-600 mb-6">
                Semantic vector searches cast a wide net. The Reranker refines
                the top-K results securely via exact business logic and metadata
                scoring before context inclusion.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="text-lg font-black text-indigo-600">
                      k=50
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      1. Vector Retrieval
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500">
                      Initial wide semantic query (Cosine similarity)
                    </p>
                  </div>
                </div>

                <div className="pl-8 border-l-2 border-indigo-100 py-1 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>{" "}
                    Apply Hybrid Metadata Filters
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{" "}
                    Execute LLM Contextual Scoring (Cohere/BGE)
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>{" "}
                    Hard-filter by Availability & Compensation
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-lg font-black text-white">k=5</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      2. Highly Grounded Context
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500">
                      Injected into LLM for final extraction & generation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cognitive Memory Infrastructure */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Brain size={250} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-3 relative z-10">
                <Activity className="text-emerald-400" size={18} /> Cognitive
                Memory Network
              </h2>

              <p className="text-sm font-semibold text-slate-400 mb-8 relative z-10">
                We don't just store documents; we store operational memory.
                Future telemetry is embedded directly back into the RAG
                environment to create an evolving intelligence loop.
              </p>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">
                    Recruiter Context
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Notes, sentiment, and manual curation tags embedded into
                    candidate profiles.
                  </p>
                </div>
                <div className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">
                    Outcome Memory
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Previous deal room successes/failures adjust future vector
                    weighting.
                  </p>
                </div>
                <div className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">
                    Client Preferences
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    Implicit biases learned from "Reject" actions on client
                    dashboards.
                  </p>
                </div>
                <div className="bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">
                    Event Telemetry
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">
                    SLA breaches and system events are mapped to predict
                    workflow bottlenecks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "graph" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                <Network className="text-indigo-600" size={18} /> Graph
                Retrieval Topology
              </h2>
              <p className="text-sm font-semibold text-slate-600 mb-6">
                Instead of simple vector proximity, we construct connection
                graphs to enable referral inferences, relationship trust
                scoring, and hidden skill adjacencies.
              </p>

              <div className="relative bg-slate-900 rounded-2xl p-6 border border-slate-800 overflow-hidden flex items-center justify-center min-h-[300px]">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>
                <Network size={150} className="text-indigo-500/20 absolute" />

                <div className="relative z-10 w-full max-w-md">
                  <div className="flex justify-between items-center mb-8">
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-center shadow-lg">
                      <Briefcase
                        size={14}
                        className="text-emerald-400 mx-auto mb-1"
                      />
                      <div className="text-[9px] font-black uppercase text-slate-300">
                        Requirement
                      </div>
                    </div>
                    <div className="bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 rounded-xl text-center shadow-lg transform -translate-y-4">
                      <Users
                        size={14}
                        className="text-indigo-400 mx-auto mb-1"
                      />
                      <div className="text-[9px] font-black uppercase text-indigo-300">
                        Candidate
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-12">
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-center shadow-lg">
                      <Share2
                        size={14}
                        className="text-amber-400 mx-auto mb-1"
                      />
                      <div className="text-[9px] font-black uppercase text-slate-300">
                        Vendor
                      </div>
                    </div>
                    <div className="border border-slate-600 border-dashed rounded-full p-2 bg-slate-800/50">
                      <Brain size={16} className="text-slate-400" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-center shadow-lg">
                      <Activity
                        size={14}
                        className="text-blue-400 mx-auto mb-1"
                      />
                      <div className="text-[9px] font-black uppercase text-slate-300">
                        Recruiter
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 border-2 border-dashed border-slate-200">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">
                Intelligence Outcomes
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                  <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Referral Inference
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      If Vendor A submits a high-quality candidate, candidates
                      in Vendor A's extended network gain implicit trust scores.
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg shrink-0">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Hidden Skill Adjacency
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      Maps tech stacks not by exact keyword match, but by
                      organizational co-occurrence (e.g. AWS + Terraform
                      networks).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "temporal" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100 lg:col-span-2">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-3">
                <Clock className="text-amber-500" size={18} /> Temporal RAG &
                Event Memory
              </h2>
              <p className="text-sm font-semibold text-slate-600 mb-6 max-w-3xl">
                Every workflow action is a retrievable intelligence point. By
                pairing semantic retrieval with temporal windows, we unlock
                operational awareness and predictive modeling.
              </p>

              <div className="flex gap-4 mb-8 overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[250px] bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg text-white">
                  <div className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex justify-between items-center mb-3">
                    Event-Sourced
                    <Clock size={12} />
                  </div>
                  <div className="space-y-3 font-mono text-[9px] text-slate-400">
                    <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-300">
                      » candidate submitted
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-300">
                      » interview delayed
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-300">
                      » vendor inactive
                    </div>
                    <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-300">
                      » offer accepted
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-slate-300 px-4">
                  <ArrowRight size={24} />
                </div>

                <div className="min-w-[300px] flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-indigo-100/50">
                  <div className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex justify-between items-center mb-3">
                    Time-Aware Reasoning Query
                    <Bot size={12} />
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs font-semibold text-indigo-900 mb-4">
                    "Which recruiters consistently delivered fast Java
                    placements over the last 90 days?"
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 pb-2">
                      <span>Recruiter</span>
                      <span>Avg Velocity (90d)</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 pt-1">
                      <span>Sarah Jenkins</span>
                      <span className="text-emerald-600">8.4 days</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                      <span>Michael Chen</span>
                      <span className="text-emerald-600">11.2 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "agents" && (
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Cpu size={250} />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-3 relative z-10">
              <Workflow className="text-emerald-400" size={18} /> Multi-Agent
              Orchestration
            </h2>
            <p className="text-sm font-semibold text-slate-400 mb-8 max-w-3xl relative z-10">
              A category-defining enterprise OS employs autonomous agents. Each
              agent possesses a specific operational mandate and is granted
              scoped RAG access to execute specialized reasoning.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
              <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-5 hover:border-emerald-500/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Bot size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">
                  Recruiter Agent
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 line-clamp-3">
                  Scans candidate pipelines independently. Accesses specialized
                  JD/Resume semantic indices.
                </p>
                <div className="text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 inline-block px-2 py-1 rounded">
                  Candidate RAG Scope
                </div>
              </div>

              <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-5 hover:border-blue-500/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <Activity size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">
                  Operations Agent
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 line-clamp-3">
                  Monitors telemetry events. Identifies bottlenecks in deal
                  rooms based on historical SLA times.
                </p>
                <div className="text-[9px] font-bold uppercase text-blue-500 bg-blue-500/10 inline-block px-2 py-1 rounded">
                  Temporal RAG Scope
                </div>
              </div>

              <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-5 hover:border-amber-500/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">
                  Compliance Agent
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 line-clamp-3">
                  Validates onboarding documents against master NDAs and MSAs.
                  Triggers automated remediations.
                </p>
                <div className="text-[9px] font-bold uppercase text-amber-500 bg-amber-500/10 inline-block px-2 py-1 rounded">
                  Governance RAG Scope
                </div>
              </div>

              <div className="bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 p-5 hover:border-purple-500/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Network size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">
                  Vendor Intel Agent
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mb-4 line-clamp-3">
                  Evaluates relationship trust graphs. Determines the optimal
                  vendor routing for new requirements.
                </p>
                <div className="text-[9px] font-bold uppercase text-purple-500 bg-purple-500/10 inline-block px-2 py-1 rounded">
                  Graph RAG Scope
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
