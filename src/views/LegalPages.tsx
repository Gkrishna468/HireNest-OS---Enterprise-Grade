import React from 'react';
import { ShieldCheck, ArrowLeft, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function LegalLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white rotate-3">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-lg font-black tracking-tighter">HireNestOS</h1>
          </Link>
          <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <header className="mb-16">
          <h1 className="text-4xl font-black tracking-tighter mb-4">{title}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{subtitle}</p>
        </header>
        <div className="prose prose-slate max-w-none prose-sm font-medium leading-relaxed">
          {children}
        </div>
      </div>

      <footer className="bg-slate-50 border-t border-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">© 2026 HireNestOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" subtitle="Last updated: July 1, 2026">
      <section className="space-y-8">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">1. Acceptance of Terms</h3>
          <p>By accessing or using HireNestOS ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">2. Use of Platform</h3>
          <p>HireNestOS is a business operating system for staffing. You are granted a limited, non-exclusive, non-transferable license to use the Platform for your staffing and recruitment business needs.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">3. User Responsibilities</h3>
          <p>Users are responsible for:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Maintaining the confidentiality of account credentials.</li>
            <li>Ensuring accuracy of data provided (candidates, requirements).</li>
            <li>Complying with all applicable labor laws and regulations.</li>
            <li>Using the platform for legitimate business purposes only.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">4. Intellectual Property</h3>
          <p>All platform technology, AI models, data structures, and UI designs are the proprietary property of HireNestOS.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">5. Termination</h3>
          <p>We reserve the right to terminate or suspend access to our Platform immediately, without prior notice or liability, for any reason whatsoever.</p>
        </div>
      </section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Last updated: July 1, 2026">
      <section className="space-y-8">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">1. Information We Collect</h3>
          <p>We collect information you provide directly to us, including but not limited to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Account info (name, email, company).</li>
            <li>Recruitment data (JDs, resumes).</li>
            <li>Usage metrics and system logs.</li>
            <li>Financial info for subscription billing.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">2. How We Use Data</h3>
          <p>Data is used to provide, maintain, and improve our services, including AI-driven matching and business analytics.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">3. Data Sharing</h3>
          <p>We do not sell your personal data. We share data only with trusted service providers who assist us in operating our platform, under strict confidentiality agreements.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">4. Security</h3>
          <p>We implement industry-standard security measures, including end-to-end encryption for data at rest and in transit.</p>
        </div>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-4">5. Contact Us</h3>
          <p>For any privacy-related queries, please contact our Data Protection Office at privacy@hirenestos.com.</p>
        </div>
      </section>
    </LegalLayout>
  );
}
