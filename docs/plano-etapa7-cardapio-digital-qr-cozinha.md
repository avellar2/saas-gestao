# Etapa 7 — Cardapio Digital QR + Cozinha

## Plano de Implementacao

---

## 1. Estado Atual do Modulo

### O que ja existe

| Recurso | Status |
|---------|--------|
| Model `MenuItem` no Prisma | Pronto (campos: id, companyId, name, description, price, category, imageUrl, active, sortOrder) |
| API CRUD `/api/cardapio` e `/api/cardapio/[id]` | Pronto (GET, POST, PUT, DELETE com module-guard, trial limits, activity log) |
| Paginas `/cardapio`, `/cardapio/novo`, `/cardapio/[id]` | Pronto (listagem, criacao, edicao, exclusao) |
| Componente `CardapioForm` | Pronto |
| `MenuItem` em `TENANT_MODELS` | Pronto |
| ActivityLog com entity `"menu"` | Pronto |
| Module guard `checkModuleAccess(companyId, "menu")` | Pronto |
| Trial limit: 20 itens | Pronto |

### O que NAO existe

| Recurso | Status |
|---------|--------|
| Campo `slug` no model Company | NAO existe — necessario para URLs publicas |
| Model `RestaurantTable` (mesas) | NAO existe |
| Model `MenuOrder` (pedidos) | NAO existe |
| Model `MenuOrderItem` (itens do pedido) | NAO existe |
| Rota publica `/c/[slug]` (cardapio do cliente) | NAO existe |
| API publica de pedidos | NAO existe |
| Painel da cozinha | NAO existe |
| QR Code | NAO existe (nenhuma lib instalada) |
| Modulo `menu` como `active` | NAO — atualmente `coming_soon` |

### Lib QR Code

Nenhuma biblioteca de QR Code esta instalada. Recomendacao:

**`qrcode.react`** (`react-qr-code` e a marca do npm)

- Leve (~5KB gzipped)
- React-native, sem canvas/SVG
- Suporta SVG (escalavel para impressao)
- Sem dependencias pesadas
- Instalacao: `npm install qrcode.react`

Alternativa: `react-qr-code` (pacote diferente, mesma ideia) — mas `qrcode.react` e mais popular e mantida.

---

## 2. Novos Models Prisma

### 2.1 Campo `slug` no Company

```prisma
model Company {
  // ... campos existentes ...
  slug        String?    @unique          // NOVO — para URLs publicas
  // ... restante ...
}
```

**Por que `String?` (opcional)?**
- Empresas existentes nao terao slug automaticamente
- O slug sera gerado na ativacao do modulo menu ou na configuracao
- Evita migration quebra em dados existentes

### 2.2 Model RestaurantTable (Mesas)

```prisma
model RestaurantTable {
  id        String   @id @default(cuid())
  companyId String
  name      String                        // "Mesa 1", "Mesa 2", "Balcao"
  token     String   @unique               // token opaco para QR Code
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  orders    MenuOrder[]

  @@index([companyId])
  @@index([token])
  @@map("restaurant_tables")
}
```

**Por que `token` unico?**
- O token e o identificador publico da mesa na URL
- Opaco (cuid ou uuid) — nao vaza informacoes internas
- Diferente do `id` — se necessario, pode ser regenerado sem afetar relacoes

### 2.3 Enums para pedidos

```prisma
enum MenuOrderType {
  TABLE       // Na mesa
  TAKEAWAY    // Para viagem
}

enum MenuOrderStatus {
  RECEIVED    // Recebido
  PREPARING   // Em preparo
  READY       // Pronto
  DELIVERED   // Entregue
  CANCELLED   // Cancelado
}
```

### 2.4 Model MenuOrder (Pedido)

