import sys

path = r'c:\Users\asus\Desktop\lumina-app\frontend\web\src\pages\Mind.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_segment = '''        {/* Type filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className={chip} style={{ flexShrink: 0 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>'''

new_segment = '''        {/* Enhanced Apple-style Segmentation */}
        <div style={{
            display: 'flex', gap: 4, overflowX: 'auto', padding: '6px', marginBottom: 20, 
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'none'
        }}>
          {TYPES.map((t) => {
            const active = typeFilter === t.key;
            return (
              <button 
                key={t.key} 
                onClick={() => setTypeFilter(t.key)}
                style={{ 
                  flexShrink: 0, padding: '8px 16px', borderRadius: 12, border: 'none',
                  background: active ? 'var(--text)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--text2)',
                  fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: active ? '0 4px 10px rgba(0,0,0,0.2)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{t.icon}</span> 
                {t.label}
              </button>
            )
          })}
        </div>'''

if old_segment in content:
    content = content.replace(old_segment, new_segment)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated Mind filter UI")
else:
    print("Could not find Mind filter segment")
