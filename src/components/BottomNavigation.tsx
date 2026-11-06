import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Map, Plus, User } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const tabs = [
  { id: 'map', label: 'Explore', icon: Map, path: '/map' },
  { id: 'add', label: 'Add box', icon: Plus, path: '/add' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = tabs.find((tab) => tab.path === location.pathname)?.id || 'profile';

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-area-pb pointer-events-none">
      <div className="mx-auto mb-3 flex max-w-sm items-center justify-between rounded-full border border-line bg-surface/90 px-3 py-2 shadow-lift backdrop-blur-md pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.id === 'add') {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                aria-label={tab.label}
                className={`-my-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-accent transition-transform duration-150 hover:bg-accent-dark active:scale-95 ${
                  isActive ? 'ring-4 ring-accent-soft' : ''
                }`}
              >
                <Plus className="h-7 w-7" strokeWidth={2.75} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-95 ${
                isActive ? 'bg-accent-soft text-accent-dark' : 'text-subtle hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={isActive ? '' : 'sr-only sm:not-sr-only'}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