```prisma
model MenuOrder {
  id           String          @id @default(cuid())
  companyId    String
  tableId      String?                            // null se TAKEAWAY
  customerName String?
  customerPhone String?
  orderType    MenuOrderType
  status       MenuOrderStatus @default(RECEIVED)
  total        Decimal         @db.Decimal(10, 2)
  notes        String?
  orderNumber  Int                                // Sequencial por empresa (1, 2, 3...)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  table       RestaurantTable? @relation(fields: [tableId], references: [id], onDelete: SetNull)
  items       MenuOrderItem[]

  @@index([companyId])
  @@index([status])
  @@index([companyId, orderNumber])
  @@map("menu_orders")
}
```

**`orderNumber` vs `id`:**
- `orderNumber` e sequencial por empresa (legivel: "Pedido #1", "Pedido #2")
- `id` e o cuid interno — nunca exposto ao cliente publico
- `orderNumber` facilita comunicacao com a cozinha: "pedido 42 esta pronto"

### 2.5 Model MenuOrderItem (Item do Pedido)

```prisma
model MenuOrderItem {
  id           String   @id @default(cuid())
  orderId      String
  menuItemId   String?                        // null se item foi removido do cardapio
  nameSnapshot String                          // snapshot do nome no momento do pedido
  priceSnapshot Decimal @db.Decimal(10, 2)     // snapshot do preco no momento do pedido
  quantity     Int
  notes        String?
  total        Decimal  @db.Decimal(10, 2)     // priceSnapshot * quantity

  order        MenuOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItem     MenuItem?  @relation(fields: [menuItemId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([menuItemId])
  @@map("menu_order_items")
}
```

**Por que snapshot?**
- Se o restaurante mudar o preco ou nome do item, pedidos antigos mantem o valor original
- `menuItemId` com `onDelete: SetNull` — se item for apagado, pedido preserva dados via snapshot

### 2.6 Relacoes adicionadas em models existentes

```prisma
// Company
slug              String?          @unique
restaurantTables  RestaurantTable[]
menuOrders        MenuOrder[]

// MenuItem
orderItems        MenuOrderItem[]

// RestaurantTable (ja descrito acima)

// Adicionar a TENANT_MODELS:
"RestaurantTable"
"MenuOrder"
"MenuOrderItem"
```

---

## 3. Rotas Publicas

### 3.1 Cardapio publico (visualizacao)

**Rota:** `/c/[slug]`

Exemplo: `https://app.gestor.local/c/restaurante-do-joao`

**Por que `/c/` e nao `/menu/` ou `/cardapio/`?**
- `/cardapio/` ja e rota autenticada do dashboard — conflito
- `/menu/` em ingles nao combina com o resto do app em PT
- `/c/` e curto, limpo, facil de colocar em QR Code
- Nao conflita com nenhuma rota existente

**Middleware:** Adicionar `pathname.startsWith("/c/")` na lista de rotas publicas

**Comportamento:**
1. Busca empresa pelo `slug`
2. Verifica se modulo `menu` esta ativo
3. Busca itens ativos (`active: true`) agrupados por categoria
4. Identifica mesa pelo `?table=TOKEN` se presente na URL
5. Renderiza cardapio responsivo com carrinho lateral

**Page:** `src/app/(public)/c/[slug]/page.tsx` — Server Component
- Busca dados com `prisma` (global, sem RLS — resolve por slug)
- Passa dados para client component do carrinho

**Client Component:** `src/app/(public)/c/[slug]/MenuContent.tsx`
- Carrinho em estado local (useState)
- Botao "Fazer Pedido" abre formulario de nome/telefone/observacoes
- Se mesa identificada, pedido e tipo TABLE automaticamente
- Se sem mesa, usuario escolhe "Para viagem"

### 3.2 API publica de pedidos

**Rota:** `POST /api/public/menu/[slug]/orders`

**Middleware:** Ja coberto — `/api/public` e publico

**Comportamento:**
1. Resolve empresa pelo `slug`
2. Verifica modulo `menu` ativo
3. Valida itens enviados (existem, estao ativos, pertencem a empresa)
4. **Calcula total no servidor** — NAO confia no total do frontend
5. Valida mesa (se `tableId` informado, verifica token e se pertence a empresa)
6. Gera `orderNumber` sequencial (ultimo orderNumber da empresa + 1)
7. Cria pedido com status `RECEIVED`
8. Registra ActivityLog (sem userId — pedido publico)
9. Retorna pedido criado (sanitizado — sem dados internos)

