import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   VIGIL AI — LANDING PAGE
   Dark teal palette, editorial layout, scroll animations
═══════════════════════════════════════════════════════════════ */

const COLORS = {
  bg:       '#040E10',
  surface:  '#061A1E',
  card:     '#0B2E33',
  border:   '#163840',
  teal:     '#4F7C82',
  tealBright:'#5EAEB5',
  accent:   '#00D4AA',
  accentDim:'#00A884',
  text:     '#E2EDF0',
  muted:    '#6B9BA2',
  white:    '#FFFFFF',
};

/* ─── Utility: section reveal ─────────────────────────────── */
const Reveal = ({ children, delay = 0, direction = 'up', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0, x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0 },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div ref={ref} className={className} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={variants} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
};

/* ─── GRID BG ─────────────────────────────────────────────── */
const GridBg = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke={COLORS.teal} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    {/* Glow orbs */}
    <div style={{ position:'absolute', top:'10%', left:'20%', width:600, height:600,
      background:`radial-gradient(circle, ${COLORS.teal}15 0%, transparent 70%)`, borderRadius:'50%' }} />
    <div style={{ position:'absolute', bottom:'20%', right:'10%', width:400, height:400,
      background:`radial-gradient(circle, ${COLORS.accent}10 0%, transparent 70%)`, borderRadius:'50%' }} />
  </div>
);

/* ─── NAV ─────────────────────────────────────────────────── */
const Nav = ({ onGetStarted }) => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', v => setScrolled(v > 50));
    return unsub;
  }, [scrollY]);

  return (
    <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem',
        background: scrolled ? `${COLORS.surface}EE` : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${COLORS.border}` : '1px solid transparent',
        transition: 'all 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.accent})`,
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <span style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700,
          color: COLORS.white, letterSpacing: '-0.5px' }}>Vigil AI</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <NavLink href="#features">Features</NavLink>
        <NavLink href="#how-it-works">How it Works</NavLink>
        <NavLink href="#use-cases">Use Cases</NavLink>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => window.location.href = '/select-role'}
          style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${COLORS.border}`,
            color: COLORS.text, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
          Sign In
        </motion.button>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onGetStarted}
          style={{ padding: '8px 20px', background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.accent})`,
            border: 'none', color: COLORS.white, borderRadius: 8, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
          Get Started
        </motion.button>
      </div>
    </motion.nav>
  );
};

const NavLink = ({ href, children }) => (
  <a href={href} style={{ color: COLORS.muted, textDecoration: 'none', padding: '6px 14px',
    borderRadius: 6, fontSize: 14, transition: 'color 0.2s' }}
    onMouseEnter={e => e.target.style.color = COLORS.text}
    onMouseLeave={e => e.target.style.color = COLORS.muted}>
    {children}
  </a>
);

/* ─── HERO VIDEO ──────────────────────────────────────────── */
const HeroVideo = () => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const hasInteracted = useRef(false);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      if (videoRef.current) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
      document.removeEventListener('click', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, []);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      hasInteracted.current = true;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto 2.5rem',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: `0 0 60px ${COLORS.teal}30, 0 20px 60px rgba(0,0,0,0.5)`,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <video
        ref={videoRef}
        src="/videos/hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 16 }}
      />
      <button
        onClick={toggleSound}
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: `1px solid ${COLORS.border}`,
          color: COLORS.white,
          fontSize: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          backdropFilter: 'blur(4px)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </motion.div>
  );
};

