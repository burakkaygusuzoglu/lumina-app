import { useState, useMemo } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { Task } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

// Haptic feedback utility for micro-interactions
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'light': navigator.vibrate(20); break;
      case 'medium': navigator.vibrate(40); break;
      case 'heavy': navigator.vibrate(80); break;
      case 'success': navigator.vibrate([30, 50, 40]); break; // Double burst
    }
  }
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#c4607a' },
  urgent:  { label: 'Urgent',  color: '#c4607a' },
  high:    { label: 'High',    color: '#d4864a' },
  medium:  { label: 'Medium',  color: '#e2b96a' },
  low:     { label: 'Low',     color: '#3daa86' },
};

function Skel() {
  return (
    <div className="card" style={{ opacity: 0.7, display: 'flex', gap: 12, alignItems: 'center' }}>
      <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 12 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '40%' }} />
      </div>
    </div>
  );
}

export default function Life() {
  const [aiInsight] = useState('AI highlights: Breaking down your upcoming priorities can reduce stress.');

  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [tab, setTab]           = useState<'today'|'upcoming'|'all'>('today');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [aiTip,   setAiTip]    = useState('');
  const [loadingTip, setLoadingTip] = useState(false);

  // Form state
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priority,    setPriority]    = useState<Task['priority']>('medium');
  const [dueDate,     setDueDate]     = useState('');
  const [tagInput,    setTagInput]    = useState('');
  const [tags,        setTags]        = useState<string[]>([]);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => api.get('/tasks').then((r) => r.data),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/tasks', { title, description: description || undefined, priority, due_date: dueDate || undefined, tags }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); addToast('success', 'Task added '); resetForm(); setShowForm(false); },
    onError:   () => addToast('error', 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/tasks/${editTask!.id}`, { title: editTask!.title, description: editTask!.description, priority: editTask!.priority, due_date: editTask!.due_date, tags: editTask!.tags }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); addToast('success', 'Task updated '); setEditTask(null); },
    onError:   () => addToast('error', 'Failed to update'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((r) => r.data),
    onSuccess: () => { 
      triggerHaptic('success');
      qc.invalidateQueries({ queryKey: ['tasks'] }); 
      addToast('success', 'Task completed! ??'); 
    },
    onError:   () => addToast('error', 'Failed to complete'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); addToast('success', 'Task deleted'); setDeleteId(null); },
    onError:   () => addToast('error', 'Failed to delete'),
  });

  function resetForm() { setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setTags([]); setTagInput(''); }
  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  }

  async function getAiFocusTip() {
    setLoadingTip(true);
    const pendingTitles = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').slice(0, 5).map((t) => t.title).join(', ');
    try {
      const { data } = await api.post('/ai/chat', {
        message: `I have these pending tasks: ${pendingTitles || 'no tasks yet'}. Give me a brief focus tip and suggest which to prioritize first (2-3 sentences max).`,
      });
      setAiTip(data.reply ?? data.response ?? data.message);
    } catch {
      setAiTip('Focus on your most important task first. Break it into smaller steps for momentum.');
    } finally {
      setLoadingTip(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tab === 'today')    return (t.status === 'todo' || t.status === 'in_progress') && (!t.due_date || t.due_date <= today);
      if (tab === 'upcoming') return (t.status === 'todo' || t.status === 'in_progress') && t.due_date && t.due_date > today;
      return true;
    });
  }, [tasks, tab, today]);

  const pendingCount   = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
  const completedCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Life</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{pendingCount} pending • {completedCount} done</p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} className="fab" onClick={() => { triggerHaptic('medium'); setShowForm(true); }}
          style={{ background: 'linear-gradient(135deg, var(--life), #60a4d4)', boxShadow: '0 4px 15px rgba(74,143,212,0.3)' }}>+</motion.button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {Object.entries(PRIORITY_MAP).map(([key, val]) => {
          const count = tasks.filter((t) => t.priority === key && t.status !== 'done' && t.status !== 'cancelled').length;
          return (
            <div key={key} className="card" style={{ flex: 1, padding: '10px 6px', textAlign: 'center', borderTop: `2px solid ${val.color}` }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: val.color }}>{count}</p>
              <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{val.label}</p>
            </div>
          );
        })}
      </div>

      {/* AI Focus Tip */}
      <div className="card glass" style={{ marginBottom: 16, background: 'rgba(74,143,212,0.05)', borderColor: 'rgba(74,143,212,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiTip ? 10 : 0 }}>
          <p className="section-label">? AI FOCUS TIP</p>
          <button onClick={() => { triggerHaptic('medium'); getAiFocusTip(); }} disabled={loadingTip}
            style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(74,143,212,0.15)', border: '1px solid rgba(74,143,212,0.3)', color: 'var(--life)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {loadingTip ? 'Thinking...' : aiTip ? '?? Refresh' : '? Get Tip'}
          </button>
        </div>
        <AnimatePresence>
          {aiTip && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>
              {aiTip}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {(['today','upcoming','all'] as const).map((t) => (
          <button key={t} onClick={() => { triggerHaptic('light'); setTab(t); }}
            className={`tab-item${tab === t ? ' active' : ''}`}>
            {t === 'today' ? '⚡ Today' : t === 'upcoming' ? '📅 Soon' : '✦ All'}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map((i) => <Skel key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="emoji"></div>
          <p>{tab === 'all' ? 'No tasks yet' : tab === 'today' ? 'Nothing due today!' : 'No upcoming tasks'}</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((task, i) => (
              <motion.div key={task.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }} transition={{ delay: i * 0.03 }}
                className="card glass glow-hover" style={{ opacity: task.status === 'done' ? 0.5 : 1, padding: '16px', borderLeft: `3px solid ${PRIORITY_MAP[task.priority ?? 'medium']?.color ?? 'var(--border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Checkbox */}
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => {
                      if (task.status === 'todo' || task.status === 'in_progress') {
                        triggerHaptic('light'); // pre-emptive feel
                        completeMutation.mutate(task.id);
                      }
                    }}
                    style={{
                      width: 24, height: 24, borderRadius: 12, border: `2px solid ${PRIORITY_MAP[task.priority ?? 'medium']?.color ?? 'var(--muted)'}`,
                      background: task.status === 'done' ? PRIORITY_MAP[task.priority ?? 'medium']?.color : 'transparent',
                      cursor: 'pointer', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.3s ease, border-color 0.3s ease'
                    }}>
                    {task.status === 'done' && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>?</motion.span>
                    )}
                  </motion.button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--muted)' : 'var(--text)' }}>
                      {task.title}
                    </p>
                    {task.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{task.description}</p>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_MAP[task.priority ?? 'medium']?.color, padding: '2px 8px', borderRadius: 20, background: `${PRIORITY_MAP[task.priority ?? 'medium']?.color}1a` }}>
                        {PRIORITY_MAP[task.priority ?? 'medium']?.label}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 11, color: task.due_date < today ? 'var(--journal)' : 'var(--muted)' }}>
                           {task.due_date}
                        </span>
                      )}
                      {task.tags?.map((tag) => (
                        <span key={tag} className="chip" style={{ fontSize: 11, padding: '2px 6px' }}>#{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 11 }} onClick={() => setEditTask({ ...task })}></button>
                    <button className="btn-icon" style={{ width: 28, height: 28, fontSize: 11, color: 'var(--journal)' }} onClick={() => setDeleteId(task.id)}></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* New task sheet */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div className="modal-sheet glass-modal" initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Task</h3>
                <button className="btn-icon" onClick={() => setShowForm(false)}></button>
              </div>
              <input className="field" placeholder="Task title*" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
              <textarea className="field" placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 10 }} />

              {/* Priority */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                  <button key={key} onClick={() => setPriority(key as Task['priority'])}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: priority === key ? `${val.color}22` : 'transparent',
                      border: `1px solid ${priority === key ? val.color : 'var(--border)'}`,
                      color: priority === key ? val.color : 'var(--muted)',
                    }}>
                    {val.label}
                  </button>
                ))}
              </div>

              <input type="date" className="field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ marginBottom: 10 }} />

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                {tags.map((t) => (
                  <span key={t} className="chip">#{t}
                    <button onClick={() => setTags(tags.filter((tg) => tg !== t))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: 0, marginLeft: 2 }}></button>
                  </span>
                ))}
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                  placeholder="Tag + Enter"
                  style={{ border: 'none', background: 'none', color: 'var(--text)', fontSize: 13, outline: 'none', flex: 1, minWidth: 80 }}
                />
              </div>

              <button className="btn-primary" onClick={() => title.trim() && createMutation.mutate()}
                disabled={createMutation.isPending || !title.trim()}
                style={{ background: 'linear-gradient(135deg, var(--life), #60a4d4)' }}>
                {createMutation.isPending ? 'Adding' : 'Add Task'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit task sheet */}
      <AnimatePresence>
        {editTask && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setEditTask(null)}>
            <motion.div className="modal-sheet" initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Task</h3>
                <button className="btn-icon" onClick={() => setEditTask(null)}></button>
              </div>
              <input className="field" value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} style={{ marginBottom: 10 }} />
              <textarea className="field" rows={2} value={editTask.description ?? ''} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                  <button key={key} onClick={() => setEditTask({ ...editTask, priority: key as Task['priority'] })}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: editTask.priority === key ? `${val.color}22` : 'transparent',
                      border: `1px solid ${editTask.priority === key ? val.color : 'var(--border)'}`,
                      color: editTask.priority === key ? val.color : 'var(--muted)' }}>
                    {val.label}
                  </button>
                ))}
              </div>
              <input type="date" className="field" value={editTask.due_date ?? ''} onChange={(e) => setEditTask({ ...editTask, due_date: e.target.value })} style={{ marginBottom: 14 }} />
              <button className="btn-primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                style={{ background: 'linear-gradient(135deg, var(--life), #60a4d4)' }}>
                {updateMutation.isPending ? 'Updating' : 'Update Task'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <ConfirmModal title="Delete Task" message="This task will be permanently deleted." confirmText="Delete" danger
            onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

