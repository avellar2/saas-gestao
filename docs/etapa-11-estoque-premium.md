# Etapa 11 — Estoque Premium: Movimentações, Ajustes, Alertas e Dashboard

## Contexto

O módulo Estoque já possui Product e StockMovement, mas as movimentações manuais (entrada, saída, ajuste) nunca foram implementadas. A OS já baixa estoque automaticamente ao finalizar. Os enums `StockMovementType` (IN, OUT, ADJUSTMENT) e `StockMovementReason` (MANUAL_ADJUSTMENT, PURCHASE, etc.) existem mas não têm uso na UI/API.

Esta etapa transforma o Estoque em módulo premium com dashboard, alertas, movimentações manuais e histórico.

---

## 1. Estado Atual

### Product
```
id, companyId, name, description?, sku?, category?,
quantity (Decimal 10,2, default 0), minStock (Decimal 10,2, default 0),
costPrice? (Decimal 10,2), salePrice (Decimal 10,2, default 0),
active (Boolean, default true), createdAt, updatedAt
```

### StockMovement
```
id, companyId, productId, serviceOrderId?,
type (StockMovementType: IN, OUT, ADJUSTMENT),
reason (StockMovementReason: SERVICE_ORDER, PURCHASE, SALE, MANUAL_ADJUSTMENT, RETURN, LOSS),
quantity (Decimal 10,2), previousQuantity (Decimal 10,2), newQuantity (Decimal 10,2),
description?, createdById?, createdAt
```

### Gaps
- **Nenhum endpoint ou UI para entrada/saída/ajuste manual**
- **PUT em Product NÃO cria StockMovement** — mudança de quantidade sem auditoria
- **Nenhuma página de movimentações** — StockMovement só visível no detalhe da OS
- **productSchema Zod existe mas NÃO é usado nas rotas** — rotas fazem validação manual
- **active field nunca usado** — sem toggle ou filtro
- **stock_movement nunca logado no ActivityLog**
- **lowStock filter é feito in-memory** (Prisma não suporta comparar campos entre si)

---

## 2. Mudanças no Prisma

**Nenhuma.** O schema atual já suporta tudo:
- `StockMovementType` (IN, OUT, ADJUSTMENT) — reutilizar
- `StockMovementReason` (MANUAL_ADJUSTMENT, etc.) — reutilizar
- `previousQuantity`, `newQuantity` — já existem
- `createdById` — já existe para auditoria

---

## 3. Novos Endpoints

### `POST /api/estoque/[id]/entrada`
```json
{ "quantity": 5, "description": "Compra de reposição" }
```
- Valida `quantity > 0`
- Usa `$transaction` para:
  1. `Product.update({ data: { quantity: { increment: quantity } } })`
  2. `StockMovement.create({ type: "IN", reason: "MANUAL_ADJUSTMENT", ... })`
- Retorna o produto atualizado

### `POST /api/estoque/[id]/saida`
```json
{ "quantity": 2, "description": "Uso interno" }
```
- Valida `quantity > 0`
- Protege contra estoque negativo: busca produto, se `quantity > product.quantity` retorna erro 409
- Usa `$transaction` para:
  1. `Product.updateMany({ where: { id, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } })`
  2. Se `count === 0`, lança erro de estoque insuficiente (rollback)
  3. `StockMovement.create({ type: "OUT", reason: "MANUAL_ADJUSTMENT", ... })`
- Retorna o produto atualizado

### `POST /api/estoque/[id]/ajuste`
```json
{ "newQuantity": 7, "description": "Inventário de fim de mês" }
```
- Valida `newQuantity >= 0`
- `description` obrigatório (ou ao menos recomendado)
- Calcula diferença = `newQuantity - product.quantity`
- Usa `$transaction` para:
  1. `Product.update({ data: { quantity: newQuantity } })`
  2. `StockMovement.create({ type: "ADJUSTMENT", reason: "MANUAL_ADJUSTMENT", quantity: Math.abs(diferenca), ... })`
- Retorna o produto atualizado

### `GET /api/estoque/movimentacoes`
- Lista StockMovement com filtros: productId, type, reason, período (startDate, endDate)
- Inclui: product (name), createdBy (name)
- Paginação

