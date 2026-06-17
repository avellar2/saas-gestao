"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Send, UtensilsCrossed, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
}

interface CategoryGroup {
  name: string;
  items: MenuItem[];
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface MenuContentProps {
  companyName: string;
  companyPhone: string | null;
  companyWhatsapp: string | null;
  slug: string;
  tableToken: string | null;
  tableName: string | null;
  categories: CategoryGroup[];
  uncategorized: MenuItem[];
}

export function MenuContent({
  companyName,
  companyPhone,
  companyWhatsapp,
  slug,
  tableToken,
  tableName,
  categories,
  uncategorized,
}: MenuContentProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"TABLE" | "TAKEAWAY">(
    tableToken ? "TABLE" : "TAKEAWAY"
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItemId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItemId === item.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.menuItemId === menuItemId
            ? { ...ci, quantity: Math.max(0, ci.quantity + delta) }
            : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  }, []);

  const updateItemNotes = useCallback((menuItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((ci) =>
        ci.menuItemId === menuItemId ? { ...ci, notes } : ci
      )
    );
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.menuItemId !== menuItemId));
  }, []);

  async function handleSubmit() {
    if (cart.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/menu/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableToken: tableToken || undefined,
          orderType,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes || undefined,
          })),
          notes: orderNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao enviar pedido");
        return;
      }

      setSuccess(true);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setOrderNotes("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
            <UtensilsCrossed className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Pedido enviado!</h1>
          <p className="text-muted-foreground">
            Seu pedido foi recebido e está sendo preparado.
            {tableName && ` Mesa ${tableName}.`}
          </p>
          <Button onClick={() => setSuccess(false)} variant="outline">
            Fazer novo pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{companyName}</h1>
            <p className="text-xs text-muted-foreground">
              {tableName ? `Mesa ${tableName}` : "Para viagem"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!tableToken && (
              <div className="flex items-center gap-1 text-xs border rounded-lg p-0.5">
                <button
                  onClick={() => setOrderType("TAKEAWAY")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    orderType === "TAKEAWAY"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Store className="h-3.5 w-3.5 inline mr-1" />
                  Viagem
                </button>
                <button
                  onClick={() => setOrderType("TABLE")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    orderType === "TABLE"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 inline mr-1" />
                  Mesa
                </button>
              </div>
            )}
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Categories */}
        {categories.map((cat) => (
          <section key={cat.name}>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              {cat.name}
            </h2>
            <div className="grid gap-3">
              {cat.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={addToCart}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <section>
            <div className="grid gap-3">
              {uncategorized.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={addToCart}
                />
              ))}
            </div>
          </section>
        )}

        {categories.length === 0 && uncategorized.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cardápio vazio no momento.</p>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {showCart && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setShowCart(false)}
        />
      )}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 bg-background border-t rounded-t-xl transition-transform duration-300 ${
          showCart ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "80vh" }}
      >
        <div className="max-w-2xl mx-auto p-4 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Carrinho ({cartCount} itens)
            </h2>
            <button
              onClick={() => setShowCart(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Carrinho vazio. Adicione itens do cardápio.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} cada
                    </p>
                    <input
                      type="text"
                      placeholder="Observações..."
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.menuItemId, e.target.value)}
                      className="mt-1 w-full text-xs rounded-md border border-input bg-transparent px-2 py-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.menuItemId)}
                      className="p-1 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Seu nome (opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
                  />
                  <input
                    type="tel"
                    placeholder="Seu telefone (opcional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-12 rounded-xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/60"
                  />
                  <textarea
                    placeholder="Observações para o pedido..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full min-h-[80px] rounded-xl border border-border/60 bg-background px-4 py-3 text-base shadow-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 resize-y"
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    Total: {formatCurrency(cartTotal)}
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Enviando..." : "Fazer Pedido"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating cart button when cart is hidden */}
      {!showCart && cartCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-20 px-4 max-w-2xl mx-auto">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 px-4 shadow-lg flex items-center justify-between font-medium"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {cartCount} {cartCount === 1 ? "item" : "itens"}
            </span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItemCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
        <p className="text-sm font-semibold mt-1">
          {formatCurrency(item.price)}
        </p>
      </div>
      <button
        onClick={() => onAdd(item)}
        className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title="Adicionar ao carrinho"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
