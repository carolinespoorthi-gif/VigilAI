import React, { useEffect } from "react";
import Routes from "./Routes";
import { SettingsProvider, useSettings } from "./context/SettingsContext";

// SettingsManager handles the side-effects of updating the global DOM 
// based on the context state, ensuring instant reactive updates.
const SettingsManager = ({ children }) => {
  const { settings } = useSettings();

  useEffect(() => {
    const theme = settings.theme || "light";
    const font = settings.font || "default";
    const density = settings.density || "normal";
    
    console.log("Selected theme:", theme);
    console.log("Applied theme:", document.documentElement.getAttribute("data-theme"));

    // 🔑 SAFE BODY CLASS UPDATE (MANDATORY)
    document.body.classList.remove("light", "dark", "theme-light", "theme-dark");
    document.body.classList.add(theme);
    
    // Applying data attributes to documentElement for full CSS reactivity
    const cl = document.documentElement.classList;
    cl.remove("font-default", "font-serif", "font-mono", "density-normal", "density-compact");
    cl.add(`font-${font}`, `density-${density}`);
    
    // Fix: Correct mapping (Light = light, Dark = dark)
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    
    document.documentElement.setAttribute('data-font', font);
    document.documentElement.setAttribute('data-density', density);
    
    // Explicit style application as fallback
    document.body.style.fontFamily = font === "serif" ? "serif" : (font === "mono" ? "monospace" : "inherit");
  }, [settings]);

  return children;
};

function App() {
  return (
    <SettingsProvider>
      <SettingsManager>
        <Routes />
      </SettingsManager>
    </SettingsProvider>
  );
}

export default App;
