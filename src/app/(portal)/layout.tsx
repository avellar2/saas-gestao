export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen mesh-gradient grain">
      <main className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
      <footer className="text-center text-xs text-muted-foreground/60 py-6">
        Powered by Gestor Local
      </footer>
    </div>
  );
}