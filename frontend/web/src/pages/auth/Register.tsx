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
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
          Begin your journey
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', letterSpacing: '0.01em' }}>
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
          background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
          borderRadius: 'var(--r-xl)',
          padding: '24px 20px 20px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 40px rgba(0,0,0,0.5)',
        }}
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
