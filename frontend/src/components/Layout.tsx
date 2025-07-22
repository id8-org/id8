import React from 'react';
import { SidebarProvider, Sidebar } from './ui/sidebar';
import { SidebarNavigation } from './ui/sidebar';
import Header from '../layout/Header';

interface LayoutProps {
  title?: string;
  onAddIdea?: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ title, onAddIdea, children }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-white">
        {/* Sidebar: always fixed, always open on desktop */}
        <Sidebar>
          <SidebarNavigation />
        </Sidebar>
        {/* Main content: full width minus sidebar */}
        <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">
          {/* Header: add hamburger menu to open sidebar on mobile */}
          <Header onAddIdea={onAddIdea} title={title} />
          {/* Main: full width, scrollable, no extra padding */}
          <main className="flex-1 bg-slate-50 overflow-x-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout; 