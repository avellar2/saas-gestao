# Funcionalidades do Gestor Local

> Documento de referência para discussão de melhorias.
> Cada módulo descreve o que faz atualmente.

---

## 1. Clientes

**Rotas:** `/clientes`, `/clientes/novo`, `/clientes/[id]`

**O que faz:**
- CRUD completo de clientes
- Campos: nome, telefone, WhatsApp, e-mail, CPF/CNPJ, endereço, observações
- Listagem com busca por nome/telefone
- Ordenação por nome, data de criação
- Paginação
- Exportar para CSV

---

## 2. Orçamentos

**Rotas:** `/orcamentos`, `/orcamentos/novo`, `/orcamentos/[id]`

**O que faz:**
- CRUD completo de orçamentos
- Itens do orçamento com descrição, quantidade, valor unitário
- Cálculo automático de subtotal, descontos, total
- Status: pendente, aprovado, recusado
- Vinculado a cliente
- Geração de PDF do orçamento
- Notificação por e-mail quando aprovado
- Exportar para CSV

---

## 3. Ordens de Serviço

**Rotas:** `/ordens-servico`, `/ordens-servico/novo`, `/ordens-servico/[id]`

**O que faz:**
- CRUD completo de ordens de serviço
- Itens da OS com descrição, quantidade, valor
- Status: pendente, em_andamento, concluido, cancelado
- Vinculado a cliente
- Descrição do problema e do serviço realizado
- Geração de PDF da OS
- Notificação por e-mail quando concluída
- Exportar para CSV

---

## 4. Estoque

**Rotas:** `/estoque`, `/estoque/novo`, `/estoque/[id]`

**O que faz:**
- CRUD completo de produtos
- Campos: nome, SKU, categoria, quantidade, estoque mínimo, preço de custo, preço de venda, descrição
- Listagem com busca
- Controle de quantidade
- Preço de custo vs preço de venda

**Não faz ainda:**
- Alerta visual de estoque baixo (abaixo do mínimo)
- Movimentação de entrada/saída
- Histórico de movimentações
- Ajuste de estoque

---

## 5. Financeiro

**Rotas:** `/financeiro`, `/financeiro/novo`, `/financeiro/[id]`

**O que faz:**
- CRUD de transações financeiras
- Tipo: receita / despesa
- Categoria, descrição, valor, data de vencimento, data de pagamento
- Status: pendente, pago, atrasado, cancelado
- Vinculado a cliente (opcional)
- Listagem com busca e filtros

**Não faz ainda:**
- Fluxo de caixa (saldo atual)
- Extrato por período
- Contas a pagar / a receber agrupadas
- Conciliação bancária

---

## 6. Agendamento

**Rotas:** `/agendamento`, `/agendamento/novo`, `/agendamento/[id]`

**O que faz:**
- CRUD de agendamentos
- Campos: título, descrição, data, horário, cliente, status
- Status: agendado, confirmado, cancelado, realizado
- Vinculado a cliente

**Não faz ainda:**
- Visualização em calendário
- Notificação de lembrete
- Recorrência (agendamento recorrente)
- Conflito de horários

---

## 7. Catálogo WhatsApp

**Rotas:** `/catalogo`, `/catalogo/novo`, `/catalogo/[id]`

**O que faz:**
- CRUD de itens do catálogo
- Campos: nome, descrição, preço, categoria, imagem (URL)
- Listagem com busca

**Nota:** Módulo marcado como "descontinuado" no roadmap. Pensando em remover.

---

## 8. Cardápio Digital

**Rotas:** `/cardapio`, `/cardapio/novo`, `/cardapio/[id]`

**O que faz:**
- CRUD de itens do cardápio
- Campos: nome, descrição, preço, categoria, imagem (URL)
- Listagem com busca

**Não faz ainda:**
- Upload de imagens (S3/R2)
- Componente ImageUpload integrado
- Visualização pública do cardápio
- Categorias personalizadas
- Destaques e promoções

---

## 9. Relatórios

**Rotas:** `/relatorios`

**O que faz:**
- Relatório de clientes (total, novos no período)
- Relatório de orçamentos (total, aprovados, taxa de conversão)
- Relatório de OS (total, concluídas, taxa de conclusão)
- Relatório financeiro (receitas, despesas, saldo)
- Filtro por período (data inicial / data final)

**Não faz ainda:**
- Gráficos visuais (Recharts)
- Exportar PDF/Excel
- Comparação entre períodos
- Dashboard executivo

---

## 10. Usuários e Permissões

**Rotas:** `/usuarios`, `/usuarios/novo`, `/usuarios/[id]`

**O que faz:**
- CRUD de usuários da empresa
- Campos: nome, e-mail, senha, papel (admin, staff)
- Cada empresa tem seus próprios usuários (isolamento por tenant)
- Papéis: admin (acesso total), staff (acesso limitado)

---

## 11. Autenticação

**Rotas:** `/login`, `/forgot-password`, `/reset-password`

**O que faz:**
- Login com e-mail e senha (NextAuth)
- Esqueci minha senha (envia e-mail com token)
- Reset de senha (token válido por 1 hora)
- Redirecionamento: super admin → `/admin`, empresa → `/dashboard`
- Proteção de rotas via middleware
- Sessão com JWT

---

## 12. Admin (Super Admin)

**Rotas:** `/admin/empresas`, `/admin/modulos`

**O que faz:**
- Listagem de todas as empresas
- Criar/editar empresas
- Gerenciar módulos ativos por empresa
- Visão geral de todas as empresas do sistema

---

## 13. Assinatura / Planos (Stripe)

**O que faz:**
- Integração com Stripe para pagamentos
- Planos: Basic e Pro
- Checkout via Stripe
- Portal de assinatura (gerenciar plano)
- Webhook para eventos de pagamento
- Trial de 14 dias para novas empresas
- Bloqueio de módulos se não tiver acesso
- Notificação de trial expirando (3 dias antes)

---

## 14. Infraestrutura

**O que faz:**
- Deploy automatizado via GitHub Actions
- Docker + Caddy (SSL automático)
- PostgreSQL com RLS (isolamento entre empresas)
- Backup automático do banco (cron diário)
- Sentry para monitoramento de erros
- Notificações por e-mail (Resend)
- Upload de arquivos (local, futuro S3/R2)

---

## 15. Interface

**O que faz:**
- Dark mode
- Responsivo (mobile)
- Skeleton screens em listas e detalhes
- Empty states padronizados
- Animações (Framer Motion)
- Tema claro/escuro/sistema
- Componentes shadcn/ui

---

## Resumo do que está "cru" e precisa de melhoria

| Módulo | Prioridade | O que falta |
|--------|-----------|-------------|
| **Estoque** | Alta | Alerta de estoque baixo, movimentação, histórico |
| **Financeiro** | Alta | Fluxo de caixa, extrato, contas a pagar/receber |
| **Relatórios** | Alta | Gráficos, exportar PDF/Excel |
| **Agendamento** | Média | Calendário, notificações, recorrência |
| **Cardápio** | Média | Upload de imagens, visual público |
| **Catálogo** | Baixa | Descontinuado (remover) |