/* ─── HERO ────────────────────────────────────────────────── */
const Hero = ({ onGetStarted }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '8rem 2rem 4rem', position: 'relative', overflow: 'hidden',
      background: COLORS.bg }}>
      <GridBg />

      <motion.div style={{ y, opacity, position: 'relative', zIndex: 2, maxWidth: 800, width: '100%' }}>
        {/* Hero Video */}
        <HeroVideo />

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            background: `${COLORS.teal}20`, border: `1px solid ${COLORS.teal}40`,
            borderRadius: 100, marginBottom: '2rem' }}>
          <div style={{ width: 8, height: 8, background: COLORS.accent, borderRadius: '50%',
            boxShadow: `0 0 8px ${COLORS.accent}` }} />
          <span style={{ color: COLORS.tealBright, fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}>
            AI-Powered Compliance Guardian
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            fontWeight: 700, color: COLORS.white, lineHeight: 1.1, marginBottom: '1.5rem',
            letterSpacing: '-1px' }}>
          Stay Compliant.
          <br />
          <span style={{ background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Stay Ahead.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ fontSize: 18, color: COLORS.muted, lineHeight: 1.7, maxWidth: 600,
            margin: '0 auto 2.5rem', fontFamily: 'inherit' }}>
          Vigil AI automatically detects PII, maps regulatory violations across GDPR, HIPAA,
          ISO 27001 & NAAC, and generates enterprise-grade compliance reports — in seconds.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button whileHover={{ scale: 1.04, boxShadow: `0 0 30px ${COLORS.accent}40` }}
            whileTap={{ scale: 0.97 }} onClick={onGetStarted}
            style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.accent})`,
              border: 'none', color: COLORS.white, borderRadius: 10, cursor: 'pointer',
              fontSize: 16, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '14px 32px', background: 'transparent', border: `1px solid ${COLORS.border}`,
              color: COLORS.text, borderRadius: 10, cursor: 'pointer', fontSize: 16, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            View Demo
          </motion.button>
        </motion.div>

        {/* Trust badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: '3rem',
            flexWrap: 'wrap' }}>
          {['GDPR', 'HIPAA', 'ISO 27001', 'PCI-DSS', 'NAAC'].map(badge => (
            <div key={badge} style={{ padding: '4px 14px', background: `${COLORS.card}`, border: `1px solid ${COLORS.border}`,
              borderRadius: 6, color: COLORS.muted, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {badge}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          style={{ width: 24, height: 38, border: `2px solid ${COLORS.border}`, borderRadius: 12,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6 }}>
          <div style={{ width: 4, height: 8, background: COLORS.teal, borderRadius: 2 }} />
        </motion.div>
      </motion.div>
    </section>
  );
};

/* ─── PROBLEM SECTION ─────────────────────────────────────── */
const ProblemSection = () => (
  <section style={{ padding: '6rem 2rem', background: COLORS.surface, position: 'relative' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontFamily: 'inherit' }}>The Problem</span>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: COLORS.white, marginTop: '0.75rem', lineHeight: 1.2 }}>
            Compliance is Broken.<br />And It's Getting Worse.
          </h2>
        </div>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {[
          { stat: '€4.6B', label: 'GDPR fines issued globally since 2018', icon: '⚠️' },
          { stat: '83%', label: 'Of organizations lack real-time PII detection', icon: '🔍' },
          { stat: '200+', label: 'Hours spent per compliance audit cycle', icon: '⏱️' },
          { stat: '1 in 3', label: 'Data breaches involve undetected PII exposure', icon: '🔓' },
        ].map((item, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div style={{ padding: '2rem', background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.accent})` }} />
              <div style={{ fontSize: 32, marginBottom: '0.75rem' }}>{item.icon}</div>
              <div style={{ fontFamily: "'Georgia', serif", fontSize: 36, fontWeight: 700,
                color: COLORS.accent, lineHeight: 1 }}>{item.stat}</div>
              <p style={{ color: COLORS.muted, fontSize: 14, marginTop: '0.5rem',
                lineHeight: 1.6, fontFamily: 'inherit' }}>{item.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ─── SOLUTION SECTION ────────────────────────────────────── */
const SolutionSection = () => (
  <section style={{ padding: '6rem 2rem', background: COLORS.bg, position: 'relative' }}>
    <GridBg />
    <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <Reveal direction="right">
          <div>
            <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'inherit' }}>The Solution</span>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              color: COLORS.white, marginTop: '0.75rem', lineHeight: 1.2 }}>
              Intelligent Compliance,<br />Automated End-to-End
            </h2>
            <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.8, marginTop: '1rem',
              fontFamily: 'inherit' }}>
              Vigil AI continuously monitors your documents, databases, and data streams —
              detecting PII, mapping violations to global frameworks, and generating
              audit-ready reports automatically.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Context-aware PII detection, not just regex patterns',
                'Real-time risk scoring across 5+ regulatory frameworks',
                'Structured 13-section compliance reports with before/after analysis',
                'Automated remediation guidance with priority ranking'].map((pt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 20, height: 20, background: `${COLORS.accent}20`,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <span style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.6, fontFamily: 'inherit' }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.15}>
          <div style={{ position: 'relative' }}>
            {/* Animated compliance card mockup */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: 16, padding: '1.5rem', boxShadow: `0 24px 80px ${COLORS.teal}15` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
                <span style={{ marginLeft: 8, color: COLORS.muted, fontSize: 12, fontFamily: 'monospace' }}>
                  compliance_scan.py
                </span>
              </div>
              {[
                { label: 'Risk Level', value: 'MEDIUM', color: '#d97706' },
                { label: 'Compliance Score', value: '72/100', color: COLORS.tealBright },
                { label: 'PII Detected', value: '14 entities', color: '#dc2626' },
                { label: 'Regulations Mapped', value: 'GDPR, ISO 27001', color: COLORS.accent },
              ].map((row, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                    borderBottom: i < 3 ? `1px solid ${COLORS.border}` : 'none' }}>
                  <span style={{ color: COLORS.muted, fontSize: 13, fontFamily: 'inherit' }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{row.value}</span>
                </motion.div>
              ))}
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.accent }} />
                <span style={{ color: COLORS.accent, fontSize: 12, fontFamily: 'monospace' }}>
                  Analyzing document... 87% complete
                </span>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ─── FEATURES SECTION ────────────────────────────────────── */
