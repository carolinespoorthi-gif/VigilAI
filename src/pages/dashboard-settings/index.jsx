import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";

const DashboardSettings = () => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [toast, setToast] = useState('');

  /* ===== APPLY SETTINGS (FINAL CONFIRMATION) ===== */
  const applySettings = () => {
    setToast('All changes have been applied in real-time');
    alert("Settings Applied Successfully");
    
    setTimeout(() => {
      setToast('');
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Dashboard Settings</h1>
      <p className="text-muted-foreground mb-8">
        Customize dashboard appearance, data display, layout, and user experience. 
        Changes are applied instantly to the UI.
      </p>

      {toast && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{toast}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Customization & Branding */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-3">Customization & Branding</h3>

          <label className="block mb-3">
            Theme
            <select
              className="border p-2 w-full mt-1"
              value={settings.theme || "light"}
              onChange={(e) => updateSettings({ theme: e.target.value })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label className="block">
            Font Style
            <select
              className="border p-2 w-full mt-1"
              value={settings.font || "default"}
              onChange={(e) => updateSettings({ font: e.target.value })}
            >
              <option value="default">Default</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
              <option value="modern">Modern</option>
              <option value="tech">Tech</option>
            </select>
          </label>
        </div>

        {/* Data Presentation */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-3">Data Presentation</h3>

          <label className="block">
            Unit Prefix
            <select
              className="border p-2 w-full mt-1"
              value={settings.units || "normal"}
              onChange={(e) => updateSettings({ units: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="k">Thousands (k)</option>
              <option value="m">Millions (M)</option>
            </select>
          </label>
        </div>

        {/* Layout & Interactivity */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-3">Layout & Interactivity</h3>

          <label className="block">
            Layout Density
            <select
              className="border p-2 w-full mt-1"
              value={settings.density || "normal"}
              onChange={(e) => updateSettings({ density: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>

        {/* User Experience */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-3">User Experience</h3>

          <label className="block">
            User Role
            <select
              className="border p-2 w-full mt-1"
              value={settings.role || "learner"}
              onChange={(e) => updateSettings({ role: e.target.value })}
            >
              <option value="learner">Learner</option>
              <option value="manager">Manager</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={applySettings}
          className="bg-primary text-white px-6 py-3 rounded"
        >
          Confirm Changes
        </button>

        <button
          onClick={() => {
            console.log("Cancel clicked");
            navigate("/dashboard");
          }}
          className="px-6 py-3 border rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DashboardSettings;
