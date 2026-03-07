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
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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
    try {
      await loginWithGoogle();
    } finally {
      setGoogleBusy(false);
    }
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
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Apple — coming soon */}
          <button
            disabled
            style={{
              flex: 1, padding: '13px 8px',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'var(--muted)', cursor: 'not-allowed',
            }}
          >
            🍎  Apple
          </button>

          {/* Google — live via Supabase OAuth */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleBusy}
            whileTap={{ scale: 0.96 }}
            style={{
              flex: 1, padding: '13px 8px',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font)',
              background: googleBusy
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: googleBusy ? 'var(--muted)' : 'var(--text)',
              cursor: googleBusy ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {googleBusy ? '…' : '🇬  Google'}
          </motion.button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', marginTop: 8, letterSpacing: '0.07em', fontWeight: 700 }}>
          APPLE SIGN-IN — COMING SOON
        </p>
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
