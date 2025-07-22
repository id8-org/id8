// src/components/Layout.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">{children}</main>
      <footer className="bg-neutral-950 text-white py-6 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} ID8. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link to="/features" className="hover:text-cyan-400">Features</Link>
            <Link to="/how-it-works" className="hover:text-cyan-400">How It Works</Link>
            <Link to="/pricing" className="hover:text-cyan-400">Pricing</Link>
            <Link to="/about" className="hover:text-cyan-400">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