const FeaturesSection = () => {
  const features = [
    { icon: '🔍', title: 'Deep PII Detection', desc: 'Identifies 20+ PII types including Aadhaar, SSN, credit cards, emails, health data, API keys, and more — with context-aware validation.' },
    { icon: '⚖️', title: 'Multi-Framework Compliance', desc: 'Maps findings to GDPR, HIPAA, ISO 27001, PCI-DSS, NAAC Criterion 4, and CCPA simultaneously — no manual mapping required.' },
    { icon: '📊', title: '13-Section Reports', desc: 'Generates structured audit reports with Executive Summary, Findings, Before/After Analysis, Graphical Charts, and Recommendations.' },
    { icon: '🛡️', title: 'Real-Time Risk Scoring', desc: 'Context-aware scoring based on entity combinations, exposure patterns, and unsafe context detection — not just keyword matching.' },
    { icon: '🔧', title: 'Automated Remediation', desc: 'Prioritized remediation actions with immediate, short-term, and long-term plans per regulation — ready for your team to act on.' },
    { icon: '👁️', title: 'Role-Based Access', desc: 'Separate Admin and User portals with JWT authentication, activity logging, and granular permission controls.' },
  ];

  return (
    <section id="features" style={{ padding: '6rem 2rem', background: COLORS.surface }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'inherit' }}>Features</span>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: COLORS.white, marginTop: '0.75rem' }}>
              Everything Compliance Needs
            </h2>
            <p style={{ color: COLORS.muted, maxWidth: 520, margin: '1rem auto 0',
              fontSize: 16, lineHeight: 1.7, fontFamily: 'inherit' }}>
              Built for compliance teams, security analysts, and data protection officers
              who need precision — not approximations.
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <motion.div whileHover={{ y: -4, boxShadow: `0 20px 60px ${COLORS.teal}15` }}
                style={{ padding: '1.75rem', background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, cursor: 'default', transition: 'border-color 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.teal}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ color: COLORS.white, fontSize: 18, fontWeight: 600,
                  fontFamily: "'Georgia', serif", marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7,
                  fontFamily: 'inherit' }}>{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── HOW IT WORKS ────────────────────────────────────────── */
const HowItWorks = () => {
  const steps = [
    { num: '01', title: 'Upload or Connect', desc: 'Upload documents, paste text, capture with camera, or connect your data sources via URL.' },
    { num: '02', title: 'AI Scans & Classifies', desc: 'The PII Engine detects entities using regex + NER, classifies risks, and maps violations to regulatory frameworks.' },
    { num: '03', title: 'Review Risk Analysis', desc: 'Get a detailed risk score with section-wise reasoning: why each risk is assigned, what data was found, which rules are violated.' },
    { num: '04', title: 'Generate & Export', desc: 'Download structured 13-section PDF/DOCX reports. Compliant documents get full reports; non-compliant ones show fix requirements.' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '6rem 2rem', background: COLORS.bg, position: 'relative' }}>
      <GridBg />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'inherit' }}>How It Works</span>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: COLORS.white, marginTop: '0.75rem' }}>
              From Upload to Report in Minutes
            </h2>
          </div>
        </Reveal>

        <div style={{ position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: 60, left: '12.5%', right: '12.5%', height: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.teal}, ${COLORS.accent}, transparent)`,
            opacity: 0.4, display: 'none' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {steps.map((step, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <motion.div whileHover={{ scale: 1.05 }}
                    style={{ width: 64, height: 64, margin: '0 auto 1rem',
                      background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.teal}30)`,
                      border: `2px solid ${COLORS.border}`, borderRadius: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 700,
                      color: COLORS.accent }}>{step.num}</span>
                  </motion.div>
                  <h3 style={{ color: COLORS.white, fontSize: 17, fontWeight: 600,
                    fontFamily: "'Georgia', serif", marginBottom: '0.5rem' }}>{step.title}</h3>
                  <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit' }}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── USE CASES ───────────────────────────────────────────── */
