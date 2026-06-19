import os, re

base = r"C:\projetos\saas-gestão\src\app"
changes = []

for root, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Remove remaining whileTap props
        content = re.sub(r'\s+whileTap\s*=\s*\{[^{}]*\}', '', content)
        # Remove remaining exit props
        content = re.sub(r'\s+exit\s*=\s*\{[^{}]*\}', '', content)

        # Remove remaining m.div occurrences (shouldn't exist but safety)
        content = content.replace('<m.div', '<div')
        content = content.replace('</m.div>', '</div>')

        # Remove remaining AnimatePresence tags
        content = re.sub(r'<AnimatePresence>\s*', '', content)
        content = re.sub(r'\s*</AnimatePresence>', '', content)

        # Remove const variants objects that still exist
        content = re.sub(r'^const\s+\w+Variants\s*=\s*\{[^}]*\};?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)

        # Remove const easeOut
        content = re.sub(r'^const\s+easeOut\s*=\s*\[.*?\]\s*as\s*(?:const|\[.*?\]);?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)

        if content != original:
            rel = os.path.relpath(fpath, r"C:\projetos\saas-gestão")
            changes.append(rel)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)

print(f'FIXED {len(changes)} files:')
for c in changes:
    print(c)
