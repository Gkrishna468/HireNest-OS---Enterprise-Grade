import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, CheckCircle2, AlertTriangle, User, Briefcase, Zap, FileText } from "lucide-react";
import { CandidateMatchingService, CandidateRequirementMatchRecord } from "../../services/CandidateMatchingService";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { roiEngine } from "../../services/roiEngine";
import { BusinessEventType } from "../../types/roi";
import { approvalService } from "../../lib/ApprovalService";

export const MatchingWorkspace: React.FC = () => {
  const [mode, setMode] = useState<'CANDIDATE_TO_REQ' | 'REQ_TO_CANDIDATE'>('CANDIDATE_TO_REQ');
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [results, setResults] = useState<CandidateRequirementMatchRecord[]>([]);

  useEffect(() => {
    setEntities([]);
    setSelectedEntityId('');
    setResults([]);
    
    const fetchEntities = async () => {
      setLoading(true);
      const collectionName = mode === 'CANDIDATE_TO_REQ' ? 'requirements_public' : 'candidatePool';
      const snap = await getDocs(query(collection(db, collectionName), limit(50)));
      setEntities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchEntities();
  }, [mode]);

  const handleMatch = async () => {
    if (!selectedEntityId) return;
    setLoading(true);

    // 1. Log operational match execution (operational)
    await roiEngine.recordEvent({
      tenantId: "system",
      requirementId: mode === 'CANDIDATE_TO_REQ' ? selectedEntityId : "MATCHING_EXECUTION",
      eventType: BusinessEventType.MATCH_EXECUTION,
      stage: "PIPELINE",
      actorType: "ADMIN",
      actorId: "admin-user"
    });

    // 2. Perform match
    try {
      // In a real scenario, you'd iterate over the "universe" of eligible entities
      // For this implementation, we will mock the ranking based on service logic
      // and call matchCandidateToRequirement for a selected pair.
      const matchRecord = await CandidateMatchingService.matchCandidateToRequirement({
        candidateId: mode === 'REQ_TO_CANDIDATE' ? selectedEntityId : "placeholder-candidate-id",
        requirementId: mode === 'CANDIDATE_TO_REQ' ? selectedEntityId : "placeholder-requirement-id",
        context: { organizationId: "admin", userId: "admin", role: "admin" }
      });
      setResults([matchRecord]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePrepareSubmission = async (record: CandidateRequirementMatchRecord) => {
    // 3. Route to P4 approval boundary
    await approvalService.requestApproval(
      record.requirementId,
      "tenant-system",
      "admin",
      "ADMIN",
      null,
      1 // Assume version 1
    );
    alert("Submission draft prepared and sent for approval.");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3"><Zap className="text-indigo-600"/>Admin Matching Workspace</h1>
      
      <div className="flex gap-4">
        <button 
          onClick={() => setMode('CANDIDATE_TO_REQ')}
          className={`px-4 py-2 rounded font-bold ${mode === 'CANDIDATE_TO_REQ' ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}
        >
          Match Candidates → Requirement
        </button>
        <button 
          onClick={() => setMode('REQ_TO_CANDIDATE')}
          className={`px-4 py-2 rounded font-bold ${mode === 'REQ_TO_CANDIDATE' ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300'}`}
        >
          Match Requirements → Candidate
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle>Selection</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <select 
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">Select {mode === 'CANDIDATE_TO_REQ' ? 'Requirement' : 'Candidate'}</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.title || e.fullName || e.id}</option>)}
            </select>
            <button onClick={handleMatch} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700">
              <Search size={16} /> Run AI Matching
            </button>
          </div>
        </CardContent>
      </Card>
      
      {loading && <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}
      
      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Match Results</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Score</th>
                  <th>Tier</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id}>
                    <td>{mode === 'CANDIDATE_TO_REQ' ? r.reqTitle : r.candidateName}</td>
                    <td>{r.score}%</td>
                    <td>{r.tier}</td>
                    <td>
                      <button onClick={() => handlePrepareSubmission(r)} className="text-indigo-600 font-bold hover:underline">
                        Prepare Submission
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
