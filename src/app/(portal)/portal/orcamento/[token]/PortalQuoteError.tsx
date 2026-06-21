import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface PortalQuoteErrorProps {
  type: "invalid_token" | "not_found";
}

export function PortalQuoteError({ type }: PortalQuoteErrorProps) {
  const title = type === "invalid_token" ? "Link invalido" : "Orcamento nao encontrado";
  const description =
    type === "invalid_token"
      ? "O link acessado e invalido ou esta incompleto."
      : "O orcamento solicitado nao existe ou foi removido.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Entre em contato com a empresa emissora para mais informacoes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
