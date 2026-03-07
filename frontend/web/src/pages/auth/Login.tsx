/**
 * Login page — beautiful, airy auth screen.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const navigate   = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

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

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(123,111,218,0.18) 0%, transparent 60%), ' +
          'radial-gradient(ellipse 60% 50% at 80% 100%, rgba(61,170,134,0.12) 0%, transparent 55%), ' +
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
      {/* Logo / hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1,  y: 0   }}
        transition={{ duration: 0.55 }}
        style={{ textAlign: 'center', marginBottom: 40 }}
      >
        {/* Gradient orb logo */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          style={{
            width: 76, height: 76,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7b6fda 0%, #b76088 50%, #3daa86 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(123,111,218,0.45), 0 0 80px rgba(61,170,134,0.2)',
          }}
        >
          ✨
        </motion.div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
          Lumina Life OS
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', letterSpacing: '0.01em' }}>
          Your AI-powered personal life operating system
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1,  y: 0  }}
        transition={{ duration: 0.5, delay: 0.12 }}
        style={{
          width: '100%',
          background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
          borderRadius: 'var(--r-xl)',
          padding: '24px 20px 20px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            className="field"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {/* Error message */}
          {error && (
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
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: 4 }}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </motion.div>

      {/* Register link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ marginTop: 24, fontSize: 14, color: 'var(--muted)' }}
      >
        New to Lumina?{' '}
        <Link to="/register" style={{ color: 'var(--mind)', fontWeight: 700 }}>
          Create account
        </Link>
      </motion.p>
    </div>
  );
}
