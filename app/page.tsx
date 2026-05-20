'use client'

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <h1 className="text-8xl font-black italic tracking-tighter text-white uppercase">
          HireNest<span className="text-indigo-500">OS</span>
        </h1>
        <p className="text-slate-500 font-mono tracking-[0.4em] uppercase text-xs">
          Autonomous Workforce Coordination & Governance Network
        </p>
        <div className="flex flex-wrap justify-center gap-6 pt-12">
          {['/admin/security', '/admin/execution', '/users', '/dashboard'].map(route => (
            <a 
              key={route}
              href={route} 
              className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all"
            >
              Go to {route.split('/').pop()}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
