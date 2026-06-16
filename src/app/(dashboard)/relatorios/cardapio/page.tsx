import { Suspense } from "react";
import { CardapioContent } from "./CardapioContent";

export default function CardapioPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <CardapioContent />
    </Suspense>
  );
}
