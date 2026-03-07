/**
 * ForgotPasswordModal — Apple-quality bottom-sheet style modal
 * Sends a password reset email via the Lumina API → Supabase.
 */
import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: Props) {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    // reset state on close
    setTimeout(() => { setEmail(''); setSent(false); setError(''); }, 350);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0,      opacity: 1 }}
            exit={{ y: '100%',    opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: 'linear-gradient(158deg, rgba(22,22,38,0.99) 0%, rgba(14,14,26,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '8px 24px 40px',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 38, height: 4,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.15)',
              margin: '10px auto 22px',
            }} />

            {sent ? (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ textAlign: 'center', paddingBottom: 8 }}
              >
                <div style={{
                  fontSize: 52, marginBottom: 16,
                  filter: 'drop-shadow(0 0 18px rgba(61,170,134,0.7))',
                }}>
                  ✅
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                  Check your inbox
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24 }}>
                  If <strong style={{ color: 'var(--mind)' }}>{email}</strong> is registered,
                  you'll receive a password reset link shortly.
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleClose}
                  style={{
                    width: '100%', padding: '15px',
                    borderRadius: 14, fontSize: 15, fontWeight: 700,
                    fontFamily: 'var(--font)',
                    background: 'linear-gradient(135deg, #7b6fda 0%, #3daa86 100%)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 6px 26px rgba(123,111,218,0.4)',
                  }}
                >
                  Done
                </motion.button>
              </motion.div>
            ) : (
              /* Form state */
              <>
                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: 'linear-gradient(145deg, rgba(123,111,218,0.3) 0%, rgba(61,170,134,0.2) 100%)',
                  border: '1px solid rgba(123,111,218,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, marginBottom: 16,
                }}>
                  🔑
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Reset password
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 22, lineHeight: 1.55 }}>
                  Enter your email and we'll send a reset link if your account exists.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Email field */}
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14, overflow: 'hidden',
                  }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      style={{
                        width: '100%',
                        padding: '15px 16px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 15,
                        color: 'var(--text)',
                        fontFamily: 'var(--font)',
                      }}
                    />
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
                        margin: 0,
                      }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading || !email.trim()}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', padding: '15px',
                      borderRadius: 14, fontSize: 15, fontWeight: 700,
                      fontFamily: 'var(--font)',
                      background: loading || !email.trim()
                        ? 'rgba(123,111,218,0.3)'
                        : 'linear-gradient(135deg, #7b6fda 0%, #3daa86 100%)',
                      color: '#fff', border: 'none',
                      cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                      boxShadow: loading || !email.trim()
                        ? 'none'
                        : '0 6px 26px rgba(123,111,218,0.42)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span className="ai-thinking-dots">
                          <span className="ai-thinking-dot dot-flicker-1" />
                          <span className="ai-thinking-dot dot-flicker-2" />
                          <span className="ai-thinking-dot dot-flicker-3" />
                        </span>
                        Sending…
                      </span>
                    ) : 'Send reset link'}
                  </motion.button>

                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 14, color: 'var(--muted)', fontWeight: 600,
                      padding: '8px', fontFamily: 'var(--font)',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
