/**
 * Register page — create a new Lumina account.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function Register() {
  const navigate   = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [localErr, setLocalErr] = useState('');

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

  const displayError = localErr || error;

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
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1,  y: 0   }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <span style={{ fontSize: 56 }}>🌱</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginTop: 10, marginBottom: 6 }}>
          Begin your journey
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          One account. Five powerful life modules.
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
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create your account</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="field"
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
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
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <input
            className="field"
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
                background: '#fff0f0',
                border: '1px solid #ffd0d0',
                borderRadius: 'var(--r-sm)',
                padding: '10px 14px',
                fontSize: 13,
                color: '#c0392b',
                fontWeight: 500,
              }}
            >
              {displayError}
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: 4 }}
          >
            {isLoading ? 'Creating account…' : 'Get Started'}
          </button>
        </form>
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
