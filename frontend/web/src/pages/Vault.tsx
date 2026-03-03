import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { VaultItem } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

const CATS = [
  { key: '',          label: 'All',       icon: '' },
  { key: 'password',  label: 'Passwords', icon: '' },
  { key: 'note',      label: 'Notes',     icon: '' },
  { key: 'card',      label: 'Cards',     icon: '' },
  { key: 'document',  label: 'Documents', icon: '' },
];

const CAT_ICON: Record<string, string> = { password: '', note: '', card: '', document: '' };

function MasterPassGate({ onUnlock }: { onUnlock: () => void }) {
  const addToast = useAppStore((s) => s.addToast);
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const storedHash = localStorage.getItem('vault_pass_hash');

  function attempt() {
    if (!pass) return;
    if (!storedHash) {
      // First time setup
      const simpleHash = btoa(pass + 'lumina-salt');
      localStorage.setItem('vault_pass_hash', simpleHash);
      sessionStorage.setItem('vault_unlocked', '1');
      addToast('success', 'Master password set ');
      onUnlock();
    } else {
      if (btoa(pass + 'lumina-salt') === storedHash) {
        sessionStorage.setItem('vault_unlocked', '1');
        onUnlock();
      } else {
        setError('Incorrect password');
        setPass('');
      }
    }
  }

  return (
    <motion.div {...PAGE} className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - var(--nav-h) - 32px)', textAlign: 'center' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic', marginBottom: 8 }}>Vault</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, maxWidth: 280 }}>
          {storedHash ? 'Enter your master password to unlock' : 'Set a master password to protect your vault'}
        </p>
        <input
          type="password"
          className="field"
          placeholder={storedHash ? 'Master password' : 'Create master password'}
          value={pass}
          onChange={(e) => { setPass(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && attempt()}
          style={{ textAlign: 'center', letterSpacing: 4, marginBottom: 8, maxWidth: 280 }}
          autoFocus
        />
        {error && <p style={{ fontSize: 12, color: 'var(--journal)', marginBottom: 8 }}>{error}</p>}
        <button className="btn-primary" onClick={attempt} style={{ maxWidth: 280, background: 'linear-gradient(135deg, var(--vault), #e8a06a)' }}>
          {storedHash ? 'Unlock Vault' : 'Create Master Password'}
        </button>
      </motion.div>
    </motion.div>
  );
}

