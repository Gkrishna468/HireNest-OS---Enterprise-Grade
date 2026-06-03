const fs = require('fs');

let lines = fs.readFileSync('src/views/CandidatesTab.tsx', 'utf8').split('\n');

let startIndex = -1;
let endIndex = -1;

for(let i=0; i<lines.length; i++) {
   if (lines[i] === '  return (') {
       startIndex = i;
   }
   if (lines[i] === '}' && Object.is(startIndex, -1) === false) {
       endIndex = i; // keep going until the last brace
   }
}

if (startIndex !== -1) {
   lines.splice(startIndex, endIndex - startIndex + 1);
}

const UI = `  return (
    <div className="flex bg-slate-50 relative min-h-screen">
      <div className="p-8 pb-32 flex-1 max-w-7xl mx-auto w-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Candidates</h1>
            <p className="text-slate-500 mt-1">Manage, enrich, and map your candidate bench securely.</p>
          </div>
          
          {!isClient && (
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search..." className="border rounded-md px-3 py-2 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="w-4 h-4 mr-2" /> Bulk Upload
              </Button>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Candidate
              </Button>
            </div>
          )}
        </div>

        {isClient ? (
          <ClientCandidatePipeline
            jobs={jobs}
            vendorMap={vendorMap}
            globalSubmissions={globalSubmissions}
            userRole={userRole}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {candidates
              .filter(
                (c) =>
                  !searchQuery ||
                  c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.skills && c.skills.join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((candidate) => (
                <div
                  key={candidate.id}
                  className="bg-white rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-200 p-5 flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shadow-inner">
                      {(candidate.fullName || candidate.name || "U")[0]}
                    </div>
                    <Badge variant={candidate.status === "ACTIVE" ? "success" : "default"}>
                      {candidate.status || "NEW"}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                    {candidate.fullName || candidate.name || "Unknown"}
                    {candidate.email && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </h3>
                  
                  <p className="text-sm text-slate-500 truncate mb-4">
                    {candidate.email || "No email provided"}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1.5">
                      {getSkillsArray(candidate.skills)
                        .slice(0, 3)
                        .map((skill: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                            {skill}
                          </Badge>
                        ))}
                      {getSkillsArray(candidate.skills).length > 3 && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">
                          +{getSkillsArray(candidate.skills).length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {candidates.length === 0 && (
              <div className="col-span-full py-12">
                <EmptyState
                  title="No Candidates Found"
                  description="Your bench is currently empty or no candidates match your search."
                />
              </div>
            )}
          </div>
        )}

        {/* Selected Candidate Modal */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCandidate(null)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
                        {(selectedCandidate.fullName || selectedCandidate.name || "U")[0]}
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{selectedCandidate.fullName || selectedCandidate.name || "Unknown"}</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                           <MapPin className="w-4 h-4" />
                           {selectedCandidate.location || "Remote"}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     {isAdmin && (
                        <Button variant="outline" onClick={() => handleDeleteCandidate(selectedCandidate.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                     )}
                     <button onClick={() => setSelectedCandidate(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                        <X className="w-5 h-5" />
                     </button>
                  </div>
               </div>
               
               <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-500" /> AI Resume Knowledge</h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedCandidate.resumeText || "No context available. Requires enrichment."}</p>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Contact Info</h3>
                         <div className="space-y-3 text-sm">
                            <p className="text-slate-600"><span className="font-medium text-slate-900">Email:</span> {selectedCandidate.email || "N/A"}</p>
                            <p className="text-slate-600"><span className="font-medium text-slate-900">Phone:</span> {selectedCandidate.phone || "N/A"}</p>
                         </div>
                     </div>
                     
                     <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="font-semibold text-indigo-900 mb-2">Automated Execution</h3>
                        <p className="text-sm text-indigo-700/80 mb-4">Map this candidate to an open requirement and instantiate a Deal Room via the Orchestrator.</p>
                        <select className="w-full text-sm rounded-md border-indigo-200 py-2.5 px-3 mb-3 bg-white" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
                           <option value="">Select Requirement...</option>
                           {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.company})</option>)}
                        </select>
                        <Button 
                           variant="primary" 
                           className="w-full bg-indigo-600 hover:bg-indigo-700" 
                           onClick={() => handleMapToJob(selectedJobId)}
                           disabled={isMapping || !selectedJobId}
                        >
                           {isMapping ? "Analyzing Fit..." : "Map & Match Candidate"}
                        </Button>
                        
                        {mappingResult && (
                           <div className="mt-4 pt-4 border-t border-indigo-200/60 animate-in fade-in">
                              <div className="flex items-center justify-between mb-3 text-sm">
                                 <span className="font-medium text-indigo-900">Fit Score</span>
                                 <span className="font-bold text-indigo-700">{mappingResult.matchScore}%</span>
                              </div>
                              <Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={finalizeDeal}>
                                 Process Submission & Open Deal
                              </Button>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddForm && (
          <CandidateSubmissionModal
            onClose={() => setShowAddForm(false)}
            reqId="GENERAL"
            reqTitle="General Pool"
          />
        )}
        
        {/* Bulk Upload logic */}
        {showBulkUpload && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold tracking-tight">Bulk Paste Candidates</h2>
                    <button onClick={() => setShowBulkUpload(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                 </div>
                 <p className="text-sm text-slate-500 mb-4">Paste unstructured resume data separated by "---" and the Orchestrator will distill attributes and resolve identities asynchronously.</p>
                 <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-48 border border-slate-200 rounded-xl p-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 mb-4 bg-slate-50" placeholder={\`John Doe \\nJava, Spring\\n---\\nJane Smith\\nReact, Node\`}></textarea>
                 <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
                    <Button onClick={handleBulkUpload} disabled={isBulkProcessing}>{isBulkProcessing ? "Processing..." : "Extract via Intelligence"}</Button>
                 </div>
             </div>
          </div>
        )}

        {/* Stats Overlay */}
        {processingStats && processingStats.show && (
          <div className="fixed bottom-8 right-8 bg-slate-900 shadow-2xl rounded-2xl p-6 border border-slate-800 w-80 z-50 text-white flex flex-col gap-4 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <Activity size={16} className={processingStats.processing > 0 ? "text-indigo-400 animate-spin" : "text-emerald-400"} />
                <h3 className="font-black text-sm uppercase tracking-wider">{processingStats.total} Resumes Uploaded</h3>
              </div>
              <button onClick={() => setProcessingStats(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
            </div>
            {/* progress bars... */}
            <div className="text-xs text-slate-400 mt-2">Processed: {processingStats.parsed}/{processingStats.total}</div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

lines.push(UI);

fs.writeFileSync('src/views/CandidatesTab.tsx', lines.join('\\n'));
console.log("Restored CandidatesTab UI");
