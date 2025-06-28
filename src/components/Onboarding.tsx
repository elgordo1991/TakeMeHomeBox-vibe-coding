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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-shimmer relative">
      {/* Skip button in corner */}
      <button
        onClick={skip}
        className="absolute top-6 right-6 text-silver/60 hover:text-silver transition-colors text-sm"
      >
        Skip
      </button>

      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-silver scale-110 shadow-silver-glow'
                    : 'bg-silver/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card with shimmer border */}
        <div className="card-dark p-8 text-center">
          {/* Emoji icon */}
          <div className="text-8xl mb-6 logo-animated">
            {steps[currentStep].emoji}
          </div>
          
          {/* Bold title */}
          <h1 className="text-2xl font-bold text-silver-light mb-4 leading-tight">
            {steps[currentStep].title}
          </h1>
          
          {/* Short subtitle */}
          <p className="text-silver text-base leading-relaxed mb-8">
            {steps[currentStep].subtitle}
          </p>

          {/* Next button with press animation */}
          <button
            onClick={nextStep}
            className="btn-primary w-full flex items-center justify-center space-x-3"
          >
            <span className="text-lg font-semibold">
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator text */}
        <div className="text-center mt-6">
          <span className="text-silver/60 text-sm">
            {currentStep + 1} of {steps.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;