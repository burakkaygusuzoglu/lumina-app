import sys
import re

path = r'c:\Users\asus\Desktop\lumina-app\backend\app\services\ai_service.py'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

patch_code = '''
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            return {"role": "assistant", "content": [{"text": "I am currently undergoing maintenance or missing my API key. Please check the backend configuration."}]}
'''
# We will inject a try-catch physically.

def replace_anthropic_call(func_name, content):
    pattern = r'(response = self\._client\.messages\.create\([\s\S]*?\n\s+\]\n\s+\))'
    match = re.search(pattern, content)
    if match:
        original = match.group(1)
        indented = '    ' + original.replace('\n', '\n    ')
        replacement = f'''try:\n{indented}\n        except Exception as e:\n            logger.error(f"AI API error: {{e}}")\n            class MockResponse:\n                content = [type('MockContent', (), {{"text": "AI module is currently unavailable due to API limits or missing keys. My systems are offline temporarily."}})()]\n            response = MockResponse()'''
        content = content.replace(original, replacement, 1)
    return content

content = replace_anthropic_call('chat_with_memories', content)
content = replace_anthropic_call('generate_journal_prompt', content)
content = replace_anthropic_call('analyze_nutrition', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched AI service with fallbacks.")
