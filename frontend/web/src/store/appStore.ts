/**
 * App store — cached memories, tasks, and mood data (in-memory only).
 * React Query handles server state; this store holds UI selections / local cache.
 */
import { create } from 'zustand';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
}

export interface MoodEntry {
  id: string;
  mood_score: number;   // 1–10
  energy_level: number; // 1–10
  note?: string;
  recorded_at: string;
  created_at: string;
}

export interface SleepEntry {
  id: string;
  hours_slept: number;
  quality: number; // 1–5
  recorded_at: string;
}

export interface VaultItem {
  id: string;
  title: string;
  category: string;
  note?: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  ai_prompt?: string;
  mood_snapshot?: number;
  created_at: string;
}

/* ── Store ──────────────────────────────────────────────────────────────── */

interface AppState {
  /* Memories */
  memories: Memory[];
  setMemories: (m: Memory[]) => void;
  addMemory:   (m: Memory)   => void;
  removeMemory: (id: string) => void;

  /* Tasks */
  tasks: Task[];
  setTasks:    (t: Task[])  => void;
  addTask:     (t: Task)    => void;
  updateTask:  (id: string, changes: Partial<Task>) => void;
  removeTask:  (id: string) => void;

  /* Mood */
  moodEntries: MoodEntry[];
  setMoodEntries: (m: MoodEntry[]) => void;
  addMoodEntry:   (m: MoodEntry)   => void;

  /* UI flags */
  activeModule: string;
  setActiveModule: (m: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  /* Memories */
  memories:    [],
  setMemories: (memories)   => set({ memories }),
  addMemory:   (m)          => set((s) => ({ memories: [m, ...s.memories] })),
  removeMemory: (id)         => set((s) => ({ memories: s.memories.filter((x) => x.id !== id) })),

  /* Tasks */
  tasks:     [],
  setTasks:  (tasks)   => set({ tasks }),
  addTask:   (t)       => set((s) => ({ tasks: [t, ...s.tasks] })),
  updateTask: (id, changes) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)) })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  /* Mood */
  moodEntries:    [],
  setMoodEntries: (entries) => set({ moodEntries: entries }),
  addMoodEntry:   (m)       => set((s) => ({ moodEntries: [m, ...s.moodEntries] })),

  /* UI */
  activeModule:    'home',
  setActiveModule: (activeModule) => set({ activeModule }),
}));
