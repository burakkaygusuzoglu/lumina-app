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
        background: 'var(--bg)',
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
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 40 }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          style={{ fontSize: 64, marginBottom: 12 }}
        >
          ✨
        </motion.div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          Lumina Life OS
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>
          Your AI-powered personal life operating system
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1,  y: 0  }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card"
        style={{ width: '100%' }}
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
                background: '#fff0f0',
                border: '1px solid #ffd0d0',
                borderRadius: 'var(--r-sm)',
                padding: '10px 14px',
                fontSize: 13,
                color: '#c0392b',
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
