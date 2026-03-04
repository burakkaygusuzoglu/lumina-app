import sys

path = r'c:\Users\asus\Desktop\lumina-app\frontend\web\src\pages\Settings.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the SettingRow look like iOS
old_segment = '''function SettingRow({ icon, label, description, end }: { icon: string; label: string; description?: string; end: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 24, padding: 8, background: 'var(--surface2)', borderRadius: 12 }}>{icon}</span>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{label}</p>
          {description && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{description}</p>}
        </div>
      </div>
      <div>{end}</div>
    </div>
  );
}'''

new_segment = '''function SettingRow({ icon, label, description, end }: { icon: string; label: string; description?: string; end: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface)', margin: '4px 0', borderRadius: 16, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'var(--surface2)', borderRadius: 12, boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)' }}>{icon}</div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
          {description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{description}</p>}
        </div>
      </div>
      <div>{end}</div>
    </div>
  );
}'''

if old_segment in content:
    content = content.replace(old_segment, new_segment)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated Settings UI to Apple standard")
else:
    print("Could not find Settings row UI")
