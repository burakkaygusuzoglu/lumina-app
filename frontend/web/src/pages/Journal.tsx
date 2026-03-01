/**
 * Journal — AI-prompted writing, past entries, and Time Capsule.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { JournalEntry } from '../store/appStore';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -8 },
};

type Tab = 'write' | 'entries' | 'capsule';

/* ── Time capsule type ───────────────────────────────────────────────────── */
interface TimeCapsule {
  id:          string;
  message:     string;
  open_date:   string;
  is_opened:   boolean;
  created_at:  string;
}

/* ── Write panel ─────────────────────────────────────────────────────────── */
function WritePanel() {
  const qc = useQueryClient();
  const [text,      setText]      = useState('');
  const [submitted, setSubmitted] = useState(false);

  /* Fetch AI journal prompt */
  const { data: promptData, isLoading: promptLoading, refetch: newPrompt } = useQuery<{ prompt: string }>({
    queryKey: ['journal-prompt'],
    queryFn:  () => api.get('/journal/prompt').then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/journal', {
        content:    text,
        ai_prompt:  promptData?.prompt,
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      setSubmitted(true);
      setText('');
    },
  });

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '48px 24px' }}
      >
        <p style={{ fontSize: 64 }}>💜</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>Entry saved!</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
          Your reflection has been added to your journal.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="btn-ghost"
          style={{ marginTop: 24 }}
        >
          Write another entry
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* AI Prompt card */}
      <div
        className="card mb-16"
        style={{
          background: 'linear-gradient(135deg, var(--journal-light), #fff8fa)',
          border: '1px solid rgba(196,96,122,0.15)',
        }}
      >
        <div className="flex justify-between items-center mb-8">
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--journal)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ✨ Today's Prompt
          </p>
          <button
            onClick={() => newPrompt()}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--journal)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            New prompt ↺
          </button>
        </div>
        {promptLoading ? (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
            {[0,1,2].map((i) => (
              <motion.div key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: i*0.2 }}
                style={{ width: 6, height: 6, background: 'var(--journal)', borderRadius: '50%' }} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', fontStyle: 'italic' }}>
            "{promptData?.prompt ?? 'What are three things you\'re grateful for today?'}"
          </p>
        )}
      </div>

      {/* Write area */}
      <textarea
        className="field"
        placeholder="Start writing… let your thoughts flow freely."
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ marginBottom: 14, lineHeight: 1.7 }}
        autoFocus
      />

      {/* Character count */}
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', marginBottom: 12 }}>
        {text.length} characters
      </p>

      <button
        className="btn-primary"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || text.trim().length < 10}
        style={{ background: 'var(--journal)', boxShadow: '0 4px 16px rgba(196,96,122,0.35)' }}
      >
        {saveMutation.isPending ? 'Saving…' : '💾 Save Entry'}
      </button>
    </div>
  );
}

