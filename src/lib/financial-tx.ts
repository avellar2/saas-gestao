/**
 * P05 fix: upsert atômico de transação financeira via SERIALIZABLE.
 *
 * Problema: duas requisições simultâneas podem ambas encontrar existingTx=null
 * e criar duas transações, inflando receita.
 *
 * Solução sem migration: usar SERIALIZABLE isolation. Postgres detecta conflito
 * de escrita e aborta a 2ª transação com erro 40001. Retry resolve.
 *
 * Sem precisar de unique constraint (sem migration).
 */

import { prisma, tenantPrisma } from "./prisma";

const MAX_RETRIES = 3;

export interface UpsertFinancialTxInput {
  companyId: string;
  serviceOrderId?: string;
  menuOrderId?: string;
  type: "RECEIVABLE" | "PAYABLE";
  description: string;
  category: string | null;
  amount: number;
  customerId: string | null;
  status: "PENDING" | "PAID" | "PARTIAL" | "CANCELLED" | "OVERDUE";
  paidAt: Date | null;
  dueDate: Date | null;
  notes: string | null;
  // Para cancelamento: filtra tx canceladas existentes
  ignoreCancelled?: boolean;
}

export interface UpsertFinancialTxResult {
  id: string;
  created: boolean;
  cancelled: boolean;
}

/**
 * Faz upsert de transação financeira com isolamento SERIALIZABLE.
 *
 * Comportamento:
 * 1. Procura transação ativa (não cancelada) para o serviceOrderId/menuOrderId
 * 2. Se status=CANCELLED, marca a tx existente como cancelada (ou cria uma nova cancelada)
 * 3. Caso contrário, atualiza ou cria nova tx
 *
 * Em caso de conflito de serialização, retry até MAX_RETRIES.
 */
export async function upsertFinancialTx(
  input: UpsertFinancialTxInput
): Promise<UpsertFinancialTxResult | null> {
  const tenant = tenantPrisma(input.companyId);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Garante o contexto RLS dentro da transação
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.current_company_id', $1, true)`,
            input.companyId
          );

          const where: Record<string, unknown> = {
            companyId: input.companyId,
          };
          if (input.serviceOrderId) where.serviceOrderId = input.serviceOrderId;
          if (input.menuOrderId) where.menuOrderId = input.menuOrderId;
          if (input.ignoreCancelled) {
            where.status = { not: "CANCELLED" };
          }

          const existing = await tx.financialTransaction.findFirst({
            where,
            orderBy: { createdAt: "desc" },
          });

          if (input.status === "CANCELLED") {
            if (existing && !input.ignoreCancelled) {
              // Cancela a tx existente
              const cancelled = await tx.financialTransaction.update({
                where: { id: existing.id },
                data: { status: "CANCELLED" },
              });
              return { id: cancelled.id, created: false, cancelled: true };
            }
            // Sem tx para cancelar — não criar nova (não é o objetivo)
            return null;
          }

          if (existing && !input.ignoreCancelled) {
            // Atualiza a tx existente
            const updated = await tx.financialTransaction.update({
              where: { id: existing.id },
              data: {
                type: input.type,
                description: input.description,
                category: input.category,
                amount: input.amount,
                customerId: input.customerId,
                status: input.status,
                paidAt: input.paidAt,
                dueDate: input.dueDate,
                notes: input.notes,
              },
            });
            return { id: updated.id, created: false, cancelled: false };
          }

          // Cria nova tx
          const created = await tx.financialTransaction.create({
            data: {
              companyId: input.companyId,
              type: input.type,
              description: input.description,
              category: input.category,
              amount: input.amount,
              customerId: input.customerId,
              status: input.status,
              paidAt: input.paidAt,
              dueDate: input.dueDate,
              notes: input.notes,
              serviceOrderId: input.serviceOrderId,
              menuOrderId: input.menuOrderId,
            },
          });
          return { id: created.id, created: true, cancelled: false };
        },
        { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 }
      );
    } catch (err: unknown) {
      // Postgres serialization failure: 40001
      if (
        err instanceof Error &&
        (err.message.includes("40001") ||
          err.message.includes("could not serialize") ||
          err.message.includes("serialization failure"))
      ) {
        // Retry
        continue;
      }
      throw err;
    }
  }
  throw new Error("Falha ao persistir transação financeira após múltiplas tentativas");
}
