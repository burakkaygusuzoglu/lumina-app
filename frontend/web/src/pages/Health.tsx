import { useState, useRef } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';
import type { NutritionEntry } from '../store/appStore';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_ICONS: Record<string, string> = { breakfast: '', lunch: '', dinner: '', snack: '' };
const MEAL_COLORS: Record<string, string> = { breakfast: '#e2b96a', lunch: '#3daa86', dinner: '#7b6fda', snack: '#d4864a' };

const CALORIE_GOAL = 2000;
const PROTEIN_GOAL = 150;
const CARBS_GOAL   = 250;
const FAT_GOAL     = 65;

interface FoodAnalysis {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  serving_size?: string;
  meal_type?: string;
  health_score?: number;
  tips?: string;
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{value}g / {goal}g</p>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 4, background: color }}
        />
      </div>
    </div>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = Math.min(consumed / goal, 1);
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const remaining = Math.max(goal - consumed, 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface2)" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r={r}
            fill="none" stroke="url(#calGrad)" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--mind)" />
              <stop offset="100%" stopColor="var(--wellness)" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{consumed}</p>
          <p style={{ fontSize: 10, color: 'var(--muted)' }}>kcal</p>
        </div>
      </div>
      <div>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Goal</p>
          <p style={{ fontSize: 18, fontWeight: 800 }}>{goal} kcal</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Remaining</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: remaining > 0 ? 'var(--wellness)' : 'var(--journal)' }}>{remaining} kcal</p>
        </div>
      </div>
    </div>
  );
}

