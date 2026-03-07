/**
 * Login page — Apple-quality auth screen with aurora background,
 * premium form card, forgot password modal, and Google sign-in.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import FloatingInput from '../../components/FloatingInput';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';

export default function Login() {
  const navigate   = useNavigate();
  const { login, loginWithGoogle, loginWithApple, isLoading, error, clearError } = useAuthStore();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appleBusy,  setAppleBusy]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      /* error already set in store */
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

  return (
    <>
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 60px',
        maxWidth: 430,
        margin: '0 auto',
        background: 'var(--bg)',
      }}
    >
      {/* Aurora background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="orb orb-mind"     style={{ top: '-8%',  left: '-12%',  width: '55%', height: '55%' }} />
        <div className="orb orb-wellness" style={{ bottom: '-6%', right: '-10%', width: '50%', height: '50%' }} />
        <div className="orb orb-journal"  style={{ top: '45%',  right: '-8%',  width: '38%', height: '38%', opacity: 0.35 }} />
      </div>

      {/* ── Logo / hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.9 }}
        animate={{ opacity: 1,  y: 0,   scale: 1   }}
        transition={{ duration: 0.62, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}
      >
        {/* App icon — iOS-style rounded square */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          style={{
            width: 84, height: 84,
            borderRadius: 26,
            background: 'linear-gradient(145deg, #7b6fda 0%, #b76088 55%, #3daa86 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, margin: '0 auto 18px',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.14), ' +
              '0 0 55px rgba(123,111,218,0.55), ' +
              '0 0 110px rgba(61,170,134,0.22), ' +
              '0 24px 50px rgba(0,0,0,0.5)',
          }}
        >
          ✦
        </motion.div>

        <h1
          style={{
            fontSize: 30, fontWeight: 800,
            letterSpacing: '-0.025em',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            marginBottom: 7, color: '#f0f0ff',
          }}
        >
          <span className="grad-text-animated">Lumina</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 400, letterSpacing: '0.01em' }}>
          Your AI-powered life operating system
        </p>
      </motion.div>

      {/* ── Sign-in card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1,  y: 0  }}
        transition={{ duration: 0.52, delay: 0.14, ease: 'easeOut' }}
        style={{
          width: '100%',
          borderRadius: 28,
          padding: '26px 22px 22px',
          background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow:
            '0 1px 0 0 rgba(255,255,255,0.05) inset, ' +
            '0 12px 50px rgba(0,0,0,0.55)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top-shine stripe */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.09) 50%, transparent 95%)',
          borderRadius: '28px 28px 0 0',
          pointerEvents: 'none',
        }} />

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 22 }}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <FloatingInput
            type="email"
            label="Email address"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          {/* Password with show/hide */}
          <div style={{ position: 'relative' }}>
            <FloatingInput
              type={showPw ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--muted)', fontWeight: 700,
                letterSpacing: '0.06em', padding: '4px 2px',
              }}
            >
              {showPw ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginTop: -5 }}>
            <span
              role="button"
              onClick={() => setShowForgot(true)}
              style={{ fontSize: 12, color: 'var(--mind)', fontWeight: 600, cursor: 'pointer' }}
            >
              Forgot password?
            </span>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(196,96,122,0.11)',
                border: '1px solid rgba(196,96,122,0.32)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: 'var(--journal)', fontWeight: 500,
              }}
            >
              {error}
            </motion.p>
          )}

          {/* Primary CTA */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '16px', marginTop: 4,
              borderRadius: 14, fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--font)',
              background: isLoading
                ? 'rgba(123,111,218,0.3)'
                : 'linear-gradient(135deg, #7b6fda 0%, #3daa86 100%)',
              color: '#fff', border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              boxShadow: isLoading ? 'none' : '0 6px 26px rgba(123,111,218,0.42), 0 1px 0 rgba(255,255,255,0.15) inset',
              position: 'relative', overflow: 'hidden',
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}
          >
            {!isLoading && (
              <span style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 55%)',
                borderRadius: 'inherit', pointerEvents: 'none',
              }} />
            )}
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="ai-thinking-dots">
                  <span className="ai-thinking-dot dot-flicker-1" />
                  <span className="ai-thinking-dot dot-flicker-2" />
                  <span className="ai-thinking-dot dot-flicker-3" />
                </span>
                Signing in
              </span>
            ) : 'Sign In'}
          </motion.button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Social buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Google — live */}
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
            {/* Official Google G logo */}
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleBusy ? 'Redirecting…' : 'Continue with Google'}
          </motion.button>

          {/* Apple — white button on dark card (Apple HIG for dark backgrounds) */}
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
            {/* Apple logo — correct silhouette path */}
            <svg width="17" height="17" viewBox="0 0 1000 1182" fill="#111" style={{ flexShrink: 0, marginTop: -1 }}>
              <path d="M702.9 602.6c-1.2-119.7 97.6-177.3 101.9-180.2-55.5-81.2-141.9-92.3-172.7-93.6-73.6-7.5-144.1 43.4-181.5 43.4-37.4 0-95.2-42.3-156.4-41.2-80.5 1.2-155 46.8-196.5 118.3-84 145.6-21.4 361.3 60.4 479.6 40 57.9 87.7 123.1 150.3 120.6 60.4-2.5 83-38.8 155.9-38.8 72.9 0 93.2 38.8 156.9 37.6 65.1-1.2 106.3-59.1 145.9-117.3 46.5-67.3 65.6-132.4 66.9-135.8-1.5-.6-128.3-49.3-129.1-195.6zM581.3 219.4c33.4-40.7 55.9-97 49.9-153.4-48.3 1.9-106.8 32.2-141.3 72.9-31.1 36.1-58.2 93.5-50.9 148.8 53.9 4.2 108.8-27.4 142.3-68.3z"/>
            </svg>
            {appleBusy ? 'Redirecting…' : 'Continue with Apple'}
          </motion.button>

        </div>
      </motion.div>

      {/* Create account link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ marginTop: 28, fontSize: 14, color: 'var(--muted)', position: 'relative', zIndex: 1 }}
      >
        New to Lumina?{' '}
        <Link to="/register" style={{ color: 'var(--mind)', fontWeight: 700 }}>
          Create account
        </Link>
      </motion.p>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12,
          justifyContent: 'center', position: 'relative', zIndex: 1,
        }}
      >
        {['🧠 AI Memory', '🔒 E2E Encrypted', '📊 Life Dashboard'].map((f) => (
          <span
            key={f}
            style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {f}
          </span>
        ))}
      </motion.div>
    </div>

    {/* Forgot password bottom-sheet modal */}
    <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />
    </>
  );
}
