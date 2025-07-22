"use client";
import React from "react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white text-slate-800">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center py-24 px-4 bg-gradient-to-br from-blue-100 via-white to-orange-50 relative overflow-hidden">
        <div className="flex flex-col items-center max-w-2xl mx-auto text-center z-10">
          <Image src="/id8-logo.svg" alt="ID8 logo" width={80} height={80} className="mb-6" />
          <h1 className="text-5xl md:text-6xl font-extrabold text-blue-900 mb-4 leading-tight drop-shadow">The all-in-one AI-powered idea platform</h1>
          <p className="text-xl md:text-2xl text-slate-700 mb-8">Generate, validate, and launch your next big thing. Open source. Founder-focused. Enterprise grade.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-2">
            <a href="http://localhost:8081" className="px-8 py-4 rounded-lg bg-orange-500 text-white font-bold text-lg shadow-lg hover:scale-105 transition">Go to App</a>
            <a href="#how-it-works" className="px-8 py-4 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold text-lg shadow hover:scale-105 transition">See How It Works</a>
          </div>
          <div className="mt-2 text-slate-500">No credit card required &bull; Free to start</div>
        </div>
        {/* Animated background shapes */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-900 rounded-full blur-3xl opacity-20 z-0" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-400 rounded-full blur-3xl opacity-20 z-0" />
      </section>

      {/* Trusted By Section (optional) */}
      <section className="py-6 flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Built for founders, teams, and innovators</div>
        {/* Add logos here if desired */}
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-white">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">Why ID8?</h2>
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {[
            { icon: "⚡️", title: "Lightning Fast", desc: "Go from zero to validated idea in minutes, not months." },
            { icon: "🤝", title: "Collaborative", desc: "Invite cofounders, get feedback, and iterate together." },
            { icon: "🎯", title: "Personalized", desc: "Ideas tailored to your skills, interests, and goals." },
            { icon: "🔒", title: "Enterprise-Ready", desc: "Secure, scalable, and ready for teams of any size." }
          ].map((feature, i) => (
            <div key={i} className="bg-blue-50 rounded-xl shadow p-6 flex flex-col items-center text-center border border-blue-100">
              <span className="text-4xl mb-3">{feature.icon}</span>
              <h3 className="text-xl font-semibold mb-2 text-blue-900">{feature.title}</h3>
              <p className="text-slate-700">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: 1, title: "Tell us about you", desc: "Share your skills, interests, and goals. ID8&apos;s AI gets to know you." },
            { step: 2, title: "Get tailored ideas", desc: "Our AI generates non-obvious, high-potential startup ideas just for you." },
            { step: 3, title: "Deep dive, refine, launch", desc: "Analyze, iterate, and move your best ideas forward—all in one place." }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center border border-blue-100">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-900 mb-3">{item.step}</div>
              <h3 className="text-xl font-semibold mb-2 text-blue-900">{item.title}</h3>
              <p className="text-slate-700">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise/Scale Section */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-blue-900 mb-2">Enterprise-grade infrastructure</h2>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-4">
              <span className="inline-block bg-white border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm font-semibold">99.99% uptime</span>
              <span className="inline-block bg-white border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm font-semibold">SOC2</span>
              <span className="inline-block bg-white border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm font-semibold">GDPR</span>
              <span className="inline-block bg-white border border-blue-200 rounded px-4 py-2 text-blue-900 text-sm font-semibold">HIPAA</span>
            </div>
            <p className="text-slate-700">ID8 is built for scale, security, and reliability—trusted by founders and teams worldwide.</p>
          </div>
          <div className="flex-1 flex justify-center">
            <Image src="/id8-logo.svg" alt="ID8 infrastructure" width={120} height={120} className="rounded-xl shadow" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-blue-900 text-center mb-12">What Our Users Say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "Alex P.", quote: "ID8 gave me the confidence to pursue my idea—and the roadmap to make it real!", company: "Startup Founder" },
            { name: "Samira K.", quote: "The deep dives are like having a team of analysts in my pocket.", company: "Product Manager" },
            { name: "Jordan L.", quote: "I found my cofounder through ID8&apos;s collaboration tools!", company: "Tech Entrepreneur" }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 flex flex-col items-start border border-blue-100">
              <p className="text-slate-700 text-base mb-4">&quot;{item.quote}&quot;</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-900">{item.name[0]}</div>
                <div>
                  <div className="font-semibold text-blue-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-blue-900 text-white text-center mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-5xl mx-auto gap-4">
          <div className="flex items-center gap-2 justify-center">
            <Image src="/id8-logo.svg" alt="ID8 logo" width={32} height={32} />
            <span className="font-bold text-lg">ID8</span>
          </div>
          <div className="flex gap-4 justify-center">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact</a>
            <a href="http://localhost:8081" className="hover:underline">Go to App</a>
          </div>
          <div className="text-sm">&copy; {new Date().getFullYear()} ID8. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
