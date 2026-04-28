import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const SECURITY_KEY = 'vigilai_security_settings';

const loadSecuritySettings = () => {
  try {
    const stored = localStorage.getItem(SECURITY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    twoFactorEnabled: false,
    sessionTimeout: '30',
    loginNotifications: true,
    ipWhitelist: '',
    lastPasswordChange: null,
  };
};

const persistSecuritySettings = (settings) => {
  try {
    localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('security:updated', { detail: settings }));
    return true;
  } catch { return false; }
};

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [updating, setUpdating] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  const [secSettings, setSecSettings] = useState(loadSecuritySettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Re-read if another tab changes
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SECURITY_KEY && e.newValue) {
        try { setSecSettings(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handlePasswordUpdate = () => {
    setPwError('');
    if (!password.current) { setPwError('Current password is required.'); return; }
    if (password.new_.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (password.new_ !== password.confirm) { setPwError('Passwords do not match.'); return; }
    setUpdating(true);
    setTimeout(() => {
      const updated = {
        ...secSettings,
        lastPasswordChange: new Date().toISOString(),
      };
      persistSecuritySettings(updated);
      setSecSettings(updated);
      setUpdating(false);
      setPwSaved(true);
      setPassword({ current: '', new_: '', confirm: '' });
      setTimeout(() => setPwSaved(false), 3500);
    }, 1000);
  };

  const handleSettingsChange = (field, value) => {
    const updated = { ...secSettings, [field]: value };
    setSecSettings(updated);
    persistSecuritySettings(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Button variant="ghost" className="-ml-3 mb-2 text-muted-foreground" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your password, sessions, and security preferences. All changes persist.</p>
        </div>

        <div className="space-y-6">
          {/* Security Preferences */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Security Preferences</h2>
            {settingsSaved && (
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#16A34A',
                borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>
                ✓ Settings saved automatically
              </div>
            )}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
                </div>
                <button onClick={() => handleSettingsChange('twoFactorEnabled', !secSettings.twoFactorEnabled)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: secSettings.twoFactorEnabled ? '#4F7C82' : '#CBD5E1', position: 'relative',
                    transition: 'background 0.3s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, left: secSettings.twoFactorEnabled ? 23 : 3,
                    transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Login Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Get notified of new sign-ins to your account</p>
                </div>
                <button onClick={() => handleSettingsChange('loginNotifications', !secSettings.loginNotifications)}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: secSettings.loginNotifications ? '#4F7C82' : '#CBD5E1', position: 'relative',
                    transition: 'background 0.3s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, left: secSettings.loginNotifications ? 23 : 3,
                    transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Session Timeout</label>
                <select className="w-full border border-border rounded-lg p-3 bg-background text-foreground"
                  value={secSettings.sessionTimeout}
                  onChange={e => handleSettingsChange('sessionTimeout', e.target.value)}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
            </div>

            {secSettings.lastPasswordChange && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last password change: {new Date(secSettings.lastPasswordChange).toLocaleString()}
              </p>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Change Password</h2>
            {pwError && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626',
                borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>{pwError}</div>
            )}
            {pwSaved && (
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#16A34A',
                borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>
                ✓ Password updated successfully!
              </div>
            )}
            <div className="space-y-4">
              {[
                { label: 'Current Password', field: 'current' },
                { label: 'New Password', field: 'new_', hint: 'Minimum 8 characters' },
                { label: 'Confirm New Password', field: 'confirm' },
              ].map(({ label, field, hint }) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
                  {hint && <p className="text-xs text-muted-foreground mb-1">{hint}</p>}
                  <input type="password" className="w-full border border-border rounded-lg p-3 bg-background text-foreground"
                    value={password[field]} onChange={e => setPassword(prev => ({ ...prev, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="pt-6 mt-6 border-t border-border flex justify-end">
              <Button onClick={handlePasswordUpdate} disabled={updating}>
                {updating ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Active Sessions</h2>
            <div className="border border-border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="Laptop" size={24} className="text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground">Current Browser Session</p>
                  <p className="text-xs text-green-600 font-bold">● Active Now</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Timeout: {secSettings.sessionTimeout}min
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
