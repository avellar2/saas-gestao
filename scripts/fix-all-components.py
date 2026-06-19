import os, re

def remove_prop_nested(content, prop_name):
    pattern = re.compile(r'\s+' + re.escape(prop_name) + r'\s*=\s*\{', re.DOTALL)
    result = []
    i = 0
    while i < len(content):
        match = pattern.search(content, i)
        if not match:
            result.append(content[i:])
            break
        result.append(content[i:match.start()])
        start = match.end() - 1
        depth = 1
        j = start + 1
        while j < len(content) and depth > 0:
            if content[j] == '{':
                depth += 1
            elif content[j] == '}':
                depth -= 1
            j += 1
        i = j
    return ''.join(result)

def remove_prop_string(content, prop_name):
    return re.sub(r'\s+' + re.escape(prop_name) + r'\s*=\s*"[^"]*"', '', content)

base = r"C:\projetos\saas-gestão\src\components"
changes = []

for root, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content

        for prop in ['whileHover', 'whileTap', 'exit', 'layoutId', 'whileInView']:
            content = remove_prop_nested(content, prop)
            content = remove_prop_string(content, prop)

        # Remove useInView import
        content = re.sub(r'^import\s+\{[^}]*\buseInView\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bVariants\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bTargetAndTransition\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bTransition\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bm\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bmotion\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)

        # Replace m.div tags
        content = content.replace('<m.div', '<div')
        content = content.replace('</m.div>', '</div>')

        if content != original:
            rel = os.path.relpath(fpath, r'C:\projetos\saas-gestão')
            changes.append(rel)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)

print(f'FIXED {len(changes)} files:')
for c in changes:
    print(c)
