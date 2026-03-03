/**
 * Global AI Assistant — floating button + full-screen chat modal
 * Available on every page. Context-aware per visible route.
 */
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef              = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const context = ROUTE_CONTEXT[location.pathname] ?? 'Lumina Life OS';

    try {
      const { data } = await api.post('/ai/chat', {
        message: `[Context: user is on ${context}]\n\n${text}`,
      });
      const aiMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: data.response ?? data.message ?? 'I\'m here to help.',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
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
              <button className="btn-icon" onClick={() => setOpen(false)}>✕</button>
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
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
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
                }}
              />
              <button
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
                ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
