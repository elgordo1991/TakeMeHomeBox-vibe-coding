import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      emoji: "📦",
      title: "Find treasures left outside homes",
      subtitle: "Discover amazing free items in your neighborhood through our interactive map and community sharing.",
    },
    {
      emoji: "🎁",
      title: "Share what you no longer need",
      subtitle: "Give back to your community by placing items you don't use in boxes outside your home.",
    },
    {
      emoji: "🧡",
      title: "Connect with your local community",
      subtitle: "Build meaningful relationships with neighbors while creating a sustainable sharing economy.",
    },
    {
      emoji: "🏆",
      title: "Track your reputation and earn badges",
      subtitle: "Rate experiences, leave comments, and build your community reputation through positive interactions.",
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="relative flex min-h-screen flex-col bg-canvas px-6 pb-10 pt-6">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-soft blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-24 h-56 w-56 rounded-full bg-leaf-soft blur-2xl" />

      <div className="relative flex items-center justify-between">
        <span className="text-lg font-black tracking-tight text-ink">
          TakeMe<span className="text-accent">Home</span>Box
        </span>
        {!isLast && (
          <button onClick={skip} className="rounded-full px-3 py-1.5 text-sm font-bold text-subtle hover:bg-sand hover:text-ink">
            Skip
          </button>
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <div key={currentStep} className="animate-slide-up">
          <div className="mx-auto mb-10 flex h-44 w-44 items-center justify-center rounded-[3rem] bg-surface shadow-lift rotate-3">
            <span className="text-8xl -rotate-3 logo-animated">{step.emoji}</span>
          </div>
          <h1 className="mb-4 text-3xl leading-tight">{step.title}</h1>
          <p className="text-lg leading-relaxed text-muted">{step.subtitle}</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to step ${index + 1}`}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep ? 'w-8 bg-accent' : 'w-2 bg-line-strong'
              }`}
            />
          ))}
        </div>
        <button onClick={nextStep} className="btn-primary w-full py-4 text-lg">
          {isLast ? 'Get started' : 'Next'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;