export default function Health() {
  const [aiInsight] = useState('AI suggests drinking an extra glass of water after your last meal.');

  const qc       = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<NutritionEntry['meal_type']>('lunch');
  const [manualFood, setManualFood] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [aiChatMsg, setAiChatMsg] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'user'|'assistant'; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: todayLog = [] } = useQuery<NutritionEntry[]>({
    queryKey: ['nutrition-today'],
    queryFn:  () => api.get('/health/nutrition/today').then((r) => r.data).catch(() => []),
    staleTime: 60_000,
  });

  const addEntryMutation = useMutation({
    mutationFn: (payload: Partial<NutritionEntry>) => api.post('/health/nutrition', payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['nutrition-today'] }); addToast('success', 'Food logged '); setShowAddForm(false); setAnalysisResult(null); setImagePreview(''); setManualFood(''); setManualCals(''); },
    onError:   () => addToast('error', 'Failed to log food'),
  });

  async function analyzeImage(file: File) {
    setAnalyzing(true);
    setAnalysisResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setImagePreview(reader.result as string);
      try {
        const { data } = await api.post('/ai/analyze-food', { image_base64: base64, meal_type: selectedMealType });
        setAnalysisResult(data);
      } catch {
        addToast('error', 'Failed to analyze food image');
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) analyzeImage(file);
  }

  async function sendDietMessage() {
    if (!aiChatMsg.trim()) return;
    const userMsg = aiChatMsg;
    setAiChatMsg('');
    setAiChatHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);
    try {
      const calorieContext = `Today I've consumed ${totalCals} calories out of ${CALORIE_GOAL} goal.`;
      const { data } = await api.post('/ai/chat', { message: `[Health & Nutrition Context: ${calorieContext}]\n\n${userMsg}` });
      setAiChatHistory((prev) => [...prev, { role: 'assistant', content: data.reply ?? data.response ?? data.message }]);
    } catch {
      setAiChatHistory((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not get a response right now.' }]);
    } finally {
      setAiLoading(false);
    }
  }

  const totalCals    = todayLog.reduce((a, b) => a + (b.calories ?? 0), 0);
  const totalProtein = todayLog.reduce((a, b) => a + (b.protein ?? 0), 0);
  const totalCarbs   = todayLog.reduce((a, b) => a + (b.carbs ?? 0), 0);
  const totalFat     = todayLog.reduce((a, b) => a + (b.fat ?? 0), 0);

  const byMealType = MEAL_TYPES.map((type) => ({
    type,
    entries: todayLog.filter((e) => e.meal_type === type),
    cals: todayLog.filter((e) => e.meal_type === type).reduce((a, b) => a + (b.calories ?? 0), 0),
  }));

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Health</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Today's nutrition</p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} className="fab" onClick={() => setShowAddForm(true)}
          style={{ background: 'linear-gradient(135deg, #3daa86, #5dd7b5)' }}>+</motion.button>
      </div>

      {/* Calorie ring */}
      <div className="card" style={{ marginBottom: 16 }}>
        <CalorieRing consumed={totalCals} goal={CALORIE_GOAL} />
        <div style={{ marginTop: 16 }}>
          <MacroBar label="Protein"      value={Math.round(totalProtein)} goal={PROTEIN_GOAL} color="#7b6fda" />
          <MacroBar label="Carbohydrates" value={Math.round(totalCarbs)}  goal={CARBS_GOAL}   color="#3daa86" />
          <MacroBar label="Fat"          value={Math.round(totalFat)}    goal={FAT_GOAL}     color="#e2b96a" />
        </div>
      </div>

      {/* Meal sections */}
      {byMealType.map(({ type, entries, cals }) => (
        <div key={type} className="card" style={{ marginBottom: 12, borderTop: `2px solid ${MEAL_COLORS[type]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: `${MEAL_COLORS[type]}18`, border: `1px solid ${MEAL_COLORS[type]}30` }}>{MEAL_ICONS[type]}</div>
              <p style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{type}</p>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: MEAL_COLORS[type] }}>{cals} kcal</p>
          </div>
          {entries.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>No {type} logged yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map((e) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13 }}>{e.food_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{e.calories} kcal</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* AI Diet Assistant */}
      <div className="card" style={{ marginTop: 8 }}>
        <p className="section-label" style={{ marginBottom: 12 }}> AI DIET ASSISTANT</p>
        {aiChatHistory.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['Am I eating enough protein?', 'Suggest a healthy dinner', 'How well am I doing today?'].map((s) => (
              <motion.button key={s} whileTap={{ scale: 0.94 }} onClick={() => { setAiChatMsg(s); }}
                style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 20, border: '1px solid rgba(61,170,134,0.3)', background: 'rgba(61,170,134,0.08)', color: 'var(--wellness)', cursor: 'pointer', flexShrink: 0, letterSpacing: '0.02em' }}>{s}</motion.button>
            ))}
          </div>
        )}
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aiChatHistory.map((msg, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, maxWidth: '86%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, var(--mind), var(--wellness))' : 'var(--surface2)',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              borderBottomRightRadius: msg.role === 'user' ? 2 : 12,
              borderBottomLeftRadius:  msg.role === 'user' ? 12 : 2,
            }}>
              {msg.content}
            </div>
          ))}
          {aiLoading && (
            <div style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--surface2)', alignSelf: 'flex-start', display: 'flex', gap: 4 }}>
              {[0,1,2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--muted)', animation: `bounce 0.9s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" placeholder="Ask about nutrition" value={aiChatMsg}
            onChange={(e) => setAiChatMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendDietMessage()}
            style={{ flex: 1 }} />
          <button onClick={sendDietMessage} disabled={!aiChatMsg.trim() || aiLoading}
            style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'var(--wellness)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', flexShrink: 0, opacity: aiChatMsg.trim() ? 1 : 0.5 }}>
            
          </button>
        </div>
      </div>

      {/* Add food sheet */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}>
            <motion.div className="modal-sheet" initial={{ y: 600 }} animate={{ y: 0 }} exit={{ y: 600 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="modal-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Log Food</h3>
                <button className="btn-icon" onClick={() => { setShowAddForm(false); setAnalysisResult(null); setImagePreview(''); }}></button>
              </div>

              {/* Meal type */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {MEAL_TYPES.map((t) => (
                  <motion.button key={t} whileTap={{ scale: 0.93 }} onClick={() => setSelectedMealType(t)}
                    style={{ flexShrink: 0, textTransform: 'capitalize', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: selectedMealType === t ? `1.5px solid ${MEAL_COLORS[t]}` : '1.5px solid var(--border)', background: selectedMealType === t ? `${MEAL_COLORS[t]}22` : 'var(--surface2)', color: selectedMealType === t ? MEAL_COLORS[t] : 'var(--muted)', transition: 'all 0.2s ease' }}>
                    {MEAL_ICONS[t]} {t}
                  </motion.button>
                ))}
              </div>

              {/* AI Photo Analysis */}
              <div style={{ marginBottom: 16 }}>
                <p className="section-label" style={{ marginBottom: 10 }}> AI FOOD RECOGNITION</p>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', height: 100, borderRadius: 'var(--r-md)', border: '2px dashed rgba(61,170,134,0.4)', background: imagePreview ? 'transparent' : 'rgba(61,170,134,0.05)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="food" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: 'var(--wellness)', fontSize: 13, fontWeight: 600 }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}></div>
                      Take photo or upload
                    </div>
                  )}
                  {analyzing && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 600 }}>
                       Analyzing
                    </div>
                  )}
                </button>

                {/* Analysis result */}
                <AnimatePresence>
                  {analysisResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ marginTop: 12, padding: 12, borderRadius: 'var(--r-md)', background: 'rgba(61,170,134,0.1)', border: '1px solid rgba(61,170,134,0.25)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>{analysisResult.food_name}</p>
                        <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--wellness)' }}>{analysisResult.calories} kcal</p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                        <span>P: {analysisResult.protein}g</span>
                        <span>C: {analysisResult.carbs}g</span>
                        <span>F: {analysisResult.fat}g</span>
                        {analysisResult.serving_size && <span style={{ color: 'var(--muted)' }}>{analysisResult.serving_size}</span>}
                      </div>
                      {analysisResult.tips && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}> {analysisResult.tips}</p>
                      )}
                      <button
                        className="btn-primary"
                        onClick={() => addEntryMutation.mutate({ ...analysisResult, meal_type: selectedMealType })}
                        disabled={addEntryMutation.isPending}
                        style={{ marginTop: 12, background: 'linear-gradient(135deg, #3daa86, #5dd7b5)' }}
                      >
                        {addEntryMutation.isPending ? 'Saving' : 'Log This Food'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Manual entry */}
              <p className="section-label" style={{ marginBottom: 10 }}>OR ENTER MANUALLY</p>
              <input className="field" placeholder="Food name" value={manualFood} onChange={(e) => setManualFood(e.target.value)} style={{ marginBottom: 10 }} />
              <input className="field" type="number" placeholder="Calories" value={manualCals} onChange={(e) => setManualCals(e.target.value)} style={{ marginBottom: 14 }} />
              <button
                className="btn-primary"
                onClick={() => manualFood.trim() && addEntryMutation.mutate({ food_name: manualFood, calories: Number(manualCals) || 0, meal_type: selectedMealType })}
                disabled={addEntryMutation.isPending || !manualFood.trim()}
                style={{ background: 'linear-gradient(135deg, #3daa86, #5dd7b5)' }}
              >
                {addEntryMutation.isPending ? 'Logging' : 'Log Food'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

