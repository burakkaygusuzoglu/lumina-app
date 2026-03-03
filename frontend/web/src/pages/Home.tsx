import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import type { Task, Memory, MoodEntry } from '../store/appStore';

const PAGE_ANIM = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

const MODULES = [
  { path: '/mind',    label: 'Mind',    sub: 'Memories & Ideas',  img: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&q=80',  color: 'var(--mind)'    },
  { path: '/wellness',label: 'Wellness',sub: 'Mood & Sleep',       img: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',  color: 'var(--wellness)'},
  { path: '/vault',   label: 'Vault',   sub: 'Secure Secrets',    img: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',  color: 'var(--vault)'   },
  { path: '/life',    label: 'Life',    sub: 'Tasks & Goals',     img: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',  color: 'var(--life)'    },
  { path: '/journal', label: 'Journal', sub: 'Reflections',       img: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',  color: 'var(--journal)' },
];

const QUICK_MOODS = [
  { score: 2,  emoji: '', label: 'Rough' },
  { score: 4,  emoji: '', label: 'Low'   },
  { score: 6,  emoji: '', label: 'Ok'    },
  { score: 8,  emoji: '', label: 'Good'  },
  { score: 10, emoji: '', label: 'Lit'   },
];

function Skel({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const user      = useAuthStore((s) => s.user);
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const addToast  = useAppStore((s) => s.addToast);
  const [moodSaved, setMoodSaved] = useState(false);

  const { data: greetData, isLoading: greetLoading } = useQuery<{ greeting: string }>({
    queryKey: ['greeting'],
    queryFn:  () => api.get('/ai/greeting').then((r) => r.data),
    staleTime: 60 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn:  () => api.get('/tasks').then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ['memories'],
    queryFn:  () => api.get('/memories').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: moods = [] } = useQuery<MoodEntry[]>({
    queryKey: ['mood'],
    queryFn:  () => api.get('/wellness/mood/history').then((r) => r.data),
    staleTime: 60_000,
  });

  const moodMutation = useMutation({
    mutationFn: (score: number) =>
      api.post('/wellness/mood', { mood_score: score, energy_level: score }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mood'] });
      setMoodSaved(true);
      addToast('success', 'Mood logged ');
      setTimeout(() => setMoodSaved(false), 3000);
    },
  });

  const taskCompleteMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const todayTasks  = tasks.filter((t) => !t.is_completed).slice(0, 4);
  const last7Moods  = [...moods].slice(0, 7).reverse();
  const recentMems  = memories.slice(0, 6);
  const avgMood     = moods.length ? Math.round(moods.slice(0,7).reduce((a,m) => a + m.mood_score, 0) / Math.min(moods.length, 7)) : 0;

  return (
    <motion.div {...PAGE_ANIM} className="page">
      {/*  Header  */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            {getGreeting()},
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {firstName} 
          </h1>
        </div>
        <div
          onClick={() => navigate('/profile')}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--mind), var(--wellness))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, cursor: 'pointer', flexShrink: 0,
            border: '2px solid var(--border2)',
          }}
        >
          {user?.avatar_url
            ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : <span>{firstName[0]?.toUpperCase()}</span>
          }
        </div>
      </div>

      {/*  AI Greeting  */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(123,111,218,0.12), rgba(61,170,134,0.12))',
          borderColor: 'rgba(123,111,218,0.25)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.06 }}></div>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--mind)', letterSpacing: '0.1em', marginBottom: 8 }}>
           LUMINA AI
        </p>
        {greetLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel h={14} w="90%" />
            <Skel h={14} w="65%" />
          </div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text2)' }}
          >
            {greetData?.greeting ?? 'Welcome back. Your journey continues.'}
          </motion.p>
        )}
        {avgMood > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>7-day avg mood</span>
            <div style={{ height: 4, flex: 1, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${avgMood * 10}%`, background: 'var(--gradient)', borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mind)' }}>{avgMood}/10</span>
          </div>
        )}
      </div>

      {/*  Quick mood check-in  */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 14 }}>
          {moodSaved ? ' MOOD LOGGED' : 'HOW ARE YOU NOW?'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {QUICK_MOODS.map((m) => (
            <motion.button
              key={m.score}
              whileTap={{ scale: 0.85 }}
              onClick={() => !moodSaved && moodMutation.mutate(m.score)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 4px', borderRadius: 12, background: 'none', border: 'none',
                cursor: moodSaved ? 'default' : 'pointer', opacity: moodSaved ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: 28 }}>{m.emoji}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{m.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/*  Module cards 2grid  */}
      <p className="section-label">YOUR MODULES</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {MODULES.map((mod) => (
          <motion.div
            key={mod.path}
            className="module-card-img"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(mod.path)}
          >
            <img src={mod.img} alt={mod.label} loading="lazy" />
            <div className="overlay">
              <p style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{mod.label}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{mod.sub}</p>
            </div>
          </motion.div>
        ))}
        {/* Health card spans full width */}
        <motion.div
          className="module-card-img"
          style={{ gridColumn: 'span 1' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/health')}
        >
          <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80" alt="Health" loading="lazy" />
          <div className="overlay">
            <p style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Health</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Nutrition & AI</p>
          </div>
        </motion.div>
      </div>

      {/*  Today's tasks  */}
      {todayTasks.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="section-label" style={{ margin: 0 }}>TODAY'S TASKS</p>
            <button onClick={() => navigate('/life')} style={{ fontSize: 12, color: 'var(--life)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              All 
            </button>
          </div>
          <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            {todayTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px',
                  borderBottom: i < todayTasks.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <button
                  onClick={() => taskCompleteMutation.mutate(task.id)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${task.priority === 'urgent' ? 'var(--journal)' : task.priority === 'high' ? 'var(--vault)' : 'var(--border2)'}`,
                    background: 'none', cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{task.title}</span>
                {task.priority === 'urgent' && <span style={{ fontSize: 10, color: 'var(--journal)', fontWeight: 700 }}>URGENT</span>}
                {task.priority === 'high'   && <span style={{ fontSize: 10, color: 'var(--vault)',   fontWeight: 700 }}>HIGH</span>}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/*  7-day mood chart  */}
      {last7Moods.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="section-label" style={{ margin: 0 }}>7-DAY MOOD</p>
            <button onClick={() => navigate('/wellness')} style={{ fontSize: 12, color: 'var(--wellness)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              Full view 
            </button>
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const entry = last7Moods[i];
                const val   = entry?.mood_score ?? 0;
                const h     = val ? Math.max(8, (val / 10) * 64) : 8;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: h }}
                      transition={{ delay: i * 0.04, type: 'spring', damping: 18 }}
                      style={{
                        width: '100%', borderRadius: 4,
                        background: val >= 8 ? 'var(--wellness)' : val >= 5 ? 'var(--life)' : val > 0 ? 'var(--journal)' : 'var(--surface2)',
                        opacity: val ? 1 : 0.3,
                      }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                      {entry ? new Date(entry.recorded_at || entry.created_at).toLocaleDateString('en', { weekday: 'narrow' }) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/*  Recent memories horizontal scroll  */}
      {recentMems.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="section-label" style={{ margin: 0 }}>RECENT MEMORIES</p>
            <button onClick={() => navigate('/mind')} style={{ fontSize: 12, color: 'var(--mind)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              All 
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 20 }}>
            {recentMems.map((mem) => (
              <motion.div
                key={mem.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/mind')}
                style={{
                  flexShrink: 0, width: 160, padding: '14px', borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mem.title || 'Memory'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {mem.content}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 8 }} />
    </motion.div>
  );
}
