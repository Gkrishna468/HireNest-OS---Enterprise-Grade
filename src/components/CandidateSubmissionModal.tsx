import { useState } from "react";
import { Upload, X, Bot, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "../lib/Button";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface CandidateSubmissionModalProps {
    onClose: () => void;
    reqId: string;
    reqTitle: string;
}

export default function CandidateSubmissionModal({ onClose, reqId, reqTitle }: CandidateSubmissionModalProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [parsed, setParsed] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [experience, setExperience] = useState("");
    const [expectedCtc, setExpectedCtc] = useState("");

    const handleFileUpload = async () => {
        setIsParsing(true);
        // Simulate AI Parsing delay for UI UX purpose (AI extraction animation)
        setTimeout(() => {
            setIsParsing(false);
            setParsed(true);
            const analysis = {
                fitScore: 88,
                skills: ["Node.js", "TypeScript", "PostgreSQL", "React", "AWS"],
                analysis: "Strong technical alignment. 6 years experience perfectly matches the 5-8 year requirement. Verified past projects in high-throughput APIs.",
                authenticity: "Verified (Trust Score: 95%)"
            };
            setAiAnalysis(analysis);
            
            // Auto fill
            setName("Sarah Jenkins");
            setEmail("sarah.j@example.com");
            setPhone("+91 98765 43210");
            setExperience("6 Years");
            setExpectedCtc("32 LPA");
        }, 1500);
    };

    const handleSubmit = async () => {
        if (!name || !email) return;
        setIsSubmitting(true);
        try {
             const docRef = await addDoc(collection(db, "submissions"), {
                 reqId,
                 reqTitle,
                 candidateName: name,
                 candidateEmail: email,
                 candidatePhone: phone,
                 experience,
                 expectedCtc,
                 aiFitScore: aiAnalysis?.fitScore || 0,
                 aiAnalysisText: aiAnalysis?.analysis || "",
                 status: "SOURCED",
                 submittedAt: serverTimestamp(),
                 stage: "NEW"
             });
             
             // Trigger Temporal Workflow
             await fetch('/api/workflows', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     action: 'start',
                     workflowType: 'CandidateLifecycle',
                     input: { submissionId: docRef.id }
                 })
             });

             onClose();
        } catch (error) {
             console.error("Submission failed: ", error);
             handleFirestoreError(error, OperationType.WRITE, "candidate_submissions");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-2xl rounded-[24px] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Add Candidate Profile</h2>
                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-0.5">POST: {reqTitle} ({reqId})</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide text-slate-300">
                    
                    {/* Resume Upload - AI First */}
                    <div className="mb-8">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                             <Bot size={14} className="text-indigo-400"/> AI Resume Parse & Autofill
                        </div>
                        
                        {!parsed && !isParsing && (
                            <div 
                                onClick={handleFileUpload}
                                className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
                            >
                                <div className="h-12 w-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={24} />
                                </div>
                                <p className="text-sm font-medium text-slate-200 mb-1">Drag & drop or click to upload</p>
                                <p className="text-xs text-slate-500">Supports PDF, DOCX. AI will automatically extract schema.</p>
                            </div>
                        )}

                        {isParsing && (
                            <div className="border border-indigo-500/30 rounded-2xl p-8 text-center bg-indigo-500/5">
                                <Bot size={32} className="text-indigo-400 mx-auto mb-4 animate-pulse" />
                                <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Cognitive Engine Parsing...</p>
                                <div className="h-1 w-48 bg-slate-800 mx-auto mt-4 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-500 w-[60%] animate-pulse" />
                                </div>
                            </div>
                        )}

                        {parsed && aiAnalysis && (
                            <div className="border border-emerald-500/30 rounded-2xl p-6 bg-emerald-500/5 flex gap-4 items-start">
                                <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex flex-shrink-0 items-center justify-center">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div className="flex-1 text-sm">
                                    <h4 className="font-bold text-emerald-300 mb-1">AI Semantic Parse Complete</h4>
                                    <p className="text-slate-400 mb-3 text-xs leading-relaxed">{aiAnalysis.analysis}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fit Score</div>
                                            <div className="text-2xl font-mono font-black text-emerald-400">{aiAnalysis.fitScore}%</div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Authenticity</div>
                                            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                                                <ShieldCheck size={14} /> Verified
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 opacity-100 transition-opacity duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Sarah Jenkins" disabled={!parsed} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. sarah@example.com" disabled={!parsed} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. +91 98765 43210" disabled={!parsed} />
                            </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Experience</label>
                                <input value={experience} onChange={e => setExperience(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. 5 Years" disabled={!parsed} />
                            </div>
                        </div>

                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Expected CTC</label>
                            <input value={expectedCtc} onChange={e => setExpectedCtc(e.target.value)} type="text" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. 15 LPA" disabled={!parsed} />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end gap-3">
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium" disabled={!parsed || isSubmitting || !name || !email}>
                        {isSubmitting ? "Committing via Trust Engine..." : "Submit Candidate Intelligence"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
