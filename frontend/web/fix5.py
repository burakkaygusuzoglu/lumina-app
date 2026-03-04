import os

files_to_fix = [
    'Journal.tsx', 'Life.tsx', 'Profile.tsx', 'Settings.tsx', 'Wellness.tsx'
]

src_dir = r'c:\\Users\\asus\\Desktop\\lumina-app\\frontend\\web\\src\\pages'

for file_name in files_to_fix:
    path = os.path.join(src_dir, file_name)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('const [aiInsight, setAiInsight] =', 'const [aiInsight] =')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed 5 files')