**Validacao de preco:**
```
Para cada item no payload:
  1. Buscar MenuItem pelo id
  2. Verificar se active = true
  3. Verificar se pertence a companyId correta
  4. Usar price do banco (NUNCA do payload)
  5. Calcular: itemTotal = dbPrice * quantity
Total = soma de todos itemTotal
```

**Rate limiting:** Ja existe 100 req/min por IP no middleware — suficiente para pedidos

---

## 4. Rotas Autenticadas (Cozinha e Gestao)

### 4.1 Pedidos da cozinha

**Rota:** `GET /api/cardapio/pedidos`

- Lista pedidos da empresa, filtrado por status
- Suporta `?status=RECEIVED,PREPARING` para filtrar
- Ordenado por `createdAt asc` (mais antigo primeiro)
- Inclui items com snapshot e mesa (se houver)

**Rota:** `PATCH /api/cardapio/pedidos/[id]/status`

- Atualiza status do pedido
- Transicoes validadas:
  - RECEIVED → PREPARING
  - PREPARING → READY
  - READY → DELIVERED
  - Qualquer → CANCELLED
- Nao permite voltar status (ex: READY → PREPARING)
- Registra ActivityLog

### 4.2 Mesas (CRUD)

**Rota:** `GET /api/cardapio/mesas`

- Lista mesas da empresa
- Inclui contagem de pedidos ativos por mesa

**Rota:** `POST /api/cardapio/mesas`

- Cria mesa com nome e token gerado automaticamente
- Verifica trial limits (limite sugerido: 30 mesas trial, ilimitado active)

**Rota:** `PUT /api/cardapio/mesas/[id]`

- Atualiza nome e active da mesa
- Desativar mesa nao cancela pedidos existentes

**Rota:** `DELETE /api/cardapio/mesas/[id]`

- Remove mesa (soft delete via `active: false` ou hard delete)
- Pedidos com `tableId` apontando para esta mesa ficam com `tableId: null`

### 4.3 Configuracao do slug

**Rota:** `PUT /api/cardapio/config`

- Permite configurar o slug da empresa para o cardapio publico
- Valida formato: `^[a-z0-9-]+$`, unico
- Verifica se slug ja esta em uso por outra empresa

---

## 5. Painel Administrativo — Abas

### Estrutura proposta

Rota base: `/cardapio`

Abas via Tabs component (shadcn/ui Tabs):

| Aba | Rota | Conteudo |
|-----|------|----------|
| **Itens do Cardapio** | `/cardapio` (atual) | Listagem CRUD existente (mantida como esta) |
| **Mesas / QR Code** | `/cardapio/mesas` | Gestao de mesas + QR Codes |
| **Cozinha** | `/cardapio/cozinha` | Kanban de pedidos |
| **Pedidos** | `/cardapio/pedidos` | Historico completo de pedidos |
| **Configurar** | `/cardapio/config` | Slug do cardapio publico + link de compartilhamento |

### 5.1 Aba "Mesas / QR Code"

`/cardapio/mesas` — `src/app/(dashboard)/cardapio/mesas/page.tsx`

- Lista de mesas em cards
- Cada card mostra: nome, status (ativo/inativo), QR Code gerado
- Botao "Nova Mesa" abre dialog para criar
- Botao "Editar" permite alterar nome
- Botao "Desativar/Ativar" toggle
- QR Code renderizado com `qrcode.react` — SVG para impressao
- Link publico: `/c/[slug]?table=[token]`
- Botao "Copiar Link" e "Baixar QR Code" (baixar SVG)

### 5.2 Aba "Cozinha"

`/cardapio/cozinha` — `src/app/(dashboard)/cardapio/cozinha/page.tsx`

