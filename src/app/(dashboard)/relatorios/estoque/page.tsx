import { Suspense } from "react";
import { EstoqueContent } from "./EstoqueContent";

export default function EstoquePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <EstoqueContent />
    </Suspense>
  );
}
