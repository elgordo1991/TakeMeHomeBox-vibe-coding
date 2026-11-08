import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import MapView from './MapView';
import Profile from './Profile';
import AddListing from './AddListing';
import Terms from './Terms';
import Login from './Login';
import InstallPrompt from './InstallPrompt';
import { useAuth } from '../contexts/AuthContext';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Require authentication for full app access
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="pb-28">
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/add" element={<AddListing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </div>
      <InstallPrompt />
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default MainApp;