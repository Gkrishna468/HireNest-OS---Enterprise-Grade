import React, { useState } from 'react';
import { Mail, MessageSquare, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '../../lib/Button';
import { cn } from '../../lib/utils';
import { queryAIGateway } from '../../services/aiService';
import { emitEvent } from '../../services/eventBus';

export function CopilotActionDrawer({ candidateId = "default-cand" }) {
  const [activeTab, setActiveTab] = useState<'interview' | 'email' | 'salary'>('email');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const generateContent = async () => {
    setGenerating(true);
    try {
      const response = await queryAIGateway(
        `Generate ${activeTab} for candidate ${candidateId}`, 
        activeTab === 'email' ? 'email-draft' : activeTab === 'interview' ? 'interview-prep' : 'salary-benchmark'
      );
      
      if (response && response.result) {
        setOutput(response.result);
        await emitEvent('AI_ACTION_GENERATED', 'SYSTEM', candidateId, 'sys', 'recruiter', { actionType: activeTab });
      } else {
        // Fallback for UI if server is unreachable
        setOutput(`[AI Gateway response for ${activeTab}]`);
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      setOutput("Error connecting to AI Gateway.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden h-96">
      <div className="flex border-b border-slate-800 bg-slate-950">
        <button 
          onClick={() => { setActiveTab('email'); setOutput(null); }}
          className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors", activeTab === 'email' ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-slate-500 hover:text-slate-300")}
        >
          <Mail size={14} /> Draft Email
        </button>
        <button 
          onClick={() => { setActiveTab('interview'); setOutput(null); }}
          className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors", activeTab === 'interview' ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-slate-500 hover:text-slate-300")}
        >
          <MessageSquare size={14} /> Prep Sheet
        </button>
        <button 
          onClick={() => { setActiveTab('salary'); setOutput(null); }}
          className={cn("flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors", activeTab === 'salary' ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5" : "text-slate-500 hover:text-slate-300")}
        >
          <DollarSign size={14} /> Benchmark
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col bg-slate-900">
        {!output && !generating && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-slate-400 mb-4 max-w-[250px] leading-relaxed">
              {activeTab === 'email' && "AI will draft a personalized follow-up email based on the candidate's current stage."}
              {activeTab === 'interview' && "Generate a custom interview preparation sheet for the hiring manager highlighting risks."}
              {activeTab === 'salary' && "Fetch live market data to benchmark the candidate's salary expectations against active peers."}
            </p>
            <Button onClick={generateContent} className="bg-indigo-600 hover:bg-indigo-700 text-xs shadow-lg shadow-indigo-500/20">
              Generate Draft
            </Button>
          </div>
        )}

        {generating && (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-indigo-400 animate-pulse">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-xs font-mono">Gateway: Synthesizing intelligence...</span>
          </div>
        )}

        {output && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <textarea 
              readOnly
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 font-mono resize-none focus:outline-none mb-4 leading-relaxed"
              value={output}
            />
            <div className="flex gap-3 mt-auto shrink-0">
              <Button onClick={() => navigator.clipboard.writeText(output)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs text-white">
                Copy to Clipboard
              </Button>
              <Button onClick={() => setOutput(null)} variant="outline" className="flex-1 text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
