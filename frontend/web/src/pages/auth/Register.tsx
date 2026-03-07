/**
 * Register page — create a new Lumina account.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import FloatingInput from '../../components/FloatingInput';

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
