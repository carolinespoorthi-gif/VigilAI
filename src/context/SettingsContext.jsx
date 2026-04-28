import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // 🔑 INITIAL LOAD FROM LOCAL STORAGE
    try {
      const stored = localStorage.getItem("dashboardSettings");
      return stored ? JSON.parse(stored) : {
        theme: "light",
        font: "default",
        density: "normal",
        units: "normal",
        role: "learner"
      };
    } catch (e) {
      console.error("Failed to parse dashboardSettings", e);
      return {
        theme: "light",
        font: "default",
        density: "normal",
        units: "normal",
        role: "learner"
      };
    }
  });

  // Sync with localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem("dashboardSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
