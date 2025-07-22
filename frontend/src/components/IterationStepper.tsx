import React, { useState } from "react";
import { Iteration } from "../types/iteration";
import { callLLM } from "../lib/llm";
import { Idea } from "../types/idea";
import { useMemo } from "react";
import { useEffect } from "react";
import { CheckCircle, ArrowRight, ArrowLeft, Lightbulb, Target, Zap, TrendingUp, AlertCircle, CheckSquare, XCircle } from "lucide-react";

const stepIcons = [
  "🔍", // Frame
  "🛠️", // Design
  "🎯", // Success Criteria
  "📈", // Confidence
  "🔬", // Results
  "🚦", // Decision
];

const stepDescriptions = [
  {
    title: "Frame the Challenge",
    description: "Identify the biggest risk or unknown that could make or break your idea. This becomes your focus for this iteration.",
    why: "Framing helps you focus on what matters most. The clearer your challenge, the better your experiment will be.",
    tips: [
      "Think about what keeps you up at night about this idea",
      "Consider what would make investors skeptical",
      "Focus on one specific risk, not multiple issues"
    ]
  },
  {
    title: "Design Your Experiment",
    description: "Create a hypothesis and design a test to validate or invalidate your assumption.",
    why: "Good experiments are specific, measurable, and actionable. They help you learn quickly and cheaply.",
    tips: [
      "Make your hypothesis specific and testable",
      "Choose the simplest method that will give you answers",
      "List the exact tools and steps you'll use"
    ]
  },
  {
    title: "Define Success",
    description: "Set clear, measurable criteria for what success looks like in this experiment.",
    why: "Without clear success criteria, you won't know if your experiment worked or failed.",
    tips: [
      "Use specific numbers when possible (e.g., '80% completion rate')",
      "Make it measurable and observable",
      "Set a realistic but ambitious target"
    ]
  },
  {
    title: "Assess Confidence",
    description: "Rate your confidence (0-10) in your hypothesis before running the experiment.",
    why: "Pre-experiment confidence helps you calibrate your expectations and learn from surprises.",
    tips: [
      "Be honest about your uncertainty",
      "Consider what you know vs. what you're guessing",
      "A confidence of 5-7 is often most realistic"
    ]
  },
  {
    title: "Capture Results",
    description: "Document what actually happened and what you learned from the experiment.",
    why: "Every experiment teaches you something, even if it doesn't go as planned. Capture those learnings.",
    tips: [
      "Focus on facts, not interpretations",
      "Note both what worked and what didn't",
      "Include unexpected findings"
    ]
  },
  {
    title: "Make a Decision",
    description: "Based on your results, decide: Pivot, Persevere, or Kill the idea.",
    why: "Clear decisions prevent analysis paralysis and keep you moving forward.",
    tips: [
      "Pivot: Change direction based on learnings",
      "Persevere: Continue with minor adjustments",
      "Kill: Stop and move to a different idea"
    ]
  }
];

const stepConfigs = [
  {
    label: "Frame",
    keys: ["risk_focus"],
    prompt: "frame",
  },
  {
    label: "Design",
    keys: ["hypothesis", "method", "tools", "task_list"],
    prompt: "design",
  },
  {
    label: "Success Criteria",
    keys: ["success_metric", "target"],
    prompt: "success_criteria",
  },
  {
    label: "Confidence",
    keys: ["confidence_score_before"],
    prompt: "confidence",
  },
  {
    label: "Results",
    keys: ["raw_results", "learnings", "hypothesis_supported"],
    prompt: "results",
  },
  {
    label: "Decision",
    keys: ["decision", "confidence_score_after", "next_action", "rationale"],
    prompt: "decision",
  },
];

type Props = {
  onComplete: (iteration: Iteration & { timebox_duration?: string }) => void;
  initialData?: Partial<Idea & Iteration>;
};

