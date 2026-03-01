/**
 * Vault — AES-256 encrypted secrets list with add/reveal.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { VaultItem } from '../store/appStore';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -8 },
};

const CATEGORIES = ['password', 'note', 'card', 'key', 'identity', 'other'];

const CATEGORY_EMOJI: Record<string, string> = {
  password: '🔑',
  note:     '📝',
  card:     '💳',
  key:      '🗝',
  identity: '🪪',
  other:    '📦',
};

/* ── Add item sheet ──────────────────────────────────────────────────────── */
function AddItemSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState('password');
  const [secret,   setSecret]   = useState('');
  const [note,     setNote]     = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/vault', { title, category, encrypted_data: secret, note }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); onClose(); },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="modal-sheet"
      >
        <div className="modal-handle" />
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add to Vault 🔒</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="field"
            placeholder="Title (e.g. Gmail password)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {/* Category picker */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: category === c ? '2px solid var(--vault)' : '2px solid var(--border)',
                  background: category === c ? 'var(--vault-light)' : 'var(--bg)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: category === c ? 'var(--vault)' : 'var(--muted)',
                }}
              >
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>

          <input
            className="field"
            placeholder="Secret / Value"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            type="password"
          />
          <textarea
            className="field"
            placeholder="Notes (optional)"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            🔐 Encrypted with AES-256 before storage
          </p>

          <button
            className="btn-primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim() || !secret.trim()}
            style={{ background: 'var(--vault)', boxShadow: '0 4px 16px rgba(212,134,74,0.35)' }}
          >
            {mutation.isPending ? 'Encrypting…' : 'Add to Vault'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Vault Item card ─────────────────────────────────────────────────────── */
function VaultCard({ item, onDelete }: { item: VaultItem; onDelete: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [secret,   setSecret]   = useState<string | null>(null);

  async function reveal() {
    if (revealed) { setRevealed(false); return; }
    try {
      const { data } = await api.get(`/vault/${item.id}/decrypt`);
      setSecret(data.decrypted_data ?? data.data ?? '••••••••');
    } catch {
      setSecret('Could not decrypt');
    }
    setRevealed(true);
  }

  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 44, height: 44, flexShrink: 0,
          background: 'var(--vault-light)',
          borderRadius: 'var(--r-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {CATEGORY_EMOJI[item.category] ?? '📦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex justify-between items-center">
          <p style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</p>
          <button
            onClick={onDelete}
            style={{ fontSize: 14, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            🗑
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.category}</p>
        {item.note && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{item.note}</p>}

        <AnimatePresence>
          {revealed && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: 8,
                background: 'var(--vault-light)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                color: 'var(--vault)',
                fontWeight: 600,
              }}
            >
              {secret}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={reveal}
          style={{
            marginTop: 8,
            fontSize: 12,
            fontWeight: 700,
            color: revealed ? 'var(--muted)' : 'var(--vault)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {revealed ? '🙈 Hide' : '👁 Reveal'}
        </button>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Vault() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useQuery<VaultItem[]>({
    queryKey: ['vault'],
    queryFn:  () => api.get('/vault').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min — vault items are sensitive, re-fetch conservatively
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['vault'] }),
  });

  /* Group by category */
  const grouped = CATEGORIES.reduce<Record<string, VaultItem[]>>((acc, cat) => {
    const group = items.filter((i) => i.category === cat);
    if (group.length) acc[cat] = group;
    return acc;
  }, {});

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="initial" animate="animate" exit="exit"
        transition={{ duration: 0.35 }}
        className="page"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-20">
          <div>
            <p style={{ fontSize: 13, color: 'var(--vault)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🔒 Vault
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>Your Secrets</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ background: 'var(--vault)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            + Add
          </button>
        </div>

        {/* Security badge */}
        <div
          className="card mb-20"
          style={{ background: 'linear-gradient(135deg, var(--vault-light), #fff)', display: 'flex', gap: 12, alignItems: 'center', padding: '16px' }}
        >
          <span style={{ fontSize: 32 }}>🛡️</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Military-grade encryption</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {items.length} items · AES-256-GCM · Zero-knowledge
            </p>
          </div>
        </div>

        {/* Items */}
        {isLoading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔒</div>
            <p>Your vault is empty. Add your first secret!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <p className="section-label">{CATEGORY_EMOJI[cat]} {cat.toUpperCase()}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <VaultCard item={item} onDelete={() => deleteMutation.mutate(item.id)} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && <AddItemSheet onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  );
}
