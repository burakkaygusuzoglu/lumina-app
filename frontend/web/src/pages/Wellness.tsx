import { useState } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { MoodEntry, SleepEntry } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
const MOODS = ['','','','','','','','','',''];
const MOOD_LABELS = ['Terrible','Bad','Meh','Okay','Good','Great','Amazing','Wonderful','Incredible','Euphoric'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const WATER_GOAL = 8;

interface WaterTrackerProps { consumed: number; onAdd: () => void; onRemove: () => void }
function WaterTracker({ consumed, onAdd, onRemove }: WaterTrackerProps) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <p className="section-label"> WATER TRACKER</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{consumed}/{WATER_GOAL} glasses today</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-icon" onClick={onRemove} disabled={consumed === 0} style={{ width: 34, height: 34, fontSize: 18 }}></button>
          <button onClick={onAdd} disabled={consumed >= WATER_GOAL}
            style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'rgba(61,170,134,0.15)', border: '1px solid rgba(61,170,134,0.3)', color: 'var(--wellness)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Glass
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: WATER_GOAL }).map((_, i) => (
          <motion.div key={i} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ delay: i * 0.04 }}
            style={{ width: 36, height: 44, borderRadius: 8, background: i < consumed ? 'linear-gradient(180deg, #5dd7b5, var(--wellness))' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'background 0.3s' }}>
            
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Wellness() {
  const [aiInsight] = useState('AI tracked higher sleep quality when you logged less screen time.');

  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [tab, setTab]             = useState<'mood'|'sleep'|'fitness'>('mood');
  const [waterConsumed, setWater] = useState(() => {
    const stored = sessionStorage.getItem('water_today');
    return stored ? Number(stored) : 0;
  });

  // Mood
  const [moodValue, setMoodValue] = useState(7);
  const [moodNote,  setMoodNote]  = useState('');

  // Sleep
  const [sleepHours,   setSleepHours]   = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [sleepNote,    setSleepNote]    = useState('');

  // Exercise
  const [exType, setExType] = useState('');
  const [exDur, setExDur]   = useState('');
  const [exCal, setExCal]   = useState('');

  // Appointment
  const [showAppt, setShowAppt]       = useState(false);
  const [apptTitle, setApptTitle]     = useState('');
  const [apptDate, setApptDate]       = useState('');
  const [apptTime, setApptTime]       = useState('');
  const [apptDoctor, setApptDoctor]   = useState('');
  const [deleteApptId, setDeleteApptId] = useState<string | null>(null);

  const { data: moods = [], isLoading: moodsLoading } = useQuery<MoodEntry[]>({
    queryKey: ['moods'],
    queryFn:  () => api.get('/wellness/mood').then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: sleepLogs = [], isLoading: sleepLoading } = useQuery<SleepEntry[]>({
    queryKey: ['sleep'],
    queryFn:  () => api.get('/wellness/sleep').then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: appointments = [] } = useQuery<{ id: string; title: string; date: string; time: string; doctor?: string }[]>({
    queryKey: ['appointments'],
    queryFn:  () => api.get('/wellness/appointments').then((r) => r.data).catch(() => []),
    staleTime: 60_000,
  });

  const moodMutation = useMutation({
    mutationFn: () => api.post('/wellness/mood', { mood_score: moodValue, note: moodNote || undefined }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moods'] }); addToast('success', 'Mood logged '); setMoodNote(''); },
    onError:   () => addToast('error', 'Failed to log mood'),
  });

  const sleepMutation = useMutation({
    mutationFn: () => api.post('/wellness/sleep', { hours: parseFloat(sleepHours), quality: sleepQuality, notes: sleepNote || undefined }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sleep'] }); addToast('success', 'Sleep logged '); setSleepNote(''); },
    onError:   () => addToast('error', 'Failed to log sleep'),
  });

  const exerciseMutation = useMutation({
    mutationFn: () => api.post('/wellness/exercise', { exercise_type: exType, duration_minutes: Number(exDur), calories_burned: exCal ? Number(exCal) : undefined }).then((r) => r.data),
    onSuccess: () => { addToast('success', 'Exercise logged '); setExType(''); setExDur(''); setExCal(''); },
    onError:   () => addToast('error', 'Failed to log exercise'),
  });

  const apptMutation = useMutation({
    mutationFn: () => api.post('/wellness/appointments', { title: apptTitle, date: apptDate, time: apptTime, doctor: apptDoctor || undefined }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); addToast('success', 'Appointment saved '); setShowAppt(false); setApptTitle(''); setApptDate(''); setApptTime(''); setApptDoctor(''); },
    onError:   () => addToast('error', 'Failed to save appointment'),
  });

  const deleteApptMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/wellness/appointments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); addToast('success', 'Appointment removed'); setDeleteApptId(null); },
    onError:   () => addToast('error', 'Failed to delete'),
  });

  const chartData = (() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const entry = moods.find((m) => m.created_at.startsWith(dateStr));
      return { day: DAYS[d.getDay()], value: entry?.mood_score ?? 0 };
    });
  })();

  const avgMood = moods.length ? (moods.slice(0, 7).reduce((a, b) => a + b.mood_score, 0) / Math.min(moods.length, 7)).toFixed(1) : '';
  const avgSleep = sleepLogs.length ? (sleepLogs.slice(0, 7).reduce((a, b) => a + (b.hours_slept ?? b.hours ?? 0), 0) / Math.min(sleepLogs.length, 7)).toFixed(1) : '';
  const barColor = (v: number) => v >= 8 ? '#3daa86' : v >= 5 ? '#7b6fda' : '#c4607a';

  function updateWater(delta: number) {
    const next = Math.max(0, Math.min(WATER_GOAL, waterConsumed + delta));
    setWater(next);
    sessionStorage.setItem('water_today', String(next));
    if (delta > 0 && next === WATER_GOAL) addToast('success', 'Hydration goal reached! ');
  }


  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Wellness</h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '10px 8px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--wellness)' }}>{avgMood}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Avg Mood</p>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '10px 8px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--life)' }}>{avgSleep}h</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Avg Sleep</p>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: '10px 8px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#5dd7b5' }}>{waterConsumed}/{WATER_GOAL}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>Water</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['mood','sleep','fitness'] as const).map((t, ti) => (
          <button key={t} onClick={() => setTab(t)}
            className={`chip${tab === t ? ' active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
            {['Mood','Fitness','Appts'][ti]}
          </button>
        ))}
      </div>

      {/* MOOD TAB */}
      <AnimatePresence mode="wait">
        {tab === 'mood' && (
          <motion.div key="mood" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* 7-day bar chart */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="section-label">7-DAY MOOD TREND</p>
              {moodsLoading ? <div className="skeleton" style={{ height: 80 }} /> : (
                <ResponsiveContainer width="100%" height={80} style={{ marginTop: 4 }}>
                  <BarChart data={chartData} barSize={22}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} hide />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: 'none', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={barColor(entry.value)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Log mood */}
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="section-label">LOG TODAY'S MOOD</p>
              <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 16 }}>
                <motion.div key={moodValue} initial={{ scale: 0.6 }} animate={{ scale: 1 }} style={{ fontSize: 52, lineHeight: 1 }}>
                  {MOODS[moodValue - 1] ?? ''}
                </motion.div>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 6, color: 'var(--text2)' }}>{MOOD_LABELS[moodValue - 1]}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--wellness)' }}>{moodValue}/10</p>
              </div>
              <input type="range" min={1} max={10} value={moodValue} onChange={(e) => setMoodValue(Number(e.target.value))} style={{ accentColor: 'var(--wellness)', marginBottom: 12 }} />
              <textarea className="field" placeholder="Optional note" rows={2} value={moodNote} onChange={(e) => setMoodNote(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="btn-primary" onClick={() => moodMutation.mutate()} disabled={moodMutation.isPending}>
                {moodMutation.isPending ? 'Logging' : 'Log Mood'}
              </button>
            </div>

            {/* Sleep log */}
            <div className="card">
              <p className="section-label">LOG SLEEP</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Hours</p>
                  <input className="field" type="number" step="0.5" min="0" max="24" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Quality (110)</p>
                  <input className="field" type="number" min="1" max="10" value={sleepQuality} onChange={(e) => setSleepQuality(Number(e.target.value))} />
                </div>
              </div>
              <textarea className="field" placeholder="Sleep notes" rows={2} value={sleepNote} onChange={(e) => setSleepNote(e.target.value)} style={{ marginBottom: 12 }} />
              {sleepLoading ? <div className="skeleton" style={{ height: 40 }} /> : (
                <button className="btn-primary" onClick={() => sleepMutation.mutate()} disabled={sleepMutation.isPending}
                  style={{ background: 'linear-gradient(135deg, var(--life), #60a4d4)' }}>
                  {sleepMutation.isPending ? 'Logging' : 'Log Sleep'}
                </button>
              )}
            </div>

            {/* Water */}
            <div style={{ marginTop: 16 }}>
              <WaterTracker consumed={waterConsumed} onAdd={() => updateWater(1)} onRemove={() => updateWater(-1)} />
            </div>
          </motion.div>
        )}

        {/* FITNESS TAB */}
        {tab === 'sleep' && (
          <motion.div key="fitness" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="section-label">LOG EXERCISE</p>
              <select className="field" value={exType} onChange={(e) => setExType(e.target.value)} style={{ marginTop: 12, marginBottom: 10 }}>
                <option value="">Choose exercise type</option>
                {['Running','Walking','Cycling','Swimming','Yoga','Weightlifting','HIIT','Sports','Other'].map((t) =>
                  <option key={t} value={t.toLowerCase()}>{t}</option>
                )}
              </select>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input className="field" type="number" placeholder="Duration (min)" value={exDur} onChange={(e) => setExDur(e.target.value)} style={{ flex: 1 }} />
                <input className="field" type="number" placeholder="Calories (opt)" value={exCal} onChange={(e) => setExCal(e.target.value)} style={{ flex: 1 }} />
              </div>
              <button className="btn-primary" onClick={() => exerciseMutation.mutate()} disabled={exerciseMutation.isPending || !exType || !exDur}>
                {exerciseMutation.isPending ? 'Logging' : ' Log Exercise'}
              </button>
            </div>
          </motion.div>
        )}

        {/* APPOINTMENTS TAB */}
        {tab === 'fitness' && (
          <motion.div key="appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p className="section-label">UPCOMING APPOINTMENTS</p>
              <button onClick={() => setShowAppt(true)}
                style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'rgba(61,170,134,0.12)', border: '1px solid rgba(61,170,134,0.25)', color: 'var(--wellness)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Add
              </button>
            </div>
            {appointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="emoji"></div>
                <p>No appointments scheduled</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {appointments.map((a) => (
                  <div key={a.id} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</p>
                      {a.doctor && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Dr. {a.doctor}</p>}
                      <p style={{ fontSize: 12, color: 'var(--wellness)' }}>{a.date} at {a.time}</p>
                    </div>
                    <button className="btn-icon" onClick={() => setDeleteApptId(a.id)} style={{ color: 'var(--journal)' }}></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add appointment sheet */}
      <AnimatePresence>
        {showAppt && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowAppt(false)}>
            <motion.div className="modal-sheet" initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Appointment</h3>
                <button className="btn-icon" onClick={() => setShowAppt(false)}></button>
              </div>
              <input className="field" placeholder="Appointment title*" value={apptTitle} onChange={(e) => setApptTitle(e.target.value)} style={{ marginBottom: 10 }} />
              <input className="field" placeholder="Doctor name (optional)" value={apptDoctor} onChange={(e) => setApptDoctor(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input type="date" className="field" value={apptDate} onChange={(e) => setApptDate(e.target.value)} style={{ flex: 1 }} />
                <input type="time" className="field" value={apptTime} onChange={(e) => setApptTime(e.target.value)} style={{ flex: 1 }} />
              </div>
              <button className="btn-primary" onClick={() => apptMutation.mutate()} disabled={apptMutation.isPending || !apptTitle || !apptDate || !apptTime}>
                {apptMutation.isPending ? 'Saving' : 'Save Appointment'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteApptId && (
          <ConfirmModal title="Remove Appointment" message="This appointment will be deleted." confirmText="Remove" danger
            onConfirm={() => deleteApptId && deleteApptMutation.mutate(deleteApptId)}
            onCancel={() => setDeleteApptId(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

