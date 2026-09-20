import React from 'react';
import { Users } from 'lucide-react';

export default function DirectCandidatesView() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Users className="text-indigo-600" /> Direct Candidates
      </h1>
      <p>Direct candidates tracking and analysis will be displayed here.</p>
    </div>
  );
}
