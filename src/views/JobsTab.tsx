import { useEffect, useState } from "react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { Sparkles, FileText } from "lucide-react";

export default function JobsTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jdText, setJdText] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    fetch("/api/jobs").then(res => res.json()).then(setJobs);
  }, []);

  const handleParseJD = async () => {
    if (!jdText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText })
      });
      const newJob = await res.json();
      setJobs([newJob, ...jobs]);
      setJdText("");
    } catch (e) {
      console.error("Failed to parse JD", e);
    }
    setIsParsing(false);
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">AI Requirement Intake</h1>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Auto-parse JDs, extract skills, and match instantly.</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Paste Job Description</label>
        </div>
        <div className="p-3">
          <textarea 
            className="w-full h-24 p-2 border border-slate-300 rounded shadow-sm text-xs font-mono text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            placeholder="e.g. We are looking for a Senior React Developer with 5+ years of experience in Next.js, handling state natively..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={handleParseJD} disabled={isParsing || !jdText.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wider text-[10px] uppercase h-auto py-1.5 px-3">
              {isParsing ? (
                 <span className="flex items-center"><span className="animate-pulse mr-1">✦</span> Analyzing...</span>
              ) : (
                 <span className="flex items-center"><Sparkles size={12} className="mr-1" /> Generate Req</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 px-4 py-2 border-b border-slate-200 shrink-0">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Role & Client</div>
            <div className="col-span-4">Extracted Skills</div>
            <div className="col-span-2 text-right">Metrics</div>
            <div className="col-span-1 text-right">Actions</div>
        </div>
        
        {jobs.map((job) => (
          <div key={job.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors shadow-sm">
            <div className="col-span-1 font-mono text-[11px] font-bold text-indigo-600 flex items-center">
              <FileText size={12} className="mr-1 text-slate-400" /> {job.id.replace('REQ-', '')}
            </div>
            
            <div className="col-span-4 pr-4">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">{job.title}</h3>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${job.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {job.status}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-3">
                <span>Client: {job.clientId}</span>
                <span>Rate: {job.rate}</span>
              </div>
            </div>
            
            <div className="col-span-4 flex flex-wrap gap-1.5 h-full content-start">
              {job.skills.map((s: string) => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                  {s}
                </span>
              ))}
            </div>
            
            <div className="col-span-2 text-right">
              <div className="inline-flex flex-col items-end">
                <span className="text-lg font-mono font-bold text-slate-800 leading-none">{job.submissions}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Submissions</span>
              </div>
            </div>
            
            <div className="col-span-1 flex justify-end">
              <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-wider h-auto py-1.5 px-2 border-slate-300 text-slate-600 hover:bg-slate-100">
                Matches
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
