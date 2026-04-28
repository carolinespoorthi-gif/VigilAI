import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';

const PROFILE_KEY = 'vigilai_profile';

const loadProfile = () => {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { name: 'Admin User', email: 'admin@vigilai.com', role: 'Compliance Manager', phone: '', department: '' };
};

const persistProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('profile:updated', { detail: profile }));
    return true;
  } catch { return false; }
};

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(loadProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === PROFILE_KEY && e.newValue) {
        try { setUser(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const validate = () => {
    if (!user.name.trim()) return 'Full name is required.';
    if (!user.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) return 'Valid email is required.';
    return '';
  };

  const handleSave = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    setTimeout(() => {
      const ok = persistProfile(user);
      setSaving(false);
      if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3500); }
      else setError('Failed to save. Please try again.');
    }, 600);
  };

  const handleChange = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }));
    if (saved) setSaved(false);
    if (error) setError('');
  };

  const initials = (user.name || '').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Button variant="ghost" className="-ml-3 mb-2 text-muted-foreground" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and roles. Changes persist after refresh.</p>
        </div>

        <div className="flex items-center gap-5 mb-8 p-6 bg-card border border-border rounded-xl">
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #4F7C82, #00D4AA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <div className="text-xl font-semibold text-foreground">{user.name || 'Your Name'}</div>
            <div className="text-sm text-muted-foreground">{user.email || 'your@email.com'}</div>
            <div className="text-xs text-muted-foreground mt-1">{user.role} {user.department ? `· ${user.department}` : ''}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626',
              borderRadius:8, padding:'12px 16px', fontSize:14 }}>{error}</div>
          )}
          {saved && (
            <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#16A34A',
              borderRadius:8, padding:'12px 16px', fontSize:14, display:'flex', gap:8, alignItems:'center' }}>
              <span>✓</span> Profile saved! Changes reflect immediately across the app.
            </div>
          )}

          {[
            { label: 'Full Name *', field: 'name', type: 'text', placeholder: 'Enter your full name' },
            { label: 'Email Address *', field: 'email', type: 'email', placeholder: 'your@email.com' },
            { label: 'Phone Number', field: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
            { label: 'Department', field: 'department', type: 'text', placeholder: 'e.g. Compliance & Risk' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-foreground mb-2">{label}</label>
              <input type={type} className="w-full border border-border rounded-lg p-3 bg-background text-foreground"
                value={user[field] || ''} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Primary Role</label>
            <select className="w-full border border-border rounded-lg p-3 bg-background text-foreground"
              value={user.role} onChange={e => handleChange('role', e.target.value)}>
              <option>Compliance Manager</option>
              <option>Security Analyst</option>
              <option>Admin</option>
              <option>Read-Only Auditor</option>
              <option>Data Protection Officer</option>
              <option>Risk Manager</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-border mt-8">
            <span className="text-xs text-muted-foreground">Stored in localStorage — persists after refresh</span>
            <Button className="px-8 py-3" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
