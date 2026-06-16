import { Suspense } from "react";
import { ClientesContent } from "./ClientesContent";

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <ClientesContent />
    </Suspense>
  );
}
