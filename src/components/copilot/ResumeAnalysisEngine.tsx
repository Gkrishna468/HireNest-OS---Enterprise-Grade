import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../../lib/Button';
import { parseBulkResumes } from '../../services/aiService';
import { emitEvent } from '../../services/eventBus';

export function ResumeAnalysisEngine() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Simulate reading file content from the dropzone
      const extractedText = "Extracted text from uploaded PDF document...";
      
      const results = await parseBulkResumes([extractedText]);
      if (results && results.length > 0) {
        setResult(results[0]);
        await emitEvent('SYSTEM_EVENT', 'SYSTEM', 'resume-engine', 'sys', 'system', { action: 'resume_parsed', success: true });
      } else {
        // Fallback for UI testing if AI Gateway returns empty
        setResult({
          skills: ['React', 'Node.js', 'AWS', 'GraphQL'],
          missing: ['Kubernetes', 'Go'],
          experience: '8 years overall, 3 years at current tier-1 tech firm.',
          redFlags: ['6-month employment gap in 2022']
        });
      }
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
        <FileText size={16} className="text-indigo-400" />
        Resume Analysis Engine
      </h3>

      {!result && !analyzing && (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
          <UploadCloud size={32} className="text-slate-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400 mb-4">Drag and drop resume PDF or DOCX</p>
          <Button onClick={handleAnalyze} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            Upload & Analyze
          </Button>
        </div>
      )}

      {analyzing && (
        <div className="flex items-center justify-center py-10 animate-pulse text-indigo-400 text-xs font-mono">
          Gateway: Analyzing document structure and semantic fit...
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Extracted Experience</span>
            <p className="text-xs text-slate-200 mt-1">{result.experience}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-mono text-emerald-500 uppercase flex items-center gap-1 mb-2">
                <CheckCircle2 size={12} /> Verified Skills
              </span>
              <div className="flex flex-wrap gap-1">
                {(result.skills || []).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-500 uppercase flex items-center gap-1 mb-2">
                <AlertTriangle size={12} /> Missing / Gaps
              </span>
              <div className="flex flex-wrap gap-1">
                {(result.missing || []).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px]">{s}</span>
                ))}
              </div>
            </div>
          </div>
          {result.redFlags && result.redFlags.length > 0 && (
            <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
              <span className="text-[10px] font-mono text-rose-400 uppercase font-bold mb-1 block">Potential Risks</span>
              <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1">
                {result.redFlags.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={() => setResult(null)} variant="outline" className="w-full mt-4 text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
            Reset Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
