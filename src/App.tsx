import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Onboarding from './components/Onboarding';
import MainApp from './components/MainApp';
import './index.css';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-deep-blue">
            {showOnboarding ? (
              <Onboarding onComplete={handleOnboardingComplete} />
            ) : (
              <MainApp />
            )}
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;