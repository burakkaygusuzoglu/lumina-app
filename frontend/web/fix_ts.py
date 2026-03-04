import os
import re

src_dir = r'c:\\Users\\asus\\Desktop\\lumina-app\\frontend\\web\\src\\pages'

for file_name in os.listdir(src_dir):
    if not file_name.endswith('.tsx'): continue
    file_path = os.path.join(src_dir, file_name)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace const [aiInsight, setAiInsight] =  with const [aiInsight] = 
    if 'Mind.tsx' not in file_name:
        content = content.replace('const [aiInsight, setAiInsight] = useState(', 'const [aiInsight] = useState(')
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Fixed setAiInsight')
