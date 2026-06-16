import { Suspense } from "react";
import { ExecutivoContent } from "./ExecutivoContent";

export default function ExecutivoPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <ExecutivoContent />
    </Suspense>
  );
}