Layout em 4 colunas (Kanban):

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  RECEBIDO    │ │  EM PREPARO  │ │  PRONTO      │ │  ENTREGUE/CANCEL.│
│              │ │              │ │              │ │                  │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────────┐ │
│ │ #42      │ │ │ │ #40      │ │ │ │ #38      │ │ │ │ #35 ENTREGUE │ │
│ │ Mesa 3   │ │ │ │ Viagem   │ │ │ │ Mesa 1  │ │ │ │ #36 CANCELADO │ │
│ │ 3 itens  │ │ │ │ 2 itens  │ │ │ │ 1 item   │ │ │ │              │ │
│ │ R$ 45,00 │ │ │ │ R$ 32,00 │ │ │ │ R$ 15,00│ │ │ │              │ │
│ │ 14:32    │ │ │ │ 14:20    │ │ │ │ 14:10   │ │ │ │              │ │
│ │[▶ Preparo]│ │ │ │[✓ Pronto]│ │ │ │[✓ Entr.]│ │ │ │              │ │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │ │ └──────────────┘ │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘
```

Cada card de pedido mostra:
- Numero do pedido (`#42`)
- Mesa ou "Para viagem"
- Quantidade de itens
- Total
- Hora do pedido (relativo: "ha 5 min")
- Observacoes (se houver)
- Botao de acao (mudar status)

**Atualizacao:** Polling a cada 15 segundos (simples, sem WebSocket)

**Client Component:** `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx`
- Usa `setInterval` para buscar pedidos a cada 15s
- Colunas renderizadas com grid CSS (grid-cols-4)
- Cada coluna filtra pedidos pelo status correspondente
- DELIVERED e CANCELLED na mesma coluna (ultimos 20, para historico)

### 5.3 Aba "Pedidos"

`/cardapio/pedidos` — `src/app/(dashboard)/cardapio/pedidos/page.tsx`

- Historico completo de pedidos
- Filtros: status, mesa, data, tipo (mesa/viagem)
- Tabela com: numero, tipo, mesa, cliente, total, status, hora
- Clique no pedido expande para ver itens
- Permite cancelar pedido daqui tambem

### 5.4 Aba "Configurar"

`/cardapio/config` — `src/app/(dashboard)/cardapio/config/page.tsx`

- Campo para definir/editar slug do cardapio publico
- Preview do link: `https://app.gestor.local/c/[slug]`
- Botao "Copiar Link do Cardapio"
- Instrucoes de uso (como compartilhar, como gerar QR)

---

## 6. Fluxo do Pedido (End-to-End)

```
1. Cliente escaneia QR Code na mesa
   → URL: /c/restaurante-joao?table=abc123token

2. Cardapio carrega (sem login)
   → Busca empresa por slug
   → Busca itens ativos agrupados por categoria
   → Identifica mesa pelo token

3. Cliente navega pelo cardapio
   → Adiciona itens ao carrinho (client-side state)
   → Ve total calculado no frontend (informativo)

4. Cliente envia pedido
   → POST /api/public/menu/[slug]/orders
   → Payload: { tableToken?, customerName?, customerPhone?, orderType, items: [{menuItemId, quantity, notes?}], notes? }

5. Servidor valida e cria pedido
   → Resolve empresa por slug
   → Verifica modulo ativo
   → Valida cada item (existe, ativo, pertence a empresa)
   → Calcula total com precos do banco
   → Valida mesa (se tableToken informado)
   → Gera orderNumber sequencial
   → Cria MenuOrder + MenuOrderItems
   → Status: RECEIVED
   → Retorna pedido sanitizado

6. Cozinha ve pedido na coluna "Recebido"
   → Polling a cada 15s
   → Card mostra: #N, Mesa/Viagem, itens, total, hora

7. Cozinha inicia preparo
   → PATCH /api/cardapio/pedidos/[id]/status { status: "PREPARING" }
   → Card move para coluna "Em preparo"

8. Cozinha marca como pronto
   → PATCH /api/cardapio/pedidos/[id]/status { status: "READY" }
   → Card move para coluna "Pronto"

9. Cozinha marca como entregue
   → PATCH /api/cardapio/pedidos/[id]/status { status: "DELIVERED" }
   → Card move para coluna "Entregue/Cancelado"
```

