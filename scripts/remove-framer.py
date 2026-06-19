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
        if 'framer-motion' not in content:
            continue

        original = content

        # Remove imports
        content = re.sub(r'^import\s+\{[^}]*\bm\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bmotion\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bAnimatePresence\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\buseInView\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{[^}]*\bVariants\b[^}]*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)
        content = re.sub(r'^import\s+\{\s*type\s+Variants\s*\}\s+from\s+"framer-motion";\s*\n?', '', content, flags=re.MULTILINE)

        # Replace tags
        content = content.replace('<m.div', '<div')
        content = content.replace('</m.div>', '</div>')

        # Remove props (multiline-safe regex)
        content = re.sub(r'\s+initial\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '', content)
        content = re.sub(r'\s+initial\s*=\s*"[^"]*"', '', content)
        content = re.sub(r'\s+animate\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '', content)
        content = re.sub(r'\s+animate\s*=\s*"[^"]*"', '', content)
        content = re.sub(r'\s+variants\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '', content)
        content = re.sub(r'\s+transition\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', '', content)
        content = re.sub(r'\s+whileTap\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+whileHover\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+exit\s*=\s*\{[^{}]*\}', '', content)
        content = re.sub(r'\s+layout\b', '', content)

        # Remove variants consts
        content = re.sub(r'^const\s+\w+Variants\s*=\s*\{[^}]*\};?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)
        content = re.sub(r'^const\s+\w+FadeIn\s*=\s*\{[^}]*\};?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)
        content = re.sub(r'^const\s+\w+Stagger\s*=\s*\{[^}]*\};?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)
        content = re.sub(r'^const\s+\w+EaseOut\s*=\s*\[.*?\]\s*as.*?;?\s*\n?', '', content, flags=re.MULTILINE|re.DOTALL)

        if content != original:
            rel = os.path.relpath(fpath, r"C:\projetos\saas-gestão")
            changes.append(rel)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)

print(f"MODIFIED {len(changes)} files:")
for c in changes:
    print(c)
