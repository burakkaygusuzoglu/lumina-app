import sys

path = r'c:\Users\asus\Desktop\lumina-app\frontend\web\src\components\AIAssistant.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_react_query = "import { useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useAppStore } from '../store/appStore';\n"
if 'useMutation' not in content:
    content = content.replace("import { api }", import_react_query + "import { api }")

old_func_def = "export default function AIAssistant() {"
new_func_def = """export default function AIAssistant() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const saveNoteMutation = useMutation({
    mutationFn: (text: string) => api.post('/memories', { content: text, type: 'Idea', tags: ['AI Note'] }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] });
      addToast('success', 'Saved to Mind seamlessly!');
    }
  });"""
if 'saveNoteMutation' not in content:
    content = content.replace(old_func_def, new_func_def)

# find msg.content renderer
old_msg_render = """                    >
                      {msg.content}
                    </div>"""
new_msg_render = """                    >
                      {msg.content}
                      {msg.role === 'assistant' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, opacity: 0.8 }}>
                          <button 
                            onClick={() => saveNoteMutation.mutate(msg.content)}
                            style={{ background: 'var(--surface)', border: 'none', color: 'var(--mind)', fontSize: 11, padding: '4px 8px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            Save to Mind
                          </button>
                        </div>
                      )}
                    </div>"""
if 'Save to Mind' not in content:
    content = content.replace(old_msg_render, new_msg_render)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AIAssistant.tsx")
