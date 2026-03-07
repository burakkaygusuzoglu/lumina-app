/**
 * Onboarding — Recipy-inspired multi-step welcome flow for Lumina Life OS
 *
 * Steps (0-5) → Loading animation → Get Started bottom sheet
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   Constants & helpers
───────────────────────────────────────────── */

const TOTAL_STEPS = 6; // content steps before loading

type Phase = 'steps' | 'loading' | 'getstarted';

const FLOATING_ITEMS = [
  { emoji: '🧠', x: -110, y: -40, delay: 0,    dur: 3.2 },
  { emoji: '📔', x:  110, y: -50, delay: 0.6,  dur: 3.8 },
  { emoji: '💪', x: -90,  y:  60, delay: 1.1,  dur: 4.0 },
  { emoji: '⚡', x:  100, y:  55, delay: 0.3,  dur: 3.5 },
  { emoji: '🎯', x: -50,  y:  100,delay: 0.8,  dur: 2.9 },
  { emoji: '✨', x:  60,  y:  95, delay: 1.4,  dur: 3.4 },
];

const LOADING_TEXTS = [
  'Personalizing your AI assistant…',
  'Calibrating your life modules…',
  'Setting up your digital space…',
  'Almost there…',
];

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */

export default function Onboarding() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState(0);
  const [phase,       setPhase]       = useState<Phase>('steps');
  const [loadingText, setLoadingText] = useState(0);
  const [sheetVisible,setSheetVisible]= useState(false);
  const [dir,         setDir]         = useState(1); // 1 = forward, -1 = back

  /* cycle loading text */
  useEffect(() => {
    if (phase !== 'loading') return;
    const iv = setInterval(() => {
      setLoadingText(t => (t + 1) % LOADING_TEXTS.length);
    }, 700);
    const timer = setTimeout(() => {
      setPhase('getstarted');
      setTimeout(() => setSheetVisible(true), 180);
    }, 2900);
    return () => { clearInterval(iv); clearTimeout(timer); };
  }, [phase]);

  function finish() {
    localStorage.setItem('lumina_onboarded', '1');
    navigate('/register');
  }
  function skipToLogin() {
    localStorage.setItem('lumina_onboarded', '1');
    navigate('/login');
  }
  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setDir(1);
      setStep(s => s + 1);
    } else {
      setPhase('loading');
    }
  }
  function goBack() {
    if (step > 0) {
      setDir(-1);
      setStep(s => s - 1);
    }
  }

  /* ── LOADING SCREEN ── */
  if (phase === 'loading' || phase === 'getstarted') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: 320, height: 320, borderRadius: '50%', filter: 'blur(80px)',
            background: 'radial-gradient(circle, rgba(123,111,218,0.25), transparent 70%)',
            opacity: phase === 'getstarted' ? 0.35 : 0.7,
            transition: 'opacity 0.8s ease',
          }} />
        </div>

        {/* Dimmed on getstarted */}
        <motion.div
          animate={{ opacity: phase === 'getstarted' ? 0.32 : 1 }}
          transition={{ duration: 0.7 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Title */}
          <p style={{
            fontSize: 26, fontWeight: 800, color: 'var(--text)',
            marginBottom: 64, textAlign: 'center', paddingInline: 32,
            fontFamily: 'var(--font)',
            opacity: phase === 'getstarted' ? 0.5 : 1,
          }}>
            Setting up your <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--mind)' }}>Lumina</span> space
          </p>

          {/* Scan frame + floating emojis */}
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            {/* Center frame */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 110, height: 110,
              border: '2.5px solid rgba(123,111,218,0.5)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Scanning line */}
              <motion.div
                animate={{ y: [-40, 40, -40] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  width: '80%', height: 2,
                  background: 'linear-gradient(90deg, transparent, var(--mind), var(--wellness), transparent)',
                  borderRadius: 2,
                  boxShadow: '0 0 12px rgba(123,111,218,0.8)',
                }}
              />
              {/* Corner dashes */}
              {[
                { top: -2, left: -2, borderTop: '3px solid var(--mind)', borderLeft: '3px solid var(--mind)', borderRadius: '4px 0 0 0' },
                { top: -2, right: -2, borderTop: '3px solid var(--mind)', borderRight: '3px solid var(--mind)', borderRadius: '0 4px 0 0' },
                { bottom: -2, left: -2, borderBottom: '3px solid var(--wellness)', borderLeft: '3px solid var(--wellness)', borderRadius: '0 0 0 4px' },
                { bottom: -2, right: -2, borderBottom: '3px solid var(--wellness)', borderRight: '3px solid var(--wellness)', borderRadius: '0 0 4px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
              ))}
            </div>

            {/* Floating life emojis */}
            {FLOATING_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  fontSize: 26,
                  filter: 'drop-shadow(0 0 8px rgba(123,111,218,0.4))',
                }}
                animate={{
                  x: [item.x - 8, item.x + 8, item.x - 8],
                  y: [item.y - 6, item.y + 6, item.y - 6],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  repeat: Infinity,
                  duration: item.dur,
                  delay: item.delay,
                  ease: 'easeInOut',
                }}
              >
                {item.emoji}
              </motion.div>
            ))}
          </div>

          {/* Loading text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingText}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              style={{
                marginTop: 48, fontSize: 14, color: 'var(--muted)',
                textAlign: 'center', letterSpacing: '0.02em',
              }}
            >
              {LOADING_TEXTS[loadingText]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* ── GET STARTED BOTTOM SHEET ── */}
        <AnimatePresence>
          {sheetVisible && (
            <motion.div
              initial={{ y: 380, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 380, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(180deg, rgba(14,14,22,0.98) 0%, rgba(10,10,15,1) 100%)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '28px 28px 0 0',
                padding: '8px 28px 44px',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(24px)',
                maxWidth: 430,
                margin: '0 auto',
              }}
            >
              {/* Handle */}
              <div style={{
                width: 40, height: 4,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                margin: '0 auto 24px',
              }} />

              <h2 style={{
                fontSize: 24, fontWeight: 800,
                color: 'var(--text)', marginBottom: 6,
                fontFamily: 'var(--font)',
              }}>
                Let's get you started
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
                Start your Lumina journey today
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Create Account */}
                <button
                  onClick={finish}
                  style={{
                    width: '100%',
                    padding: '17px 24px',
                    borderRadius: 100,
                    border: 'none',
                    background: 'linear-gradient(135deg, #7b6fda 0%, #3daa86 100%)',
                    color: '#fff',
                    fontSize: 16, fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 24px rgba(123,111,218,0.5)',
                    fontFamily: 'var(--font)',
                    letterSpacing: '0.01em',
                  }}
                >
                  ✨ Create Account
                </button>

                {/* Sign In */}
                <button
                  onClick={skipToLogin}
                  style={{
                    width: '100%',
                    padding: '17px 24px',
                    borderRadius: 100,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    fontSize: 16, fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                  }}
                >
                  Sign In
                </button>
              </div>

              {/* Skip */}
              <button
                onClick={skipToLogin}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--muted)', fontSize: 14,
                  cursor: 'pointer', width: '100%',
                  marginTop: 16, paddingBlock: 8,
                  fontFamily: 'var(--font)',
                }}
              >
                Skip
              </button>

              <p style={{
                fontSize: 11, color: 'var(--muted)', opacity: 0.6,
                textAlign: 'center', marginTop: 12,
                lineHeight: 1.5,
              }}>
                By continuing you agree to our{' '}
                <span style={{ color: 'var(--mind)', textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: 'var(--mind)', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── CONTENT STEPS ── */
  return (
    <div style={{
      minHeight: '100dvh',
      background:
        'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(123,111,218,0.14) 0%, transparent 55%),' +
        'radial-gradient(ellipse 60% 50% at 80% 110%, rgba(61,170,134,0.1) 0%, transparent 55%),' +
        'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 20px 0',
        gap: 16,
        flexShrink: 0,
      }}>
        {/* Back arrow */}
        <button
          onClick={goBack}
          disabled={step === 0}
          style={{
            background: 'none', border: 'none',
            color: step === 0 ? 'transparent' : 'var(--text2)',
            fontSize: 20, cursor: step === 0 ? 'default' : 'pointer',
            padding: '4px 8px 4px 0',
            fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
        >
          ←
        </button>

        {/* Progress bar */}
        <div style={{
          flex: 1,
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--mind), var(--wellness))',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Skip */}
        <button
          onClick={() => { localStorage.setItem('lumina_onboarded', '1'); navigate('/login'); }}
          style={{
            background: 'none', border: 'none',
            color: 'var(--muted)', fontSize: 13,
            cursor: 'pointer', fontWeight: 600,
            fontFamily: 'var(--font)',
            padding: '4px 0 4px 8px',
            flexShrink: 0,
          }}
        >
          Skip
        </button>
      </div>

      {/* ── SLIDE CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 20px' }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit:   (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.32, 0, 0.67, 0] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 32 }}
          >
            <StepContent step={step} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CONTINUE BUTTON ── */}
      <div style={{ padding: '0 20px 40px', flexShrink: 0 }}>
        <button
          onClick={goNext}
          style={{
            width: '100%',
            padding: '18px 24px',
            borderRadius: 100,
            border: 'none',
            background: step === TOTAL_STEPS - 1
              ? 'linear-gradient(135deg, #7b6fda 0%, #3daa86 100%)'
              : 'rgba(255,255,255,0.95)',
            color: step === TOTAL_STEPS - 1 ? '#fff' : '#0a0a0f',
            fontSize: 17, fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            letterSpacing: '0.01em',
            boxShadow: step === TOTAL_STEPS - 1
              ? '0 4px 24px rgba(123,111,218,0.5)'
              : '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'background 0.4s, color 0.4s',
          }}
        >
          {step === TOTAL_STEPS - 1 ? '✨ Get Started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step content renderer
───────────────────────────────────────────── */

function StepContent({ step }: { step: number }) {
  switch (step) {
    case 0: return <Step0Comparison />;
    case 1: return <Step1SocialProof />;
    case 2: return <Step2FreeTrialText />;
    case 3: return <Step3ReminderBell />;
    case 4: return <Step4Notifications />;
    case 5: return <Step5Features />;
    default: return null;
  }
}

/* ─────────────────────────────────────────────
   Step 0 — Comparison
───────────────────────────────────────────── */
function Step0Comparison() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={{
        fontSize: 30, fontWeight: 800, lineHeight: 1.2,
        color: 'var(--text)', marginBottom: 8,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
      }}>
        No more scattered life,{' '}
        <span style={{ color: 'var(--mind)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          no more chaos
        </span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.5 }}>
        One AI-powered app for every part of your life.
      </p>

      {/* Comparison card */}
      <div style={{
        background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        flex: 1,
        maxHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
          {/* Without Lumina */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textAlign: 'center', letterSpacing: '0.1em' }}>
              WITHOUT LUMINA
            </p>
            {/* Placeholder bars — scattered, gray */}
            {[70, 45, 85, 55].map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  height: i === 0 ? 36 : 12,
                  width: `${w}%`,
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 6,
                }}
              />
            ))}
            {/* Stress indicator */}
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 24 }}>😵‍💫</div>
          </div>

          {/* With Lumina */}
          <div style={{
            flex: 1,
            background: 'linear-gradient(158deg, rgba(30,25,60,0.95), rgba(18,35,30,0.95))',
            border: '1px solid rgba(123,111,218,0.3)',
            borderRadius: 16,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            boxShadow: '0 0 30px rgba(123,111,218,0.15)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mind)', textAlign: 'center', letterSpacing: '0.1em' }}>
              WITH LUMINA
            </p>
            {/* Module chips */}
            {[
              { emoji: '🧠', color: '#7b6fda', label: 'Mind' },
              { emoji: '💪', color: '#3daa86', label: 'Health' },
              { emoji: '📔', color: '#c4607a', label: 'Journal' },
              { emoji: '⚡', color: '#e2b96a', label: 'Life' },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: `${m.color}18`,
                  border: `1px solid ${m.color}35`,
                  borderRadius: 8, padding: '6px 10px',
                }}
              >
                <span style={{ fontSize: 14 }}>{m.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.label}</span>
                <div style={{ marginLeft: 'auto', width: 24, height: 6, background: m.color, borderRadius: 3, opacity: 0.7 }} />
              </motion.div>
            ))}
            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 24 }}>🌟</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.5 }}>
          Manage everything{' '}
          <strong style={{ color: 'var(--text)', fontWeight: 800 }}>3× faster</strong>{' '}
          with Lumina's AI organization.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 1 — Social proof
