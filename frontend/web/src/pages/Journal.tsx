import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { JournalEntry } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

const MOODS = ['','','','','','','',''];
const CATS  = ['reflection','gratitude','goals','memories','emotions','growth'];
const MOOD_COLORS = ['#c4607a','#c47a60','#6b7280','#3daa86','#3daa86','#e2b96a','#7b6fda','#7b6fda'];

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

  const { data: prompt, isFetching: promptLoading } = useQuery<{ prompt: string }>({
    queryKey: ['journal-prompt', promptCat, promptSeed],
    queryFn:  () => api.get(`/ai/journal-prompt?category=${promptCat}&seed=${promptSeed}`).then((r) => r.data),
    staleTime: 3_600_000,
  });

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal'],
    queryFn:  () => api.get('/journal').then((r) => r.data),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/journal', { content: newContent, mood: newMood, tags: newTags }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] });
      addToast('success', 'Entry saved ');
      setNewContent(''); setNewTags([]); setWriting(false);
    },
    onError: () => addToast('error', 'Failed to save entry'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/journal/${editEntry!.id}`, { content: editEntry!.content, mood: editEntry!.mood, tags: editEntry!.tags }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); addToast('success', 'Updated '); setEditEntry(null); },
    onError: () => addToast('error', 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/journal/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal'] }); addToast('success', 'Entry deleted'); setDeleteId(null); },
    onError: () => addToast('error', 'Failed to delete'),
  });

  const capsuleMutation = useMutation({
      mutationFn: () => api.post('/journal/timecapsule', { letter: capsuleContent, open_at: capsuleDate }).then((r) => r.data),
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
      setWriting(true);
      setShowCard(false);
    }
  }

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Journal</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{entries.length} entries written</p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} className="fab"
          onClick={() => setWriting(true)}
          style={{ background: 'linear-gradient(135deg, var(--journal), #e07a8a)' }}>
          +
        </motion.button>
      </div>

      {/* AI Prompt Card */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="card"
            style={{ background: 'linear-gradient(135deg, rgba(196,96,122,0.15), rgba(196,96,122,0.05))', borderColor: 'rgba(196,96,122,0.25)', marginBottom: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="section-label"> TODAY'S PROMPT</p>
              <button className="btn-icon" onClick={() => setShowCard(false)} style={{ width: 24, height: 24, fontSize: 11 }}></button>
            </div>
            {promptLoading ? (
              <div className="skeleton" style={{ height: 40, marginBottom: 10 }} />
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.6, fontFamily: 'var(--font-display)', fontStyle: 'italic', marginBottom: 12 }}>
                "{prompt?.prompt ?? 'What are you feeling grateful for today?'}"
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={regeneratePrompt} style={{ flex: 1, fontSize: 12 }}> New Prompt</button>
              <button
                onClick={usePrompt}
                style={{ flex: 2, padding: '10px', borderRadius: 'var(--r-md)', background: 'var(--journal)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Write Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Capsule CTA */}
      <button
        onClick={() => setShowTimeCapsule(true)}
        className="card card-hover"
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, textAlign: 'left', cursor: 'pointer', background: 'rgba(226,185,106,0.08)', borderColor: 'rgba(226,185,106,0.2)' }}
      >
        <span style={{ fontSize: 28 }}>🕰️</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>Seal a Time Capsule</p>
            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              E2E Secure
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Write a deeply personal letter to your future self.</p>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>→</span>
      </button>

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
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{MOODS[Math.min((entry.mood ?? 1) - 1, 7)] ?? ''}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: MOOD_COLORS[Math.min((entry.mood ?? 1) - 1, 7)] }}>
                      Mood {entry.mood ?? ''}/8
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(entry.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => setEditEntry({ ...entry })} style={{ width: 30, height: 30, fontSize: 12 }}></button>
                  <button className="btn-icon" onClick={() => setDeleteId(entry.id)} style={{ width: 30, height: 30, fontSize: 12, color: 'var(--journal)' }}></button>
                </div>
              </div>

              <p style={{
                fontSize: 14, lineHeight: 1.6, marginTop: 10, color: 'var(--text2)',
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
                  {expandedId === entry.id ? 'Show less ' : 'Read more '}
                </button>
              )}

              {entry.tags && entry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {entry.tags.map((t) => <span key={t} className="chip" style={{ fontSize: 11, padding: '3px 8px' }}>#{t}</span>)}
                </div>
              )}
            </motion.div>
          ))}
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
