import os, re

base = r"C:\projetos\saas-gestão\src"
changes = []

for root, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Replace any m.tag with tag
        content = re.sub(r'<m\.(\w+)', r'<\1', content)
        content = re.sub(r'</m\.(\w+)>', r'</\1>', content)

        # Remove animation props
        content = re.sub(r'\s+whileTap\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+whileHover\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+whileInView\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+exit\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+viewport\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+initial\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+animate\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+variants\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+transition\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+layout\b', '', content)

        if content != original:
            rel = os.path.relpath(fpath, r"C:\projetos\saas-gestão")
            changes.append(rel)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)

print(f'FIXED {len(changes)} files:')
for c in changes:
    print(c)
