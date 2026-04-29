import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RoleSelection = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
             style={{ background: '#061A1E' }}>
            {/* Brand background glows */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 opacity-20"
                     style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 40%, #4F7C82, transparent)' }} />
                <div className="absolute inset-0 opacity-15"
                     style={{ background: 'radial-gradient(ellipse 50% 60% at 70% 60%, #0B2E33, transparent)' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 text-center mb-16 flex flex-col items-center"
            >
                <img src="/assets/images/vigilai-logo.png" alt="Vigil AI Logo" className="h-28 object-contain mb-2 drop-shadow-2xl" style={{ background: 'transparent' }} />
                <p className="text-xl text-slate-400 tracking-[0.3em] uppercase font-light mt-4">AI Compliance Platform</p>
            </motion.div>

            <div className="z-10 flex flex-col md:flex-row gap-8 items-center">
                <RoleCard
                    role="USER"
                    description="Upload documents & Generate Reports"
                    onClick={() => navigate('/login?role=user')}
                    delay={0.2}
                    color="from-teal-500 to-cyan-400"
                />
                <RoleCard
                    role="ADMIN"
                    description="System Management & Oversight"
                    onClick={() => navigate('/login?role=admin')}
                    delay={0.4}
                    color="from-teal-700 to-teal-500"
                />
            </div>

            <div className="absolute bottom-8 text-slate-600 text-sm flex flex-col items-center gap-2">
                <span>Vigil AI © 2026</span>
                <button onClick={() => navigate('/landing')}
                    className="text-slate-500 hover:text-slate-400 underline text-xs transition-colors">
                    Learn more about Vigil AI
                </button>
            </div>
        </div>
    );
};

const RoleCard = ({ role, description, onClick, delay, color }) => (
    <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139, 92, 246, 0.2)" }}
        whileTap={{ scale: 0.95 }}
        transition={{ delay, duration: 0.3 }}
        onClick={onClick}
        className="w-80 h-56 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 flex flex-col items-center justify-center group hover:border-slate-500/50 transition-all duration-300 relative overflow-hidden"
    >
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

        <span className="text-3xl font-bold text-white mb-3 tracking-wider group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
            {role}
        </span>
        <span className="text-slate-400 text-sm font-light">{description}</span>
    </motion.button>
);

export default RoleSelection;
