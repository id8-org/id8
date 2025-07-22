// src/App.tsx
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import HomePage from "@/pages/HomePage";
import FeaturesPage from "@/pages/FeaturesPage";
import PricingPage from "@/pages/PricingPage";
import HowItWorksPage from "@/pages/HowItWorksPage";
import AboutPage from "@/pages/AboutPage";
import Layout from "@/components/Layout";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout><PageWrapper><HomePage /></PageWrapper></Layout>} />
        <Route path="/features" element={<Layout><PageWrapper><FeaturesPage /></PageWrapper></Layout>} />
        <Route path="/how-it-works" element={<Layout><PageWrapper><HowItWorksPage /></PageWrapper></Layout>} />
        <Route path="/pricing" element={<Layout><PageWrapper><PricingPage /></PageWrapper></Layout>} />
        <Route path="/about" element={<Layout><PageWrapper><AboutPage /></PageWrapper></Layout>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}