───────────────────────────────────────────── */
function Step1SocialProof() {
  const testimonials = [
    {
      name: 'Sarah K.',
      stars: 5,
      text: "I've tried every productivity app, but Lumina is the only one that actually understands me. It's my second brain.",
      color: '#7b6fda',
      initials: 'SK',
    },
    {
      name: 'Marcus T.',
      stars: 5,
      text: 'The AI insights are jaw-dropping. It told me my mood dips every Wednesday — and it was right.',
      color: '#3daa86',
      initials: 'MT',
    },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActive(a => (a + 1) % testimonials.length), 3200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h1 style={{
        fontSize: 30, fontWeight: 800, lineHeight: 1.2,
        color: 'var(--text)', marginBottom: 8,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
      }}>
        Your AI life coach,{' '}
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--wellness)' }}>
          here for you
        </span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.5 }}>
        Built for ambitious people who want more from every day.
      </p>

      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex' }}>
          {['#7b6fda', '#3daa86', '#c4607a', '#e2b96a'].map((c, i) => (
            <motion.div
              key={i}
              initial={{ x: -10 * (3 - i), opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{
                width: 42, height: 42,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${c}, ${c}aa)`,
                border: '2.5px solid var(--bg)',
                marginLeft: i === 0 ? 0 : -12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17,
                boxShadow: `0 0 16px ${c}50`,
              }}
            >
              {['✨', '🧘', '💡', '🎯'][i]}
            </motion.div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.4 }}>
          Made by people,<br /><strong style={{ color: 'var(--text)', fontWeight: 700 }}>for people</strong>
        </p>
      </div>

      {/* Testimonial card */}
      <div style={{ position: 'relative', minHeight: 160 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.38 }}
            style={{
              background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '20px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Name + stars row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${testimonials[active].color}, ${testimonials[active].color}80)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff',
                  boxShadow: `0 0 16px ${testimonials[active].color}50`,
                }}>
                  {testimonials[active].initials}
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>
                  {testimonials[active].name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: testimonials[active].stars }).map((_, i) => (
                  <span key={i} style={{ color: '#e2b96a', fontSize: 15 }}>★</span>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 }}>
              "{testimonials[active].text}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
        {testimonials.map((_, i) => (
          <div key={i} style={{
            width: i === active ? 20 : 6,
            height: 6, borderRadius: 3,
            background: i === active ? 'var(--mind)' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 2 — Free trial text (centered, large)
───────────────────────────────────────────── */
function Step2FreeTrialText() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flex: 1, textAlign: 'center', paddingInline: 8,
    }}>
      <motion.div
        animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        style={{ fontSize: 72, marginBottom: 32 }}
      >
        🌟
      </motion.div>
      <h1 style={{
        fontSize: 34, fontWeight: 800,
        color: 'var(--text)', lineHeight: 1.25,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
        marginBottom: 0,
      }}>
        Enjoy{' '}
        <span style={{
          color: '#ff7a59',
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
        }}>
          7 days free
        </span>{' '}
        to transform your life with Lumina.
      </h1>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 3 — Reminder bell (centered)
───────────────────────────────────────────── */
function Step3ReminderBell() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flex: 1, textAlign: 'center', paddingInline: 8,
    }}>
      <motion.div
        animate={{ rotate: [-15, 15, -15] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        style={{ fontSize: 90, marginBottom: 40, filter: 'drop-shadow(0 0 24px rgba(255,122,89,0.45))' }}
      >
        🔔
      </motion.div>
      <h1 style={{
        fontSize: 32, fontWeight: 800,
        color: 'var(--text)', lineHeight: 1.3,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
      }}>
        You'll get a reminder{' '}
        <span style={{ color: '#ff7a59', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          2 days before
        </span>{' '}
        your trial ends.
      </h1>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 4 — Notifications mockup
───────────────────────────────────────────── */
function Step4Notifications() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <h1 style={{
        fontSize: 30, fontWeight: 800, lineHeight: 1.2,
        color: 'var(--text)', marginBottom: 8,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
      }}>
        Turn on smart{' '}
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--life)' }}>
          reminders
        </span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.5 }}>
        Never miss a check-in, task, or mood log again.
      </p>

      {/* Phone mockup */}
      <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
        <div style={{
          width: 240, height: 380,
          background: 'linear-gradient(158deg, rgba(18,18,30,0.98), rgba(12,12,22,0.98))',
          borderRadius: 36,
          border: '2.5px solid rgba(255,255,255,0.12)',
          padding: '12px 10px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(123,111,218,0.12)',
          display: 'flex', flexDirection: 'column', gap: 8,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Dynamic island */}
          <div style={{
            width: 70, height: 22, background: '#000',
            borderRadius: 11, margin: '0 auto 8px',
            flexShrink: 0,
          }} />

          {/* Status bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingInline: 12, fontSize: 10, color: 'var(--text2)',
            flexShrink: 0,
          }}>
            <span>9:41</span>
            <span>● ● ●</span>
          </div>

          {/* Page preview */}
          <div style={{ flex: 1, paddingInline: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.08em' }}>LUMINA</p>
            {/* Mini module chips */}
            {[
              { emoji: '🧠', color: '#7b6fda', w: 80 },
              { emoji: '💪', color: '#3daa86', w: 70 },
              { emoji: '📔', color: '#c4607a', w: 90 },
            ].map((m, i) => (
              <div key={i} style={{
                height: 22, display: 'flex', alignItems: 'center', gap: 5,
                background: `${m.color}18`, borderRadius: 6,
                paddingInline: 6,
              }}>
                <span style={{ fontSize: 9 }}>{m.emoji}</span>
                <div style={{ height: 5, width: m.w, background: m.color, borderRadius: 2, opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification bubble */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.45 }}
        style={{
          background: 'linear-gradient(158deg, rgba(22,22,34,0.98), rgba(16,16,26,0.98))',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          marginTop: -60, marginInline: 8, position: 'relative', zIndex: 2,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #7b6fda, #3daa86)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, boxShadow: '0 0 20px rgba(123,111,218,0.5)',
        }}>
          ✨
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Lumina</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
            New AI insights ready for you today 🌟
          </p>
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>now</span>
      </motion.div>

      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 16 }}>
        *Turn notifications off anytime in settings
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Step 5 — Features (like Recipy paywall, no pricing)
───────────────────────────────────────────── */
function Step5Features() {
  const features = [
    { emoji: '🧠', color: '#7b6fda', label: 'AI Mind & Memory vault' },
    { emoji: '📔', color: '#c4607a', label: 'Daily journal & mood tracking' },
    { emoji: '💪', color: '#3daa86', label: 'Health, fitness & nutrition AI' },
    { emoji: '⚡', color: '#e2b96a', label: 'Goals, habits & life planning' },
    { emoji: '🎯', color: '#4a8fd4', label: 'Smart AI insights & coaching' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero banner — gradient mosaic background */}
      <div style={{
        height: 140, borderRadius: 20,
        background: 'linear-gradient(135deg, #1a1030 0%, #0f2420 50%, #1a1530 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, marginBottom: 24,
        overflow: 'hidden', position: 'relative',
        flexShrink: 0,
      }}>
        {/* Orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,111,218,0.25), transparent 70%)',
          filter: 'blur(16px)',
        }} />
        {['🧠', '📔', '💪', '⚡', '🎯'].map((e, i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.3, delay: i * 0.2, ease: 'easeInOut' }}
            style={{ fontSize: 30, position: 'relative', zIndex: 1 }}
          >
            {e}
          </motion.span>
        ))}
      </div>

      <h1 style={{
        fontSize: 26, fontWeight: 800, lineHeight: 1.2,
        color: 'var(--text)', marginBottom: 4,
        fontFamily: 'var(--font)', letterSpacing: '-0.02em',
        flexShrink: 0,
      }}>
        Everything you need,{' '}
        <span style={{ color: '#ff7a59', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          unlimited
        </span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, flexShrink: 0 }}>
        All your life modules. All AI-powered. All in one place.
      </p>

      {/* Feature list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              borderRadius: 12,
              background: `${f.color}20`,
              border: `1px solid ${f.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {f.emoji}
            </div>
            <span style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>
              {f.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