### `GET /api/estoque/resumo`
- Dashboard: total produtos ativos, estoque baixo, zerados, valor total, movimentações recentes

---

## 4. Fluxo de Entrada/Saída/Ajuste

### Entrada
```
1. Usuário clica "Entrada" no produto
2. Dialog: quantidade (obrigatório, > 0) + descrição (opcional)
3. POST /api/estoque/[id]/entrada
4. Transaction: incrementa Product.quantity + cria StockMovement (IN, MANUAL_ADJUSTMENT)
5. ActivityLog: "Entrada manual de estoque: Produto X +5"
6. UI atualiza
```

### Saída
```
1. Usuário clica "Saída" no produto
2. Dialog: quantidade (obrigatório, > 0) + descrição (opcional)
3. POST /api/estoque/[id]/saida
4. Transaction: verifica estoque suficiente, decrementa Product.quantity + cria StockMovement (OUT, MANUAL_ADJUSTMENT)
5. Se estoque insuficiente: erro 409 com mensagem clara
6. ActivityLog: "Saída manual de estoque: Produto X -2"
7. UI atualiza
```

### Ajuste
```
1. Usuário clica "Ajustar" no produto
2. Dialog: nova quantidade (obrigatório, >= 0) + descrição (obrigatório)
3. POST /api/estoque/[id]/ajuste
4. Transaction: calcula diferença, seta Product.quantity + cria StockMovement (ADJUSTMENT, MANUAL_ADJUSTMENT, quantidade = |diferença|)
5. ActivityLog: "Ajuste de estoque: Produto X 10 → 7"
6. UI atualiza
```

---

## 5. Proteção Contra Estoque Negativo

A saída manual usa `updateMany` com `where: { id, quantity: { gte: requestedQuantity } }`:
- Se `count === 0`, significa que o estoque é insuficiente → rollback automático via transaction
- Retorna erro 409 com mensagem: `"Estoque insuficiente. Disponível: X, Solicitado: Y"`
- Mesmo padrão usado na baixa da OS (em `stock-deduction.ts`)

---

## 6. UI

### Layout com abas

Adicionar tab ao estoque (sem layout.tsx ainda, criar):

```
Dashboard | Produtos | Movimentações
```

| Tab | Rota | Conteúdo |
|-----|------|----------|
| Dashboard | `/estoque` | Cards + alertas |
| Produtos | `/estoque/produtos` | Lista atual (migrada) |
| Movimentações | `/estoque/movimentacoes` | Lista de StockMovement |

Rota `/estoque` atual (lista de produtos) vira `/estoque/produtos`.
Rota `/estoque` vira o Dashboard.
`/estoque/novo` e `/estoque/[id]` continuam funcionando.

### Dashboard (`/estoque`)

Cards:
- Total de produtos ativos
- Produtos com estoque baixo (quantity <= minStock)
- Produtos zerados (quantity = 0)
- Valor total em estoque (soma de costPrice * quantity)
- Movimentações recentes (5 últimas)

Se recharts já instalado (está, da Etapa 10): gráfico de entradas x saídas dos últimos 7 dias.

### Lista de Produtos (`/estoque/produtos`)

Migrada da atual, adicionando:
- Filtro: Todos / Estoque baixo / Zerados / Ativos / Inativos
- Badge de status: Normal (verde), Baixo (amarelo), Zerado (vermelho)
- Botões de ação: Entrada, Saída, Ajustar (abrem dialog)

### Movimentações (`/estoque/movimentacoes`)

Tabela com:
- Data, Produto, Tipo (IN/OUT/ADJUSTMENT), Motivo, Quantidade, Anterior → Novo, Origem (Manual/OS), Usuário, Descrição
- Filtros: produto, tipo, motivo, período

### Detalhe do Produto (`/estoque/[id]`)

Adicionar seção "Histórico de Movimentações" no final:
- Lista das últimas 20 movimentações daquele produto
- Data, Tipo, Motivo, Quantidade, Anterior → Novo, Origem, Descrição

### Dialogs de Entrada/Saída/Ajuste

Modal com:
- Título: "Entrada de Estoque — {nome do produto}" / "Saída de Estoque" / "Ajuste de Estoque"
- Campo quantidade (number, obrigatório, > 0 para entrada/saída, >= 0 para ajuste)
- Campo descrição (text, opcional para entrada/saída, obrigatório para ajuste)
- Informação: estoque atual
- Botões: Cancelar / Confirmar
- Loading state

