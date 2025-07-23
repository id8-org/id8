import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative min-h-[60vh] overflow-hidden">
      {/* Background gradient representing sky transition from dawn to data flows */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-900 to-indigo-900" />
      
      {/* Animated data flow overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse" />
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Mountain silhouette */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg viewBox="0 0 1200 300" className="w-full h-auto text-slate-800 fill-current">
          <path d="M0,300 L0,200 L200,100 L400,150 L600,80 L800,120 L1000,60 L1200,100 L1200,300 Z" />
        </svg>
      </div>

      {/* Cliff edge and figure silhouette */}
      <div className="absolute bottom-0 right-1/4 w-32 h-40">
        <svg viewBox="0 0 128 160" className="w-full h-full text-slate-700 fill-current">
          {/* Cliff edge */}
          <path d="M0,160 L0,40 L80,20 L100,30 L120,25 L128,35 L128,160 Z" />
          {/* Figure silhouette */}
          <ellipse cx="85" cy="35" rx="3" ry="4" className="text-slate-900 fill-current" />
          <path d="M85,39 L85,55 M80,45 L90,45 M85,55 L80,70 M85,55 L90,70" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none" 
                className="text-slate-900" />
        </svg>
      </div>

      {/* Floating idea nodes and mindmaps */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Node clusters */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-cyan-400 rounded-full animate-pulse opacity-70" />
        <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/5 right-1/3 w-4 h-4 bg-purple-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
        
        {/* Connection lines */}
        <svg className="absolute top-1/4 left-1/4 w-48 h-24 opacity-40">
          <path d="M12,12 Q30,8 48,16 Q66,24 84,12" 
                stroke="cyan" 
                strokeWidth="1" 
                fill="none" 
                className="animate-pulse" />
        </svg>
        
        {/* Wireframe elements */}
        <div className="absolute top-1/6 right-1/4 w-16 h-10 border border-blue-300 opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-2/5 left-1/6 w-12 h-8 border border-purple-300 opacity-25 animate-pulse" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Mist effect */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/10 to-transparent" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 pt-16 pb-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/id8logo.png" 
              alt="ID8 Logo" 
              className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
            />
          </div>
          
          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            ID8: Think in Versions.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Create with Intelligence.
            </span>
          </h1>
          
          {/* Subtext */}
          <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
            ID8 is the first system for thinking that evolves like software. Track your ideas with version control, 
            memory, scoring, and transparent logic.{' '}
            <span className="text-cyan-300 font-semibold">It's GitHub for ideas.</span>
          </p>
        </div>
      </div>
    </div>
  );
};