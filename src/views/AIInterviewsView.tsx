import React from 'react';
import { BrainCircuit } from 'lucide-react';

export default function AIInterviewsView() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <BrainCircuit className="text-indigo-600" /> AI Interviews
      </h1>
      <p>AI interview tracking and candidate results will be displayed here.</p>
    </div>
  );
}
