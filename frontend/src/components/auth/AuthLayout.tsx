import React from 'react';
import { HeroSection } from './HeroSection';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <HeroSection />
      
      {/* User Input Section */}
      <div className="relative -mt-16 px-4 pb-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
              <p className="text-slate-600">{subtitle}</p>
            </div>
            
            {/* Form Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};