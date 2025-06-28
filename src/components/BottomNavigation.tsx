import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Plus, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'map', label: 'Map', icon: Map, path: '/map' },
    { id: 'add', label: 'Add', icon: Plus, path: '/add' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    return tabs.find(tab => tab.path === currentPath)?.id || 'map';
  };

  const currentTab = getCurrentTab();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark-blue border-t border-silver/30 safe-area-pb">
      <div className="flex justify-around items-center py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 active:animate-press-down ${
                isActive
                  ? 'text-silver-light bg-dark-blue-light border border-silver/50 shadow-silver-glow'
                  : 'text-silver/60 hover:text-silver'
              }`}
            >
              <div className={`p-2 rounded-full transition-all duration-200 ${
                isActive ? 'bg-dark-blue border border-silver/30' : ''
              }`}>
                <Icon className={`w-6 h-6 ${
                  tab.id === 'add' && isActive ? 'scale-110' : ''
                }`} />
              </div>
              <span className={`text-xs mt-1 font-medium ${
                isActive ? 'text-silver-light' : ''
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;