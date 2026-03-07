import { useState, useMemo } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { JournalEntry } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

const MOODS = ['😞','😕','😐','🙂','😊','😄','🥰','🤩'];
const CATS  = ['reflection','gratitude','goals','memories','emotions','growth'];
const MOOD_LABELS = ['Rough','Low','Meh','Okay','Good','Great','Lovely','Amazing'];
const MOOD_COLORS = ['#c4607a','#c47a60','#6b7280','#60a5fa','#34d399','#e2b96a','#a78bfa','#7b6fda'];

function Skel() {
  return (
    <div className="card" style={{ opacity: 0.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
      <div className="skeleton" style={{ height: 12, width: '95%' }} />
      <div className="skeleton" style={{ height: 12, width: '80%' }} />
    </div>
  );
}

export default function Journal() {
  const [aiInsight] = useState('AI prompt: Reflect on three things that made you smile today.');

  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [showCard, setShowCard]   = useState(true);
  const [promptCat, setPromptCat] = useState(CATS[Math.floor(Math.random() * CATS.length)]);
  const [promptSeed, setPromptSeed] = useState(Math.floor(Math.random() * 99));
  const [newContent, setNewContent] = useState('');
  const [newMood, setNewMood]     = useState(4);
  const [tagInput, setTagInput]   = useState('');
  const [newTags, setNewTags]     = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [showTimeCapsule, setShowTimeCapsule] = useState(false);
  const [capsuleContent, setCapsuleContent] = useState('');
  const [capsuleDate, setCapsuleDate] = useState('');
  const [writing, setWriting]     = useState(false);
  const [inlineWriting, setInlineWriting] = useState(false);

  const { data: prompt, isFetching: promptLoading } = useQuery<{ prompt: string }>({
    queryKey: ['journal-prompt', promptCat, promptSeed],
    queryFn:  () => api.get(`/ai/journal-prompt?category=${promptCat}&seed=${promptSeed}`).then((r) => r.data),
    staleTime: 3_600_000,
  });

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal'],
    queryFn:  () => api.get('/journal/entries').then((r) => r.data),
    staleTime: 30_000,
  });

  const journalStreak = useMemo(() => {
    if (!entries.length) return 0;
    const dates = [...new Set(entries.map((e) => e.created_at.split('T')[0]))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let check = today;
    for (const d of dates) {
      if (d === check) {
        streak++;
        const dt = new Date(check); dt.setDate(dt.getDate() - 1);
        check = dt.toISOString().split('T')[0];
      } else if (d < check) break;
    }
    return streak;
  }, [entries]);

  function exportJournal() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `lumina-journal-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Journal exported!');
  }

  const createMutation = useMutation({
    mutationFn: () => api.post('/journal/entry', { content: newContent, mood: newMood, tags: newTags }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      addToast('success', 'Entry saved ');
      setNewContent(''); setNewTags([]); setWriting(false); setInlineWriting(false);
    },
    onError: () => addToast('error', 'Failed to save entry'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/memories/${editEntry!.id}`, { content: editEntry!.content, mood: editEntry!.mood, tags: editEntry!.tags }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); addToast('success', 'Updated '); setEditEntry(null); },
    onError: () => addToast('error', 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/memories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); addToast('success', 'Entry deleted'); setDeleteId(null); },
    onError: () => addToast('error', 'Failed to delete'),
  });

  const capsuleMutation = useMutation({
      mutationFn: () => api.post('/journal/timecapsule', { title: "Letters to future", letter: capsuleContent, open_date: new Date(capsuleDate).toISOString() }).then((r) => r.data),
      onSuccess: () => { addToast('success', 'Time capsule sealed! ⏳'); setCapsuleContent(''); setCapsuleDate(''); setShowTimeCapsule(false); },
  });

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !newTags.includes(t)) setNewTags([...newTags, t]);
    setTagInput('');
  }

  function regeneratePrompt() {
    setPromptCat(CATS[Math.floor(Math.random() * CATS.length)]);
    setPromptSeed(Math.floor(Math.random() * 99));
  }

  function usePrompt() {
    if (prompt?.prompt) {
      setNewContent(prompt.prompt + '\n\n');
      setInlineWriting(true);
    }
  }

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Journal</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {entries.length} entries written
            {journalStreak > 0 && (
              <span style={{ marginLeft: 8, color: '#f97316', fontWeight: 700 }}>🔥 {journalStreak} day streak
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {entries.length > 0 && (
            <button onClick={exportJournal} title="Export JSON"
              style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(196,96,122,0.12)', border: '1px solid rgba(196,96,122,0.25)', color: 'var(--journal)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ↓ Export
            </button>
          )}
          <motion.button whileTap={{ scale: 0.92 }} className="fab"
            onClick={() => setWriting(true)}
            style={{ background: 'linear-gradient(135deg, var(--journal), #e07a8a)' }}>
            +
          </motion.button>
        </div>
      </div>

      {/* ── AI Prompt Card — immersive premium design ── */}
      <AnimatePresence>
        {showCard && !inlineWriting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, scale: 0.97 }}
            style={{
              background: 'linear-gradient(160deg, rgba(196,96,122,0.18) 0%, rgba(123,111,218,0.12) 60%, rgba(61,170,134,0.08) 100%)',
              border: '1px solid rgba(196,96,122,0.25)',
              borderRadius: 24, padding: 24, marginBottom: 20,
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -40, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(196,96,122,0.25)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(123,111,218,0.2)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(196,96,122,0.18)', border: '1px solid rgba(196,96,122,0.3)', color: 'var(--journal)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ✦ {promptCat}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={regeneratePrompt} disabled={promptLoading}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 12px', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {promptLoading ? '...' : '↻ New'}
                  </button>
                  <button className="btn-icon" onClick={() => setShowCard(false)} style={{ width: 30, height: 30, fontSize: 11 }}>✕</button>
                </div>
              </div>

              {promptLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <div className="skeleton" style={{ height: 22, width: '88%' }} />
                  <div className="skeleton" style={{ height: 22, width: '70%' }} />
                </div>
              ) : (
                <p style={{
                  fontSize: 20, lineHeight: 1.5,
                  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500,
                  color: 'var(--text)', marginBottom: 22, letterSpacing: '-0.01em',
                }}>
                  "{prompt?.prompt ?? 'What are you feeling grateful for today?'}"
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={usePrompt}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--journal), #e07a8a)',
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 8px 24px -8px rgba(196,96,122,0.5)',
                }}
              >
                ✏ Write Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline writing area ── */}
      <AnimatePresence>
        {inlineWriting && (
          <motion.div
            key="inline-write"
            initial={{ opacity: 0, scaleY: 0.85, originY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.85 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={{ marginBottom: 20, overflow: 'hidden' }}
          >
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(196,96,122,0.3)', borderRadius: 20, padding: 20 }}>
              {prompt?.prompt && (
                <p style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'rgba(196,96,122,0.85)', marginBottom: 14, lineHeight: 1.4 }}>
                  "{prompt.prompt}"
                </p>
              )}

              <textarea
                className="field"
                placeholder="Start writing..."
                rows={6}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ marginBottom: 14, fontSize: 15, lineHeight: 1.65, resize: 'vertical' }}
                autoFocus
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginRight: 4, flexShrink: 0 }}>MOOD</p>
                {MOODS.map((em, i) => (
                  <button key={i} onClick={() => setNewMood(i + 1)}
                    style={{
                      background: newMood === i+1 ? 'rgba(196,96,122,0.18)' : 'none',
                      border: newMood === i+1 ? '1px solid rgba(196,96,122,0.35)' : '1px solid transparent',
                      borderRadius: 10, padding: '4px 7px', cursor: 'pointer', fontSize: 20,
                      transform: newMood === i+1 ? 'scale(1.25)' : 'scale(1)', transition: 'all 0.15s', flexShrink: 0,
                    }}>
                    {em}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setInlineWriting(false); setNewContent(''); }}
                  className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={() => newContent.trim() && createMutation.mutate()}
                  disabled={createMutation.isPending || !newContent.trim()}
                  style={{ flex: 2, background: 'linear-gradient(135deg, var(--journal), #e07a8a)' }}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Entry ✓'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Time Capsule CTA — with hourglass visual ── */}
      <motion.button
        onClick={() => setShowTimeCapsule(true)}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%', marginBottom: 20, textAlign: 'left', cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(226,185,106,0.12) 0%, rgba(212,134,74,0.06) 100%)',
          border: '1px solid rgba(226,185,106,0.22)', borderRadius: 20, padding: 0,
          position: 'relative', overflow: 'hidden',
        }}
      >
        <svg style={{ position: 'absolute', right: -10, top: 0, pointerEvents: 'none', opacity: 0.07 }} width="160" height="110" viewBox="0 0 160 110" fill="none">
          <circle cx="120" cy="30" r="50" fill="#e2b96a" />
          <circle cx="145" cy="85" r="25" fill="#d4864a" />
          <path d="M55 8 L85 8 L70 52 L85 96 L55 96 L70 52 Z" stroke="#e2b96a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="53" y1="8" x2="87" y2="8" stroke="#e2b96a" strokeWidth="3" strokeLinecap="round"/>
          <line x1="53" y1="96" x2="87" y2="96" stroke="#e2b96a" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="70" cy="48" r="3" fill="#e2b96a"/>
          <circle cx="66" cy="56" r="2" fill="#e2b96a" opacity="0.6"/>
          <circle cx="74" cy="56" r="2" fill="#e2b96a" opacity="0.6"/>
          <text x="10" y="25" fontSize="14" fill="#e2b96a">✦</text>
          <text x="135" y="105" fontSize="9" fill="#d4864a">✦</text>
          <text x="150" y="20" fontSize="7" fill="#e2b96a">✦</text>
        </svg>
        <div style={{ position: 'relative', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(226,185,106,0.25), rgba(212,134,74,0.15))',
            border: '1px solid rgba(226,185,106,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            ⏳
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>Seal a Time Capsule</p>
              <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: 10, fontWeight: 700 }}>🔒 E2E</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>Write a letter to your future self</p>
          </div>
          <span style={{ color: 'var(--gold)', fontSize: 18, opacity: 0.6, flexShrink: 0 }}>›</span>
        </div>
      </motion.button>

      {/* Journal entries */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map((i) => <Skel key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="emoji"></div>
          <p>No entries yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Start writing your first journal entry</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry, i) => {
            const moodIdx   = Math.min((entry.mood ?? 1) - 1, 7);
            const moodColor = MOOD_COLORS[moodIdx];
            const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
            return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card"
              style={{ borderLeft: `3px solid ${moodColor}`, paddingLeft: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: `${moodColor}18`,
                    border: `1.5px solid ${moodColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {MOODS[moodIdx]}
                  </span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: moodColor }}>
                      {MOOD_LABELS[moodIdx]}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(entry.created_at).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', padding: '2px 7px', borderRadius: 10, background: 'var(--surface2)', marginRight: 2 }}>
                    {wordCount}w
                  </span>
                  <button className="btn-icon" onClick={() => setEditEntry({ ...entry })} style={{ width: 30, height: 30, fontSize: 12 }}>✎</button>
                  <button className="btn-icon" onClick={() => setDeleteId(entry.id)} style={{ width: 30, height: 30, fontSize: 12, color: 'var(--journal)' }}>✕</button>
                </div>
              </div>

              <p style={{
                fontSize: 14, lineHeight: 1.6, marginTop: 12, color: 'var(--text2)',
                display: expandedId === entry.id ? 'block' : '-webkit-box',
                WebkitLineClamp: expandedId === entry.id ? undefined : 3,
                WebkitBoxOrient: 'vertical' as const,
                overflow: expandedId === entry.id ? 'visible' : 'hidden',
              }}>
                {entry.content}
              </p>

              {entry.content.length > 150 && (
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--journal)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 6, padding: 0 }}
                >
                  {expandedId === entry.id ? '↑ Show less' : '↓ Read more'}
                </button>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  {entry.tags.map((t) => (
                    <span key={t} style={{
                      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: 'rgba(196,96,122,0.1)', border: '1px solid rgba(196,96,122,0.2)',
                      color: 'var(--journal)',
                    }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
            );
          })}
        </div>
      )}

      {/* New Entry Sheet */}
      <AnimatePresence>
        {writing && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setWriting(false)}>
            <motion.div className="modal-sheet" initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Entry</h3>
                <button className="btn-icon" onClick={() => setWriting(false)}></button>
              </div>
              {!showCard && (
                <button onClick={() => setShowCard(true)} className="btn-ghost" style={{ fontSize: 12, marginBottom: 10, padding: '6px 10px' }}> Use AI Prompt</button>
              )}
              <textarea
                className="field"
                placeholder="What's on your mind today?"
                rows={6}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>MOOD:</p>
                {MOODS.map((em, i) => (
                  <button key={i} onClick={() => setNewMood(i + 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, opacity: newMood === i + 1 ? 1 : 0.35, transform: newMood === i + 1 ? 'scale(1.3)' : 'scale(1)', transition: 'all 0.15s' }}>
                    {em}
                  </button>
                ))}
              </div>
              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                {newTags.map((t) => (
                  <span key={t} className="chip">
                    #{t}
                    <button onClick={() => setNewTags(newTags.filter((tg) => tg !== t))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: 0, marginLeft: 2 }}></button>
                  </span>
                ))}
                <input
                  value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Tag + Enter"
                  style={{ border: 'none', background: 'none', color: 'var(--text)', fontSize: 13, outline: 'none', flex: 1, minWidth: 80 }}
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => newContent.trim() && createMutation.mutate()}
                disabled={createMutation.isPending || !newContent.trim()}
                style={{ background: 'linear-gradient(135deg, var(--journal), #e07a8a)' }}
              >
                {createMutation.isPending ? 'Saving' : 'Save Entry'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Sheet */}
      <AnimatePresence>
        {editEntry && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setEditEntry(null)}>
            <motion.div className="modal-sheet" initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Entry</h3>
                <button className="btn-icon" onClick={() => setEditEntry(null)}></button>
              </div>
              <textarea className="field" rows={6} value={editEntry.content} onChange={(e) => setEditEntry({ ...editEntry, content: e.target.value })} style={{ marginBottom: 14 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                {MOODS.map((em, i) => (
                  <button key={i} onClick={() => setEditEntry({ ...editEntry, mood: i + 1 })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, opacity: editEntry.mood === i + 1 ? 1 : 0.35, transform: editEntry.mood === i + 1 ? 'scale(1.3)' : 'scale(1)', transition: 'all 0.15s' }}>
                    {em}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                style={{ background: 'linear-gradient(135deg, var(--journal), #e07a8a)' }}>
                {updateMutation.isPending ? 'Updating' : 'Update Entry'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Capsule Sheet */}
      <AnimatePresence>
        {showTimeCapsule && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowTimeCapsule(false)}>
            <motion.div className="modal-sheet" initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}></span>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Seal a Time Capsule</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Write a letter to your future self</p>
              </div>
              <textarea className="field" placeholder="Dear future me" rows={5} value={capsuleContent}
                onChange={(e) => setCapsuleContent(e.target.value)} style={{ marginBottom: 12 }} />
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>UNLOCK DATE</p>
                <input
                  type="date"
                  className="field"
                  value={capsuleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCapsuleDate(e.target.value)}
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => capsuleContent.trim() && capsuleDate && capsuleMutation.mutate()}
                disabled={capsuleMutation.isPending || !capsuleContent.trim() || !capsuleDate}
                style={{ background: 'linear-gradient(135deg, #e2b96a, #d4864a)' }}
              >
                {capsuleMutation.isPending ? 'Sealing' : ' Seal Capsule'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Delete Entry"
            message="This journal entry will be permanently deleted."
            confirmText="Delete"
            danger
            onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

