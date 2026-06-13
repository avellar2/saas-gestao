const fs = require('fs');
const path = require('path');

// Schema mapping
const SCHEMAS = {
  'clientes/route.ts': 'clientSchema',
  'clientes/[id]/route.ts': 'clientSchema',
  'orcamentos/route.ts': 'quoteSchema',
  'orcamentos/[id]/route.ts': 'quoteUpdateSchema',
  'ordens-servico/route.ts': 'osSchema',
  'ordens-servico/[id]/route.ts': 'osUpdateSchema',
  'estoque/route.ts': 'productSchema',
  'estoque/[id]/route.ts': 'productUpdateSchema',
  'financeiro/route.ts': 'financialTransactionSchema',
  'financeiro/[id]/route.ts': 'financialTransactionUpdateSchema',
  'agendamento/route.ts': 'appointmentSchema',
  'agendamento/[id]/route.ts': 'appointmentUpdateSchema',
  'catalogo/route.ts': 'catalogItemSchema',
  'catalogo/[id]/route.ts': 'catalogItemUpdateSchema',
  'cardapio/route.ts': 'menuItemSchema',
  'cardapio/[id]/route.ts': 'menuItemUpdateSchema',
  'usuarios/route.ts': 'userSchema',
  'usuarios/[id]/route.ts': 'userUpdateSchema',
  'empresas/route.ts': 'companySchema',
  'empresas/[id]/route.ts': 'companySchema',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const rel = path.relative('src/app/api', filePath).replace(/\\/g, '/');

  // 1. Add import for rate-limit after last import
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportIdx = i;
  }

  if (lastImportIdx >= 0) {
    // Add rate-limit import
    const rlImport = 'import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "@/lib/rate-limit";';
    lines.splice(lastImportIdx + 1, 0, rlImport);
    lastImportIdx++;

    // Add Zod schema import if applicable
    const schemaName = SCHEMAS[rel];
    if (schemaName) {
      const zodImport = `import { ${schemaName} } from "@/lib/validations";`;
      lines.splice(lastImportIdx + 1, 0, zodImport);
      lastImportIdx++;
    }
  }

  content = lines.join('\n');

  // 2. For each handler, add rate limit check after the auth/unauthorized block
  const handlers = ['GET', 'POST', 'PUT', 'DELETE'];
  for (const handler of handlers) {
    // Find each handler's auth check end and insert rate limit
    // Pattern: after `if (!session) { return ... }` block
    const handlerRegex = new RegExp(
      '(export async function ' + handler + '\\()([\\s\\S]*?)(if \\(!session\\)(?:\\?\\s*user)?\\s*\\{[\\s\\S]*?\\}\\s*)',
      'g'
    );
    content = content.replace(handlerRegex, (match, start, middle, authBlock) => {
      return start + middle + authBlock + `
  // Rate limiting
  const rateKey = getRateLimitKey(request);
  const { allowed: rlAllowed, resetAt: rlResetAt } = checkRateLimit(rateKey);
  if (!rlAllowed) {
    return rateLimitResponse(rlResetAt);
  }
`;
    });
  }

  // 3. Replace manual validation in POST with Zod
  if (content.includes('export async function POST(') && SCHEMAS[rel]) {
    const schemaName = SCHEMAS[rel];
    // Replace the common pattern: const body = ... ; const { name, ... } = body; if (!name || !name.trim())
    // We need to keep the body = await request.json() line and replace the rest

    const lines2 = content.split('\n');
    const newLines = [];
    let skipUntil = -1;
    let replaced = false;

    for (let i = 0; i < lines2.length; i++) {
      const line = lines2[i];
      const nextLine = lines2[i + 1] || '';

      if (!replaced &&
          line.includes('const body = await request.json();') &&
          (nextLine.includes('const {') || nextLine.includes('let {')) &&
          i < skipUntil) {
        // This is a manual validation that needs Zod replacement
        // Find the end of manual validation block
        let endIdx = i + 2;
        let foundNameCheck = false;
        for (let j = i + 2; j < Math.min(i + 15, lines2.length); j++) {
          if (lines2[j].includes('if (!') && (lines2[j].includes('.trim()') || lines2[j].includes('|| !'))) {
            foundNameCheck = true;
            endIdx = j + 5; // skip the if block
            continue;
          }
          if (foundNameCheck && !lines2[j].includes('if (!') && !lines2[j].includes('{') && !lines2[j].includes('return NextResponse')) {
            break;
          }
        }

        newLines.push(line);
        newLines.push(`  const { data: parsed, error: validationError } = (() => {`);
        newLines.push(`    const result = ${schemaName}.safeParse(body);`);
        newLines.push(`    if (!result.success) {`);
        newLines.push(`      return { error: Response.json({ error: result.error.errors[0]?.message || "Dados invalidos" }, { status: 400 }) };`);
        newLines.push(`    }`);
        newLines.push(`    return { data: result.data };`);
        newLines.push(`  })();`);
        newLines.push(`  if (validationError) return validationError;`);
        skipUntil = endIdx;
        replaced = true;
        continue;
      }

      if (i >= skipUntil) continue;
      newLines.push(line);
    }

    content = newLines.join('\n');

    // Also clean up orphaned `if (!name || !name.trim())` blocks
    content = content.replace(/\n\s+if \(!\w+ \|\| !\w+\.trim\(\)\) \{\s*\n\s+return NextResponse\.json\(\s*\{ error: "[^"]+" \},\s*\{ status: 400 \}\s*\);\s*\n\s+\}/g, '');
  }

  // 4. Replace manual validation in PUT with Zod
  if (content.includes('export async function PUT(') && SCHEMAS[rel]) {
    const schemaName = SCHEMAS[rel];
    // Same approach for PUT handler
    const lines2 = content.split('\n');
    const newLines = [];
    let skipUntil = -1;
    let replaced = false;

    for (let i = 0; i < lines2.length; i++) {
      const line = lines2[i];
      const nextLine = lines2[i + 1] || '';

      if (!replaced &&
          line.includes('const body = await request.json();') &&
          (nextLine.includes('const {') || nextLine.includes('let {')) &&
          i >= skipUntil) {
        let endIdx = i + 2;
        // Find where manual validation ends - next "const" or "if (!" or "if (!"
        for (let j = i + 2; j < Math.min(i + 12, lines2.length); j++) {
          const l = lines2[j].trim();
          if (l.startsWith('if (!') && (l.includes('.trim()') || l.includes('|| !'))) {
            endIdx = j + 6;
          }
        }

        newLines.push(line);
        newLines.push(`  const { data: parsed, error: validationError } = (() => {`);
        newLines.push(`    const result = ${schemaName}.safeParse(body);`);
        newLines.push(`    if (!result.success) {`);
        newLines.push(`      return { error: Response.json({ error: result.error.errors[0]?.message || "Dados invalidos" }, { status: 400 }) };`);
        newLines.push(`    }`);
        newLines.push(`    return { data: result.data };`);
        newLines.push(`  })();`);
        newLines.push(`  if (validationError) return validationError;`);
        skipUntil = endIdx;
        replaced = true;
        continue;
      }

      if (i < skipUntil) continue;
      newLines.push(line);
    }

    content = newLines.join('\n');
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
console.log('\n✨ Done!');