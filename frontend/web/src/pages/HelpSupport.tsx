/**
 * Help & Support — contact form + FAQ
 * Users can report bugs, ask questions, and get help via email.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';

const SUPPORT_EMAIL = 'support@luminalifeos.com';

const FAQ = [
  {
    q: 'How do I reset my password?',
    a: 'On the login screen, tap "Forgot password" and enter your email. You\'ll receive a reset link within a few minutes.',
  },
  {
    q: 'How does AI memory search work?',
    a: 'Lumina uses semantic vector search (Pinecone) to find memories based on meaning, not just keywords. Describe what you remember and it will find it.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. All your data is encrypted in transit (TLS) and at rest (Supabase Row Level Security). You own your data — we never sell it.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Profile → scroll to the bottom → tap "Delete Account". This permanently removes all your data from our servers.',
  },
  {
    q: 'Why are notifications not working?',
    a: 'Go to Settings → Notifications → enable Push Notifications. On iOS, make sure Lumina is allowed to send notifications in your phone\'s Settings app.',
  },
  {
    q: 'Can I export my data?',
    a: 'Data export is coming soon. Contact us at ' + SUPPORT_EMAIL + ' and we\'ll send you a CSV export manually in the meantime.',
  },
];

type Category = 'bug' | 'question' | 'feedback' | 'account';

const CATEGORIES: { key: Category; emoji: string; label: string }[] = [
  { key: 'bug',      emoji: '🐛', label: 'Bug Report'       },
  { key: 'question', emoji: '❓', label: 'Question'          },
  { key: 'feedback', emoji: '💬', label: 'Feedback'          },
  { key: 'account',  emoji: '🔐', label: 'Account Issue'     },
];

export default function HelpSupport() {
  const navigate  = useNavigate();
  const addToast  = useAppStore((s) => s.addToast);

  const [tab,      setTab]      = useState<'contact' | 'faq'>('contact');
  const [category, setCategory] = useState<Category>('bug');
  const [subject,  setSubject]  = useState('');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [openFaq,  setOpenFaq]  = useState<number | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      addToast('error', 'Please fill in all fields');
      return;
    }
    setSending(true);
    // Build mailto link as fallback (real email API would go here)
    const body = encodeURIComponent(
      `Category: ${category}\n\n${message}\n\n---\nSent from Lumina Life OS`
    );
    const subj = encodeURIComponent(`[${category.toUpperCase()}] ${subject}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subj}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      setSubject('');
      setMessage('');
      addToast('success', 'Message opened in your email app!');
    }, 800);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y: 0  }}
      className="page"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          className="btn-icon"
          onClick={() => navigate(-1)}
          style={{ width: 36, height: 36 }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Help & Support</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{SUPPORT_EMAIL}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {(['contact', 'faq'] as const).map((t) => (
          <button
            key={t}
            className={`tab-item${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'contact' ? '✉️ Contact Us' : '❓ FAQ'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'contact' ? (
          <motion.div
            key="contact"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Category chips */}
            <p className="section-label" style={{ marginBottom: 12 }}>📌 CATEGORY</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`chip${category === c.key ? ' active' : ''}`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p className="section-label" style={{ marginBottom: 8 }}>✏️ SUBJECT</p>
                <input
                  className="field"
                  placeholder={
                    category === 'bug'      ? 'e.g. App crashes when I open Journal' :
                    category === 'question' ? 'e.g. How do I set daily reminders?' :
                    category === 'feedback' ? 'e.g. I love the AI mood insights!' :
                    'e.g. Can\'t log in to my account'
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <p className="section-label" style={{ marginBottom: 8 }}>💬 MESSAGE</p>
                <textarea
                  className="field"
                  placeholder={
                    category === 'bug'
                      ? 'Describe the bug: what happened, what did you expect, steps to reproduce...'
                      : 'Tell us more...'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                />
                <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
                  {message.length}/2000
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={sending}
              >
                {sending ? 'Opening email…' : `📧 Send via Email`}
              </button>
            </div>

            {/* Direct email note */}
            <div style={{
              marginTop: 20, padding: '14px 16px',
              background: 'rgba(123,111,218,0.08)',
              border: '1px solid rgba(123,111,218,0.2)',
              borderRadius: 14,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  You can also email us directly
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {SUPPORT_EMAIL}
                  <br />We respond within 24–48 hours.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="faq"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <p className="section-label" style={{ marginBottom: 14 }}>❓ FREQUENTLY ASKED QUESTIONS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FAQ.map((item, i) => (
                <motion.div
                  key={i}
                  className="card"
                  style={{ cursor: 'pointer', padding: '16px 18px' }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
                      {item.q}
                    </p>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ color: 'var(--muted)', fontSize: 16, flexShrink: 0 }}
                    >
                      ›
                    </motion.span>
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ fontSize: 13, color: 'var(--text2)', marginTop: 10, lineHeight: 1.6, overflow: 'hidden' }}
                      >
                        {item.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Can't find what you need?<br />
                <button
                  onClick={() => setTab('contact')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--mind)', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Contact us directly →
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
