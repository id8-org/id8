// src/pages/HomePage.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="relative h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] overflow-hidden text-white font-sans">
      <nav className="absolute top-0 left-0 w-full px-10 py-6 flex justify-between items-center z-20 backdrop-blur bg-black/80">
        <Link to="/" className="text-cyan-400 text-2xl font-bold">ID8</Link>
        <ul className="hidden md:flex gap-8 list-none">
          <li><Link to="/features" className="hover:text-cyan-400">Features</Link></li>
          <li><Link to="/how-it-works" className="hover:text-cyan-400">How It Works</Link></li>
          <li><Link to="/pricing" className="hover:text-cyan-400">Pricing</Link></li>
          <li><Link to="/about" className="hover:text-cyan-400">About</Link></li>
        </ul>
      </nav>

      <div className="absolute top-1/5 right-1/10 bg-cyan-400/10 border border-cyan-400/30 px-4 py-1 rounded-full text-xs text-cyan-400 animate-pulse">
        v2.1.3 • Logic Score: 94%
      </div>

      <div className="absolute top-[60%] left-[8%] w-52 bg-white/5 border border-white/10 rounded-md p-3 backdrop-blur">
        <div className="text-cyan-400 text-xs mb-2">Idea Evolution</div>
        {[
          { label: "Clarity", width: "88%" },
          { label: "Innovation", width: "76%" },
          { label: "Feasibility", width: "92%" },
        ].map(({ label, width }) => (
          <div key={label} className="mb-1">
            <div className="text-[10px] text-gray-400 mb-1">{label}</div>
            <div className="h-1 bg-white/10 rounded">
              <div
                className="h-full rounded bg-gradient-to-r from-cyan-400 to-blue-500"
                style={{ width }}
              />
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-4xl px-10"
      >
        <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-bold mb-6 bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent leading-tight">
          Think in Versions.<br />Create with Intelligence.
        </h1>
        <p className="text-[clamp(1.1rem,3vw,1.4rem)] text-gray-400 mb-10">
          ID8 is the first system for thinking that evolves like software. Track your ideas with version control, memory, scoring, and transparent logic. It's GitHub for ideas. Notion for invention. Figma for thought.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl hover:shadow-2xl">
            <Link to="/start">Begin Your First Idea <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:border-cyan-400">
            <Link to="/how-it-works">See How It Works</Link>
          </Button>
        </div>
      </motion.div>

      <p className="absolute bottom-10 left-10 text-sm italic text-gray-500 hidden sm:block">
        Innovation begins in clarity.
      </p>

      <div className="absolute inset-0 z-0 pointer-events-none" id="backgroundElements"></div>
    </div>
  );
}
