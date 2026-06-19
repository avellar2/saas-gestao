import os, re

def remove_prop(content, prop_name):
    # Remove prop={...} handling nested braces
    pattern = re.compile(r'\s+' + re.escape(prop_name) + r'\s*=\s*\{', re.DOTALL)
    result = []
    i = 0
    while i < len(content):
        match = pattern.search(content, i)
        if not match:
            result.append(content[i:])
            break
        result.append(content[i:match.start()])
        start = match.end() - 1  # position of opening {
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

files = [
    r"C:\projetos\saas-gestão\src\components\layout\dashboard-sidebar.tsx",
    r"C:\projetos\saas-gestão\src\components\layout\filter-pills.tsx",
]

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content

    for prop in ['whileHover', 'whileTap', 'exit', 'layoutId']:
        content = remove_prop(content, prop)

    # Remove AnimatePresence tags
    content = re.sub(r'\s*<AnimatePresence>\s*', '\n', content)
    content = re.sub(r'\s*</AnimatePresence>\s*', '\n', content)

    if content != original:
        print(f"FIXED: {os.path.relpath(fpath, r'C:\projetos\saas-gestão')}")
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
    else:
        print(f"UNCHANGED: {os.path.relpath(fpath, r'C:\projetos\saas-gestão')}")
