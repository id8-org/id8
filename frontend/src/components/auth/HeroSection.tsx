import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background gradient representing innovation and data flows */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900" />
      
      {/* Animated data flow overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse" />
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      {/* Featured Image Area - Placeholder for provided image */}
      {/* TODO: Replace with actual image from https://chatgpt.com/s/m_6881788222248191b5e2cc2108425568 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative z-10 max-w-lg mx-auto px-8">
          {/* Main featured image placeholder */}
          <div className="mb-8 text-center">
            <div className="w-64 h-64 mx-auto bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-2xl flex items-center justify-center border border-cyan-400/30 backdrop-blur-sm shadow-2xl">
              {/* Placeholder content - to be replaced with actual image */}
              <div className="text-center p-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="text-white/80 text-sm font-medium">
                  Featured Image Placeholder
                  <br />
                  <span className="text-xs text-cyan-300">
                    Replace with provided image
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mountain silhouette */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg viewBox="0 0 1200 300" className="w-full h-auto text-slate-800 fill-current opacity-60">
          <path d="M0,300 L0,200 L200,100 L400,150 L600,80 L800,120 L1000,60 L1200,100 L1200,300 Z" />
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
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-8 z-10">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/id8logo.png" 
            alt="ID8 Logo" 
            className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
          />
        </div>
        
        {/* Main headline */}
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
          ID8: Think in Versions.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            Create with Intelligence.
          </span>
        </h1>
        
        {/* Subtext */}
        <p className="text-base lg:text-lg text-gray-200 leading-relaxed max-w-md mx-auto">
          ID8 is the first system for thinking that evolves like software. Track your ideas with version control, 
          memory, scoring, and transparent logic.{' '}
          <span className="text-cyan-300 font-semibold">It's GitHub for ideas.</span>
        </p>
      </div>

      {/* Mist effect */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
};