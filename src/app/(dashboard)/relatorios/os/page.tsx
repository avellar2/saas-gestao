import { Suspense } from "react";
import { OSContent } from "./OSContent";

export default function OSPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Carregando...</div>}>
      <OSContent />
    </Suspense>
  );
}