interface ItemFormProps { initial?: VaultItem; onClose: () => void }
function ItemForm({ initial, onClose }: ItemFormProps) {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [cat,      setCat]      = useState<VaultItem['category']>(initial?.category ?? 'password');
  const [title,    setTitle]    = useState(initial?.title ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [url,      setUrl]      = useState(initial?.url ?? '');
  const [content,  setContent]  = useState(initial?.content ?? '');
  const [cardNum,  setCardNum]  = useState(initial?.card_number ?? '');
  const [expiry,   setExpiry]   = useState(initial?.expiry ?? '');
  const [cvv,      setCvv]      = useState(initial?.cvv ?? '');
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<VaultItem> = { title, category: cat, content, username: username || undefined, password: password || undefined, url: url || undefined, card_number: cardNum || undefined, expiry: expiry || undefined, cvv: cvv || undefined };
      if (initial?.id) return api.put(`/vault/${initial.id}`, payload).then((r) => r.data);
      return api.post('/vault', payload).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); addToast('success', initial?.id ? 'Item updated ' : 'Item saved '); onClose(); },
    onError:   () => addToast('error', 'Failed to save item'),
  });

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal-sheet" initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{initial?.id ? 'Edit Item' : 'New Item'}</h3>
          <button className="btn-icon" onClick={onClose}></button>
        </div>

        {/* Category */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.slice(1).map((c) => (
            <button key={c.key} onClick={() => setCat(c.key as VaultItem['category'])}
              className={`chip${cat === c.key ? ' active' : ''}`} style={{ flexShrink: 0 }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <input className="field" placeholder="Title*" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />

        {cat === 'password' && (
          <>
            <input className="field" placeholder="Username / Email" value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input className="field" type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>
                {showPass ? '' : ''}
              </button>
            </div>
            <input className="field" placeholder="Website URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ marginBottom: 10 }} />
          </>
        )}

        {cat === 'card' && (
          <>
            <input className="field" placeholder="Card Number" value={cardNum} onChange={(e) => setCardNum(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input className="field" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ flex: 1 }} />
              <input className="field" placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} style={{ flex: 1 }} />
            </div>
          </>
        )}

        {(cat === 'note' || cat === 'document') && (
          <textarea className="field" placeholder={cat === 'note' ? 'Secure note' : 'Document content'} rows={4} value={content} onChange={(e) => setContent(e.target.value)} style={{ marginBottom: 10 }} />
        )}

        <button className="btn-primary" onClick={() => title.trim() && mutation.mutate()} disabled={mutation.isPending || !title.trim()}
          style={{ background: 'linear-gradient(135deg, var(--vault), #e8a06a)' }}>
          {mutation.isPending ? 'Saving' : 'Save to Vault'}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Vault() {
  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('vault_unlocked') === '1');
  const [catFilter, setCatFilter] = useState('');
  const [search,    setSearch]   = useState('');
  const [showForm, setShowForm]  = useState(false);
  const [editItem, setEditItem]  = useState<VaultItem | undefined>();
  const [deleteId, setDeleteId]  = useState<string | null>(null);
  const [revealId, setRevealId]  = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<VaultItem[]>({
    queryKey: ['vault'],
    queryFn:  () => api.get('/vault').then((r) => r.data),
    enabled:  unlocked,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault'] }); addToast('success', 'Item deleted'); setDeleteId(null); },
    onError:   () => addToast('error', 'Failed to delete'),
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => addToast('success', `${label} copied!`));
  }

  const filtered = useMemo(() => items.filter((item) => {
    const matchCat    = !catFilter || item.category === catFilter;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [items, catFilter, search]);

  if (!unlocked) return <MasterPassGate onUnlock={() => setUnlocked(true)} />;

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Vault</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{items.length} items secured</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-icon" onClick={() => { sessionStorage.removeItem('vault_unlocked'); setUnlocked(false); }} title="Lock vault"></button>
          <motion.button whileTap={{ scale: 0.92 }} className="fab" onClick={() => setShowForm(true)}
            style={{ background: 'linear-gradient(135deg, var(--vault), #e8a06a)' }}>+</motion.button>
        </div>
      </div>

      <input className="field" placeholder="  Search vault" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12 }} />

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setCatFilter(c.key)}
            className={`chip${catFilter === c.key ? ' active' : ''}`} style={{ flexShrink: 0 }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map((i) => <div key={i} className="card" style={{ opacity: 0.7 }}><div className="skeleton" style={{ height: 50 }} /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="emoji"></div>
          <p>No items {catFilter ? `in ${catFilter}` : 'in vault'}</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item, i) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                className="card card-hover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    background: 'rgba(212,134,74,0.1)',
                  }}>
                    {CAT_ICON[item.category] ?? ''}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                    {item.username && <p style={{ fontSize: 12, color: 'var(--muted)' }}>{item.username}</p>}
                    {item.url && <p style={{ fontSize: 11, color: 'var(--life)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url}</p>}
                    {item.category === 'card' && item.card_number && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                           {item.card_number.slice(-4)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {item.password && (
                      <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12 }}
                        onClick={() => copyToClipboard(item.password!, 'Password')}></button>
                    )}
                    {item.content && (
                      <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12 }}
                        onClick={() => copyToClipboard(item.content!, 'Content')}></button>
                    )}
                    <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12 }} onClick={() => setEditItem(item)}></button>
                    <button className="btn-icon" style={{ width: 30, height: 30, fontSize: 12, color: 'var(--journal)' }} onClick={() => setDeleteId(item.id)}></button>
                  </div>
                </div>

                {/* Reveal section */}
                {(item.password || item.content) && revealId !== item.id && (
                  <button onClick={() => setRevealId(item.id)}
                    style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--vault)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                     Reveal
                  </button>
                )}
                <AnimatePresence>
                  {revealId === item.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      {item.password && (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', fontFamily: 'monospace', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ wordBreak: 'break-all' }}>{item.password}</span>
                          <button onClick={() => { copyToClipboard(item.password!, 'Password'); setRevealId(null); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, marginLeft: 8 }}></button>
                        </div>
                      )}
                      {item.content && item.category !== 'password' && (
                        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{item.content}</p>
                      )}
                      <button onClick={() => setRevealId(null)}
                        style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                        Hide
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {(showForm || editItem) && (
          <ItemForm initial={editItem} onClose={() => { setShowForm(false); setEditItem(undefined); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <ConfirmModal title="Delete Item" message="This vault item will be permanently deleted." confirmText="Delete" danger
            onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
