"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in development
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 grain">
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Algo deu errado
        </h1>
        <p className="text-muted-foreground mb-6">
          Ocorreu um erro inesperado. Tente recarregar a pagina.
        </p>
        <div className="flex justify-center gap-3">
          <m.div whileTap={{ scale: 0.97 }}>
            <Button onClick={reset} className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </m.div>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground/50 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </m.div>
    </div>
  );
}
