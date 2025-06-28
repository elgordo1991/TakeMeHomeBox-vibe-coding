import React, { createContext, useContext } from 'react';

interface ThemeContextType {
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always dark theme
  const isDark = true;

  return (
    <ThemeContext.Provider value={{ isDark }}>
      <div className="min-h-screen bg-deep-blue">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};