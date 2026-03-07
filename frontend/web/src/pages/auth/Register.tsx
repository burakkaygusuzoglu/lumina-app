/**
 * Register page — create a new Lumina account.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import FloatingInput from '../../components/FloatingInput';

// ── Brand SVG icons ──
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = ({ dark = false }: { dark?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 1000 1182" fill={dark ? '#fff' : '#111'} style={{ flexShrink: 0, marginTop: -1 }}>
    <path d="M702.9 602.6c-1.2-119.7 97.6-177.3 101.9-180.2-55.5-81.2-141.9-92.3-172.7-93.6-73.6-7.5-144.1 43.4-181.5 43.4-37.4 0-95.2-42.3-156.4-41.2-80.5 1.2-155 46.8-196.5 118.3-84 145.6-21.4 361.3 60.4 479.6 40 57.9 87.7 123.1 150.3 120.6 60.4-2.5 83-38.8 155.9-38.8 72.9 0 93.2 38.8 156.9 37.6 65.1-1.2 106.3-59.1 145.9-117.3 46.5-67.3 65.6-132.4 66.9-135.8-1.5-.6-128.3-49.3-129.1-195.6zM581.3 219.4c33.4-40.7 55.9-97 49.9-153.4-48.3 1.9-106.8 32.2-141.3 72.9-31.1 36.1-58.2 93.5-50.9 148.8 53.9 4.2 108.8-27.4 142.3-68.3z"/>
  </svg>
);

// ── Password strength helper ──
function getStrength(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw)           return { level: 0, label: '',         color: 'transparent' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9!@#$%^&*]/.test(pw)) score++;
  const map = [
    { level: 1 as const, label: 'Weak',   color: '#c4607a' },
    { level: 2 as const, label: 'Fair',   color: '#d4864a' },
    { level: 3 as const, label: 'Good',   color: '#e2b96a' },
    { level: 4 as const, label: 'Strong', color: '#3daa86' },
  ];
  return map[Math.min(score, 4) - 1] ?? { level: 1, label: 'Weak', color: '#c4607a' };
}

export default function Register() {
  const navigate   = useNavigate();
  const { register, loginWithGoogle, loginWithApple, isLoading, error, clearError } = useAuthStore();

  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [localErr,    setLocalErr]    = useState('');
  const [googleBusy,  setGoogleBusy]  = useState(false);
  const [appleBusy,   setAppleBusy]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setLocalErr('');

    if (password !== confirm) {
      setLocalErr("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setLocalErr('Password must be at least 6 characters.');
      return;
    }

    try {
      await register(email, password, fullName);
      navigate('/');
    } catch {
      /* error set in store */
    }
  }

  async function handleGoogleLogin() {
    setGoogleBusy(true);
    try { await loginWithGoogle(); } finally { setGoogleBusy(false); }
  }

  async function handleAppleLogin() {
    setAppleBusy(true);
    try { await loginWithApple(); } finally { setAppleBusy(false); }
  }

  const displayError = localErr || error;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(61,170,134,0.14) 0%, transparent 55%), ' +
          'radial-gradient(ellipse 60% 50% at 20% 110%, rgba(123,111,218,0.12) 0%, transparent 55%), ' +
          'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 48px',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1,  y: 0   }}
        transition={{ duration: 0.55 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          style={{
            width: 70, height: 70,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3daa86 0%, #7b6fda 70%, #c4607a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto 14px',
            boxShadow: '0 0 36px rgba(61,170,134,0.4), 0 0 70px rgba(123,111,218,0.2)',
          }}
        >
          🌱
        </motion.div>
        <h1 className="heading-lg" style={{ marginBottom: 6 }}>
          Begin your journey
        </h1>
        <p className="body-sm" style={{ letterSpacing: '0.01em' }}>
          One account. Five powerful life modules.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1,  y: 0  }}
        transition={{ duration: 0.5, delay: 0.12 }}
        style={{
          width: '100%',
          borderRadius: 'var(--r-xl)',
          padding: '24px 20px 20px',
          background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <h2 className="heading-md" style={{ marginBottom: 20 }}>Create your account</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FloatingInput
            type="text"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            required
            autoComplete="name"
          />
          <FloatingInput
            type="email"
            label="Email address"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <FloatingInput
            type="password"
            label="Password (min. 6 characters)"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />
          {/* Password strength meter */}
          {password.length > 0 && (() => {
            const s = getStrength(password);
            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: -4 }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[1,2,3,4].map((n) => (
                    <motion.div
                      key={n}
                      animate={{ background: n <= s.level ? s.color : 'var(--surface2)' }}
                      transition={{ duration: 0.3 }}
                      style={{ flex: 1, height: 3, borderRadius: 4 }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: '0.04em' }}>
                  {s.label}
                </p>
              </motion.div>
            );
          })()}
          <FloatingInput
            type="password"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            required
            autoComplete="new-password"
          />

          {/* Modules preview */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              flexWrap: 'wrap',
              padding: '8px 0',
            }}
          >
            {['🧠 Mind', '💚 Well', '🔒 Vault', '📅 Life', '📖 Journal'].map((m) => (
              <span
                key={m}
                style={{
                  background: 'var(--bg)',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted)',
                }}
              >
                {m}
              </span>
            ))}
          </div>

          {/* Error */}
          {displayError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'rgba(196,96,122,0.12)',
                border: '1px solid rgba(196,96,122,0.35)',
                borderRadius: 'var(--r-sm)',
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--journal)',
                fontWeight: 500,
              }}
            >
              {displayError}
            </motion.p>
          )}

          <motion.button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ai-thinking-dots">
                  <span className="ai-thinking-dot dot-flicker-1" />
                  <span className="ai-thinking-dot dot-flicker-2" />
                  <span className="ai-thinking-dot dot-flicker-3" />
                </span>
                Creating account…
              </span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M2 8l10 6 10-6"/>
                </svg>
                Continue with Email
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Social sign-in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Google */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleBusy}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '13px 18px',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font)',
              background: googleBusy ? 'rgba(255,255,255,0.85)' : '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#1f1f1f',
              cursor: googleBusy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              opacity: googleBusy ? 0.75 : 1,
            }}
          >
            <GoogleIcon />
            {googleBusy ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>

          {/* Apple — white button adapts to all dark themes */}
          <motion.button
            type="button"
            onClick={handleAppleLogin}
            disabled={appleBusy}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '13px 18px',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font)',
              background: appleBusy ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#111',
              cursor: appleBusy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
              opacity: appleBusy ? 0.7 : 1,
            }}
          >
            <AppleIcon />
            {appleBusy ? 'Redirecting…' : 'Continue with Apple'}
          </motion.button>

        </div>
      </motion.div>

      {/* Login link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ marginTop: 24, fontSize: 14, color: 'var(--muted)' }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--mind)', fontWeight: 700 }}>
          Sign in
        </Link>
      </motion.p>
    </div>
  );
}
