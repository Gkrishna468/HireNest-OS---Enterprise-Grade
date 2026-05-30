import React, { useState, useEffect } from 'react';

interface Props {
  role: string | null;
}

export function OnboardingGuide({ role }: Props) {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem(`onboarding_complete_${role}`);
    if (!seen) {
      setHasSeenWelcome(false);
    } else {
      setHasSeenWelcome(true);
    }
  }, [role]);

  const startTour = () => {
    // For now, "Start Tour" is basically skipping the overlay, as they have seen the guide.
    // Real tooltips can be added later without adding heavy dependencies.
    setHasSeenWelcome(true);
    localStorage.setItem(`onboarding_complete_${role}`, 'true');
  };

  const skipTour = () => {
    setHasSeenWelcome(true);
    localStorage.setItem(`onboarding_complete_${role}`, 'true');
  };

  if (hasSeenWelcome) return null;

  // Welcome Screen
  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in slide-in-from-bottom border border-slate-200">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome to HireNestOS</h2>
          <p className="text-slate-500 mt-2">Here is a quick guide to your workflow on day 1.</p>
        </div>

        <div className="space-y-4 mb-8">
          {(role === 'recruiter' || role === 'independent_recruiter' || role === 'freelancer_recruiter' || role === 'independent') && (
            <ul className="space-y-3 font-medium text-slate-700">
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span> Review Requirements</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span> Upload Candidates</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span> Submit Candidates</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span> Track Interviews</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">5</span> Earn Payouts</li>
            </ul>
          )}
          {(role === 'vendor' || role === 'vendor_admin' || role === 'vendor_recruiter' || role === 'independent_vendor') && (
            <ul className="space-y-3 font-medium text-slate-700">
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span> Review Open Requirements</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span> Upload Bench Candidates</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span> Submit Resources</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span> Track Placements</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">5</span> Monitor Payments</li>
            </ul>
          )}
          {(role && role.startsWith('client')) && (
            <ul className="space-y-3 font-medium text-slate-700">
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span> Create Requirement</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span> Review Candidates</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span> Schedule Interviews</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span> Issue Offers</li>
              <li className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">5</span> Review Invoices</li>
            </ul>
          )}
          {(role === 'admin' || role === 'super_admin' || role === 'ops_admin') && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed font-medium">
              <p className="mb-2"><strong>Executive HQ Overview</strong></p>
              <p>Your workspace is divided into strategic pillars:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Operations</li>
                <li>Governance</li>
                <li>Network</li>
                <li>Financials</li>
                <li>System Intelligence</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={startTour}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl transition-colors"
          >
            Start Tour
          </button>
          <button 
            onClick={skipTour}
            className="px-6 border border-slate-200 hover:bg-slate-50 font-bold text-slate-500 rounded-xl transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