---

## 7. Arquivos que Serao Alterados/Criados

### Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `prisma/schema.prisma` | Adicionar `slug` em Company, criar `RestaurantTable`, `MenuOrder`, `MenuOrderItem`, enums `MenuOrderType`, `MenuOrderStatus`, relacoes |
| `src/lib/prisma.ts` | Adicionar `"RestaurantTable"`, `"MenuOrder"`, `"MenuOrderItem"` a TENANT_MODELS |
| `src/lib/activity-log.ts` | Adicionar `"menu_order"` e `"restaurant_table"` ao entity union type |
| `src/lib/modules.ts` | Mudar status do `menu` de `"coming_soon"` para `"active"`. Adicionar novas rotas em routes |
| `src/middleware.ts` | Adicionar `pathname.startsWith("/c/")` na lista de rotas publicas |
| `src/lib/validations.ts` | Adicionar schemas para RestaurantTable, MenuOrder, slug |
| `src/lib/company-limits.ts` | Adicionar `restaurantTables: 30` (trial) |
| `src/app/(dashboard)/cardapio/page.tsx` | Transformar em layout com abas (Tabs) |
| `package.json` | Adicionar dependencia `qrcode.react` |

### Criados

| Arquivo | Proposito |
|---------|-----------|
| `prisma/migrations/YYYYMMDD_add_menu_orders_and_tables/migration.sql` | Migration auto-gerada |
| `src/app/(public)/c/[slug]/page.tsx` | Pagina publica do cardapio (Server Component) |
| `src/app/(public)/c/[slug]/MenuContent.tsx` | Client component do cardapio + carrinho |
| `src/app/(public)/layout.tsx` | Layout publico (sem sidebar, sem auth) |
| `src/app/api/public/menu/[slug]/route.ts` | API publica: GET cardapio por slug |
| `src/app/api/public/menu/[slug]/orders/route.ts` | API publica: POST criar pedido |
| `src/app/api/cardapio/pedidos/route.ts` | API autenticada: GET listar pedidos |
| `src/app/api/cardapio/pedidos/[id]/status/route.ts` | API autenticada: PATCH atualizar status |
| `src/app/api/cardapio/mesas/route.ts` | API autenticada: GET + POST mesas |
| `src/app/api/cardapio/mesas/[id]/route.ts` | API autenticada: PUT + DELETE mesa |
| `src/app/api/cardapio/config/route.ts` | API autenticada: GET + PUT slug/config |
| `src/app/(dashboard)/cardapio/mesas/page.tsx` | Pagina Mesas + QR Code |
| `src/app/(dashboard)/cardapio/mesas/MesasContent.tsx` | Client component mesas |
| `src/app/(dashboard)/cardapio/cozinha/page.tsx` | Pagina Cozinha |
| `src/app/(dashboard)/cardapio/cozinha/CozinhaContent.tsx` | Client component cozinha (kanban) |
| `src/app/(dashboard)/cardapio/pedidos/page.tsx` | Pagina Historico Pedidos |
| `src/app/(dashboard)/cardapio/pedidos/PedidosContent.tsx` | Client component pedidos |
| `src/app/(dashboard)/cardapio/config/page.tsx` | Pagina Config slug |
| `src/app/(dashboard)/cardapio/config/ConfigContent.tsx` | Client component config |
| `src/lib/menu-helpers.ts` | Helpers: gerar token de mesa, gerar orderNumber, sanitizar pedido publico |

---

## 8. Layout do Cardapio Publico (Cliente)

