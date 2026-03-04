import os

def insert_in_file(path, target_str, insert_str, after=True):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if insert_str in content:
        return
    if insert_str.startswith('import'):
        # Just prepend
        content = insert_str + '\n' + content
    else:
        if after:
            content = content.replace(target_str, target_str + '\n' + insert_str)
        else:
            content = content.replace(target_str, insert_str + '\n' + target_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# HOME
home_path = r'c:\Users\asus\Desktop\lumina-app\frontend\web\src\pages\Home.tsx'
insert_in_file(home_path, 'import { useQuery }', 'import AICard from \'../components/AICard\';')
insert_in_file(home_path, 'export default function Home() {', '  const [aiInsight] = useState(\'AI anticipates a productive day ahead based on your morning routine.\');\n')
# In Home: find: <motion.div className="flex-1 overflow-y-auto page"> or something. Let's just insert after <Greeting />
insert_in_file(home_path, '<Greeting />', '        <div style={{ marginBottom: 24, marginTop: 12 }}><AICard insight={aiInsight} /></div>')

# MIND
mind_path = r'c:\Users\asus\Desktop\lumina-app\frontend\web\src\pages\Mind.tsx'
insert_in_file(mind_path, 'import { useQuery', 'import AICard from \'../components/AICard\';')
# State: call it pageInsight
insert_in_file(mind_path, 'export default function Mind() {', '  const [pageInsight] = useState(\'AI notices a trend of calmness in your recent memory logs.\');\n')
insert_in_file(mind_path, '<h1 style={{ fontSize: 24, fontWeight: 800 }}>Mind</h1>', '<h1 style={{ fontSize: 24, fontWeight: 800 }}>Mind</h1>\n      </div>\n      <div style={{ marginBottom: 24 }}><AICard insight={pageInsight} /></div>\n')
# Let's fix that string hack - we will replace <h1 style={{ fontSize: 24, fontWeight: 800 }}>Mind</h1> but wait, that is inside a Header div. Let's replace the whole header div logic later.
