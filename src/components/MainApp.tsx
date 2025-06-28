import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import MapView from './MapView';
import Profile from './Profile';
import AddListing from './AddListing';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('map');

  // Temporarily disable auth requirement - remove this condition to re-enable
  // if (!user) {
  //   return <Login />;
  // }

  return (
    <div className="min-h-screen bg-deep-blue">
      <div className="pb-20">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/add" element={<AddListing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default MainApp;