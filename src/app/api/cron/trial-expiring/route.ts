import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTrialExpiringEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    // Find subscriptions where trial ends in ~3 days (between 3 and 4 days from now)
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        company: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Also find subscriptions where trial already ended but status is still TRIAL
    const overdueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: {
          lte: now,
        },
      },
      include: {
        company: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const results: Array<{ companyId: string; companyName: string; email: string | null; daysLeft: number; sent: boolean; error?: string }> = [];

    // Process expiring trials
    for (const sub of expiringSubscriptions) {
      const companyEmail = sub.company.email;
      if (!companyEmail) {
        results.push({
          companyId: sub.company.id,
          companyName: sub.company.name,
          email: null,
          daysLeft: 3,
          sent: false,
          error: "Empresa sem email cadastrado",
        });
        continue;
      }

      const result = await sendTrialExpiringEmail(companyEmail, sub.company.name, 3);
      results.push({
        companyId: sub.company.id,
        companyName: sub.company.name,
        email: companyEmail,
        daysLeft: 3,
        sent: result.success,
        error: result.error,
      });
    }

    // Process overdue trials (send "expired" notification)
    for (const sub of overdueSubscriptions) {
      const companyEmail = sub.company.email;
      if (!companyEmail) {
        results.push({
          companyId: sub.company.id,
          companyName: sub.company.name,
          email: null,
          daysLeft: 0,
          sent: false,
          error: "Empresa sem email cadastrado",
        });
        continue;
      }

      const result = await sendTrialExpiringEmail(companyEmail, sub.company.name, 0);
      results.push({
        companyId: sub.company.id,
        companyName: sub.company.name,
        email: companyEmail,
        daysLeft: 0,
        sent: result.success,
        error: result.error,
      });
    }

    return NextResponse.json({
      processed: results.length,
      sent: results.filter((r) => r.sent).length,
      failed: results.filter((r) => !r.sent).length,
      results,
    });
  } catch (error) {
    console.error("Trial expiring cron error:", error);
    return NextResponse.json(
      { error: "Erro ao processar trials expirando" },
      { status: 500 }
    );
  }
}
