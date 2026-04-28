import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, register } = useAuth();

    // Default to user if not specified
    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'user';
    const [activeRole, setActiveRole] = useState(initialRole);
    const [isRegistering, setIsRegistering] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Effect to check for remembered username
    useEffect(() => {
        const savedUsername = localStorage.getItem('rememberedUsername');
        if (savedUsername) {
            setFormData(prev => ({ ...prev, username: savedUsername }));
            setRememberMe(true);
        }
    }, []);

    useEffect(() => {
        const role = searchParams.get('role');
        if (role === 'admin' || role === 'user') {
            setActiveRole(role);
            // Reset registering state and messages when switching roles
            setIsRegistering(false);
            setError('');
            setSuccessMessage('');
        }
    }, [searchParams]);

    const handleSwitch = (role) => {
        setActiveRole(role);
        setIsRegistering(false);
        setError('');
        setSuccessMessage('');
        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
        navigate(`/login?role=${role}`, { replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            if (isRegistering) {
                if (formData.password.length < 8) {
                    throw new Error("Password must be at least 8 characters");
                }
                if (formData.password.length > 70) {
                    throw new Error("Password is too long (Max 70 characters)");
                }
                if (formData.password !== formData.confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                await register(formData.username, formData.email, formData.password, activeRole);

                // Clear form but keep username for convenience
                const registeredUsername = formData.username;
                setFormData({ username: registeredUsername, email: '', password: '', confirmPassword: '' });

                // Redirect logic: Switch to login view
                setIsRegistering(false);
                setSuccessMessage("Account created successfully! Please sign in with your password.");
            } else {
                await login(formData.username, formData.password, rememberMe);

                if (rememberMe) {
                    localStorage.setItem('rememberedUsername', formData.username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }

                // Redirect based on role to the oroginal dashboard pages
                if (activeRole === 'admin') {
                    navigate('/admin-dashboard');
                } else {
                    navigate('/user-dashboard');
                }
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.message || "Network Error: Could not connect to server.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen overflow-hidden relative"
             style={{ background: '#061A1E' }}>
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-1/2 h-full bg-indigo-900/10"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-purple-900/10"></div>
            </div>

            {/* ERROR TOAST */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg"
                    >
                        <AlertCircle size={18} />
                        {error}
                    </motion.div>
                )}
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/50 text-emerald-200 px-6 py-3 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg"
                    >
                        <Shield size={18} className="text-emerald-400" />
                        {successMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* VIGIL AI LOGO */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex justify-center w-full pointer-events-none">
                <img src="/assets/vigilai-logo.png" alt="Vigil AI Logo" className="h-16 object-contain drop-shadow-2xl" />
            </div>

            {/* LEFT PANEL - USER */}
            <div
                className={`w-1/2 relative transition-all duration-700 flex flex-col items-center justify-center p-4 md:p-12 cursor-pointer ${activeRole === 'user' ? 'opacity-100 blur-0 scale-100 cursor-default' : 'opacity-30 blur-sm scale-95 grayscale hover:opacity-50 hover:scale-[0.97]'
                    }`}
                onClick={() => activeRole !== 'user' && handleSwitch('user')}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-900 to-indigo-900/20 -z-10"></div>

                <motion.div
                    layout
                    className={`w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${activeRole === 'user' ? 'ring-2 ring-indigo-500/50 shadow-indigo-500/20' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-indigo-500/20 rounded-xl">
                            <User className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">User Portal</h2>
                            <p className="text-indigo-300/60 text-sm">Access your compliance tools</p>
                        </div>
                    </div>

                    {activeRole === 'user' ? (
                        <AuthForm
                            isRegistering={isRegistering}
                            setIsRegistering={setIsRegistering}
                            formData={formData}
                            setFormData={setFormData}
                            handleSubmit={handleSubmit}
                            loading={loading}
                            color="indigo"
                            rememberMe={rememberMe}
                            setRememberMe={setRememberMe}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-indigo-300/50 mb-4 font-light tracking-wide">Click to access User Login</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* RIGHT PANEL - ADMIN */}
            <div
                className={`w-1/2 relative transition-all duration-700 flex flex-col items-center justify-center p-4 md:p-12 cursor-pointer ${activeRole === 'admin' ? 'opacity-100 blur-0 scale-100 cursor-default' : 'opacity-30 blur-sm scale-95 grayscale hover:opacity-50 hover:scale-[0.97]'
                    }`}
                onClick={() => activeRole !== 'admin' && handleSwitch('admin')}
            >
                <div className="absolute inset-0 bg-gradient-to-bl from-purple-900/20 via-slate-900 to-purple-900/20 -z-10"></div>

                <motion.div
                    layout
                    className={`w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${activeRole === 'admin' ? 'ring-2 ring-purple-500/50 shadow-purple-500/20' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Shield className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Admin Console</h2>
                            <p className="text-purple-300/60 text-sm">System oversight & control</p>
                        </div>
                    </div>

                    {activeRole === 'admin' ? (
                        <AuthForm
                            role="admin"
                            isRegistering={false} // Admin registration disabled in UI
                            setIsRegistering={() => { }}
                            formData={formData}
                            setFormData={setFormData}
                            handleSubmit={handleSubmit}
                            loading={loading}
                            color="purple"
                            rememberMe={rememberMe}
                            setRememberMe={setRememberMe}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-purple-300/50 mb-4 font-light tracking-wide">Click to access Admin Login</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Back to Home */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors z-50 flex items-center gap-2"
            >
                <span>←</span> Back
            </button>
        </div>
    );
};

const AuthForm = ({ isRegistering, setIsRegistering, formData, setFormData, handleSubmit, loading, color, role, rememberMe, setRememberMe }) => {
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Dynamic styles based on color prop
    const activeBorder = color === 'indigo' ? 'focus:border-indigo-400' : 'focus:border-purple-400';
    const activeShadow = color === 'indigo' ? 'focus:shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'focus:shadow-[0_0_15px_rgba(168,85,247,0.3)]';
    const iconColor = color === 'indigo' ? 'text-indigo-400' : 'text-purple-400';
    const btnClass = color === 'indigo'
        ? 'bg-teal-700 hover:bg-teal-600 shadow-teal-500/20'
        : 'bg-teal-800 hover:bg-teal-700 shadow-teal-500/20';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none transition-all ${activeBorder} ${activeShadow}`}
                    required
                />
            </div>

            {isRegistering && (
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none transition-all ${activeBorder} ${activeShadow}`}
                        required
                    />
                </div>
            )}

            <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none transition-all ${activeBorder} ${activeShadow}`}
                    required
                    minLength={6}
                />
            </div>

            {isRegistering && (
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none transition-all ${activeBorder} ${activeShadow}`}
                        required
                    />
                </div>
            )}

            {!isRegistering && (
                <div className="flex justify-between items-center text-xs text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className={`rounded bg-slate-800 border-slate-700 ${color === 'indigo' ? 'text-indigo-600' : 'text-purple-600'} focus:ring-0`}
                        />
                        Remember me
                    </label>
                    <button
                        type="button"
                        onClick={async () => {

                            const username = prompt("Enter your username");
                            const newPassword = prompt("Enter new password");

                            if (!username || !newPassword) return;

                            try {
                                const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
                                await fetch(`${API_BASE}/auth/reset-password`, {
                                    method: "POST",

                                    headers: {
                                        "Content-Type": "application/json"
                                    },

                                    body: JSON.stringify({
                                        username: username,
                                        password: newPassword
                                    })
                                });

                                alert("Password reset successful");

                            } catch {

                                alert("Password reset failed");

                            }

                        }}
                        className="hover:text-white transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${btnClass} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        {isRegistering ? 'CREATE ACCOUNT' : 'LOGIN'}
                        <ArrowRight size={18} />
                    </>
                )}
            </button>

            {role !== 'admin' && (
                <div className="text-center mt-6">
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className={`text-sm hover:text-white transition-colors ${iconColor} opacity-80 hover:opacity-100`}
                    >
                        {isRegistering ? "Already have an account? Login" : "Don't have an account? Create one"}
                    </button>
                </div>
            )}
        </form>
    );
};

export default Login;
