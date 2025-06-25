import React, { useState } from 'react';
import { Package, Heart, Users, ArrowRight, Gift, Search } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Package className="w-16 h-16 text-primary-500" />,
      title: "Welcome to TakeMeHomeBox",
      description: "Connect with your community to share and discover free items left outside homes.",
      animation: "animate-bounce-gentle"
    },
    {
      icon: <Gift className="w-16 h-16 text-earth-500" />,
      title: "Give Back",
      description: "Share items you no longer need by placing them in boxes outside your home.",
      animation: "animate-fade-in"
    },
    {
      icon: <Search className="w-16 h-16 text-warm-600" />,
      title: "Discover Treasures",
      description: "Find amazing free items in your neighborhood through our interactive map.",
      animation: "animate-slide-up"
    },
    {
      icon: <Heart className="w-16 h-16 text-primary-500" />,
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary-50 via-earth-50 to-warm-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-primary-500 scale-110'
                    : 'bg-gray-300 dark:bg-gray-600'
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
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {steps[currentStep].title}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-8">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={skip}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Skip
          </button>
          
          <button
            onClick={nextStep}
            className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Community illustration */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center space-x-4 text-primary-400">
            <Users className="w-8 h-8" />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Join thousands sharing in their communities
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;