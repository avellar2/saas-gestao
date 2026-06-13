const fs = require('fs');

// Schema mapping: api relative path -> schema name
const SCHEMAS = {
  'estoque/route.ts': { post: 'productSchema', put: 'productSchema' },
  'estoque/[id]/route.ts': { put: 'productUpdateSchema' },
  'financeiro/route.ts': { post: 'financialTransactionSchema', put: 'financialTransactionSchema' },
  'financeiro/[id]/route.ts': { put: 'financialTransactionUpdateSchema' },
  'orcamentos/route.ts': { post: 'quoteSchema', put: 'quoteUpdateSchema' },
  'orcamentos/[id]/route.ts': { put: 'quoteUpdateSchema' },
  'ordens-servico/route.ts': { post: 'osSchema', put: 'osUpdateSchema' },
  'ordens-servico/[id]/route.ts': { put: 'osUpdateSchema' },
  'agendamento/route.ts': { post: 'appointmentSchema', put: 'appointmentSchema' },
  'agendamento/[id]/route.ts': { put: 'appointmentUpdateSchema' },
  'catalogo/route.ts': { post: 'catalogItemSchema', put: 'catalogItemSchema' },
  'catalogo/[id]/route.ts': { put: 'catalogItemUpdateSchema' },
  'cardapio/route.ts': { post: 'menuItemSchema', put: 'menuItemSchema' },
  'cardapio/[id]/route.ts': { put: 'menuItemUpdateSchema' },
  'usuarios/route.ts': { post: 'userSchema', put: 'userUpdateSchema' },
  'usuarios/[id]/route.ts': { put: 'userUpdateSchema' },
};

const apiDir = 'src/app/api';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const rel = filePath.replace(/\\/g, '/').replace('src/app/api/', '');
  const schemas = SCHEMAS[rel];
  if (!schemas) return;

  const lines = content.split('\n');

  // 1. Add import for the schema (skip if already added)
  const schemaNames = [...new Set(Object.values(schemas))];
  const importLine = `import { ${schemaNames.join(', ')} } from "@/lib/validations";`;

  if (!content.includes('validations')) {
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, importLine);
      content = lines.join('\n');
    }
  }

  // 2. Replace POST handler manual validation
  if (schemas.post && content.includes('export async function POST(')) {
    // Find the manual validation pattern: const body = ... then const { fields } = body then if (!field)
    const postRegex = /(export async function POST\([\s\S]*?const body = await request\.json\(\);)\s*\n\s*const \{[\s\S]*?\}\s*=\s*body;?\s*\n[\s\S]*?if \(!(\w+)/;

    content = content.replace(postRegex, (match, before) => {
      return before + `\n\n  const result = ${schemas.post}.safeParse(body);\n  if (!result.success) {\n    return NextResponse.json(\n      { error: result.error.errors[0]?.message || "Dados invalidos" },\n      { status: 400 }\n    );\n  }\n\n  const parsed = result.data;`;
    });

    // Remove the old manual validation if blocks
    content = content.replace(/if \(!(\w+) \|\| !\w+\.trim\(\)\) \{\s*\n\s*return NextResponse\.json\(\s*\{ error: "[^"]+" \},\s*\{ status: 400 \}\s*\);\s*\n\s*\}/g, '');
  }

  // 3. Replace PUT handler manual validation
  if (schemas.put && content.includes('export async function PUT(')) {
    const putRegex = /(export async function PUT\([\s\S]*?const body = await request\.json\(\);)\s*\n\s*const \{[\s\S]*?\}\s*=\s*body;?\s*\n[\s\S]*?if \(!(\w+)/;

    content = content.replace(putRegex, (match, before) => {
      return before + `\n\n  const result = ${schemas.put}.safeParse(body);\n  if (!result.success) {\n    return NextResponse.json(\n      { error: result.error.errors[0]?.message || "Dados invalidos" },\n      { status: 400 }\n    );\n  }\n\n  const parsed = result.data;`;
    });

    content = content.replace(/if \(!(\w+) \|\| !\w+\.trim\(\)\) \{\s*\n\s*return NextResponse\.json\(\s*\{ error: "[^"]+" \},\s*\{ status: 400 \}\s*\);\s*\n\s*\}/g, '');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅', rel);
}

// Walk through API routes
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

// Backup first
// Don't backup, directly process
walk(apiDir);
console.log('\n✅ Zod validation applied!');