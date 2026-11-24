import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './LandingPage.css';

const TYPING_TEXTS = [
  'brainstorm ideas',
  'design architectures',
  'sketch diagrams',
  'plan sprints',
  'teach concepts',
];

const FEATURES = [
  {
    icon: '⚡',
    title: 'CRDT Real-Time Sync',
    description:
      'Conflict-free version + versionNonce LWW reconciliation with 100ms delta batching and ack/retry.',
    accent: '#f59e0b',
  },
  {
    icon: '🎨',
    title: 'Infinite Excalidraw Canvas',
    description:
      'Production-grade vector drawing, shapes, arrows, text, grouping, copy/paste, undo/redo, and dark mode.',
    accent: '#ec4899',
  },
  {
    icon: '💬',
    title: 'Live Team Chat',
    description:
      'Discuss while you sketch with persistent message history, typing indicators, and quick emojis.',
    accent: '#06b6d4',
  },
  {
    icon: '🖱️',
    title: '60fps Live Cursors',
    description:
      'requestAnimationFrame cursor coalescing keeps 20+ simultaneous collaborators silky smooth without lag.',
    accent: '#22c55e',
  },
  {
    icon: '📄',
    title: 'PNG & PDF Export',
    description:
      'Export crisp high-resolution PNG images or landscape/portrait PDFs directly from your infinite canvas.',
    accent: '#f43f5e',
  },
  {
    icon: '🔒',
    title: 'Production Security',
    description:
      'JWT + tokenVersion instant revocation, atomic Redis Lua rate limiting, and HTTPS Brevo OTP reset.',
    accent: '#6366f1',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Create account',
    description: 'Sign up with your email in seconds. No credit card required.',
    icon: '👤',
  },
  {
    number: '02',
    title: 'Open your canvas',
    description: 'Click "New Board" to launch an infinite Excalidraw workspace.',
    icon: '🎨',
  },
  {
    number: '03',
    title: 'Share & collaborate',
    description: 'Share the link so teammates can join and sketch live together.',
    icon: '🚀',
  },
];

const TECH_STACK = [
  { name: 'React 19', icon: '⚛️' },
  { name: 'Excalidraw', icon: '✏️' },
  { name: 'Node.js', icon: '🟢' },
  { name: 'MongoDB', icon: '🍃' },
  { name: 'Socket.IO', icon: '🔌' },
  { name: 'Redis Lua', icon: '🔴' },
  { name: 'JWT Auth', icon: '🔑' },
  { name: 'Vite', icon: '⚡' },
];

const HIGHLIGHTS = [
  { icon: '⚡', value: '<100ms', label: 'Batched delta sync' },
  { icon: '∞', value: 'Infinite', label: 'Excalidraw vector canvas' },
  { icon: '🔐', value: 'Multi-layer', label: 'Security & rate limiting' },
];

/**
 * Animated typewriter hook cycling through a list of short phrases.
 * @param {string[]} texts - Phrases to type and erase.
 * @param {number} [typingSpeed=100] - Milliseconds per typed character.
 * @param {number} [deletingSpeed=50] - Milliseconds per deleted character.
 * @param {number} [pause=2000] - Pause duration in ms after completing a word.
 * @returns {string} Current visible substring.
 */
const useTypingEffect = (texts, typingSpeed = 100, deletingSpeed = 50, pause = 2000) => {
  const [text, setText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    let pauseTimer = null;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (text.length < current.length) {
            setText(current.slice(0, text.length + 1));
          } else {
            pauseTimer = setTimeout(() => setIsDeleting(true), pause);
          }
        } else if (text.length > 0) {
          setText(text.slice(0, -1));
        } else {
          setIsDeleting(false);
          setTextIndex((prev) => (prev + 1) % texts.length);
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => {
      clearTimeout(timeout);
      clearTimeout(pauseTimer);
    };
  }, [text, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pause]);

  return text;
};

/**
 * Public marketing landing page showcasing CollabCanvas capabilities, architecture,
 * and quick-start links.
 */
