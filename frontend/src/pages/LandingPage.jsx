// src/pages/LandingPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TYPING_TEXTS = [
  'brainstorm ideas',
  'design workflows',
  'sketch diagrams',
  'plan sprints',
  'teach concepts',
];

// Typing effect hook
const useTypingEffect = (texts, typingSpeed = 100, deletingSpeed = 50, pause = 2000) => {
  const [text, setText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < current.length) {
          setText(current.slice(0, text.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pause]);

  return text;
};

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const typingText = useTypingEffect(TYPING_TEXTS);

  // Scroll reveal setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: '⚡',
      title: 'Real-time Sync',
      description: 'Sub-100ms latency via WebSockets. Every stroke syncs instantly across all users.',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: '🎨',
      title: '11 Drawing Tools',
      description: 'Pen, shapes, arrows, sticky notes, text with 6 fonts. Full control over your canvas.',
      gradient: 'from-pink-500 to-purple-500',
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Discuss while you create. Typing indicators, message history, emoji support.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '🖱',
      title: 'Live Cursors',
      description: 'See exactly where teammates are working. Named cursors with unique colors.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: '📄',
      title: 'PDF Export',
      description: 'Export beautiful PDFs of your boards. Perfect for presentations and documentation.',
      gradient: 'from-red-500 to-rose-500',
    },
    {
      icon: '🔒',
      title: 'Enterprise-grade Security',
      description: 'JWT auth, sliding window rate limiting, OTP password reset, session invalidation.',
      gradient: 'from-indigo-500 to-violet-500',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Create account',
      description: 'Sign up with your email. No credit card required.',
      icon: '👤',
    },
    {
      number: '02',
      title: 'Create your board',
      description: 'Click "New Board" and start drawing immediately.',
      icon: '🎨',
    },
    {
      number: '03',
      title: 'Share the link',
      description: 'Anyone with the link can join and collaborate live.',
      icon: '🚀',
    },
  ];

  const techStack = [
    { name: 'React', icon: '⚛️' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'MongoDB', icon: '🍃' },
    { name: 'Socket.io', icon: '🔌' },
    { name: 'Redis', icon: '🔴' },
    { name: 'JWT', icon: '🔑' },
    { name: 'Tailwind', icon: '💨' },
    { name: 'Vite', icon: '⚡' },
  ];

  const highlights = [
    {
      icon: '⚡',
      value: '<100ms',
      label: 'Sync latency',
    },
    {
      icon: '🎨',
      value: '4000×2500',
      label: 'Canvas dimensions',
    },
    {
      icon: '🔐',
      value: 'Multi-layer',
      label: 'Security architecture',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-aurora-animated relative overflow-hidden">
      {/* Floating aurora blobs */}
      <div className="aurora-blob aurora-blob-1"></div>
      <div className="aurora-blob aurora-blob-2"></div>
      <div className="aurora-blob aurora-blob-3"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern pointer-events-none"></div>

      {/* ═══════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-primary/10 backdrop-blur-sm border border-primary/30 rounded-full animate-bounce-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-live-pulse"></span>
          <span className="text-sm text-primary font-medium">
            🎨 Open-source collaborative whiteboard
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight animate-fade-in-up">
          <span className="block mb-2">Draw. Collaborate.</span>
          <span className="block">
            <span className="gradient-text-animated">Create together.</span>
          </span>
        </h1>

        {/* Typing subtitle */}
        <div
          className="text-xl md:text-2xl text-slate-300 mb-10 h-16 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          A real-time whiteboard to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 font-semibold">
            {typingText}
          </span>
          <span className="typing-cursor"></span>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up"
          style={{ animationDelay: '0.4s' }}
        >
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="pulse-ring inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold text-lg rounded-xl transition-all shadow-2xl shadow-primary/40"
            >
              Go to Dashboard <span>→</span>
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="pulse-ring inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold text-lg rounded-xl transition-all shadow-2xl shadow-primary/40 animate-glow-pulse"
              >
                Get Started Free <span>🚀</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-10 py-5 bg-canvas-surface/70 backdrop-blur-sm hover:bg-canvas-surface text-white font-semibold text-lg rounded-xl transition-all border border-canvas-border hover:border-primary/50"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Honest tagline */}
        <p
          className="text-sm text-slate-500 animate-fade-in-up"
          style={{ animationDelay: '0.6s' }}
        >
          Free forever · No credit card required · Setup in 30 seconds
        </p>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* PERFORMANCE HIGHLIGHTS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-8 reveal">
          <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">
            Built for performance
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="reveal text-center p-6 bg-canvas-surface/50 backdrop-blur-sm border border-canvas-border rounded-2xl hover-bloom"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-4xl mb-3">{h.icon}</div>
              <div className="text-2xl font-bold gradient-text-animated mb-1">
                {h.value}
              </div>
              <p className="text-slate-400 text-sm">{h.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* FEATURES */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 reveal">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to{' '}
            <span className="gradient-text-animated">collaborate</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Powerful features that make remote collaboration feel like being in the same room.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="reveal group relative p-6 bg-canvas-surface/70 backdrop-blur-sm border border-canvas-border rounded-2xl hover-bloom cursor-pointer overflow-hidden"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl`}
              ></div>

              <div className="relative">
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                >
                  <span className="text-3xl">{feature.icon}</span>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>

                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl`}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* HOW IT WORKS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 reveal">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get started in <span className="gradient-text-animated">3 simple steps</span>
          </h2>
          <p className="text-slate-400 text-lg">
            From signup to your first collaborative board in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

          {steps.map((step, i) => (
            <div
              key={i}
              className="reveal relative text-center"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-xl shadow-primary/40 mb-4 relative z-10">
                <span className="text-2xl">{step.icon}</span>
              </div>
              <div className="text-xs font-bold text-primary/60 mb-2">
                STEP {step.number}
              </div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* TECH STACK — Interview Gold */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12 reveal">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powered by <span className="gradient-text-animated">modern tech</span>
          </h2>
          <p className="text-slate-400">
            Full-stack MERN application with real-time capabilities.
          </p>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {techStack.map((tech, i) => (
            <div
              key={i}
              className="reveal p-4 bg-canvas-surface/50 backdrop-blur-sm border border-canvas-border rounded-xl text-center hover-bloom cursor-default"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="text-3xl mb-2">{tech.icon}</div>
              <div className="text-xs font-medium text-slate-400">
                {tech.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <div className="reveal gradient-border p-12 text-center">
          <div className="text-6xl mb-6 animate-float">🎨</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Ready to <span className="gradient-text-animated">start creating?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Free forever. No credit card required. Create your first board in seconds.
          </p>

          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="pulse-ring inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary-dark hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-2xl shadow-primary/40 animate-glow-pulse"
              >
                Get Started Free 🚀
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-10 py-4 bg-canvas-surface/70 hover:bg-canvas-surface text-white font-semibold rounded-xl transition-all border border-canvas-border"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* FOOTER — Personal Touch */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-12 border-t border-canvas-border">
        <div className="text-center mb-8 reveal">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">🎨</span>
            </div>
            <span className="text-xl font-bold gradient-text-animated">
              CollabCanvas
            </span>
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            An open-source real-time collaborative whiteboard built with the MERN stack and Socket.io.
          </p>
        </div>

        <div className="pt-8 border-t border-canvas-border text-center text-sm text-slate-500">
          <p className="mb-2">
            Built with{' '}
            <span className="text-red-400 animate-pulse inline-block">❤️</span>{' '}
            by <span className="text-primary font-medium">Samman Jaiswal</span>
          </p>
          <p className="text-xs text-slate-600">
            ©️ 2026 CollabCanvas · MERN + Socket.io + Redis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;