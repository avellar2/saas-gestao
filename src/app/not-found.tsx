"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileSearch, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 grain">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-5">
          <FileSearch className="w-8 h-8" />
        </div>
        <h1 className="text-6xl font-bold tracking-tighter text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Pagina nao encontrada</h2>
        <p className="text-muted-foreground mb-6">
          A pagina que voce esta procurando nao existe ou foi movida.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
