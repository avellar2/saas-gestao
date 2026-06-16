import { z } from "zod";

// ─── Clientes ──────────────────────────────────────────────────────
export const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  cpfCnpj: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

// ─── Orçamentos ─────────────────────────────────────────────────────
export const quoteItemSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.coerce.number().positive("Quantidade deve ser positiva"),
  unitPrice: z.coerce.number().nonnegative("Preço não pode ser negativo"),
});

export const quoteSchema = z.object({
  customerId: z.string().min(1, "Cliente é obrigatório"),
  items: z.array(quoteItemSchema).min(1, "Adicione pelo menos um item"),
  discount: z.coerce.number().nonnegative("Desconto não pode ser negativo").optional().default(0),
  notes: z.string().optional().or(z.literal("")),
  validUntil: z.string().optional().or(z.literal("")),
});

export const quoteUpdateSchema = quoteSchema.partial();

// ─── Ordens de Serviço ─────────────────────────────────────────────
export const serviceOrderPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const paymentMethodSchema = z.enum(["CASH", "PIX", "CARD", "TRANSFER", "OTHER"]);

export const osItemSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  quantity: z.coerce.number().positive("Quantidade deve ser positiva"),
  unitPrice: z.coerce.number().nonnegative("Preço não pode ser negativo"),
});

export const osSchema = z.object({
  customerId: z.string().min(1, "Cliente é obrigatório"),
  quoteId: z.string().optional().or(z.literal("")),
  problemDescription: z.string().optional().or(z.literal("")),
  serviceDescription: z.string().optional().or(z.literal("")),
  equipmentName: z.string().optional().or(z.literal("")),
  equipmentBrand: z.string().optional().or(z.literal("")),
  equipmentModel: z.string().optional().or(z.literal("")),
  serialNumber: z.string().optional().or(z.literal("")),
  accessories: z.string().optional().or(z.literal("")),
  priority: serviceOrderPrioritySchema.optional().default("NORMAL"),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  warrantyEnabled: z.coerce.boolean().optional().default(false),
  warrantyTerms: z.string().optional().or(z.literal("")),
  internalNotes: z.string().optional().or(z.literal("")),
  customerNotes: z.string().optional().or(z.literal("")),
  items: z.array(osItemSchema).optional().default([]),
  notes: z.string().optional().or(z.literal("")),
});

export const osUpdateSchema = osSchema.partial();

export const closeServiceOrderSchema = z.object({
  finalStatus: z.enum(["READY", "DELIVERED", "COMPLETED"], {
    message: "Status final inválido",
  }),
  finalAmount: z.coerce.number().nonnegative("Valor final não pode ser negativo"),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID", "CANCELLED"], {
    message: "Status de pagamento inválido",
  }),
  paymentMethod: z.enum(["CASH", "PIX", "CARD", "TRANSFER", "OTHER"]).optional().nullable(),
  completedAt: z.string().min(1, "Data de conclusão é obrigatória"),
  serviceDescription: z.string().optional().default(""),
  customerNotes: z.string().optional().default(""),
  warrantyEnabled: z.coerce.boolean(),
  warrantyStartDate: z.string().optional().default(""),
  warrantyEndDate: z.string().optional().default(""),
  warrantyTerms: z.string().optional().default(""),
  sendEmail: z.coerce.boolean().optional().default(true),
});

// ─── Produtos (Estoque) ────────────────────────────────────────────
export const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().optional().or(z.literal("")),
  sku: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  quantity: z.coerce.number().nonnegative("Quantidade não pode ser negativa"),
  minStock: z.coerce.number().nonnegative("Estoque mínimo não pode ser negativo"),
  costPrice: z.coerce.number().nonnegative("Preço de custo não pode ser negativo").optional().default(0),
  salePrice: z.coerce.number().nonnegative("Preço de venda não pode ser negativo"),
});

export const productUpdateSchema = productSchema.partial();

// ─── Transações Financeiras ────────────────────────────────────────
export const financialTransactionSchema = z.object({
  type: z.enum(["RECEIVABLE", "PAYABLE"], { message: "Tipo deve ser RECEIVABLE ou PAYABLE" }),
  description: z.string().min(1, "Descrição é obrigatória").max(300),
  category: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  dueDate: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  paidAt: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const financialTransactionUpdateSchema = financialTransactionSchema.partial();

// ─── Agendamentos ──────────────────────────────────────────────────
export const appointmentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().optional().or(z.literal("")),
  dateTime: z.string().min(1, "Data e hora são obrigatórias"),
  duration: z.coerce.number().positive("Duração deve ser positiva"),
  status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  customerId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const appointmentUpdateSchema = appointmentSchema.partial();

// ─── Catálogo ──────────────────────────────────────────────────────
export const catalogItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().optional().or(z.literal("")),
  price: z.coerce.number().nonnegative("Preço não pode ser negativo"),
  category: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
});

export const catalogItemUpdateSchema = catalogItemSchema.partial();

// ─── Cardápio ──────────────────────────────────────────────────────
export const menuItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  description: z.string().optional().or(z.literal("")),
  price: z.coerce.number().nonnegative("Preço não pode ser negativo"),
  category: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

export const menuItemUpdateSchema = menuItemSchema.partial();

// ─── Usuários ──────────────────────────────────────────────────────
export const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["COMPANY_ADMIN", "STAFF"], { message: "Função inválida" }),
  active: z.coerce.boolean().optional().default(true),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  role: z.enum(["COMPANY_ADMIN", "STAFF"]).optional(),
  active: z.coerce.boolean().optional(),
});

// ─── Empresas (Admin) ──────────────────────────────────────────────
export const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  slug: z.string().min(1, "Slug é obrigatório").max(50).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  plan: z.enum(["TRIAL", "ACTIVE", "BLOCKED", "CANCELLED"]).optional(),
  trialEndsAt: z.string().optional().or(z.literal("")),
});

// ─── Atividades ────────────────────────────────────────────────────
export const activitySchema = z.object({
  action: z.string().min(1, "Ação é obrigatória").max(100),
  entity: z.string().min(1).max(50),
  entityId: z.string().min(1),
  details: z.string().optional().or(z.literal("")),
});

// ─── Exportar ───────────────────────────────────────────────────────
export const exportSchema = z.object({
  entity: z.enum(["customers", "quotes", "service_orders", "products", "financial", "appointments", "catalog", "menu"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});