const UseCases = () => {
  const cases = [
    { title: 'Healthcare', icon: '🏥', tags: ['HIPAA', 'GDPR'], desc: 'Protect patient records, detect PHI exposure in medical documents, and ensure HIPAA compliance automatically.' },
    { title: 'Financial Services', icon: '🏦', tags: ['PCI-DSS', 'GDPR'], desc: 'Scan for credit card data, SSNs, and financial identifiers. Enforce PCI-DSS data security across all systems.' },
    { title: 'Education & NAAC', icon: '🎓', tags: ['NAAC', 'ISO 27001'], desc: 'Audit infrastructure documents for NAAC Criterion 4 compliance across ICT, library, and maintenance sub-criteria.' },
    { title: 'Enterprise IT', icon: '💻', tags: ['ISO 27001', 'GDPR'], desc: 'Monitor codebases, configs, and databases for API keys, passwords, and sensitive credentials before deployment.' },
  ];

  return (
    <section id="use-cases" style={{ padding: '6rem 2rem', background: COLORS.surface }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: 'inherit' }}>Use Cases</span>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: COLORS.white, marginTop: '0.75rem' }}>
              Built for Every Industry
            </h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {cases.map((c, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div whileHover={{ y: -4 }}
                style={{ padding: '1.75rem', background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 14 }}>
                <div style={{ fontSize: 36, marginBottom: '1rem' }}>{c.icon}</div>
                <h3 style={{ color: COLORS.white, fontSize: 18, fontWeight: 600,
                  fontFamily: "'Georgia', serif", marginBottom: '0.5rem' }}>{c.title}</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {c.tags.map(tag => (
                    <span key={tag} style={{ padding: '2px 10px', background: `${COLORS.teal}20`,
                      border: `1px solid ${COLORS.teal}40`, borderRadius: 100,
                      color: COLORS.tealBright, fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit' }}>{c.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── DASHBOARD PREVIEW ───────────────────────────────────── */
const DashboardPreview = () => (
  <section style={{ padding: '6rem 2rem', background: COLORS.bg, position: 'relative', overflow: 'hidden' }}>
    <GridBg />
    <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontFamily: 'inherit' }}>Dashboard</span>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: COLORS.white, marginTop: '0.75rem' }}>
            See Your Compliance at a Glance
          </h2>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 20, padding: '1.5rem', boxShadow: `0 40px 120px ${COLORS.teal}15` }}>
          {/* Fake browser chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
            {['#FF5F57','#FEBC2E','#28C840'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
            <div style={{ flex: 1, background: COLORS.surface, borderRadius: 6, padding: '4px 12px',
              marginLeft: 8, maxWidth: 300 }}>
              <span style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'monospace' }}>
                app.vigilai.com/dashboard
              </span>
            </div>
          </div>

          {/* Dashboard widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Total Scans', value: '247', change: '+12%', color: COLORS.tealBright },
              { label: 'High Risk Items', value: '8', change: '-3 this week', color: '#dc2626' },
              { label: 'Avg Compliance', value: '84%', change: '+5% this month', color: '#16a34a' },
              { label: 'Violations Found', value: '23', change: 'GDPR, PCI-DSS', color: '#d97706' },
            ].map((widget, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                style={{ background: COLORS.surface, borderRadius: 10, padding: '1rem',
                  border: `1px solid ${COLORS.border}` }}>
                <div style={{ color: COLORS.muted, fontSize: 11, fontFamily: 'inherit',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {widget.label}
                </div>
                <div style={{ color: widget.color, fontSize: 24, fontWeight: 700,
                  fontFamily: "'Georgia', serif" }}>{widget.value}</div>
                <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 4, fontFamily: 'inherit' }}>
                  {widget.change}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Fake chart area */}
          <div style={{ background: COLORS.surface, borderRadius: 10, padding: '1rem',
            border: `1px solid ${COLORS.border}`, height: 120, position: 'relative', overflow: 'hidden' }}>
            <span style={{ color: COLORS.muted, fontSize: 12, fontFamily: 'inherit' }}>
              Compliance Score Trend (Last 30 Days)
            </span>
            <svg width="100%" height="80" viewBox="0 0 600 80" style={{ position: 'absolute', bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,60 C100,50 150,40 200,35 S320,20 400,25 S500,15 600,10"
                stroke={COLORS.accent} strokeWidth="2" fill="none" />
              <path d="M0,60 C100,50 150,40 200,35 S320,20 400,25 S500,15 600,10 L600,80 L0,80Z"
                fill="url(#chartGrad)" />
            </svg>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ─── CTA SECTION ─────────────────────────────────────────── */
const CTASection = ({ onGetStarted }) => (
  <section style={{ padding: '6rem 2rem', background: COLORS.surface, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 300, background: `radial-gradient(ellipse, ${COLORS.teal}20 0%, transparent 70%)` }} />
    </div>
    <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <Reveal>
        <h2 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          color: COLORS.white, lineHeight: 1.15, marginBottom: '1.5rem' }}>
          Ready to Automate Your Compliance?
        </h2>
        <p style={{ color: COLORS.muted, fontSize: 16, lineHeight: 1.7, marginBottom: '2rem',
          fontFamily: 'inherit' }}>
          Join compliance teams already using Vigil AI to detect, report, and remediate
          PII violations — before they become penalties.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button whileHover={{ scale: 1.04, boxShadow: `0 0 40px ${COLORS.accent}40` }}
            whileTap={{ scale: 0.97 }} onClick={onGetStarted}
            style={{ padding: '16px 40px', background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.accent})`,
              border: 'none', color: COLORS.white, borderRadius: 12, cursor: 'pointer',
              fontSize: 16, fontWeight: 600, fontFamily: 'inherit' }}>
            Start For Free →
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = '/select-role'}
            style={{ padding: '16px 40px', background: 'transparent', border: `1px solid ${COLORS.border}`,
              color: COLORS.text, borderRadius: 12, cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>
            Sign In
          </motion.button>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ─── FOOTER ──────────────────────────────────────────────── */
const Footer = () => (
  <footer style={{ background: COLORS.bg, borderTop: `1px solid ${COLORS.border}`,
    padding: '3rem 2rem' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 40,
        marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.accent})`,
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
              </svg>
            </div>
            <span style={{ color: COLORS.white, fontFamily: "'Georgia', serif", fontSize: 18, fontWeight: 700 }}>
              Vigil AI
            </span>
          </div>
          <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit' }}>
            AI-powered compliance guardian for the modern enterprise.
          </p>
        </div>
        {[
          { title: 'Product', links: ['Features', 'How It Works', 'Use Cases', 'Dashboard'] },
          { title: 'Compliance', links: ['GDPR', 'HIPAA', 'ISO 27001', 'PCI-DSS', 'NAAC'] },
          { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
        ].map(col => (
          <div key={col.title}>
            <h4 style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, marginBottom: '0.75rem',
              textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'inherit' }}>
              {col.title}
            </h4>
            {col.links.map(link => (
              <div key={link} style={{ marginBottom: 8 }}>
                <span style={{ color: COLORS.muted, fontSize: 13, cursor: 'pointer',
                  transition: 'color 0.2s', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.target.style.color = COLORS.text}
                  onMouseLeave={e => e.target.style.color = COLORS.muted}>
                  {link}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: COLORS.muted, fontSize: 13, fontFamily: 'inherit' }}>
          © 2026 Vigil AI. All rights reserved.
        </span>
        <span style={{ color: COLORS.muted, fontSize: 13, fontFamily: 'inherit' }}>
          Built with ♥ for Compliance Teams
        </span>
      </div>
    </div>
  </footer>
);

/* ─── MAIN LANDING PAGE ───────────────────────────────────── */
const LandingPage = () => {
  const navigate = useNavigate();
  const handleGetStarted = () => navigate('/select-role');

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Nav onGetStarted={handleGetStarted} />
      <Hero onGetStarted={handleGetStarted} />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <HowItWorks />
      <UseCases />
      <DashboardPreview />
      <CTASection onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
};

export default LandingPage;
