import React, { useState } from 'react';
import { Heart, Users, ArrowRight, Gift, Search } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <div className="text-6xl logo-animated">📦💎</div>,
      title: "Welcome to TakeMeHomeBox",
      description: "Connect with your community to share and discover free items left outside homes.",
      animation: "animate-bounce-gentle"
    },
    {
      icon: <Gift className="w-16 h-16 text-silver" />,
      title: "Give Back",
      description: "Share items you no longer need by placing them in boxes outside your home.",
      animation: "animate-fade-in"
    },
    {
      icon: <Search className="w-16 h-16 text-silver" />,
      title: "Discover Treasures",
      description: "Find amazing free items in your neighborhood through our interactive map.",
      animation: "animate-slide-up"
    },
    {
      icon: <Heart className="w-16 h-16 text-silver" />,
      title: "Build Community",
      description: "Rate experiences, leave comments, and help create a sustainable sharing economy.",
      animation: "animate-fade-in"
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-deep-blue">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
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

        {/* Content */}
        <div className="text-center animate-fade-in">
          <div className={`flex justify-center mb-6 ${steps[currentStep].animation}`}>
            {steps[currentStep].icon}
          </div>
          
          <h1 className="text-2xl font-bold text-silver-light mb-4">
            {steps[currentStep].title}
          </h1>
          
          <p className="text-silver text-lg leading-relaxed mb-8">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={skip}
            className="text-silver/60 hover:text-silver transition-colors"
          >
            Skip
          </button>
          
          <button
            onClick={nextStep}
            className="btn-primary flex items-center space-x-2"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Community illustration */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center space-x-4 text-silver/60">
            <Users className="w-8 h-8" />
            <div className="text-sm">
              Join thousands sharing in their communities
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;