const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const typingText = useTypingEffect(TYPING_TEXTS);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-reveal--visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing aurora-bg">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="landing__grid-overlay" />

      <section className="landing__hero">
        <div className="landing__badge">
          <span className="landing__badge-dot" />
          <span>🎨 Open-source collaborative whiteboard</span>
        </div>

        <h1 className="landing__headline">
          <span className="landing__headline-line">Draw. Collaborate.</span>
          <span className="landing__headline-line gradient-text">Create together.</span>
        </h1>

        <div className="landing__subtitle">
          A real-time whiteboard to{' '}
          <span className="landing__typing-word">{typingText}</span>
          <span className="landing__typing-cursor" />
        </div>

        <div className="landing__cta-row">
          {isAuthenticated ? (
            <Link to="/dashboard" className="landing__btn-primary">
              Go to Dashboard <span>→</span>
            </Link>
          ) : (
            <>
              <Link to="/signup" className="landing__btn-primary">
                Get Started Free <span>🚀</span>
              </Link>
              <Link to="/login" className="landing__btn-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>

        <p className="landing__tagline">
          Free forever · No credit card required · Ready in 30 seconds
        </p>
      </section>

      <section className="landing__section landing__section--narrow">
        <p className="landing__eyebrow landing-reveal">Built for performance</p>
        <div className="landing__highlights-grid">
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="landing__highlight-card landing-reveal">
              <div className="landing__highlight-icon">{h.icon}</div>
              <div className="landing__highlight-value gradient-text">{h.value}</div>
              <p className="landing__highlight-label">{h.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__section">
        <div className="landing__section-head landing-reveal">
          <h2 className="landing__section-title">
            Everything you need to <span className="gradient-text">collaborate</span>
          </h2>
          <p className="landing__section-sub">
            Production-grade architecture that makes remote sketching feel effortless.
          </p>
        </div>

        <div className="landing__features-grid">
          {FEATURES.map((feature, i) => (
            <div key={i} className="landing__feature-card landing-reveal">
              <div
                className="landing__feature-icon"
                style={{ backgroundColor: `${feature.accent}22`, borderColor: `${feature.accent}55` }}
              >
                <span>{feature.icon}</span>
              </div>
              <h3 className="landing__feature-title">{feature.title}</h3>
              <p className="landing__feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__section">
        <div className="landing__section-head landing-reveal">
          <h2 className="landing__section-title">
            Get started in <span className="gradient-text">3 simple steps</span>
          </h2>
          <p className="landing__section-sub">
            From signup to your first collaborative board in under a minute.
          </p>
        </div>

        <div className="landing__steps-grid">
          {STEPS.map((step, i) => (
            <div key={i} className="landing__step-card landing-reveal">
              <div className="landing__step-icon">{step.icon}</div>
              <div className="landing__step-num">STEP {step.number}</div>
              <h3 className="landing__step-title">{step.title}</h3>
              <p className="landing__step-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__section landing__section--narrow">
        <div className="landing__section-head landing-reveal">
          <h2 className="landing__section-title">
            Powered by <span className="gradient-text">modern tech</span>
          </h2>
          <p className="landing__section-sub">
            Full-stack MERN application engineered for low-latency collaboration.
          </p>
        </div>

        <div className="landing__tech-grid">
          {TECH_STACK.map((tech, i) => (
            <div key={i} className="landing__tech-card landing-reveal">
              <div className="landing__tech-icon">{tech.icon}</div>
              <div className="landing__tech-name">{tech.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing__section landing__section--cta">
        <div className="landing__cta-box landing-reveal">
          <div className="landing__cta-emoji">🎨</div>
          <h2 className="landing__cta-title">
            Ready to <span className="gradient-text">start creating?</span>
          </h2>
          <p className="landing__cta-sub">
            Create your first infinite collaborative board in seconds.
          </p>
          {!isAuthenticated && (
            <div className="landing__cta-row">
              <Link to="/signup" className="landing__btn-primary">
                Get Started Free 🚀
              </Link>
              <Link to="/login" className="landing__btn-secondary">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-brand">
          <div className="landing__footer-logo">🎨</div>
          <span className="landing__footer-name gradient-text">CollabCanvas</span>
        </div>
        <p className="landing__footer-desc">
          An open-source real-time collaborative whiteboard built with React, Excalidraw,
          Node.js, MongoDB, Socket.IO, and Redis.
        </p>
        <p className="landing__footer-copy">© 2026 CollabCanvas · Built by Samman Jaiswal</p>
      </footer>
    </div>
  );
};

export default LandingPage;