```
┌───────────────────────────────────────────────────────┐
│  🍽️  Restaurante do Joao        Mesa 3  │  Para viagem │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ── Entradas ─────────────────────────────────────────│
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │  📷     │  │  📷     │  │  📷     │               │
│  │ Bruschetta│  │ Carpaccio│  │ Caesar  │               │
│  │ R$ 28,00 │  │ R$ 35,00 │  │ R$ 32,00│               │
│  │ [   +   ]│  │ [   +   ]│  │ [   +   ]│               │
│  └─────────┘  └─────────┘  └─────────┘               │
│                                                       │
│  ── Pratos Principais ────────────────────────────────│
│  ┌─────────┐  ┌─────────┐                             │
│  │  📷     │  │  📷     │                             │
│  │ Filet    │  │ Risoto   │                             │
│  │ R$ 65,00 │  │ R$ 55,00│                             │
│  │ [   +   ]│  │ [   +   ]│                             │
│  └─────────┘  └─────────┘                             │
│                                                       │
├───────────────────────────────────────────────────────┤
│  🛒 Carrinho (2 itens)              Total: R$ 93,00   │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Bruschetta  x1          R$ 28,00    [-][1][+]   │ │
│  │ Filet        x1          R$ 65,00    [-][1][+]   │ │
│  ├──────────────────────────────────────────────────┤ │
│  │ Observacoes: [_______________________________]   │ │
│  │ Nome: [_______________]  Tel: [______________]   │ │
│  │                                                  │ │
│  │              [ 🛒 Fazer Pedido ]                 │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

Mobile-first: 1 coluna de itens, carrinho como bottom sheet ou fixo no rodape.

---

## 9. Seguranca

| Aspecto | Implementacao |
|---------|--------------|
| Cardapio publico so mostra itens ativos | `where: { active: true }` na query |
| Pedido nao expoe dados internos | Sanitizacao: nao retorna companyId, id interno, etc. |
| Total calculado no backend | Precos vem do banco, nao do payload |
| Validacao de itens | Verifica se item existe, esta ativo e pertence a empresa |
| Validacao de mesa | Token verificado contra a empresa |
| Cozinha requer login | Rotas `/api/cardapio/pedidos` e `/cozinha` protegidas por auth + module-guard |
| Rate limiting | 100 req/min por IP (middleware) |
| Slug unico | Constraint `@unique` no banco |
| Token de mesa opaco | Cuid/uuid — nao vaza informacao |

---

## 10. ActivityLog

| Evento | Action | Entity | Details |
|--------|--------|--------|---------|
| Pedido criado (publico) | CREATE | menu_order | `Pedido #[N] — [TABLE/TAKEAWAY] — [Mesa X / Viagem] — R$ [total]` |
| Status alterado | UPDATE | menu_order | `Pedido #[N]: [statusAnterior] → [novoStatus]` |
| Pedido cancelado | UPDATE | menu_order | `Pedido #[N] cancelado` |
| Mesa criada | CREATE | restaurant_table | `Mesa: [nome]` |
| Mesa desativada | UPDATE | restaurant_table | `Mesa: [nome] desativada` |
| Mesa editada | UPDATE | restaurant_table | `Mesa: [nome]` |
| Slug configurado | UPDATE | menu | `Slug: [slug]` |

**Pedidos publicos:** `userId` e `userName` serao `null` ou um valor placeholder como `"public_order"`. O ActivityLog precisa aceitar userId opcional.

---

## 11. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|--------|-----------|
| Slug de empresa ja ocupado | Mediano | Constraint `@unique` + validacao antes de salvar |
| Token de mesa colidindo | Baixo | Token e cuid — colisao praticamente impossivel |
| Race condition no orderNumber | Mediano | Usar `prisma.$transaction` + `findFirst` + `orderBy: { orderNumber: desc }` + incrementar. Alternativa: campo `@unique` composto `[companyId, orderNumber]` |
| Pedidos spam (sem login) | Mediano | Rate limiting por IP (100/min). Sugerir captcha se problema persistir (fora de escopo desta etapa) |
| Migration com slug null em empresas existentes | Baixo | Slug e `String?` — migration roda limpo. Slug sera preenchido ao configurar |
| Polling da cozinha sobrecarregar | Baixo | 15s e conservador. Se necessario, aumentar para 30s |
| MenuItem apagado com pedido referenciando | Baixo | `menuItemId` com `onDelete: SetNull` + snapshot preserva dados |

