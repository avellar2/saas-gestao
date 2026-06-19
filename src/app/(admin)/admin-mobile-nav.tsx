"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";

interface AdminMobileNavProps {
  email: string;
}

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/modulos", label: "Módulos" },
];

export function AdminMobileNav({ email }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Gestor Local</h1>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Gestor Local</h1>
            <p className="text-sm text-gray-400 mt-1">Admin Global</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-500 truncate">{email}</p>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}