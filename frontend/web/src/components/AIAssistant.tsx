/**
 * Global AI Assistant — floating button + full-screen chat modal
 * Available on every page. Context-aware per visible route.
 */
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
}

const EXAMPLE_PROMPTS = [
  'What patterns do you see in my mood lately?',
  'Give me a journal prompt for tonight',
  'Help me prioritize my tasks today',
  'What are my most important memories?',
  'What did I write about last month?',
  'Suggest a mindfulness exercise for me',
];

const ROUTE_CONTEXT: Record<string, string> = {
  '/':         'home dashboard',
  '/mind':     'Mind & Memories module',
  '/wellness': 'Wellness & Mood tracker',
  '/vault':    'Secure Vault',
  '/life':     'Life & Tasks planner',
  '/journal':  'Journal',
  '/health':   'Health & Nutrition tracker',
  '/profile':  'Profile settings',
};

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--mind)',
            animation: `bounce 1.2s ease infinite`,
            animationDelay: `${i * 0.18}s`,
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const saveNoteMutation = useMutation({
    mutationFn: (text: string) => api.post('/memories', { content: text, memory_type: 'idea', tags: ['AI Note'] }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      addToast('success', 'Saved to Mind seamlessly!');
    }
  });
  const location = useLocation();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef              = useRef<HTMLDivElement>(null);
  // Only fetch memories on the first message of each session for speed
  const memoriesLoaded = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Reset memory cache flag when drawer is closed so next session loads fresh context
  useEffect(() => {
    if (!open) memoriesLoaded.current = false;
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const context = ROUTE_CONTEXT[location.pathname] ?? 'Lumina Life OS';

    try {
      const fetchMemories = !memoriesLoaded.current;
      if (fetchMemories) memoriesLoaded.current = true;
      const { data } = await api.post('/ai/chat', {
        message: `[Context: user is on ${context}]\n\n${text}`,
        include_memories: fetchMemories,
        conversation_history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });
      const aiMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: data.reply ?? data.response ?? data.message ?? "I'm here to help.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error('[Lumina AI] chat error:', err);
      const httpStatus = (err as any)?.response?.status;
      const detail     = (err as any)?.response?.data?.detail;
      const errMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: httpStatus === 401
          ? 'Please sign in again to continue.'
          : detail
            ? `Error: ${detail}`
            : 'Sorry, I had trouble connecting. Please try again.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            id="lumina-ai-trigger"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{    scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            style={{
              position:     'fixed',
              bottom:       'calc(var(--nav-h) + 16px)',
              right:        16,
              width:        52,
              height:       52,
              borderRadius: '50%',
              background:   'var(--gradient)',
              color:        '#fff',
              fontSize:     22,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              border:       'none',
              cursor:       'pointer',
              zIndex:       70,
              boxShadow:    '0 4px 20px rgba(123,111,218,0.5)',
            }}
          >
            ✦
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            style={{
              position:   'fixed',
              inset:       0,
              background:  'var(--bg)',
              zIndex:      150,
              display:     'flex',
              flexDirection: 'column',
              maxWidth:    430,
              left:        '50%',
              transform:   'translateX(-50%)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            12,
                padding:        '16px 20px',
                borderBottom:   '1px solid var(--border)',
                background:     'var(--bg2)',
              }}
            >
              <div
                style={{
                  width:        40,
                  height:       40,
                  borderRadius: '50%',
                  background:   'var(--gradient)',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     18,
                }}
              >
                ✦
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700 }}>Lumina AI</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {ROUTE_CONTEXT[location.pathname] ?? 'Your personal AI'}
                </p>
              </div>
              <button className="btn-icon" onClick={() => { setOpen(false); memoriesLoaded.current = false; }}>✕</button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex:       1,
                overflowY:  'auto',
                padding:    '16px 16px 8px',
                display:    'flex',
                flexDirection: 'column',
                gap:        12,
                scrollbarWidth: 'none',
              }}
            >
              {messages.length === 0 && (
                <div>
                  <p
                    style={{
                      textAlign: 'center',
                      color:     'var(--text2)',
                      fontSize:  15,
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      marginBottom: 20,
                      marginTop: 24,
                    }}
                  >
                    How can I help you today?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {EXAMPLE_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        style={{
                          padding:      '10px 14px',
                          borderRadius: 'var(--r-md)',
                          background:   'var(--surface)',
                          border:       '1px solid var(--border)',
                          color:        'var(--text2)',
                          fontSize:     13,
                          textAlign:    'left',
                          cursor:       'pointer',
                          transition:   'border-color 0.2s',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display:   'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth:     '82%',
                      padding:      '10px 14px',
                      borderRadius: msg.role === 'user'
                        ? '18px 18px 4px 18px'
                        : '18px 18px 18px 4px',
                      background: msg.role === 'user'
                        ? 'var(--gradient)'
                        : 'var(--surface2)',
                      color:     '#fff',
                      fontSize:  14,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      onClick={() => saveNoteMutation.mutate(msg.content)}
                      disabled={saveNoteMutation.isPending}
                      style={{
                        marginTop: 5,
                        background: 'none',
                        border: '1px solid rgba(123,111,218,0.3)',
                        borderRadius: 20,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--mind)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ✦ Save to Mind
                    </motion.button>
                  )}
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      background:   'var(--surface2)',
                      borderRadius: '18px 18px 18px 4px',
                    }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding:      '12px 16px',
                borderTop:    '1px solid var(--border)',
                background:   'var(--bg2)',
                display:      'flex',
                alignItems:   'flex-end',
                gap:          10,
              }}
            >
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <textarea
                  className="field"
                  placeholder="Ask Lumina anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{
                    resize:     'none',
                    flex:       1,
                    maxHeight:  120,
                    paddingTop: 11,
                    paddingBottom: 11,
                    paddingLeft: 40,
                    paddingRight: 40,
                  }}
                />
                <button
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-sec)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
                <button
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-sec)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width:        44,
                  height:       44,
                  borderRadius: '50%',
                  background:   !input.trim() || loading ? 'var(--surface2)' : 'var(--gradient)',
                  color:        '#fff',
                  border:       'none',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     18,
                  cursor:       !input.trim() || loading ? 'not-allowed' : 'pointer',
                  flexShrink:   0,
                  transition:   'background 0.2s',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