---

## 7. Arquivos a Criar/Alterar

### Novos
| Arquivo | Função |
|---------|--------|
| `src/app/api/estoque/[id]/entrada/route.ts` | POST entrada manual |
| `src/app/api/estoque/[id]/saida/route.ts` | POST saída manual |
| `src/app/api/estoque/[id]/ajuste/route.ts` | POST ajuste |
| `src/app/api/estoque/movimentacoes/route.ts` | GET lista de movimentações |
| `src/app/api/estoque/resumo/route.ts` | GET dashboard resumo |
| `src/app/(dashboard)/estoque/layout.tsx` | Tabs: Dashboard, Produtos, Movimentações |
| `src/app/(dashboard)/estoque/DashboardContent.tsx` | Cards + gráfico |
| `src/app/(dashboard)/estoque/produtos/page.tsx` | Lista migrada |
| `src/app/(dashboard)/estoque/movimentacoes/page.tsx` | Lista de movimentações |
| `src/app/(dashboard)/estoque/movimentacoes/MovimentacoesContent.tsx` | Client component |
| `src/lib/estoque-helpers.ts` | isLowStock, isOutOfStock, STOCK_TYPE_LABELS, etc. |

### Alterar
| Arquivo | Mudança |
|--------|---------|
| `src/app/(dashboard)/estoque/page.tsx` | De lista → Dashboard |
| `src/app/(dashboard)/estoque/[id]/EstoqueDetailContent.tsx` | Adicionar seção de histórico + botões Entrada/Saída/Ajustar |
| `src/app/api/estoque/route.ts` | Adicionar filtro lowStock mais eficiente, usar Zod |
| `src/lib/modules.ts` | Adicionar sub-rotas `/estoque/produtos`, `/estoque/movimentacoes` |

---

## 8. ActivityLog

- `"Entrada manual de estoque: Produto X +5"`
- `"Saída manual de estoque: Produto X -2"`
- `"Ajuste de estoque: Produto X 10 → 7"`
- Entidade: `"product"` (para entrada/saída/ajuste)
- Entidade: `"stock_movement"` (alternativa, se preferir granularidade)

---

## 9. Segurança

- ✅ Todas as rotas exigem login + módulo inventory ativo
- ✅ Usa tenantPrisma/RLS em todas as queries
- ✅ Usa `$transaction` para atomicidade (Product + StockMovement)
- ✅ Saída protege contra estoque negativo com `updateMany + count`
- ✅ Validação Zod em todos os endpoints
- ✅ Não expõe dados entre empresas
- ✅ Preserva baixa automática da OS (não altera stock-deduction.ts)

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Concorrência na entrada/saída | Usa `prisma.$transaction` com `updateMany` + `count` check |
| PUT em Product sem StockMovement | Não alterar o PUT existente agora; futuramente pode ser desabilitado ou auditado |
| Migrar `/estoque` para dashboard sem quebrar links existentes | `/estoque/[id]` e `/estoque/novo` continuam funcionando; lista migra para `/estoque/produtos` |
| Filtro lowStock in-memory | Melhorar query com where clause quando possível; para MVP, funciona |

---

## 11. Como Testar

1. **Dashboard**: Ir para /estoque → ver cards com totais e movimentações recentes
2. **Entrada**: No detalhe do produto, clicar "Entrada" → informar quantidade → estoque incrementa + StockMovement criado
3. **Saída**: Clicar "Saída" → informar quantidade → estoque decrementa + StockMovement criado
4. **Saída insuficiente**: Tentar sair mais do que disponível → erro 409 claro
5. **Ajuste**: Clicar "Ajustar" → informar nova quantidade + descrição → estoque ajustado + StockMovement criado
6. **Movimentações**: Ir para /estoque/movimentacoes → ver lista com filtros
7. **Histórico no produto**: No detalhe do produto → ver seção de histórico
8. **Alerta de estoque baixo**: Produto com quantity <= minStock → badge "Baixo"
9. **Integração OS**: Fechar uma OS com produto → StockMovement com reason SERVICE_ORDER continua funcionando
10. **Build**: `npm run build && npx tsc --noEmit`