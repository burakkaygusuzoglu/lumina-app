import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { Memory } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';
import ImageUpload from '../components/ImageUpload';

const PAGE = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as any } }, exit: { opacity: 0, y: -6, transition: { duration: 0.15 } } };

const TYPES = [
  { key: '',            label: 'All',        icon: '◈',  color: '#a0a0b8'         },
  { key: 'note',        label: 'Note',       icon: '◻',  color: '#4a8fd4'         },
  { key: 'idea',        label: 'Idea',       icon: '⚡',  color: '#f0a855'         },
  { key: 'experience',  label: 'Experience', icon: '🌟',  color: '#3daa86'         },
  { key: 'dream',       label: 'Dream',      icon: '🌙',  color: '#7b6fda'         },
  { key: 'goal',        label: 'Goal',       icon: '🎯',  color: '#c4607a'         },
  { key: 'gratitude',   label: 'Gratitude',  icon: '✦',  color: '#e2b96a'         },
];

const TYPE_ICON: Record<string, string> = { note: '◻', idea: '⚡', experience: '🌟', dream: '🌙', goal: '🎯', gratitude: '✦' };
const TYPE_COLOR: Record<string, string> = { note: '#4a8fd4', idea: '#f0a855', experience: '#3daa86', dream: '#7b6fda', goal: '#c4607a', gratitude: '#e2b96a' };
const TYPE_BG: Record<string, string> = { note: 'rgba(74,143,212,0.10)', idea: 'rgba(240,168,85,0.10)', experience: 'rgba(61,170,134,0.10)', dream: 'rgba(123,111,218,0.10)', goal: 'rgba(196,96,122,0.10)', gratitude: 'rgba(226,185,106,0.10)' };

const MOOD_EMOJIS = ['', '', '', '', '', '', '', '', '', ''];

const Skel = memo(function Skel() {
  return (
    <div className="card" style={{ opacity: 0.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="skeleton" style={{ height: 16, width: '60%' }} />
      <div className="skeleton" style={{ height: 12, width: '90%' }} />
      <div className="skeleton" style={{ height: 12, width: '70%' }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <div className="skeleton" style={{ height: 20, width: 50, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 20, width: 40, borderRadius: 20 }} />
      </div>
    </div>
  );
});

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} className="star-btn" onClick={() => onChange(i)}>
          {i <= value ? '' : ''}
        </button>
      ))}
    </div>
  );
}

interface NewMemorySheetProps { initial?: Memory; onClose: () => void }

