import React, { useState } from 'react';
import { Button } from '../lib/Button';
import { Shield, Zap, Target, Users, Bot, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WelcomeDemoProps {
  type: 'client' | 'vendor';
  onClose: () => void;
}

export default function WelcomeDemo({ type, onClose }: WelcomeDemoProps) {
  const [step, setStep] = useState(1);

  const clientSteps = [
    {
      title: "Recruiter-In-Chief View",
      description: "Welcome to HireNest OS. You are now equipped with the ultimate operational staffing layer.",
      icon: <Shield className="text-indigo-500" />,
      features: ["Strategic Presence", "High-Density Governance", "Zero-Trust Security"]
    },
    {
      title: "Structured Precision Posting",
      description: "Post requirements with financial precision. Define Budget (LPA/LPM) and work modes (C2C, C2H, Permanent).",
      icon: <Zap className="text-amber-500" />,
      features: ["LPA/LPM Budgeting", "Engagement Modes", "Mandatory Skills Guardrail"]
    },
    {
      title: "AI Match Processing",
      description: "Submit a job and our Match Engine scan verified vendor networks globally in real-time.",
      icon: <Bot className="text-emerald-500" />,
      features: ["5-Min Processing Window", "Cross-Tenant Intelligence", "Automated Outreach"]
    }
  ];

  const vendorSteps = [
    {
      title: "Marketplace Command Center",
      description: "Scale your recruitment business through the most advanced vendor OS ever built.",
      icon: <Shield className="text-amber-500" />,
      features: ["Deal Pipeline Control", "Candidate Pool Management", "Vendor Quality Scoring"]
    },
    {
      title: "Rapid Submission Hub",
      description: "Submit candidates directly to live client requirements with automated pre-screening.",
      icon: <Zap className="text-indigo-500" />,
      features: ["One-Click Submission", "Resume Extraction", "Match Score Validation"]
    },
    {
      title: "Secure Deal Rooms",
      description: "Collaborate directly with clients in secure, identity-revealing deal rooms.",
      icon: <Users className="text-emerald-500" />,
      features: ["Structured Collaboration", "Compliance Tracking", "Zero-Reveal Negotiation"]
    }
  ];

  const activeSteps = type === 'client' ? clientSteps : vendorSteps;
  const current = activeSteps[step - 1];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row h-[500px]"
      >
        {/* Left Side: Visual/Branding */}
        <div className={`w-1/3 p-8 flex flex-col justify-between text-white ${type === 'client' ? 'bg-indigo-600' : 'bg-amber-600'}`}>
          <div>
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl italic mb-4">H</div>
            <h2 className="text-2xl font-black italic leading-tight uppercase tracking-tighter">
              Welcome to <br /> HireNest OS
            </h2>
          </div>
          <div className="space-y-4">
             <div className="flex gap-1">
                {activeSteps.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i + 1 <= step ? 'bg-white' : 'bg-white/30'}`} />
                ))}
             </div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-white/70">
                Strategic Onboarding {step}/{activeSteps.length}
             </p>
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="flex-1 p-8 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div 
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    {current.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{current.title}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Priority Milestone</p>
                  </div>
               </div>

               <p className="text-slate-600 leading-relaxed mb-8">
                 {current.description}
               </p>

               <div className="space-y-3 mb-8">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic Features Enabled:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {current.features.map(f => (
                       <div key={f} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                          <CheckCircle size={16} className="text-emerald-500" />
                          {f}
                       </div>
                    ))}
                  </div>
               </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-auto pt-8 border-t border-slate-100">
             <Button variant="ghost" onClick={onClose} className="text-slate-400 text-xs font-bold uppercase hover:bg-slate-50">
               Skip Demo
             </Button>
             <Button 
                onClick={() => {
                  if (step < activeSteps.length) setStep(step + 1);
                  else onClose();
                }}
                className={`text-white font-bold uppercase text-xs px-8 h-10 shadow-lg ${type === 'client' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-amber-600 hover:bg-amber-500'}`}
             >
                {step === activeSteps.length ? "Get Started" : "Next Milestone"} <ArrowRight size={14} className="ml-2" />
             </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
