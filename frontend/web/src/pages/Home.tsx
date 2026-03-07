import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AICard from '../components/AICard';
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
  { score: 2,  emoji: '😔', label: 'Rough', color: '#818cf8' },
  { score: 4,  emoji: '😕', label: 'Low',   color: '#60a5fa' },
  { score: 6,  emoji: '🙂', label: 'Ok',    color: '#34d399' },
  { score: 8,  emoji: '😊', label: 'Good',  color: '#fbbf24' },
  { score: 10, emoji: '🤩', label: 'Lit',   color: '#f472b6' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [aiInsight] = useState('AI anticipates a productive day ahead based on your morning routine.');
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const user      = useAuthStore((s) => s.user);
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const addToast  = useAppStore((s) => s.addToast);
  const [moodSaved, setMoodSaved] = useState(false);
  const [moodSuggestion, setMoodSuggestion] = useState<string | null>(null);
  const [moodSuggLoading, setMoodSuggLoading] = useState(false);

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
      api.post('/wellness/mood', { mood_score: score }).then((r) => r.data),
    onSuccess: (_data, score) => {
      qc.invalidateQueries({ queryKey: ['mood'] });
      setMoodSaved(true);
      addToast('success', 'Mood logged ');
      setTimeout(() => setMoodSaved(false), 3000);
      // Fetch AI suggestion based on selected mood
      const moodData = QUICK_MOODS.find((m) => m.score === score);
      fetchMoodSuggestion(moodData?.label ?? 'neutral', score);
    },
    onError: () => addToast('error', 'Failed to log mood'),
  });

  async function fetchMoodSuggestion(label: string, score: number) {
    setMoodSuggLoading(true);
    setMoodSuggestion(null);
    try {
      const { data } = await api.post('/ai/chat', {
        message: `I'm feeling ${label} right now (mood score ${score}/10). Give me a single warm, personalised suggestion or encouragement for this moment — keep it to 1-2 sentences.`,
        include_memories: false,
        conversation_history: [],
      });
      setMoodSuggestion(data.reply ?? data.response ?? data.message ?? '');
    } catch {
      // Fail silently — suggestion is a nice-to-have
    } finally {
      setMoodSuggLoading(false);
    }
  }

  const taskCompleteMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const todayTasks  = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').slice(0, 4);
  const last7Moods  = [...moods].slice(0, 7).reverse();
  const recentMems  = memories.slice(0, 6);

  return (
    <motion.div {...PAGE_ANIM} className="page">
      <div style={{ marginBottom: 24 }}>
        <AICard insight={aiInsight} />
      </div>
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

      {/*  Ask Lumina AI CTA  */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => document.getElementById('lumina-ai-trigger')?.click()}
        style={{
          width: '100%', marginBottom: 20, padding: '18px 20px',
          background: 'linear-gradient(135deg, rgba(123,111,218,0.15), rgba(196,96,122,0.1))',
          border: '1px solid rgba(123,111,218,0.3)', borderRadius: 24,
          cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden',
          display: 'block',
        }}
      >
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.06 }}>✦</div>
        <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--mind)', letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          ✦ <span className="pulse-dot" style={{ background: 'var(--mind)' }} /> LUMINA AI
        </p>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Ask me anything...</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>Journal prompts · Mood analysis · Task advice</p>
      </motion.button>

      {/*  Quick mood check-in — TikTok/Instagram reaction style  */}
      <div
        className="card glass"
        style={{
          marginBottom: 24, padding: '20px 20px 24px', position: 'relative',
          overflow: 'hidden', borderRadius: 28, border: '1px solid var(--border2)',
          transition: 'border-color 0.4s',
        }}
      >
        {/* Dynamic glow orb that matches selected mood */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, filter: 'blur(70px)', background: 'var(--gradient)', opacity: 0.12, borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 3 }}>
              HOW ARE YOU NOW?
            </p>
            {moodSaved && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 12, color: 'var(--wellness)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Mood logged
              </motion.p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(123,111,218,0.15)', border: '1px solid rgba(123,111,218,0.3)', padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: 'var(--mind)', cursor: 'pointer' }}
            onClick={() => document.getElementById('lumina-ai-trigger')?.click()}
          >
            ✦ Ask AI
          </motion.button>
        </div>

        {/* Emoji reaction row — large, Instagram/TikTok style */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 4 }}>
          {QUICK_MOODS.map((m) => (
            <motion.button
              key={m.score}
              whileHover={{ y: -8, scale: 1.1 }}
              whileTap={{ scale: 0.75 }}
              onClick={() => {
                if (!moodSaved) {
                  if (navigator.vibrate) navigator.vibrate(30);
                  moodMutation.mutate(m.score);
                }
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: moodSaved ? 'default' : 'pointer',
                opacity: moodSaved ? 0.4 : 1, flex: 1,
                transition: 'opacity 0.3s',
              }}
            >
              {/* Emoji circle with glow */}
              <motion.div
                animate={moodSaved ? {} : { y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: QUICK_MOODS.indexOf(m) * 0.3 }}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `radial-gradient(circle at 40% 35%, ${m.color}22, ${m.color}08)`,
                  border: `1.5px solid ${m.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                  boxShadow: `0 6px 20px -6px ${m.color}50`,
                }}
              >
                {m.emoji}
              </motion.div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', color: m.color, textTransform: 'uppercase' }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* AI suggestion after mood selection */}
        <AnimatePresence>
          {moodSuggLoading && (
            <motion.div
              key="sugg-loading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 14, color: 'var(--mind)' }}>✦</span>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Lumina is thinking...</span>
            </motion.div>
          )}
          {moodSuggestion && !moodSuggLoading && (
            <motion.div
              key="sugg-text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 16,
                background: 'rgba(123,111,218,0.1)',
                border: '1px solid rgba(123,111,218,0.2)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--mind)', flexShrink: 0, marginTop: 1 }}>✦</span>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>{moodSuggestion}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/*  Module cards 2grid  */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p className="section-label" style={{ margin: 0 }}>YOUR MODULES</p>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>6 ACTIVE</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {MODULES.map((mod) => (
          <motion.div
            key={mod.path}
            className="module-card-img"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(mod.path)}
            style={{ boxShadow: `0 4px 20px -8px ${mod.color}60` }}
          >
            <img src={mod.img} alt={mod.label} loading="lazy" />
            <div className="overlay" style={{ background: `linear-gradient(to top, ${mod.color}cc 0%, rgba(0,0,0,0.3) 100%)` }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{mod.label}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{mod.sub}</p>
            </div>
            <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: mod.color, boxShadow: `0 0 8px ${mod.color}` }} />
          </motion.div>
        ))}
        {/* Health card spans full width */}
        <motion.div
          className="module-card-img"
          style={{ gridColumn: 'span 1', boxShadow: '0 4px 20px -8px rgba(61,170,134,0.4)' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/health')}
        >
          <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80" alt="Health" loading="lazy" />
          <div className="overlay" style={{ background: 'linear-gradient(to top, rgba(61,170,134,0.8) 0%, rgba(0,0,0,0.3) 100%)' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Health</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Nutrition & AI</p>
          </div>
          <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--wellness)', boxShadow: '0 0 8px var(--wellness)' }} />
        </motion.div>
      </div>

      {/*  Today's tasks  */}
      {todayTasks.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="section-label" style={{ margin: 0 }}>⚡ TODAY'S TASKS</p>
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
                  padding: '14px 16px',
                  borderBottom: i < todayTasks.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${(task.priority === 'urgent' || task.priority === 'critical') ? 'var(--journal)' : task.priority === 'high' ? 'var(--vault)' : task.priority === 'medium' ? 'var(--gold)' : 'var(--wellness)'}`,
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.75 }}
                  onClick={() => taskCompleteMutation.mutate(task.id)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${(task.priority === 'urgent' || task.priority === 'critical') ? 'var(--journal)' : task.priority === 'high' ? 'var(--vault)' : 'var(--border2)'}`,
                    background: 'none', cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                />
                <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{task.title}</span>
                {(task.priority === 'urgent' || task.priority === 'critical') && <span style={{ fontSize: 10, color: 'var(--journal)', fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: 'rgba(196,96,122,0.12)' }}>{task.priority === 'critical' ? 'CRITICAL' : 'URGENT'}</span>}
                {task.priority === 'high'   && <span style={{ fontSize: 10, color: 'var(--vault)',   fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: 'rgba(212,134,74,0.12)'  }}>HIGH</span>}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/*  7-day mood chart  */}
      {last7Moods.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p className="section-label" style={{ margin: 0 }}>📊 7-DAY MOOD</p>
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
                      {entry ? new Date(entry.created_at).toLocaleDateString('en', { weekday: 'narrow' }) : ''}
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
            <p className="section-label" style={{ margin: 0 }}>✦ RECENT MEMORIES</p>
            <button onClick={() => navigate('/mind')} style={{ fontSize: 12, color: 'var(--mind)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              All 
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 20 }}>
            {recentMems.map((mem) => {
              const typeColors: Record<string, string> = { note: '#60a5fa', idea: '#fbbf24', experience: '#34d399', dream: '#a78bfa', goal: '#f87171', gratitude: '#e2b96a' };
              const tColor = typeColors[mem.memory_type ?? ''] ?? 'var(--mind)';
              return (
                <motion.div
                  key={mem.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/mind')}
                  style={{
                    flexShrink: 0, width: 155, padding: '14px', borderRadius: 16,
                    background: 'linear-gradient(158deg, rgba(22,22,34,0.97) 0%, rgba(16,16,26,0.97) 100%)',
                    border: `1px solid rgba(255,255,255,0.07)`,
                    borderTop: `2px solid ${tColor}`,
                    cursor: 'pointer',
                    boxShadow: `0 4px 16px rgba(0,0,0,0.3), 0 0 0 0 ${tColor}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: `${tColor}18`, border: `1px solid ${tColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                      {mem.memory_type === 'idea' ? '⚡' : mem.memory_type === 'dream' ? '🌙' : mem.memory_type === 'goal' ? '🎯' : mem.memory_type === 'experience' ? '⭐' : mem.memory_type === 'gratitude' ? '❤️' : '◻'}
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: tColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {mem.memory_type ?? 'memory'}
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {mem.content}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ height: 8 }} />
    </motion.div>
  );
}