---

## 12. Ordem de Implementacao

1. **Schema + Migration** — Adicionar models, enums, slug, relacoes
2. **Libs e helpers** — Instalar `qrcode.react`, criar `menu-helpers.ts`
3. **TENANT_MODELS + ActivityLog** — Atualizar prisma.ts e activity-log.ts
4. **Modulo ativo** — Mudar `status: "coming_soon"` → `"active"` em modules.ts
5. **Middleware** — Adicionar `/c/` como rota publica
6. **Validacoes** — Adicionar schemas em validations.ts
7. **Company limits** — Adicionar `restaurantTables: 30`
8. **API publica: cardapio** — `GET /api/public/menu/[slug]` (listar itens ativos)
9. **API publica: pedidos** — `POST /api/public/menu/[slug]/orders`
10. **API autenticada: mesas** — CRUD `/api/cardapio/mesas`
11. **API autenticada: pedidos** — `GET /api/cardapio/pedidos` + `PATCH /api/cardapio/pedidos/[id]/status`
12. **API autenticada: config** — `GET/PUT /api/cardapio/config` (slug)
13. **Pagina publica: cardapio** — `/c/[slug]` + MenuContent com carrinho
14. **Pagina: Mesas/QR** — `/cardapio/mesas`
15. **Pagina: Cozinha** — `/cardapio/cozinha` com kanban
16. **Pagina: Pedidos** — `/cardapio/pedidos`
17. **Pagina: Config** — `/cardapio/config`
18. **Refatorar: pagina cardapio** — Transformar em layout com abas (Tabs)
19. **Build + Typecheck** — `npm run build` + `npx tsc --noEmit`

---

## 13. Como Testar Manualmente

### Pre-requisitos
1. Rodar migration: `npx prisma migrate dev`
2. Empresa de teste precisa ter modulo `menu` ativo
3. Configurar slug para empresa de teste (via /cardapio/config)

### Teste 1: Cardapio publico
1. Acesse `/c/[slug]` sem login
2. Verifique itens ativos agrupados por categoria
3. Adicione itens ao carrinho
4. Verifique total calculado

### Teste 2: Pedido com mesa
1. Crie uma mesa em /cardapio/mesas
2. Escaneie/acesse link com `?table=TOKEN`
3. Faca um pedido
4. Verifique pedido aparece na cozinha como RECEBIDO
5. Verifique mesa associada ao pedido

### Teste 3: Pedido para viagem
1. Acesse `/c/[slug]` sem parametro table
2. Selecione "Para viagem"
3. Faca um pedido
4. Verifique pedido na cozinha

### Teste 4: Cozinha
1. Acesse /cardapio/cozinha
2. Mova pedido de RECEBIDO → PREPARING → READY → DELIVERED
3. Verifique colunas atualizam
4. Verifique ActivityLog

### Teste 5: QR Code
1. Acesse /cardapio/mesas
2. Verifique QR Code gerado para cada mesa
3. Copie link e acesse
4. Baixe QR Code (SVG)

### Teste 6: Seguranca
1. Tente criar pedido com item inativo — deve falhar
2. Tente criar pedido com preco alterado no payload — total deve usar preco do banco
3. Tente acessar cozinha sem login — redirecionado para /login
4. Tente criar pedido para empresa com modulo inativo — deve retornar 403

---

## 14. O que NAO sera implementado nesta etapa

- Pagamento online
- Integracao com Financeiro
- Integracao com Estoque / baixa de ingredientes
- Delivery completo (taxa de entrega, endereco)
- Impressora termica
- WhatsApp automatico real
- Cupom/desconto
- WebSocket (usaremos polling de 15s)
- Notificacao push para cliente quando pedido ficar pronto
- Multi-idioma
- Avaliacao do pedido