/**
 * Home  Lumina Life OS dashboard.
 *
 * Sections (top to bottom):
 *  1. AI Greeting    personalised, cached 1 h from /ai/greeting
 *  2. Mood check-in  5 emoji quick-tap
 *  3. Module grid    5 tiles with live stats
 *  4. Today's tasks  top 3 pending, checkable inline
 *  5. Weekly mood    7-bar mini chart
 *  6. On This Day    AI reflection on past memories
 *  7. Recent notes   horizontal scroll of last 6 memories
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import ModuleCard from '../components/ModuleCard';
import type { Task, Memory, MoodEntry } from '../store/appStore';

interface GreetingData { greeting: string; cached: boolean }
interface OnThisDayData { memories: Memory[]; insight: string; has_memories: boolean }
interface VaultStats    { count: number }
interface JournalEntry  { id: string; content: string; created_at: string }

const PAGE = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

const QUICK_MOODS = [
  { score: 2,  emoji: '', label: 'Rough'  },
  { score: 4,  emoji: '', label: 'Low'    },
  { score: 6,  emoji: '', label: 'OK'     },
  { score: 8,  emoji: '', label: 'Good'   },
  { score: 10, emoji: '', label: 'Lit'    },
];

const PCOL: Record<string, string> = {
  high: 'var(--journal)', medium: 'var(--vault)', low: 'var(--wellness)',
};

const moodBarColor = (v: number) =>
  v >= 8 ? 'var(--wellness)' : v >= 5 ? 'var(--life)' : 'var(--journal)';

function Skeleton({ h = 20, w = '100%', r = 10 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div style={{ height: h, width: w, borderRadius: r, background: 'var(--border)', opacity: 0.5 }} />
  );
}

function GreetingCard({ loading, text }: { loading: boolean; text: string }) {
  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg,#7b6fda18 0%,#3daa8618 100%)',
        borderLeft: '3px solid var(--mind)',
        padding: '18px 20px',
        marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--mind)', letterSpacing: '0.07em', marginBottom: 8 }}>
         LUMINA
      </p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton h={15} w="90%" />
          <Skeleton h={15} w="65%" />
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.6, color: 'var(--text)' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

function MoodMiniChart({ data }: { data: MoodEntry[] }) {
  const last7 = [...data].slice(0, 7).reverse();
  const navigate = useNavigate();
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="flex justify-between items-center mb-12">
        <p className="section-label" style={{ margin: 0 }}>7-Day Mood</p>
        <button
          onClick={() => navigate('/wellness')}
          style={{ fontSize: 12, color: 'var(--wellness)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Full view 
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const entry = last7[i];
          const val   = entry?.mood_score ?? 0;
          const pct   = val ? (val / 10) * 100 : 0;
          const today = new Date();
          const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
          const label = dayLabels[(today.getDay() - 6 + i + 7) % 7];
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: pct ? `${Math.max(pct * 0.48, 4)}px` : '4px' }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                style={{
                  width: '100%',
                  background: val ? moodBarColor(val) : 'var(--border)',
                  borderRadius: 4,
                  opacity: val ? 1 : 0.3,
                }}
              />
              <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnThisDayCard({ data }: { data: OnThisDayData }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      className="card mt-20"
      style={{ background: 'var(--journal-light)', borderLeft: '3px solid var(--journal)', cursor: 'pointer' }}
      onClick={() => setOpen((x) => !x)}
    >
      <div className="flex justify-between items-center">
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--journal)', letterSpacing: '0.07em' }}> ON THIS DAY</p>
        <span style={{ fontSize: 14, color: 'var(--journal)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', display: 'inline-block' }}></span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, marginTop: 8, lineHeight: 1.55 }}>{data.insight}</p>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginTop: 12 }}
          >
            {data.memories.map((m) => (
              <div key={m.id} style={{ padding: '8px 0', borderTop: '1px solid rgba(196,96,122,0.15)' }}>
                <p style={{ fontSize: 12, fontWeight: 700 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {m.content.slice(0, 100)}{m.content.length > 100 ? '' : ''}
                </p>
                <p style={{ fontSize: 10, color: 'var(--journal)', marginTop: 4 }}>
                  {new Date(m.created_at).getFullYear()}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const user     = useAuthStore((s) => s.user);

  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  const { data: greeting, isLoading: greetLoading } = useQuery<GreetingData>({
    queryKey: ['ai-greeting'],
    queryFn:  () => api.get('/ai/greeting').then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => api.get('/tasks').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min — re-fetch at most once per 5 min
  });

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn:  () => api.get('/memories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: moodHistory = [] } = useQuery<MoodEntry[]>({
    queryKey: ['mood'],
    queryFn:  () => api.get('/wellness/mood').then((r) => r.data),
    staleTime: 60 * 1000, // 1 min — mood changes frequently
  });

  const { data: onThisDay } = useQuery<OnThisDayData>({
    queryKey: ['on-this-day'],
    queryFn:  () => api.get('/ai/on-this-day').then((r) => r.data),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  });

  const { data: vaultStats } = useQuery<VaultStats>({
    queryKey: ['vault-count'],
    queryFn:  () =>
      api.get('/vault').then((r) => ({ count: Array.isArray(r.data) ? r.data.length : 0 })).catch(() => ({ count: 0 })),
    staleTime: 10 * 60 * 1000, // 10 min — vault count rarely changes
  });

  const { data: journals = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journal'],
    queryFn:  () => api.get('/journal').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { is_completed: done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  async function logMood(score: number) {
    setTodayMood(score);
    try {
      await api.post('/wellness/mood', { mood_score: score, energy_level: score, note: '' });
      qc.invalidateQueries({ queryKey: ['mood'] });
      setMoodSaved(true);
    } catch { /* optimistic already shown */ }
  }

  const pending       = tasks.filter((t) => !t.is_completed);
  const recentMems    = memories.slice(0, 6);
  const greetingText  = greeting?.greeting ?? `Welcome back, ${firstName}. Ready to make today count?`;

  return (
    <motion.div variants={PAGE} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="page">

      {/* Header */}
      <div className="flex justify-between items-center mb-20">
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em' }}>{firstName} </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/wellness')}
          style={{ width: 48, height: 48, background: 'var(--surface)', borderRadius: '50%', border: '1.5px solid var(--border)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          
        </motion.button>
      </div>

      {/* AI Greeting */}
      <GreetingCard loading={greetLoading} text={greetingText} />

      {/* Mood check-in */}
      <AnimatePresence mode="wait">
        {!moodSaved ? (
          <motion.div key="pick" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="card">
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>How are you right now?</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {QUICK_MOODS.map((m) => (
                <motion.button
                  key={m.score}
                  whileHover={{ scale: 1.22 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => logMood(m.score)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: todayMood === m.score ? 'var(--wellness-light)' : 'none',
                    border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 12,
                    outline: todayMood === m.score ? '2px solid var(--wellness)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{m.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="saved" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ background: 'var(--wellness-light)', textAlign: 'center', padding: 20 }}>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} style={{ fontSize: 36, display: 'block' }}>
              {QUICK_MOODS.find((m) => m.score === todayMood)?.emoji ?? ''}
            </motion.span>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--wellness)', marginTop: 8 }}>Mood logged </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module grid */}
      <div style={{ marginTop: 24 }}>
        <p className="section-label">Modules</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModuleCard title="Mind"     subtitle="Notes & memories"       emoji="" color="var(--mind)"    colorLight="var(--mind-light)"    path="/mind"     count={memories.length}      countLabel="notes"   />
          <ModuleCard title="Wellness" subtitle="Mood & sleep"            emoji="" color="var(--wellness)" colorLight="var(--wellness-light)" path="/wellness" count={moodHistory.length}   countLabel="logs"    />
          <ModuleCard title="Vault"    subtitle="Encrypted secrets"       emoji="" color="var(--vault)"   colorLight="var(--vault-light)"   path="/vault"    count={vaultStats?.count}    countLabel="items"   />
          <ModuleCard title="Life"     subtitle="Tasks & goals"           emoji="" color="var(--life)"    colorLight="var(--life-light)"    path="/life"     count={pending.length}       countLabel="open"    />
          <ModuleCard title="Journal"  subtitle="AI prompts & reflection" emoji="" color="var(--journal)" colorLight="var(--journal-light)" path="/journal"  count={journals.length}      countLabel="entries" />
          <div />
        </div>
      </div>

      {/* Today's tasks */}
      <div style={{ marginTop: 28 }}>
        <div className="flex justify-between items-center mb-12">
          <p className="section-label" style={{ margin: 0 }}>Today's Focus</p>
          <button onClick={() => navigate('/life')} style={{ fontSize: 13, color: 'var(--life)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            All tasks 
          </button>
        </div>
        {pending.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <span style={{ fontSize: 28 }}></span>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>All caught up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {pending.slice(0, 3).map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card"
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.75 }}
                    onClick={() => toggleTask.mutate({ id: task.id, done: true })}
                    style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: `2.5px solid ${PCOL[task.priority] ?? 'var(--border)'}`, background: 'transparent', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                    {task.due_date && (
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                         {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: (PCOL[task.priority] ?? 'var(--border)') + '22', color: PCOL[task.priority] ?? 'var(--muted)' }}>
                    {task.priority}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {pending.length > 3 && (
              <button onClick={() => navigate('/life')} style={{ fontSize: 13, color: 'var(--life)', fontWeight: 600, padding: 8, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                +{pending.length - 3} more 
              </button>
            )}
          </div>
        )}
      </div>

      {/* 7-Day mood chart */}
      {moodHistory.length > 0 && <MoodMiniChart data={moodHistory} />}

      {/* On This Day */}
      {onThisDay?.has_memories && <OnThisDayCard data={onThisDay} />}

      {/* Recent memories */}
      {recentMems.length > 0 && (
        <div style={{ marginTop: 28, marginBottom: 8 }}>
          <div className="flex justify-between items-center mb-12">
            <p className="section-label" style={{ margin: 0 }}>Recent Memories</p>
            <button onClick={() => navigate('/mind')} style={{ fontSize: 13, color: 'var(--mind)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>See all </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {recentMems.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate('/mind')}
                style={{ minWidth: 175, background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '14px', cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {m.content}
                </p>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
