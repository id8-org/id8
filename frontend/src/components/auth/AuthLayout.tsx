import React from 'react';
import { HeroSection } from './HeroSection';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Split Screen Layout */}
      <div className="flex w-full min-h-screen">
        {/* Left Panel - Hero/Image Section */}
        <div className="hidden lg:flex lg:flex-1 relative">
          <HeroSection />
        </div>
        
        {/* Right Panel - Form Section */}
        <div className="flex-1 lg:flex-none lg:w-1/2 flex items-center justify-center px-4 py-8 lg:px-8">
          <div className="w-full max-w-md">
            {/* Mobile Hero Section */}
            <div className="lg:hidden mb-8">
              <div className="text-center">
                <img 
                  src="/id8logo.png" 
                  alt="ID8 Logo" 
                  className="w-16 h-16 mx-auto mb-4"
                />
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  ID8: Think in Versions
                </h1>
                <p className="text-slate-600 text-sm">
                  Create with Intelligence
                </p>
              </div>
            </div>
            
            {/* Form Container */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 lg:p-8">
              {/* Form Header */}
              <div className="text-center mb-6 lg:mb-8">
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">{title}</h2>
                <p className="text-slate-600 text-sm lg:text-base">{subtitle}</p>
              </div>
              
              {/* Form Content */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};