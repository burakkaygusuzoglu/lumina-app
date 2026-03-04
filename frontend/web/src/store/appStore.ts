/**
 * App store — extended types for full Lumina Life OS feature set.
 */
import { create } from 'zustand';

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface Memory {
  id: string;
  title?: string;
  content: string;
  memory_type?: string;
  tags?: string[];
  mood_score?: number;
  importance?: number;
  photo_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  status?: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  tags?: string[];
  created_at: string;
}

export interface MoodEntry {
  id: string;
  mood_score: number;
  energy_level: number;
  note?: string;
  recorded_at: string;
  created_at: string;
}

export interface SleepEntry {
  id: string;
  hours_slept: number;
  hours?: number;
  quality: number;
  recorded_at: string;
  created_at: string;
}

export interface VaultItem {
  id: string;
  title: string;
  category: 'password' | 'note' | 'card' | 'document';
  content?: string;
  username?: string;
  password?: string;
  url?: string;
  card_number?: string;
  expiry?: string;
  cvv?: string;
  note?: string;
  tags?: string[];
  created_at: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  ai_prompt?: string;
  mood?: number;
  mood_snapshot?: number;
  tags?: string[];
  created_at: string;
}

export interface TimeCapsule {
  id: string;
  content: string;
  reveal_date: string;
  is_revealed: boolean;
  ai_seal_message?: string;
  created_at: string;
}

export interface NutritionEntry {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  portion?: string;
  health_score?: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  photo_url?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  title: string;
  doctor?: string;
  date: string;
  location?: string;
  notes?: string;
  created_at: string;
}

/* ── Theme ──────────────────────────────────────────────────────────────── */
export const THEMES: Record<string, { label: string; bg: string; surface: string; surface2: string; text: string; border: string; muted: string }> = {
  dark:   { label: 'Siyah',      bg: '#0a0a0f', surface: '#141420', surface2: '#1e1e2e', text: '#f0f0f7', border: 'rgba(255,255,255,0.07)', muted: '#6b6b80' },
  gray:   { label: 'Gri',        bg: '#111118', surface: '#1c1c26', surface2: '#25253a', text: '#ededf5', border: 'rgba(255,255,255,0.08)', muted: '#72728a' },
  teal:   { label: 'Turkuaz',    bg: '#031619', surface: '#072028', surface2: '#0c2a35', text: '#e4f5f7', border: 'rgba(61,170,134,0.15)', muted: '#568a90' },
  navy:   { label: 'Koyu Mavi',  bg: '#050e1f', surface: '#0c1830', surface2: '#112040', text: '#e4ecf7', border: 'rgba(74,143,212,0.15)', muted: '#4a6a8a' },
  purple: { label: 'Koyu Mor',   bg: '#0d0818', surface: '#190f2a', surface2: '#221538', text: '#ede8f7', border: 'rgba(123,111,218,0.18)', muted: '#6a5888' },
  white:  { label: 'Beyaz',      bg: '#f0f0f7', surface: '#ffffff', surface2: '#e8e8f2', text: '#0e0e1a', border: 'rgba(0,0,0,0.08)', muted: '#707088' },
};

export function applyTheme(key: string) {
  const t = THEMES[key] ?? THEMES.dark;
  const root = document.documentElement;
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface2', t.surface2);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text2', t.text);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--muted', t.muted);
}

/* ── Toast ─────────────────────────────────────────────────────────────── */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

/* ── Store ──────────────────────────────────────────────────────────────── */
interface AppState {
  memories: Memory[];
  setMemories: (m: Memory[]) => void;
  addMemory:   (m: Memory)   => void;
  removeMemory: (id: string) => void;

  tasks: Task[];
  setTasks:    (t: Task[])  => void;
  addTask:     (t: Task)    => void;
  updateTask:  (id: string, changes: Partial<Task>) => void;
  removeTask:  (id: string) => void;

  moodEntries: MoodEntry[];
  setMoodEntries: (m: MoodEntry[]) => void;
  addMoodEntry:   (m: MoodEntry)   => void;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;

  bgTheme: string;
  setBgTheme: (theme: string) => void;

  activeModule: string;
  setActiveModule: (m: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  memories:    [],
  setMemories: (memories)   => set({ memories }),
  addMemory:   (m)          => set((s) => ({ memories: [m, ...s.memories] })),
  removeMemory: (id)         => set((s) => ({ memories: s.memories.filter((x) => x.id !== id) })),

  tasks:     [],
  setTasks:  (tasks)   => set({ tasks }),
  addTask:   (t)       => set((s) => ({ tasks: [t, ...s.tasks] })),
  updateTask: (id, changes) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  moodEntries:    [],
  setMoodEntries: (entries) => set({ moodEntries: entries }),
  addMoodEntry:   (m)       => set((s) => ({ moodEntries: [m, ...s.moodEntries] })),

  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  bgTheme: (() => { const t = localStorage.getItem('lumina_theme') ?? 'dark'; applyTheme(t); return t; })(),
  setBgTheme: (theme) => {
    localStorage.setItem('lumina_theme', theme);
    applyTheme(theme);
    set({ bgTheme: theme });
  },

  activeModule:    'home',
  setActiveModule: (activeModule) => set({ activeModule }),
}));

