const fs = require('fs');
const path = require('path');

const RL_IMPORT = 'import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";\n';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const rel = path.relative('src/app/api', filePath).replace(/\\/g, '/');
  const isNextAuth = rel.includes('nextauth');

  if (isNextAuth) return;

  // 1. Add rate-limit import after last import if not present
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

  // 2. For each handler, add rate limit after the auth check
  const handlerNames = ['GET', 'POST', 'PUT', 'DELETE'];
  for (const handler of handlerNames) {
    // Find the handler's auth check block
    const regex = new RegExp(
      `(export async function ${handler}\\([\\s\\S]*?if \\(!session\\)[\\s\\S]*?\\}[ \\t]*\\n)`,
      'g'
    );
    content = content.replace(regex, (match) => {
      // Only add rate limit if not already present
      if (match.includes('checkRateLimit')) return match;
      return match + `
  // Rate limiting
  const rateKey = getRateLimitKey(request);
  const { allowed: rlAllowed, resetAt: rlResetAt } = checkRateLimit(rateKey);
  if (!rlAllowed) {
    return rateLimitResponse(rlResetAt);
  }
`;
    });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅', rel);
}

// Process all route files
const apiDir = 'src/app/api';
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'route.ts') {
      processFile(fullPath);
    }
  }
}

walk(apiDir);
console.log('\n✅ Rate limiting added to all API routes.');