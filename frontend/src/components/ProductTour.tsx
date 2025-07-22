import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import Confetti from 'react-confetti';

interface ProductTourProps {
  isVisible: boolean;
  onComplete: () => void;
  ideasCount: number;
  isLoading: boolean;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  isVisible,
  onComplete,
  ideasCount,
  isLoading
}) => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Listen for repo scaffold and MVP checklist events
  useEffect(() => {
    function handleScaffolded() {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setStepIndex(idx => idx + 1);
    }
    function handleChecklist() {
      setStepIndex(idx => idx + 1);
    }
    window.addEventListener('tour-repo-scaffolded', handleScaffolded);
    window.addEventListener('tour-mvp-step-checked', handleChecklist);
    return () => {
      window.removeEventListener('tour-repo-scaffolded', handleScaffolded);
      window.removeEventListener('tour-mvp-step-checked', handleChecklist);
    };
  }, []);

  useEffect(() => {
    if (isVisible && ideasCount === 0) setRun(true);
    else if (ideasCount > 0) setRun(false);
  }, [isVisible, ideasCount]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="text-center animate-fade-in">
          <h3 className="text-2xl font-bold mb-2">Welcome to ID8! 🚀</h3>
          <p className="text-base text-blue-700 font-medium mb-2">Everything here is personalized for you. Let's see the magic.</p>
          <span className="text-sm text-gray-500">(You can pause or skip the tour anytime.)</span>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="personalized-ideas"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">Your Personalized Ideas</h4>
          <p className="text-sm">These ideas are matched to your skills, interests, and GitHub activity. No generic suggestions—just magic for you.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="idea-card"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">Idea Card Magic</h4>
          <p className="text-sm">Click any idea to see why it's a match for you, and what makes it special. Try it now!</p>
        </div>
      ),
      placement: 'bottom',
      spotlightClicks: true,
    },
    {
      target: '[data-tour="scaffold-repo"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">Transform Your Idea</h4>
          <p className="text-sm">Turn your idea into a real, ready-to-build GitHub repo with a single click. Click "Scaffold Repo" to see the magic!</p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '[data-tour="mvp-checklist"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">MVP Build Steps</h4>
          <p className="text-sm">Check off a step to see your progress. Every step brings you closer to launch!</p>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '[data-tour="notification-bell"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">Real-Time Notifications</h4>
          <p className="text-sm">Get instant updates when new ideas are generated or your repo is ready. Never miss a beat!</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="ask-ai"]',
      content: (
        <div>
          <h4 className="font-semibold mb-2">Ask AI Anything</h4>
          <p className="text-sm">Stuck or curious? Ask our AI for help, feedback, or next steps—anytime.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: 'body',
      content: (
        <div className="text-center animate-fade-in">
          <h3 className="text-2xl font-bold mb-2">You're ready to build. Let's go! 🎉</h3>
          <p className="text-base text-blue-700 font-medium mb-2">ID8 is here to turn your ideas into reality—effortlessly.</p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) {
      setRun(false);
      onComplete();
    } else if (typeof data.index === 'number') {
      setStepIndex(data.index);
    }
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        disableScrolling
        disableOverlayClose={false}
        spotlightClicks={false}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563eb',
            textColor: '#1e293b',
            backgroundColor: '#fff',
            arrowColor: '#2563eb',
          },
        }}
        callback={handleCallback}
      />
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}
    </>
  );
}; 