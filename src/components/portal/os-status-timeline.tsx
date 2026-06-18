"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { SERVICE_ORDER_STATUS, getStatusLabel } from "@/lib/os-status";
import { PORTAL_STATUS_ORDER } from "@/lib/portal";
import type { ServiceOrderStatus } from "@/generated/prisma/client";

interface OsStatusTimelineProps {
  currentStatus: ServiceOrderStatus;
}

export function OsStatusTimeline({ currentStatus }: OsStatusTimelineProps) {
  if (currentStatus === "CANCELLED") {
    return (
      <div className="flex items-center justify-center py-3">
        <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Ordem Cancelada
        </span>
      </div>
    );
  }

  const statusLabels = Object.fromEntries(
    SERVICE_ORDER_STATUS.map((s) => [s.value, s.label])
  );

  const currentIndex = PORTAL_STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full overflow-x-auto pb-2">
      {/* Desktop: horizontal timeline */}
      <div className="hidden sm:flex items-center justify-between min-w-[600px]">
        {PORTAL_STATUS_ORDER.map((status, index) => {
          const reached = index <= currentIndex;
          const current = index === currentIndex;
          const variant = SERVICE_ORDER_STATUS.find((s) => s.value === status)?.variant ?? "";

          return (
            <div key={status} className="flex items-center flex-1">
              {/* Step dot */}
              <div className="flex flex-col items-center">
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    reached
                      ? current
                        ? "border-primary bg-primary text-white shadow-lg shadow-primary/25"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground/40"
                  }`}
                >
                  {reached && !current && (
                    <Check className="h-4 w-4" />
                  )}
                  {current && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                  {current && (
                    <span className="absolute inset-0 rounded-full animate-pulse border-2 border-primary/50" />
                  )}
                </m.div>
                <span
                  className={`mt-1.5 text-xs font-medium text-center leading-tight ${
                    reached
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {statusLabels[status]}
                </span>
              </div>

              {/* Connector line */}
              {index < PORTAL_STATUS_ORDER.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mt-[-20px]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      index < currentIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="flex sm:hidden flex-col gap-2">
        {PORTAL_STATUS_ORDER.map((status, index) => {
          const reached = index <= currentIndex;
          const current = index === currentIndex;

          return (
            <div key={status} className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    reached
                      ? current
                        ? "border-primary bg-primary text-white"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground/40"
                  }`}
                >
                  {reached && !current && <Check className="h-3.5 w-3.5" />}
                  {current && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </m.div>
                {index < PORTAL_STATUS_ORDER.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 my-0.5 min-h-[12px] ${
                      index < currentIndex
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm font-medium ${
                  reached ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                {statusLabels[status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}