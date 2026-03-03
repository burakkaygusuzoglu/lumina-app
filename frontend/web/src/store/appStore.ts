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

  activeModule:    'home',
  setActiveModule: (activeModule) => set({ activeModule }),
}));

