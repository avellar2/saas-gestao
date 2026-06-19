"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  Users,
  Package,
  Mail,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";


const leftPanelFeatures = [
  { icon: TrendingUp, label: "Controle financeiro" },
  { icon: Users, label: "Gestão de clientes" },
  { icon: Package, label: "Estoque inteligente" },
  { icon: ShieldCheck, label: "Segurança em primeiro lugar" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ocorreu um erro ao entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[50%] relative overflow-hidden bg-emerald-950">
        {/* Rich gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-950 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/20 via-transparent to-emerald-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-transparent to-emerald-900/40" />

        {/* Mesh grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating orbs */}
        <div
          className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[130px]"
        />
        <div
          className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[150px]"
        />
        <div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px]"
        />

        {/* Floating mock dashboard cards */}
        <div
          className="absolute top-[22%] right-[12%] w-56 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-4 shadow-2xl shadow-black/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Faturamento</span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">R$ 47.350</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-400">+12,5% este mês</span>
          </div>
        </div>

        <div
          className="absolute top-[48%] right-[22%] w-48 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-4 shadow-2xl shadow-black/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-blue-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Clientes</span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">1.248</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[11px] text-white/40">Novos hoje: </span>
            <span className="text-[11px] font-medium text-blue-300">+8</span>
          </div>
        </div>

        <div
          className="absolute top-[68%] right-[8%] w-52 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-4 shadow-2xl shadow-black/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Estoque</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/50">Produtos</span>
              <span className="text-xs font-semibold text-white">342</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[78%] rounded-full bg-amber-400/60" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/50">Alertas</span>
              <span className="text-xs font-semibold text-amber-300">3</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-10"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/15 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Gestor Local</span>
            </div>
          </div>

          <div className="space-y-10 max-w-md">
            <div className="space-y-4">
              <h2 className="text-3xl xl:text-[2.75rem] font-extrabold text-white tracking-tight leading-[1.1]">
                Tudo que sua empresa precisa em um só lugar
              </h2>
              <p className="text-emerald-100/60 text-base leading-relaxed max-w-sm">
                Gestão financeira, controle de estoque, ordens de serviço e muito mais.
                Simples, rápido e feito para crescer com você.
              </p>
            </div>

            {/* Bento feature grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {leftPanelFeatures.map((feature, i) => {
                const colors = [
                  "from-emerald-500/15 to-emerald-500/5 border-emerald-400/15",
                  "from-blue-500/15 to-blue-500/5 border-blue-400/15",
                  "from-amber-500/15 to-amber-500/5 border-amber-400/15",
                  "from-cyan-500/15 to-cyan-500/5 border-cyan-400/15",
                ];
                return (
                  <div
                    key={feature.label}
                    className={`rounded-xl bg-gradient-to-br ${colors[i]} backdrop-blur-sm border px-4 py-3.5`}
                  >
                    <feature.icon className={`w-4 h-4 mb-2 ${
                      i === 0 ? "text-emerald-300" :
                      i === 1 ? "text-blue-300" :
                      i === 2 ? "text-amber-300" : "text-cyan-300"
                    }`} />
                    <span className="text-sm font-semibold text-white/90 block">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 border-2 border-emerald-950 flex items-center justify-center"
                >
                  <Users className="w-3 h-3 text-emerald-200/70" />
                </div>
              ))}
            </div>
            <p className="text-sm text-emerald-200/50">
              <span className="font-semibold text-emerald-200/70">500+</span> empresas já confiam
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,theme(colors.border/20)_1px,transparent_0)] [background-size:24px_24px]" />

        <div
          className="relative w-full max-w-lg px-8"
        >
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 mb-3">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Gestor Local</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Sistema de gestão empresarial</p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl border border-border/60 border-t-2 border-t-emerald-500/30 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden"
          >
            <div className="px-6 py-5 bg-emerald-50/40 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-foreground">Acesse sua conta</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-6">
              {error && (
                <div
                  className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-9 rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all duration-150 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground/70">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-9 rounded-lg border border-border/60 bg-background pl-9 pr-10 text-sm shadow-sm outline-none focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all duration-150 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-emerald-600 transition-colors font-medium"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-150 active:scale-[0.97] shadow-sm shadow-emerald-500/15"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </div>
            </form>
          </div>

          <p
            className="text-center text-xs text-muted-foreground/50 mt-6"
          >
            Não tem uma conta?{" "}
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
              Saiba mais
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
