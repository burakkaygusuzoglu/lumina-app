/**
 * Wellness - mood tracker, sleep logger, AI pattern insight, and charts.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import type { MoodEntry, SleepEntry } from "../store/appStore";

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

const MOOD_EMOJIS = ["","","","","","","","","",""];
const MOOD_LABELS = ["Rough","Low","Okay","Good","Nice","Great","Happy","Amazing","Glowing","On fire"];

function Skeleton({ h = 20, w = "100%", r = 10 }: { h?: number; w?: number | string; r?: number }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: "var(--border)", opacity: 0.5 }} />;
}

interface PatternData {
  pattern_type: string; severity: string; title: string;
  description: string; suggested_action: string;
}

function MoodSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/wellness/mood", { mood_score: mood, energy_level: energy, note }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mood"] }); onClose(); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="modal-sheet">
        <div className="modal-handle" />
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Log Mood</h3>
          <button className="btn-icon" onClick={onClose}>X</button>
        </div>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <motion.span key={mood} initial={{ scale: 0.6 }} animate={{ scale: 1 }} style={{ fontSize: 60, display: "block" }}>
            {MOOD_EMOJIS[mood - 1]}
          </motion.span>
          <p style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{MOOD_LABELS[mood - 1]}</p>
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>MOOD {mood}/10</p>
        <input type="range" min={1} max={10} value={mood} onChange={(e) => setMood(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--wellness)", marginBottom: 20 }} />
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>ENERGY {energy}/10 </p>
        <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--life)", marginBottom: 20 }} />
        <textarea className="field" placeholder="Optional note..." rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 14 }} />
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ background: "var(--wellness)", boxShadow: "0 4px 16px rgba(61,170,134,0.35)" }}>
          {mutation.isPending ? "Saving..." : "Log Mood"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function SleepSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState(3);

  const mutation = useMutation({
    mutationFn: () => api.post("/wellness/sleep", { hours_slept: hours, quality }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sleep"] }); onClose(); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="modal-sheet">
        <div className="modal-handle" />
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Log Sleep</h3>
          <button className="btn-icon" onClick={onClose}>X</button>
        </div>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 56 }}>{hours >= 7 ? "" : hours >= 5 ? "" : ""}</span>
          <p style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{hours}h</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{hours >= 8 ? "Excellent!" : hours >= 6 ? "Good rest" : hours >= 4 ? "Could be better" : "Very short"}</p>
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>HOURS</p>
        <input type="range" min={0} max={12} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--life)", marginBottom: 20 }} />
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>QUALITY</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map((q) => (
            <button key={q} onClick={() => setQuality(q)} style={{ flex: 1, padding: "10px 0", borderRadius: "var(--r-sm)", border: quality === q ? "2px solid var(--wellness)" : "2px solid var(--border)", background: quality === q ? "var(--wellness-light)" : "var(--bg)", fontSize: 16, cursor: "pointer" }}>
              {"".repeat(q)}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ background: "var(--life)", boxShadow: "0 4px 16px rgba(74,143,212,0.35)" }}>
          {mutation.isPending ? "Saving..." : "Log Sleep"}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Wellness() {
  const [activeSheet, setActiveSheet] = useState<"mood" | "sleep" | null>(null);

  const { data: moodData = [], isLoading: moodLoading } = useQuery<MoodEntry[]>({
    queryKey: ["mood"],
    queryFn:  () => api.get("/wellness/mood").then((r) => r.data),
    staleTime: 60 * 1000, // 1 min
  });

  const { data: sleepData = [], isLoading: sleepLoading } = useQuery<SleepEntry[]>({
    queryKey: ["sleep"],
    queryFn:  () => api.get("/wellness/sleep").then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const { data: pattern } = useQuery<PatternData>({
    queryKey: ["mood-pattern"],
    queryFn:  () => api.post("/ai/insight/mood-pattern").then((r) => r.data),
    staleTime: 1000 * 60 * 60,
    retry: false,
    enabled: moodData.length >= 3,
  });

  const avgMood  = moodData.length  ? (moodData.reduce((s, m) => s + m.mood_score,   0) / moodData.length).toFixed(1) : null;
  const avgSleep = sleepData.length ? (sleepData.reduce((s, e) => s + e.hours_slept, 0) / sleepData.length).toFixed(1) : null;
  const latestMood = moodData[0];

  // Streak: consecutive days with a mood log
  const streak = (() => {
    if (!moodData.length) return 0;
    const days = new Set(moodData.map((m) => new Date(m.recorded_at ?? m.created_at ?? "").toDateString()));
    let count = 0;
    const today = new Date();
    while (days.has(new Date(today.getTime() - count * 86400000).toDateString())) count++;
    return count;
  })();

  // Chart data
  const moodChartData = [...moodData].reverse().slice(-30).map((m, i) => ({
    day: i + 1,
    mood: m.mood_score,
    energy: m.energy_level,
  }));

  const sleepChartData = [...sleepData].reverse().slice(-14).map((s, i) => ({
    day: i + 1,
    hours: s.hours_slept,
    quality: s.quality * 2,
  }));

  const severityColor = (s: string) =>
    s === "high" ? "var(--journal)" : s === "medium" ? "var(--vault)" : "var(--wellness)";

  return (
    <>
      <motion.div variants={PAGE} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.35 }} className="page">

        {/* Header */}
        <p style={{ fontSize: 13, color: "var(--wellness)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}> Wellness</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 2, marginBottom: 20, letterSpacing: "-0.02em" }}>Your Health</h1>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Avg Mood", value: avgMood ?? "", suffix: "/10", color: "var(--wellness)", bg: "var(--wellness-light)", emoji: "" },
            { label: "Avg Sleep", value: avgSleep ?? "", suffix: "h",  color: "var(--life)",    bg: "var(--life-light)",    emoji: "" },
            { label: "Logs",   value: String(moodData.length),  suffix: " total", color: "var(--mind)", bg: "var(--mind-light)", emoji: "" },
            { label: "Streak", value: String(streak),           suffix: " day" + (streak !== 1 ? "s" : ""), color: "var(--vault)", bg: "var(--vault-light)", emoji: streak > 0 ? "" : "" },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ background: stat.bg, textAlign: "center", padding: "16px 12px" }}>
              <p style={{ fontSize: 22 }}>{stat.emoji}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, marginTop: 4 }}>
                {moodLoading ? <Skeleton h={22} w={60} /> : <>{stat.value}<span style={{ fontSize: 11 }}>{stat.suffix}</span></>}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 4 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveSheet("mood")} className="card" style={{ textAlign: "center", cursor: "pointer", padding: "20px 12px", background: "var(--wellness-light)", border: "1px solid rgba(61,170,134,0.2)" }}>
            <p style={{ fontSize: 32, marginBottom: 6 }}>{latestMood ? MOOD_EMOJIS[latestMood.mood_score - 1] : ""}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--wellness)" }}>Log Mood</p>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveSheet("sleep")} className="card" style={{ textAlign: "center", cursor: "pointer", padding: "20px 12px", background: "var(--life-light)", border: "1px solid rgba(74,143,212,0.2)" }}>
            <p style={{ fontSize: 32, marginBottom: 6 }}></p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--life)" }}>Log Sleep</p>
          </motion.button>
        </div>

        {/* AI Pattern insight */}
        {pattern && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ background: "linear-gradient(135deg,#7b6fda18 0%,#3daa8618 100%)", borderLeft: `3px solid ${severityColor(pattern.severity)}`, marginBottom: 24 }}>
            <div className="flex justify-between items-center mb-8">
              <p style={{ fontSize: 11, fontWeight: 700, color: severityColor(pattern.severity), letterSpacing: "0.07em" }}>
                 AI PATTERN INSIGHT
              </p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: severityColor(pattern.severity) + "22", color: severityColor(pattern.severity) }}>
                {pattern.severity}
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{pattern.title}</p>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 10 }}>{pattern.description}</p>
            {pattern.suggested_action && (
              <p style={{ fontSize: 12, fontWeight: 600, color: severityColor(pattern.severity) }}>
                Suggestion: {pattern.suggested_action}
              </p>
            )}
          </motion.div>
        )}

        {/* 30-day Mood chart */}
        {moodChartData.length >= 2 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="section-label" style={{ marginBottom: 16 }}>30-Day Mood Trend</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={moodChartData} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--wellness)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--wellness)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number, n: string) => [v, n === "mood" ? "Mood" : "Energy"]}
                />
                <Area type="monotone" dataKey="mood"   stroke="var(--wellness)"  strokeWidth={2} fill="url(#moodGrad)"   dot={false} />
                <Area type="monotone" dataKey="energy" stroke="var(--life)"      strokeWidth={1.5} fill="none"            dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: "var(--wellness)", fontWeight: 600 }}> Mood</span>
              <span style={{ fontSize: 11, color: "var(--life)", fontWeight: 600 }}>-- Energy</span>
            </div>
          </div>
        )}

        {/* 14-day Sleep chart */}
        {sleepChartData.length >= 2 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="section-label" style={{ marginBottom: 16 }}>14-Day Sleep</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={sleepChartData} barCategoryGap="25%" margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${v}h`, "Hours"]} />
                <Bar dataKey="hours" fill="var(--life)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent mood list */}
        <p className="section-label">Recent Logs</p>
        {moodLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3].map((k) => <div key={k} className="card"><Skeleton h={52} /></div>)}
          </div>
        ) : moodData.length === 0 ? (
          <div className="empty-state">
            <div className="emoji"></div>
            <p>No mood logs yet. Start tracking!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {moodData.slice(0, 10).map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 26 }}>{MOOD_EMOJIS[entry.mood_score - 1]}</span>
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between">
                    <p style={{ fontSize: 14, fontWeight: 700 }}>Mood {entry.mood_score}/10</p>
                    <p style={{ fontSize: 11, color: "var(--muted)" }}>
                      {new Date(entry.recorded_at ?? entry.created_at ?? "").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {entry.note && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{entry.note}</p>}
                  <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 8 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${entry.mood_score * 10}%` }} transition={{ duration: 0.5, delay: i * 0.04 }} style={{ height: "100%", background: "var(--wellness)", borderRadius: 2 }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Sleep list */}
        {!sleepLoading && sleepData.length > 0 && (
          <>
            <p className="section-label mt-24">Sleep Log</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sleepData.slice(0, 7).map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 26 }}>{entry.hours_slept >= 7 ? "" : entry.hours_slept >= 5 ? "" : ""}</span>
                  <div style={{ flex: 1 }}>
                    <div className="flex justify-between">
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{entry.hours_slept}h {"".repeat(entry.quality)}</p>
                      <p style={{ fontSize: 11, color: "var(--muted)" }}>
                        {new Date(entry.recorded_at ?? entry.created_at ?? "").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 8 }}>
                      <div style={{ height: "100%", width: `${Math.min((entry.hours_slept / 10) * 100, 100)}%`, background: "var(--life)", borderRadius: 2 }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {activeSheet === "mood"  && <MoodSheet  onClose={() => setActiveSheet(null)} />}
        {activeSheet === "sleep" && <SleepSheet onClose={() => setActiveSheet(null)} />}
      </AnimatePresence>
    </>
  );
}