function MemoryForm({ initial, onClose }: NewMemorySheetProps) {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [title,      setTitle]      = useState(initial?.title ?? '');
  const [content,    setContent]    = useState(initial?.content ?? '');
  const [memType,    setMemType]    = useState(initial?.memory_type ?? 'note');
  const [moodScore,  setMoodScore]  = useState<number>(initial?.metadata?.mood_score ?? 7);
  const [importance, setImportance] = useState<number>(initial?.metadata?.importance ?? 3);
  const [tagInput,   setTagInput]   = useState('');
  const [tags,       setTags]       = useState<string[]>(initial?.tags ?? []);
  const [photoUrl,   setPhotoUrl]   = useState<string>(initial?.metadata?.photo_url ?? '');
  const [photoFile,  setPhotoFile]  = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initial?.metadata?.photo_url ?? '');

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let finalPhotoUrl = photoUrl;
      if (photoFile) {
        // Upload to supabase storage via backend or use data URL
        finalPhotoUrl = photoPreview;
      }
      const payload = {
        title: title || undefined,
        content,
        memory_type: memType,
        tags,
        metadata: {
          mood_score: moodScore,
          importance,
          ...(finalPhotoUrl ? { photo_url: finalPhotoUrl } : {}),
        },
      };
      if (initial?.id) {
        return api.put(`/memories/${initial.id}`, payload).then((r) => r.data);
      }
      return api.post('/memories', payload).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      addToast('success', initial?.id ? 'Memory updated' : 'Memory saved ');
      onClose();
    },
    onError: () => addToast('error', 'Failed to save memory'),
  });

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal-sheet" initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.6 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 400) onClose();
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="modal-handle" />
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{initial?.id ? 'Edit Memory' : 'New Memory'}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Scrollable form body */}
        <div className="modal-sheet-body">
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, scrollbarWidth: 'none' }}>
            {TYPES.slice(1).map((t) => (
              <button key={t.key} onClick={() => setMemType(t.key)}
                className={`chip${memType === t.key ? ' active' : ''}`} style={{ flexShrink: 0 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <input className="field" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} />
          <textarea className="field" placeholder="What do you want to remember?*" rows={4} value={content} onChange={(e) => setContent(e.target.value)} style={{ marginBottom: 14 }} />

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {tags.map((tag) => (
              <span key={tag} className="chip" style={{ gap: 4 }}>
                #{tag}
                <button onClick={() => setTags(tags.filter((t) => t !== tag))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
              </span>
            ))}
            <input
              value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag + Enter"
              style={{ border: 'none', background: 'none', color: 'var(--text)', fontSize: 13, outline: 'none', flex: 1, minWidth: 80 }}
            />
          </div>

          {/* Mood score */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>MOOD {moodScore}/10</p>
              <span style={{ fontSize: 20 }}>{MOOD_EMOJIS[moodScore] ?? ''}</span>
            </div>
            <input type="range" min={1} max={10} value={moodScore} onChange={(e) => setMoodScore(Number(e.target.value))} style={{ accentColor: 'var(--mind)' }} />
          </div>

          {/* Importance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>IMPORTANCE</p>
            <StarRating value={importance} onChange={setImportance} />
          </div>

          {/* Photo */}
          <div style={{ marginBottom: 4 }}>
            <ImageUpload
              value={photoPreview}
              height={100}
              label="Attach Photo"
              onChange={(_file, dataUrl) => { setPhotoFile(_file); setPhotoPreview(dataUrl); }}
              onRemove={() => { setPhotoPreview(''); setPhotoFile(null); setPhotoUrl(''); }}
            />
          </div>
        </div>

        {/* Sticky submit */}
        <div className="modal-sheet-footer">
          <button
            className="btn-primary"
            onClick={() => { if (content.trim()) mutation.mutate(); }}
            disabled={mutation.isPending || !content.trim()}
            style={{ background: 'linear-gradient(135deg, var(--mind), #9b8de8)' }}
          >
            {mutation.isPending ? 'Saving…' : initial?.id ? 'Update Memory' : 'Save Memory'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

import AICard from '../components/AICard';

export default function Mind() {
  const [pageInsight] = useState('AI notices a trend of calmness in your recent memory logs.');
  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [search,   setSearch]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMem,  setEditMem]  = useState<Memory | undefined>();
  const [deleteId, setDeleteId] = useState<string | undefined>();
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 350);
  }, []);

  const { data: allMemories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn:  () => api.get('/memories').then((r) => r.data),
    staleTime: 30_000,
  });

  // Semantic (Pinecone) search — only fires when user types ≥2 chars
  const { data: semanticResults = [], isFetching: semanticLoading } = useQuery<Memory[]>({
    queryKey: ['memories-search', debouncedSearch],
    queryFn:  () => api.get(`/memories/search?q=${encodeURIComponent(debouncedSearch)}`).then((r) => r.data),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 30_000,
  });

  function exportMemories() {
    const exportData = allMemories.map(({ id, title, content, memory_type, tags, created_at }) => ({ id, title, content, memory_type, tags, created_at }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `lumina-memories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Memories exported!');
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/memories/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['memories'] }); addToast('success', 'Memory deleted'); setDeleteId(undefined); },
    onError:    () => addToast('error', 'Failed to delete memory'),
  });

  async function getAiInsight(mem: Memory) {
    if (aiInsight[mem.id] || loadingAi === mem.id) return;
    setLoadingAi(mem.id);
    try {
      const { data } = await api.post('/ai/chat', {
        message: `Reflect on this memory and give me a brief, meaningful insight (2-3 sentences): "${mem.content}"`,
      });
      setAiInsight((prev) => ({ ...prev, [mem.id]: data.reply ?? data.response ?? data.message }));
    } catch {
      setAiInsight((prev) => ({ ...prev, [mem.id]: 'Could not generate insight.' }));
    } finally {
      setLoadingAi(null);
    }
  }

  // Use semantic results when searching, local filter otherwise
  const filtered = useMemo(() => {
    if (debouncedSearch.length >= 2) {
      return semanticResults.filter((m) => !typeFilter || m.memory_type === typeFilter);
    }
    return allMemories.filter((m) => !typeFilter || m.memory_type === typeFilter);
  }, [debouncedSearch, semanticResults, allMemories, typeFilter]);

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}>
        <AICard insight={pageInsight} />
      </div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Mind</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{allMemories.length} memories stored</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportMemories} title="Export JSON"
            style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(123,111,218,0.12)', border: '1px solid rgba(123,111,218,0.25)', color: 'var(--mind)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ↓ Export
          </button>
          <motion.button whileTap={{ scale: 0.92 }} className="fab" onClick={() => setShowForm(true)}>+</motion.button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          className="field" placeholder="  🔍 Search memories (semantic)" value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ paddingRight: semanticLoading ? 44 : 12 }}
        />
        {semanticLoading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--mind)', fontWeight: 700 }}>AI…</span>
        )}
      </div>
      {debouncedSearch.length >= 2 && !semanticLoading && (
        <p style={{ fontSize: 11, color: 'var(--mind)', marginBottom: 8, fontWeight: 600 }}>
          ✦ Semantic search · {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Enhanced Apple-style Segmentation */}
        <div style={{
            display: 'flex', gap: 4, overflowX: 'auto', padding: '4px', marginBottom: 20, 
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            scrollbarWidth: 'none'
        }}>
          {TYPES.map((t) => {
            const active = typeFilter === t.key;
            const col = t.color;
            return (
              <motion.button
                key={t.key} 
                whileTap={{ scale: 0.93 }}
                onClick={() => setTypeFilter(t.key)}
                style={{ 
                  flexShrink: 0, padding: '7px 13px', borderRadius: 11,
                  border: active ? `1.5px solid ${col}50` : '1.5px solid transparent',
                  background: active ? `${col}22` : 'transparent',
                  color: active ? col : 'var(--muted)',
                  fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.2s',
                  boxShadow: active ? `0 2px 10px ${col}30` : 'none',
                  cursor: 'pointer'
                }}
              >
                <span>{t.icon}</span> 
                {t.label}
              </motion.button>
            );
          })}
        </div>

      {/* Memory list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map((i) => <Skel key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="emoji"></div>
          <p>No memories yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Tap + to store your first memory</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((mem, i) => (
              <motion.div
                key={mem.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="card card-hover"
                style={{ borderLeft: `3px solid ${TYPE_COLOR[mem.memory_type ?? ''] ?? 'var(--border)'}`, backgroundImage: `linear-gradient(135deg, ${TYPE_BG[mem.memory_type ?? ''] ?? 'transparent'}, transparent 70%)` }}
              >
                {/* Photo */}
                {mem.metadata?.photo_url && (
                  <img src={mem.metadata.photo_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--r-md)', marginBottom: 12 }} />
                )}

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICON[mem.memory_type ?? ''] ?? '◻'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {mem.title && <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{mem.title}</p>}
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {mem.content}
                    </p>
                  </div>
                  {mem.metadata?.mood_score && (
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{MOOD_EMOJIS[mem.metadata.mood_score] ?? ''}</span>
                  )}
                </div>

                {/* Tags */}
                {mem.tags && mem.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {mem.tags.map((tag) => (
                      <span key={tag} className="chip" style={{ fontSize: 11, padding: '3px 8px' }}>#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Importance stars */}
                {mem.metadata?.importance && (
                  <p style={{ fontSize: 12, marginBottom: 8 }}>
                    {'★'.repeat(mem.metadata.importance)}{'☆'.repeat(5 - mem.metadata.importance)}
                  </p>
                )}

                {/* AI insight */}
                {aiInsight[mem.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      padding: '10px 12px', borderRadius: 'var(--r-md)',
                      background: 'rgba(123,111,218,0.1)', borderLeft: '3px solid var(--mind)',
                      marginBottom: 10,
                    }}
                  >
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}> {aiInsight[mem.id]}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => getAiInsight(mem)}
                    disabled={!!aiInsight[mem.id] || loadingAi === mem.id}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 'var(--r-sm)',
                      background: 'rgba(123,111,218,0.1)', border: '1px solid rgba(123,111,218,0.2)',
                      color: 'var(--mind)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: aiInsight[mem.id] ? 0.5 : 1,
                    }}
                  >
                    {loadingAi === mem.id ? ' Thinking' : aiInsight[mem.id] ? ' Insight shown' : ' AI Insight'}
                  </button>
                  <button className="btn-icon" onClick={() => setEditMem(mem)} style={{ width: 34, height: 34 }}></button>
                  <button className="btn-icon" onClick={() => setDeleteId(mem.id)} style={{ width: 34, height: 34, color: 'var(--journal)' }}></button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                  {new Date(mem.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* New / Edit form */}
      <AnimatePresence>
        {(showForm || editMem) && (
          <MemoryForm
            initial={editMem}
            onClose={() => { setShowForm(false); setEditMem(undefined); }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            title="Delete Memory"
            message="This memory will be permanently deleted."
            confirmText="Delete"
            danger
            onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(undefined)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}


