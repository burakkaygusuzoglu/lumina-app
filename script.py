import os
import re

pages = {
    'Home.tsx': 'AI anticipates a productive day ahead based on your morning routine.',
    'Health.tsx': 'AI suggests drinking an extra glass of water after your last meal.',
    'Life.tsx': 'AI highlights: Breaking down your upcoming priorities can reduce stress.',
    'Mind.tsx': 'AI notices a trend of calmness in your recent memory logs.',
    'Vault.tsx': 'AI confirms your vault architecture is secure and encrypted.',
    'Journal.tsx': 'AI prompt: Reflect on three things that made you smile today.',
    'Profile.tsx': 'AI notes you have been consistently active this week!',
    'Settings.tsx': 'AI says: Dark mode is saving your battery and eye strain.',
    'Wellness.tsx': 'AI tracked higher sleep quality when you logged less screen time.'
}

src_dir = r'c:\\Users\\asus\\Desktop\\lumina-app\\frontend\\web\\src\\pages'

for file_name, insight in pages.items():
    file_path = os.path.join(src_dir, file_name)
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'AICard' in content:
        continue
        
    if 'import AICard' not in content:
        content = re.sub(r'(import .*?;)', r'\1\nimport AICard from \'../components/AICard\';'.replace("\\'", "'"), content, count=1)
        
    if 'import { useState' not in content and 'import React' not in content:
        content = re.sub(r'(import .*?;)', r'\1\nimport { useState } from \'react\';'.replace("\\'", "'"), content, count=1)
        
    func_match = re.search(r'export default function (\w+)\(.*?\) \{', content)
    if func_match:
        state_str = f"  const [aiInsight, setAiInsight] = useState('{insight}');\n"
        content = content.replace(func_match.group(0), func_match.group(0) + '\n' + state_str)

        motion_match = re.search(r'(<motion\.div\s+\{\.\.\.PAGE\}\s+className="page"[^>]*>)', content)
        if motion_match:
            card_str = f"\n      <div style={{{{ marginBottom: 24 }}}}><AICard insight={{aiInsight}} /></div>\n"
            content = content.replace(motion_match.group(1), motion_match.group(1) + card_str)
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Injection done')
