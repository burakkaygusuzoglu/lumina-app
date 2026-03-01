/**
 * Life — task management with priorities, filtering, completion, and AI focus tip.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Task } from '../store/appStore';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -8 },
};

type Filter = 'all' | 'active' | 'done';
type Priority = 'low' | 'medium' | 'high';

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   'var(--journal)',
  medium: 'var(--vault)',
  low:    'var(--wellness)',
};

const PRIORITY_BG: Record<Priority, string> = {
  high:   'var(--journal-light)',
  medium: 'var(--vault-light)',
  low:    'var(--wellness-light)',
};

/* ── Add task sheet ──────────────────────────────────────────────────────── */
function AddTaskSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate,  setDueDate]  = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/tasks', {
        title,
        description: desc,
        priority,
        due_date: dueDate || undefined,
        is_completed: false,
      }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose(); },
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Task</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="field"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="field"
            placeholder="Description (optional)"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          {/* Priority */}
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>PRIORITY</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: priority === p ? `2px solid ${PRIORITY_COLOR[p]}` : '2px solid var(--border)',
                  background: priority === p ? PRIORITY_BG[p] : 'var(--bg)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: priority === p ? PRIORITY_COLOR[p] : 'var(--muted)',
                  textTransform: 'capitalize',
                }}
              >
                {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}
              </button>
            ))}
          </div>

          {/* Due date */}
          <input
            className="field"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <button
            className="btn-primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim()}
            style={{ background: 'var(--life)', boxShadow: '0 4px 16px rgba(74,143,212,0.35)' }}
          >
            {mutation.isPending ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Skeleton card ──────────────────────────────────────────────────────── */
function TaskSkeleton() {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: 0.6 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', flexShrink: 0, animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 15, width: '65%', borderRadius: 6, background: 'var(--border)', marginBottom: 8, animation: 'pulse 1.4s ease infinite' }} />
        <div style={{ height: 12, width: '40%', borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Life() {
  const qc = useQueryClient();
  const [filter,   setFilter]   = useState<Filter>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => api.get('/tasks').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const activeTasks = tasks.filter((t) => !t.is_completed);

  /* AI focus tip — enabled when ≥2 active tasks, keyed by task IDs for freshness */
  const taskKey = activeTasks.map((t) => t.id).join(',');
  const { data: focusTip, isLoading: tipLoading } = useQuery<string>({
    queryKey: ['ai-focus-tip', taskKey],
    queryFn: async () => {
      const top5 = activeTasks
        .sort((a, b) => {
          const o: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
          return o[a.priority] - o[b.priority];
        })
        .slice(0, 5)
        .map((t) => `- ${t.title} [${t.priority}]${t.due_date ? ` (due ${t.due_date})` : ''}`)
        .join('\n');

      const msg = `I have these tasks:\n${top5}\n\nIn 1-2 sentences, tell me which to tackle first and why. Be direct and energizing.`;
      const res = await api.post('/ai/chat', { message: msg });
      return res.data.response as string;
    },
    enabled: activeTasks.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { is_completed: done }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  /* Filtered + sorted tasks */
  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.is_completed;
      if (filter === 'done')   return t.is_completed;
      return true;
    })
    .sort((a, b) => {
      const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  const counts = {
    all:    tasks.length,
    active: tasks.filter((t) => !t.is_completed).length,
    done:   tasks.filter((t) =>  t.is_completed).length,
  };

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
            <p style={{ fontSize: 13, color: 'var(--life)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              📅 Life
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>Your Tasks</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ background: 'var(--life)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            + Task
          </button>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="card mb-16" style={{ background: 'var(--life-light)' }}>
            <div className="flex justify-between items-center mb-8">
              <p style={{ fontSize: 13, fontWeight: 700 }}>
                {counts.done}/{counts.all} completed
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--life)' }}>
                {Math.round((counts.done / counts.all) * 100)}%
              </p>
            </div>
            <div style={{ height: 8, background: 'rgba(74,143,212,0.15)', borderRadius: 4 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(counts.done / counts.all) * 100}%` }}
                transition={{ duration: 0.6 }}
                style={{ height: '100%', background: 'var(--life)', borderRadius: 4 }}
              />
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['active', 'all', 'done'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: filter === f ? 'var(--life)' : 'var(--surface)',
                color: filter === f ? '#fff' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: filter === f ? '0 4px 12px rgba(74,143,212,0.3)' : 'var(--shadow-sm)',
              }}
            >
              {f === 'active' ? `Active (${counts.active})` : f === 'done' ? `Done (${counts.done})` : `All (${counts.all})`}
            </button>
          ))}
        </div>

        {/* AI focus tip */}
        {activeTasks.length >= 2 && (
          <AnimatePresence>
            {(tipLoading || focusTip) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="card mb-16"
                style={{ background: 'linear-gradient(135deg, var(--life-light) 0%, #e8f4fd 100%)', borderLeft: '4px solid var(--life)' }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--life)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  ⚡ AI FOCUS TIP
                </p>
                {tipLoading ? (
                  <div>
                    <div style={{ height: 12, width: '90%', borderRadius: 6, background: 'var(--border)', marginBottom: 6, animation: 'pulse 1.4s ease infinite' }} />
                    <div style={{ height: 12, width: '70%', borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
                  </div>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>{focusTip}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Task list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map((i) => <TaskSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">{filter === 'done' ? '🎉' : '📅'}</div>
            <p>
              {filter === 'done'
                ? 'No completed tasks yet.'
                : filter === 'active'
                ? 'All caught up! No pending tasks.'
                : 'No tasks yet. Add your first!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {filtered.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card"
                  style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleMutation.mutate({ id: task.id, done: !task.is_completed })}
                    style={{
                      width: 24, height: 24, flexShrink: 0, marginTop: 1,
                      borderRadius: '50%',
                      border: `2.5px solid ${task.is_completed ? 'var(--wellness)' : PRIORITY_COLOR[task.priority]}`,
                      background: task.is_completed ? 'var(--wellness)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {task.is_completed && '✓'}
                  </button>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        textDecoration: task.is_completed ? 'line-through' : 'none',
                        color: task.is_completed ? 'var(--muted)' : 'var(--text)',
                      }}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 20,
                          background: PRIORITY_BG[task.priority],
                          color: PRIORITY_COLOR[task.priority],
                        }}
                      >
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          📅 {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMutation.mutate(task.id)}
                    style={{ fontSize: 14, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    🗑
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showForm && <AddTaskSheet onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  );
}
