const fs = require('fs');

const apiDir = 'src/app/api';

const RL_CODE = `
  // Rate limiting
  const rateKey = getRateLimitKey(request);
  const { allowed: rlAllowed, resetAt: rlResetAt } = checkRateLimit(rateKey);
  if (!rlAllowed) {
    return rateLimitResponse(rlResetAt);
  }
`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip nextauth routes
  if (filePath.includes('nextauth') || filePath.includes('relatorios')) return;

  // 1. Add import for rate-limit if not present
  if (!content.includes('rate-limit')) {
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, 'import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";');
      content = lines.join('\n');
    }
  }

  // 2. Skip files that already have rate limit checks
  if (content.includes('checkRateLimit(request)')) {
    const rel = filePath.replace(/\\/g, '/').replace('src/app/api/', '');
    console.log('⏩', rel, '(already has rate limit)');
    return;
  }

  const lines = content.split('\n');
  const newLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    newLines.push(line);

    // Detect end of `if (!session) { return ... }` block
    if (line.includes('if (!session') && line.includes('{')) {
      // Find the matching closing brace
      let depth = 0;
      let startIdx = i;
      let endIdx = i;
      for (let j = i; j < Math.min(i + 12, lines.length); j++) {
        const openCount = (lines[j].match(/{/g) || []).length;
        const closeCount = (lines[j].match(/}/g) || []).length;
        depth += openCount - closeCount;
        if (depth <= 0 && j > i) {
          endIdx = j;
          break;
        }
      }

      // Only add rate limit after if we found the end and it's NOT next to another if/return
      if (endIdx > i) {
        const nextLine = lines[endIdx + 1]?.trim() || '';
        const prevLine = lines[endIdx - 1]?.trim() || '';

        // Check if rate limit already exists in the next few lines
        let alreadyHasRl = false;
        for (let k = endIdx + 1; k < Math.min(endIdx + 6, lines.length); k++) {
          if (lines[k].includes('checkRateLimit')) { alreadyHasRl = true; break; }
        }

        if (!alreadyHasRl) {
          newLines.push('');
          newLines.push('  // Rate limiting');
          newLines.push('  const rateKey = getRateLimitKey(request);');
          newLines.push('  const { allowed: rlAllowed, resetAt: rlResetAt } = checkRateLimit(rateKey);');
          newLines.push('  if (!rlAllowed) {');
          newLines.push('    return rateLimitResponse(rlResetAt);');
          newLines.push('  }');
          // Skip lines between i and endIdx since we're adding them via the loop below this block
        }
      }
    }

    i++;
  }

  content = newLines.join('\n');

  // 3. Clean up: remove duplicate blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  const rel = filePath.replace(/\\/g, '/').replace('src/app/api/', '');
  console.log('✅', rel);
}

// Walk through all route files
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = dir + '/' + entry.name;
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name === 'route.ts') {
      processFile(fullPath);
    }
  }
}

walk(apiDir);
console.log('\n✅ Done!');