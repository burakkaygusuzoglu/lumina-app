/**
 * Mind — Notes & Memories module.
 * Features: debounced search, skeleton loading, type filter, tag cloud.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Memory } from '../store/appStore';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -8 },
};

const MEMORY_TYPES = [
  { key: '',           label: 'All',        emoji: '✨' },
  { key: 'core',       label: 'Core',       emoji: '💎' },
  { key: 'knowledge',  label: 'Knowledge',  emoji: '📚' },
  { key: 'note',       label: 'Note',       emoji: '📝' },
  { key: 'experience', label: 'Experience', emoji: '🌟' },
];

/* ── Skeleton card ──────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ height: 16, width: '55%', borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
        <div style={{ height: 14, width: 28,   borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
      </div>
      <div style={{ height: 12, width: '90%', borderRadius: 6, background: 'var(--border)', marginBottom: 6,  animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ height: 12, width: '75%', borderRadius: 6, background: 'var(--border)', marginBottom: 12, animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ height: 20, width: 52, borderRadius: 20, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
        <div style={{ height: 20, width: 40, borderRadius: 20, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
      </div>
    </div>
  );
}

/* ── New memory form ─────────────────────────────────────────────────────── */
interface NewMemorySheetProps { onClose: () => void; }

function NewMemorySheet({ onClose }: NewMemorySheetProps) {
  const qc = useQueryClient();
  const [title,      setTitle]      = useState('');
  const [content,    setContent]    = useState('');
  const [tags,       setTags]       = useState('');
  const [memoryType, setMemoryType] = useState('note');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/memories', {
        title,
        content,
        memory_type: memoryType,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      onClose();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 340 }}
        animate={{ y: 0 }}
        exit={{ y: 340 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="modal-sheet"
      >
        <div className="modal-handle" />
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Memory</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {MEMORY_TYPES.slice(1).map((t) => (
            <button
              key={t.key}
              onClick={() => setMemoryType(t.key)}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                borderRadius: 20,
                border: `2px solid ${memoryType === t.key ? 'var(--mind)' : 'var(--border)'}`,
                background: memoryType === t.key ? 'var(--mind-light)' : 'transparent',
                color: memoryType === t.key ? 'var(--mind)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="field"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="field"
            placeholder="What's on your mind?"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <input
            className="field"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim() || !content.trim()}
            style={{ background: 'var(--mind)', boxShadow: '0 4px 16px rgba(123,111,218,0.35)' }}
          >
            {mutation.isPending ? 'Saving…' : 'Save Memory'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Memory card ─────────────────────────────────────────────────────────── */
interface MemoryCardProps {
  memory: Memory;
  index: number;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function MemoryCard({ memory, index, onDelete, deleting }: MemoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = memory.content.length > 120;
  const typeInfo = MEMORY_TYPES.find((t) => t.key === (memory as any).memory_type) ?? MEMORY_TYPES[0];

  return (
    <motion.div
      key={memory.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.03 }}
      className="card"
      style={{ position: 'relative' }}
    >
      {(memory as any).memory_type && (
        <span style={{
          position: 'absolute', top: 14, right: 42,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          color: 'var(--mind)', background: 'var(--mind-light)', borderRadius: 20, padding: '2px 8px',
        }}>
          {typeInfo.emoji} {(memory as any).memory_type}
        </span>
      )}

      <div className="flex justify-between items-center mb-8">
        <h3 style={{ fontSize: 15, fontWeight: 700, paddingRight: 80 }}>{memory.title}</h3>
        <button
          onClick={() => onDelete(memory.id)}
          disabled={deleting}
          style={{ fontSize: 14, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
        >
          {deleting ? '…' : '🗑'}
        </button>
      </div>

      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 8 }}>
        {isLong && !expanded ? memory.content.slice(0, 120) + '…' : memory.content}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 12, color: 'var(--mind)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, marginBottom: 8 }}
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}

      {memory.tags && memory.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {memory.tags.map((tag) => (
            <span
              key={tag}
              style={{ background: 'var(--mind-light)', color: 'var(--mind)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
        {new Date(memory.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Mind() {
  const qc = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeTag,  setActiveTag]  = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: memories = [], isLoading } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn:  () => api.get('/memories').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/memories/${id}`),
    onSuccess:  () => { setDeletingId(null); qc.invalidateQueries({ queryKey: ['memories'] }); },
    onError:    () => setDeletingId(null),
  });

  /* 500ms debounce */
  const handleSearchChange = useCallback((val: string) => {
    setInputValue(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSearch(val), 500);
  }, []);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  const allTags = [...new Set(memories.flatMap((m) => m.tags ?? []))].sort();

  const filtered = memories.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
    const matchType   = !typeFilter || (m as any).memory_type === typeFilter;
    const matchTag    = !activeTag  || (m.tags ?? []).includes(activeTag);
    return matchSearch && matchType && matchTag;
  });

  const thisMonth = memories.filter((m) => {
    const d = new Date(m.created_at), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate(id);
  }

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35 }}
        className="page"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-20">
          <div>
            <p style={{ fontSize: 13, color: 'var(--mind)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🧠 Mind
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>Your Memories</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--mind)', color: '#fff', border: 'none',
              borderRadius: 'var(--r-md)', padding: '10px 18px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(123,111,218,0.35)',
            }}
          >
            + New
          </button>
        </div>

        {/* Stats bar */}
        <div className="card mb-16" style={{ display: 'flex', justifyContent: 'space-around', padding: '14px 8px', background: 'var(--mind-light)', border: 'none' }}>
          {[
            { label: 'MEMORIES',   value: memories.length },
            { label: 'TAGS',       value: allTags.length },
            { label: 'THIS MONTH', value: thisMonth },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--mind)' }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input
            className="field"
            placeholder="Search memories…"
            value={inputValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); setSearch(''); }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)' }}
            >✕</button>
          )}
        </div>

        {/* Type filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
          {MEMORY_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(typeFilter === t.key ? '' : t.key)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                border: `2px solid ${typeFilter === t.key ? 'var(--mind)' : 'var(--border)'}`,
                background: typeFilter === t.key ? 'var(--mind-light)' : 'transparent',
                color: typeFilter === t.key ? 'var(--mind)' : 'var(--muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Tag cloud */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {allTags.slice(0, 12).map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none',
                  background: activeTag === tag ? 'var(--mind)' : 'var(--mind-light)',
                  color: activeTag === tag ? '#fff' : 'var(--mind)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        {(search || typeFilter || activeTag) && !isLoading && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Memory list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
            <div className="emoji">🧠</div>
            <p>{search || typeFilter || activeTag ? 'No memories match your filters.' : 'Start capturing your thoughts — add your first memory!'}</p>
            {(search || typeFilter || activeTag) && (
              <button
                onClick={() => { setInputValue(''); setSearch(''); setTypeFilter(''); setActiveTag(''); }}
                style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: 'var(--mind-light)', color: 'var(--mind)', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((memory, i) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  index={i}
                  onDelete={handleDelete}
                  deleting={deletingId === memory.id}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* New memory sheet */}
      <AnimatePresence>
        {showForm && <NewMemorySheet onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  );
}