/* ── Expandable entry ───────────────────────────────────────────────────── */
function EntryCard({ entry, index }: { entry: JournalEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 180;
  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card"
    >
      {entry.ai_prompt && (
        <p style={{ fontSize: 12, color: 'var(--journal)', fontWeight: 600, marginBottom: 8, fontStyle: 'italic' }}>
          "{entry.ai_prompt}"
        </p>
      )}
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
        {isLong && !expanded ? entry.content.slice(0, 180) + '…' : entry.content}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 12, color: 'var(--journal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, marginTop: 6 }}
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
      <div className="flex justify-between items-center mt-12">
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          {new Date(entry.created_at).toLocaleDateString('en-GB', {
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
        {entry.mood_snapshot && (
          <span style={{ fontSize: 13 }}>
            {'😔😕😐🙂😊😄😁🤩✨🚀'[entry.mood_snapshot - 1]}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Past entries panel ──────────────────────────────────────────────────── */
function EntriesPanel() {
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal-entries'],
    queryFn:  () => api.get('/journal').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card" style={{ opacity: 0.6 }}>
            <div style={{ height: 11, width: '50%', borderRadius: 6, background: 'var(--border)', marginBottom: 10, animation: 'pulse 1.4s ease infinite' }} />
            <div style={{ height: 13, width: '95%', borderRadius: 6, background: 'var(--border)', marginBottom: 6, animation: 'pulse 1.4s ease infinite' }} />
            <div style={{ height: 13, width: '80%', borderRadius: 6, background: 'var(--border)', marginBottom: 6, animation: 'pulse 1.4s ease infinite' }} />
            <div style={{ height: 13, width: '60%', borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="emoji">📖</div>
        <p>No entries yet. Write your first journal entry!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map((entry, i) => <EntryCard key={entry.id} entry={entry} index={i} />)}
    </div>
  );
}

/* ── Time Capsule panel ──────────────────────────────────────────────────── */
function CapsulePanel() {
  const qc = useQueryClient();
  const [message,    setMessage]    = useState('');
  const [openDate,   setOpenDate]   = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [sealMsg,    setSealMsg]    = useState('');
  const [sealDone,   setSealDone]   = useState(false);

  const { data: capsules = [] } = useQuery<TimeCapsule[]>({
    queryKey: ['time-capsules'],
    queryFn:  () => api.get('/journal/time-capsules').then((r) => r.data),
    staleTime: 10 * 60 * 1000, // 10 min — capsules rarely change
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const capsule = await api.post('/journal/time-capsule', { message, open_date: openDate }).then((r) => r.data);
      try {
        const dateStr = new Date(openDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const aiRes = await api.post('/ai/chat', {
          message: `Generate a brief, poetic 1-2 sentence "sealing message" for a time capsule that opens on ${dateStr}. The message starts with something like "Until ${dateStr}..." Be warm and mystical.`,
        });
        setSealMsg(aiRes.data.response as string);
      } catch { /* non-critical */ }
      return capsule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-capsules'] });
      setMessage('');
      setOpenDate('');
      setShowForm(false);
      setSealDone(true);
    },
  });

  const now = new Date();

  return (
    <div>
      {/* Header card */}
      <div
        className="card mb-20"
        style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#fff', textAlign: 'center', padding: '28px 20px' }}
      >
        <p style={{ fontSize: 40 }}>⏳</p>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Time Capsules</h3>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          Write a message to your future self.
        </p>
      </div>

      {/* Seal success banner */}
      <AnimatePresence>
        {sealDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card mb-16"
            style={{ background: 'var(--journal-light)', borderLeft: '4px solid var(--journal)', textAlign: 'center' }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>⏳✨</p>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Capsule sealed!</p>
            {sealMsg && <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--journal)', fontStyle: 'italic' }}>{sealMsg}</p>}
            <button
              onClick={() => { setSealDone(false); setSealMsg(''); }}
              style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      {showForm ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card mb-20"
        >
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Write to Future You</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              className="field"
              placeholder="Dear future me… write what you want to remember or share."
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>OPEN ON</p>
              <input
                className="field"
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '14px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !message.trim() || !openDate}
                style={{ flex: 2, background: 'var(--journal)', boxShadow: '0 4px 14px rgba(196,96,122,0.3)' }}
              >
                {createMutation.isPending ? 'Sealing…' : '⏳ Seal Capsule'}
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 'var(--r-lg)',
            border: '2px dashed rgba(196,96,122,0.3)',
            background: 'var(--journal-light)',
            color: 'var(--journal)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          + Create Time Capsule
        </button>
      )}

      {/* Capsules list */}
      {capsules.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">⏳</div>
          <p>No capsules yet. Write a letter to your future self!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {capsules.map((cap, i) => {
            const openDate = new Date(cap.open_date);
            const canOpen  = now >= openDate;
            return (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="card"
                style={{ background: canOpen ? 'var(--journal-light)' : '#f8f7f4' }}
              >
                <div className="flex justify-between items-center mb-8">
                  <p style={{ fontSize: 13, fontWeight: 700, color: canOpen ? 'var(--journal)' : 'var(--muted)' }}>
                    {canOpen ? '📬 Ready to open!' : '🔒 Sealed'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Opens {openDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {canOpen && cap.is_opened ? (
                  <p style={{ fontSize: 14, lineHeight: 1.6 }}>{cap.message}</p>
                ) : canOpen ? (
                  <p style={{ fontSize: 14, color: 'var(--journal)', fontStyle: 'italic' }}>
                    Tap to open your capsule…
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>
                    This message is waiting for {openDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  Written {new Date(cap.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Journal() {
  const [activeTab, setActiveTab] = useState<Tab>('write');

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'write',   label: 'Write',   emoji: '✍️'  },
    { id: 'entries', label: 'Entries', emoji: '📖'  },
    { id: 'capsule', label: 'Capsule', emoji: '⏳'  },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial" animate="animate" exit="exit"
      transition={{ duration: 0.35 }}
      className="page"
    >
      {/* Header */}
      <p style={{ fontSize: 13, color: 'var(--journal)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        📖 Journal
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 2, marginBottom: 20 }}>Your Reflections</h1>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          background: 'var(--surface)',
          borderRadius: 'var(--r-md)',
          padding: 4,
          gap: 4,
          marginBottom: 24,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === tab.id ? 'var(--journal)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'write'   && <WritePanel   />}
          {activeTab === 'entries' && <EntriesPanel />}
          {activeTab === 'capsule' && <CapsulePanel />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