export const IterationStepper: React.FC<Props> = ({ onComplete, initialData = {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [showSummary, setShowSummary] = useState(false);

  const steps = [
    { 
      label: 'Frame', 
      field: 'risk_focus', 
      guidance: 'Identify the riskiest part of your idea or the biggest unknown. This is your focus for this iteration.',
      placeholder: 'Enter the biggest risk or unknown...',
      icon: AlertCircle
    },
    { 
      label: 'Design', 
      field: 'experiment_design', 
      guidance: 'Describe your hypothesis, method, tools, and task list for testing this risk.',
      placeholder: 'Describe your experiment design...',
      icon: Target
    },
    { 
      label: 'Success Criteria', 
      field: 'success_criteria', 
      guidance: 'Define what success looks like for this iteration. Be specific and measurable.',
      placeholder: 'Define your success criteria...',
      icon: CheckSquare
    },
    { 
      label: 'Confidence', 
      field: 'confidence_before', 
      guidance: 'Rate your confidence (0-10) in your hypothesis before running the test.',
      placeholder: 'Rate your confidence (0-10)...',
      icon: TrendingUp
    },
    { 
      label: 'Results', 
      field: 'results', 
      guidance: 'What happened? What did you learn? Was your hypothesis supported?',
      placeholder: 'Summarize your results and learnings...',
      icon: Zap
    },
    { 
      label: 'Decision', 
      field: 'decision', 
      guidance: 'Based on your results, decide: Pivot, Persevere, or Kill. What\'s your next action?',
      placeholder: 'Describe your decision and next steps...',
      icon: XCircle
    },
  ];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [steps[currentStep].field]: e.target.value });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Extract idea context for better guidance
  const { title, description, risk_factors, core_assumptions, riskiest_assumptions, assumptions, mvp_steps, iteration_notes, success_metrics, iterating } = initialData || {};

  // Helper: Get previous iteration data if available
  const lastIteration = iterating?.iteration_log?.length ? iterating.iteration_log[iterating.iteration_log.length - 1] : undefined;

  // Get contextual examples based on idea data
  const getContextualExample = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Frame
        return risk_factors || (riskiest_assumptions?.[0]) || (core_assumptions?.[0]) || 'Will users trust our AI to make financial decisions?';
      case 1: // Design
        return (lastIteration?.changes) || (assumptions?.[0]) || (mvp_steps?.[0]) || 'Hypothesis: Users will complete onboarding in under 2 minutes. Method: Usability test. Tools: Figma, Maze. Tasks: Build prototype, recruit testers, run test.';
      case 2: // Success Criteria
        return success_metrics || '80% of users complete onboarding without help.';
      case 3: // Confidence
        return '6 (somewhat confident, but there are unknowns)';
      case 4: // Results
        return (lastIteration?.outcomes) || '7/10 users completed onboarding, but 3 got stuck on step 2.';
      case 5: // Decision
        return (lastIteration?.rationale) || 'Persevere: Results are promising, but need to improve step 2.';
      default:
        return '';
    }
  };

  const getProgressPercentage = () => {
    return showSummary ? 100 : ((currentStep + 1) / steps.length) * 100;
  };

  const getStepStatus = (stepIndex: number) => {
    if (showSummary) return 'completed';
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const renderStepIndicator = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    const step = steps[stepIndex];
    
    return (
      <div key={stepIndex} className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          status === 'completed' ? 'bg-green-500 text-white' :
          status === 'current' ? 'bg-blue-500 text-white' :
          'bg-gray-200 text-gray-600'
        }`}>
          {status === 'completed' ? <CheckCircle className="w-4 h-4" /> : stepIndex + 1}
        </div>
        <div className="flex-1">
          <div className={`font-medium ${status === 'current' ? 'text-blue-600' : 'text-gray-700'}`}>
            {step.label}
          </div>
          <div className="text-xs text-gray-500">
            {stepDescriptions[stepIndex].title}
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const completedSteps = steps.filter((_, idx) => formData[steps[idx].field]);
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Iteration Summary</h2>
          <p className="text-gray-600">Review your iteration plan before submitting</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">What You've Created</h3>
          <p className="text-sm text-blue-700">
            You've designed a focused experiment to test the riskiest assumption in your idea. 
            This systematic approach will help you learn quickly and make informed decisions.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => {
            const value = formData[step.field];
            if (!value) return null;
            
            return (
              <div key={step.field} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <step.icon className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-800">{step.label}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{stepDescriptions[idx].description}</p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Next Steps</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Execute your experiment according to your design</li>
            <li>• Track your results against your success criteria</li>
            <li>• Document learnings and unexpected findings</li>
            <li>• Make your decision based on evidence, not gut feeling</li>
          </ul>
        </div>

        <div className="flex justify-between items-center">
          <button
            className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Edit
          </button>
          <button
            className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            onClick={() => onComplete(formData as Iteration & { timebox_duration?: string })}
          >
            Submit Iteration
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep];
    const stepDescription = stepDescriptions[currentStep];
    const example = getContextualExample(currentStep);

    return (
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>

        {/* Step Header */}
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">Step {currentStep + 1} of {steps.length}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{step.label}</h2>
          <p className="text-gray-600">{stepDescription.description}</p>
        </div>

        {/* Why This Matters */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Why This Matters</h3>
          </div>
          <p className="text-sm text-blue-700">{stepDescription.why}</p>
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Pro Tips</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {stepDescription.tips.map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </div>

        {/* Example */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Example</h3>
          <p className="text-sm text-gray-600 italic">"{example}"</p>
        </div>

        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your {step.label}
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            rows={4}
            placeholder={step.placeholder}
            value={formData[step.field] || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-blue-500' : 
                  idx < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
          
          <button
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNext}
            disabled={!formData[step.field]}
          >
            {currentStep === steps.length - 1 ? 'Review' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {showSummary ? renderSummary() : renderCurrentStep()}
    </div>
  );
}; 