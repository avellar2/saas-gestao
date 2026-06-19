import os, re

# Files with known remaining animation props
files = [
    r"C:\projetos\saas-gestão\src\app\not-found.tsx",
    r"C:\projetos\saas-gestão\src\components\empty-state.tsx",
    r"C:\projetos\saas-gestão\src\components\layout\dashboard-sidebar.tsx",
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    # Remove whileTap
    content = re.sub(r'\s+whileTap\s*=\s*\{[^{}]*\}', '', content)
    # Remove whileHover
    content = re.sub(r'\s+whileHover\s*=\s*\{[^{}]*\}', '', content)
    # Remove exit
    content = re.sub(r'\s+exit\s*=\s*\{[^{}]*\}', '', content)
    # Remove AnimatePresence tags (opening and closing)
    content = re.sub(r'\s*<AnimatePresence>\s*', '\n', content)
    content = re.sub(r'\s*</AnimatePresence>\s*', '\n', content)

    if content != original:
        print(f"FIXED: {os.path.relpath(fpath, r'C:\projetos\saas-gestão')}")
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f"UNCHANGED: {os.path.relpath(fpath, r'C:\projetos\saas-gestão')}")
