import { Suspense } from "react";
import { FinanceiroContent } from "./FinanceiroContent";

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <FinanceiroContent />
    </Suspense>
  );
}
